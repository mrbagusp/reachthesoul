// email-channel.ts — Email in & out for ReachTheSoul (Zendesk-style forwarding model)
//
// HOW IT WORKS
//  • Each org gets one or more inbox addresses: <local>@inbox.reachthesoul.org
//    (stored in social_accounts, platform = "email").
//  • The church forwards its existing address (e.g. prayer@church.org) to that inbox.
//    Website contact/counseling forms that email the church therefore arrive too.
//  • Resend receives the mail (MX on inbox.reachthesoul.org) and calls
//    webhookEmailInbound with an `email.received` event. We fetch the full email,
//    then create/continue a ticket via processIncomingMessage.
//  • Counselor replies are sent from "<Church> via ReachTheSoul <local@inbox...>"
//    with the ticket number in the subject, so the person's reply threads back.
//
// SETUP (one time, platform level) — see EMAIL-SETUP.md
//  • Resend: receiving domain + sending domain = inbox.reachthesoul.org
//  • Resend webhook → https://asia-southeast1-reachthesoul-prod.cloudfunctions.net/webhookEmailInbound
//    (event: email.received). Put its signing secret in functions/.env as RESEND_WEBHOOK_SECRET.
//  • RESEND_API_KEY already exists (used for welcome emails).

import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { logger } from "firebase-functions/v2";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { processIncomingMessage } from "./webhook-processor";
import type { Attachment } from "./webhook-processor";
import { downloadAndUploadMedia, categorizeMimeType } from "./media-helper";

export const INBOX_DOMAIN = (process.env.EMAIL_INBOX_DOMAIN ?? "inbox.reachthesoul.org").toLowerCase();
const RESEND_API = "https://api.resend.com";
const TEST_TAG = "RTS-FWD-TEST-";
const MAX_BODY_CHARS = 8000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function getDb() {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for tests)
// ────────────────────────────────────────────────────────────────────────────

/** Verify a Resend (Svix) webhook signature. */
export function verifySvixSignature(
  rawBody: string,
  headers: { id?: string; timestamp?: string; signature?: string },
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  if (!isFinite(ts) || Math.abs(nowSec - ts) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  const exp = Buffer.from(expected);
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig);
    return got.length === exp.length && crypto.timingSafeEqual(got, exp);
  });
}

/** "Jane Doe <jane@x.org>" → { name, email } */
export function parseAddress(raw: string | undefined | null): { name: string; email: string } {
  const s = String(raw ?? "").trim();
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  const e = s.match(/[^\s<>"]+@[^\s<>"]+/);
  return { name: "", email: (e ? e[0] : s).toLowerCase() };
}

function headerValue(headers: Record<string, any> | undefined, name: string): string {
  if (!headers) return "";
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  const v = key ? headers[key] : "";
  return Array.isArray(v) ? v.join(", ") : String(v ?? "");
}

/** Auto-replies, bounces, newsletters and our own mail should never become tickets. */
export function isAutomatedEmail(headers: Record<string, any> | undefined, fromEmail: string): string | null {
  const auto = headerValue(headers, "auto-submitted").toLowerCase();
  if (auto && auto !== "no") return "auto-submitted";
  const prec = headerValue(headers, "precedence").toLowerCase();
  if (["bulk", "junk", "list", "auto_reply"].includes(prec)) return `precedence:${prec}`;
  if (headerValue(headers, "x-autoreply") || headerValue(headers, "x-autorespond")) return "autoreply";
  if (headerValue(headers, "list-unsubscribe") || headerValue(headers, "list-id")) return "mailing-list";
  if (/^(mailer-daemon|postmaster)@/i.test(fromEmail)) return "bounce";
  if (fromEmail.endsWith(`@${INBOX_DOMAIN}`) || /@(mail\.)?reachthesoul\.org$/i.test(fromEmail)) return "own-mail";
  return null;
}

/** Gmail / Google Workspace forwarding confirmation → { code, link } */
export function parseGmailVerification(fromEmail: string, subject: string, text: string): { code: string; link: string } | null {
  if (!/forwarding-noreply@google\.com$/i.test(fromEmail)) return null;
  const code = (subject.match(/#(\d{6,})/) ?? text.match(/Confirmation code:\s*(\d{6,})/i) ?? [])[1] ?? "";
  const link = (text.match(/https:\/\/[^\s<>"]*(mail-settings\.google\.com|mail\.google\.com)[^\s<>"]*/i) ?? [])[0] ?? "";
  return { code, link };
}

export function htmlToText(html: string): string {
  let h = String(html ?? "");
  if (h.startsWith("data:")) {
    const comma = h.indexOf(",");
    const meta = h.slice(0, comma);
    const data = h.slice(comma + 1);
    h = meta.includes(";base64") ? Buffer.from(data, "base64").toString("utf8") : decodeURIComponent(data);
  }
  return h
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Keep only the new part of a reply (drop quoted history + signature separators). */
export function stripQuotedReply(text: string): string {
  const t = String(text ?? "").replace(/\r\n/g, "\n");
  const patterns: RegExp[] = [
    /^On .{3,200}wrote:\s*$/m,                    // Gmail / Apple Mail (EN)
    /^Pada .{3,200}menulis:\s*$/m,                // Gmail (ID)
    /^-{2,}\s*Original Message\s*-{2,}/im,        // Outlook classic
    /^_{8,}\s*$/m,                                // Outlook web separator
    /^From:\s.+\n(Sent|Date):\s.+/m,              // Outlook header block
    /^Dari:\s.+\n(Dikirim|Tanggal):\s.+/m,        // Outlook (ID)
    /^-- ?$/m,                                    // signature delimiter
  ];
  let cut = t.length;
  for (const re of patterns) {
    const m = re.exec(t);
    if (m && m.index > 0 && m.index < cut) cut = m.index;
  }
  let out = t.slice(0, cut);
  // Drop trailing "> quoted" lines
  out = out.split("\n").filter((l, i, arr) => !(l.startsWith(">") && arr.slice(i).every((x) => x.startsWith(">") || !x.trim()))).join("\n");
  return out.trim();
}

export function cleanSubject(subject: string): string {
  return String(subject ?? "")
    .replace(/\[RTS-\d+\]/gi, "")
    .replace(/^\s*((re|fw|fwd|aw|balas|tr)\s*:\s*)+/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function ticketNumberFromSubject(subject: string): string | null {
  const m = String(subject ?? "").match(/\[(RTS-\d{3,})\]/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Who is the real sender?
 * Website forms usually email FROM a system address (wordpress@, noreply@, forms@…)
 * with the visitor in Reply-To — prefer Reply-To in that case.
 */
export function pickSender(from: string, replyTo: string[] | undefined): { name: string; email: string; viaForm: boolean } {
  const f = parseAddress(from);
  const r = (replyTo ?? []).map(parseAddress).find((a) => a.email && a.email !== f.email && !a.email.endsWith(`@${INBOX_DOMAIN}`));
  if (r) return { ...r, viaForm: true };
  return { ...f, viaForm: false };
}

function slugify(s: string): string {
  return String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "church";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function resendFetch(path: string, init: RequestInit = {}): Promise<any> {
  const key = process.env.RESEND_API_KEY ?? "";
  if (!key) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch(`${RESEND_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${json?.message ?? JSON.stringify(json).slice(0, 200)}`);
  return json;
}

function monthFolder(orgId: string): string {
  const d = new Date();
  return `email/${orgId}/${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ────────────────────────────────────────────────────────────────────────────
// INBOUND — Resend webhook
// ────────────────────────────────────────────────────────────────────────────
export const webhookEmailInbound = onRequest({ cors: false, memory: "512MiB", timeoutSeconds: 120 }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

  const raw = (req as any).rawBody ? (req as any).rawBody.toString("utf8") : JSON.stringify(req.body ?? {});
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const ok = verifySvixSignature(raw, {
    id: req.get("svix-id") ?? undefined,
    timestamp: req.get("svix-timestamp") ?? undefined,
    signature: req.get("svix-signature") ?? undefined,
  }, secret);
  if (!ok) { logger.warn("[email-in] invalid signature"); res.status(401).send("invalid signature"); return; }

  try {
    const event = req.body ?? {};
    if (event.type !== "email.received") { res.status(200).json({ ignored: event.type }); return; }
    const status = await handleInboundEmail(event.data ?? {});
    res.status(200).json({ status });
  } catch (err) {
    logger.error("[email-in] error:", err);
    // 200 on processing errors so Resend doesn't retry forever; the error is logged.
    res.status(200).json({ status: "error" });
  }
});

export async function handleInboundEmail(data: any): Promise<string> {
  const db = getDb();
  const FieldValue = admin.firestore.FieldValue;

  // 1) Which RTS inbox was this for?
  const candidates: string[] = [
    ...(data.received_for ?? []), ...(data.to ?? []), ...(data.cc ?? []), ...(data.bcc ?? []),
  ].map((a: string) => parseAddress(a).email);
  const target = candidates.find((e) => e.endsWith(`@${INBOX_DOMAIN}`));
  if (!target) { logger.info("[email-in] no RTS inbox address in recipients"); return "no_inbox"; }
  const local = target.split("@")[0];

  const accSnap = await db.collection("social_accounts")
    .where("platform", "==", "email")
    .where("credentials.inboxLocal", "==", local)
    .limit(1).get();
  if (accSnap.empty) { logger.info(`[email-in] unknown inbox ${local}`); return "unknown_inbox"; }
  const accDoc = accSnap.docs[0];
  const account = accDoc.data();
  if (account.isActive === false) return "inactive_inbox";
  const orgId: string = account.orgId;

  // 2) Fetch the full email
  const full = await resendFetch(`/emails/receiving/${encodeURIComponent(data.email_id)}`);
  const fromRaw: string = full.headers?.from ?? full.from ?? data.from ?? "";
  const fromEmail = parseAddress(fromRaw).email;
  const subject: string = full.subject ?? data.subject ?? "";
  const text: string = full.text ? String(full.text) : (full.html ? htmlToText(full.html) : "");

  // 3) Setup helpers: Gmail forwarding confirmation + RTS forwarding test
  const gmail = parseGmailVerification(fromEmail, subject, text);
  if (gmail) {
    await accDoc.ref.update({
      "emailStatus.verification": { provider: "gmail", code: gmail.code, link: gmail.link, receivedAt: new Date().toISOString() },
      "emailStatus.lastReceivedAt": FieldValue.serverTimestamp(),
    });
    logger.info(`[email-in] Gmail forwarding confirmation captured for ${local}`);
    return "gmail_verification";
  }
  const testToken = (subject.match(new RegExp(`${TEST_TAG}([A-Za-z0-9]+)`)) ?? [])[1];
  if (testToken) {
    const expected = account.emailStatus?.testToken;
    if (expected && expected === testToken) {
      await accDoc.ref.update({
        "emailStatus.forwardingVerifiedAt": new Date().toISOString(),
        "emailStatus.lastReceivedAt": FieldValue.serverTimestamp(),
      });
      return "forwarding_verified";
    }
    return "stale_test";
  }

  // 4) Filters
  const automated = isAutomatedEmail(full.headers, fromEmail);
  if (automated) {
    await accDoc.ref.update({ "emailStatus.lastSkipped": { reason: automated, from: fromEmail, subject: subject.slice(0, 120), at: new Date().toISOString() } });
    logger.info(`[email-in] skipped (${automated}) from ${fromEmail}`);
    return `skipped:${automated}`;
  }

  // 5) Sender (Reply-To wins for website-form notifications)
  const sender = pickSender(fromRaw, full.reply_to ?? data.reply_to);
  if (!sender.email) return "no_sender";
  const senderName = sender.name || sender.email.split("@")[0];

  // 6) Thread: [RTS-00123] in subject
  let ticketIdHint: string | undefined;
  const tn = ticketNumberFromSubject(subject);
  if (tn) {
    const t = await db.collection("tickets").where("orgId", "==", orgId).where("ticketNumber", "==", tn).limit(1).get();
    if (!t.empty) ticketIdHint = t.docs[0].id;
  }

  // 7) Body
  const isReply = !!ticketIdHint || /^\s*(re|balas)\s*:/i.test(subject);
  let body = isReply ? stripQuotedReply(text) : text.trim();
  if (body.length > MAX_BODY_CHARS) body = body.slice(0, MAX_BODY_CHARS) + "\n…";
  const subj = cleanSubject(subject);
  const content = (!isReply && subj ? `✉️ ${subj}\n\n` : "") + (body || (subj ? "" : "(empty email)"));

  // 8) Attachments (skip inline signature images)
  const attachments: Attachment[] = [];
  if ((full.attachments ?? data.attachments ?? []).length > 0) {
    try {
      const list = await resendFetch(`/emails/receiving/${encodeURIComponent(data.email_id)}/attachments?limit=20`);
      for (const a of list.data ?? []) {
        if (a.content_id && a.content_disposition !== "attachment") continue;
        if (Number(a.size ?? 0) > MAX_ATTACHMENT_BYTES || !a.download_url) continue;
        const up = await downloadAndUploadMedia(a.download_url, monthFolder(orgId), `em_${Date.now()}`, {}, {
          mimeHint: a.content_type, maxBytes: MAX_ATTACHMENT_BYTES,
        });
        if (up) {
          attachments.push({
            type: categorizeMimeType(up.mimeType), url: up.url, mimeType: up.mimeType,
            filename: a.filename || up.filename, size: up.size,
          });
        }
      }
    } catch (err) {
      logger.warn("[email-in] attachments failed:", err);
    }
  }

  // 9) Ticket
  await processIncomingMessage({
    orgId,
    channel: "email",
    senderId: sender.email,
    senderName,
    senderEmail: sender.email,
    message: content || (attachments.length ? "[Attachment]" : "(empty email)"),
    attachments: attachments.length ? attachments : undefined,
    rawPayload: { from: fromRaw, replyTo: full.reply_to ?? [], to: full.to ?? data.to ?? [], subject, viaForm: sender.viaForm, emailId: data.email_id },
    socialAccountId: accDoc.id,
    programName: account.programName ?? undefined,
    ticketIdHint,
    ticketSubject: subj || undefined,
    messageMeta: {
      emailSubject: subject,
      emailMessageId: full.message_id ?? data.message_id ?? null,
      emailReferences: headerValue(full.headers, "references") || null,
      emailFrom: sender.email,
      emailViaForm: sender.viaForm,
    },
  });

  await accDoc.ref.update({ "emailStatus.lastReceivedAt": FieldValue.serverTimestamp() });
  return "ticket";
}

// ────────────────────────────────────────────────────────────────────────────
// OUTBOUND — called from onMessageCreated for channel "email"
// ────────────────────────────────────────────────────────────────────────────
export async function sendTicketEmailReply(opts: {
  ticketId: string;
  ticket: Record<string, any>;
  respondent: Record<string, any>;
  account: Record<string, any> | null;
  content: string;
  senderName?: string;
  messageRef?: admin.firestore.DocumentReference;
}): Promise<void> {
  const db = getDb();
  const { ticketId, ticket, respondent, account, content } = opts;
  const to = String(respondent.email ?? respondent.channelSenderId ?? "").trim();
  if (!to || !to.includes("@")) { logger.warn(`[email-out] no email for respondent on ticket ${ticketId}`); return; }

  const creds = account?.credentials ?? {};
  const inboxLocal: string = creds.inboxLocal ?? "";
  if (!inboxLocal) { logger.warn(`[email-out] ticket ${ticketId} has no email inbox account`); return; }
  const inboxAddress = `${inboxLocal}@${INBOX_DOMAIN}`;
  const orgName = String(creds.fromName || account?.displayName || "Our team").replace(/[<>"]/g, "");

  // Latest inbound email on this ticket → subject + threading headers
  let subject = "";
  let viaForm = false;
  let inReplyTo = "";
  let references = "";
  const msgs = await db.collection(`tickets/${ticketId}/messages`).orderBy("createdAt", "desc").limit(30).get();
  for (const d of msgs.docs) {
    const m = d.data();
    if (m.senderRole === "respondent" && m.emailMessageId) {
      subject = m.emailSubject ?? "";
      viaForm = m.emailViaForm === true;
      inReplyTo = m.emailMessageId;
      references = [m.emailReferences, m.emailMessageId].filter(Boolean).join(" ");
      break;
    }
  }
  // Website-form notifications have internal subjects ("New form submission") — use a friendly one
  const base = viaForm ? `Your message to ${orgName}` : (cleanSubject(subject) || ticket.subject || `Your message to ${orgName}`);
  const finalSubject = `Re: ${base} [${ticket.ticketNumber ?? "RTS"}]`;

  const html =
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937">` +
    `${escapeHtml(content).replace(/\n/g, "<br>")}` +
    `<p style="margin-top:28px;font-size:12px;color:#9ca3af">${escapeHtml(orgName)} · Reply to this email to continue the conversation.</p>` +
    `</div>`;

  const headers: Record<string, string> = {};
  if (inReplyTo) headers["In-Reply-To"] = inReplyTo;
  if (references) headers["References"] = references;

  try {
    const sent = await resendFetch("/emails", {
      method: "POST",
      body: JSON.stringify({
        from: `${orgName} via ReachTheSoul <${inboxAddress}>`,
        to: [to],
        reply_to: inboxAddress,
        subject: finalSubject,
        html,
        text: `${content}\n\n— ${orgName}\nReply to this email to continue the conversation.`,
        headers,
        tags: [{ name: "type", value: "ticket_reply" }],
      }),
    });
    logger.info(`[email-out] ticket ${ticketId} → ${to} (${sent?.id})`);
    if (opts.messageRef) await opts.messageRef.update({ emailSentId: sent?.id ?? null, emailSubject: finalSubject });
  } catch (err: any) {
    logger.error(`[email-out] ticket ${ticketId} failed:`, err);
    if (opts.messageRef) await opts.messageRef.update({ emailError: String(err?.message ?? err).slice(0, 300) });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SETUP — callables used by Dashboard → Admin → Email Inbox
// ────────────────────────────────────────────────────────────────────────────
async function requireOrgRole(uid: string | undefined, orgId: string, adminOnly: boolean) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  if (!orgId) throw new HttpsError("invalid-argument", "orgId is required.");
  const user = (await getDb().collection("users").doc(uid).get()).data() ?? {};
  if (user.isPlatformAdmin === true) return;
  const role = user.orgRoles?.[orgId];
  if (!role) throw new HttpsError("permission-denied", "You are not a member of this organization.");
  if (adminOnly && role !== "admin") throw new HttpsError("permission-denied", "Only organization admins can do this.");
}

function publicInbox(doc: admin.firestore.DocumentSnapshot) {
  const d = doc.data() ?? {};
  const c = d.credentials ?? {};
  const st = d.emailStatus ?? {};
  const ts = (v: any) => v?.toDate?.()?.toISOString?.() ?? v ?? null;
  return {
    id: doc.id,
    inboxAddress: `${c.inboxLocal}@${INBOX_DOMAIN}`,
    publicAddress: c.publicAddress ?? "",
    fromName: c.fromName ?? "",
    programName: d.programName ?? "",
    isActive: d.isActive !== false,
    status: {
      forwardingVerifiedAt: st.forwardingVerifiedAt ?? null,
      lastReceivedAt: ts(st.lastReceivedAt),
      testSentAt: st.testSentAt ?? null,
      verification: st.verification ?? null,
      lastSkipped: st.lastSkipped ?? null,
    },
  };
}

export const listEmailInboxes = onCall(async (request) => {
  const orgId = String(request.data?.orgId ?? "");
  await requireOrgRole(request.auth?.uid, orgId, false);
  const snap = await getDb().collection("social_accounts").where("orgId", "==", orgId).where("platform", "==", "email").get();
  return { domain: INBOX_DOMAIN, inboxes: snap.docs.filter((d) => d.data()?.credentials?.inboxLocal).map(publicInbox) };
});

export const createEmailInbox = onCall(async (request) => {
  const orgId = String(request.data?.orgId ?? "");
  await requireOrgRole(request.auth?.uid, orgId, true);
  const db = getDb();
  const org = (await db.collection("organizations").doc(orgId).get()).data() ?? {};
  if ((org.plan ?? "free") === "free") throw new HttpsError("failed-precondition", "Email inbox is available on paid plans. Please upgrade.");

  const publicAddress = String(request.data?.publicAddress ?? "").trim().toLowerCase().slice(0, 200);
  if (publicAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicAddress)) throw new HttpsError("invalid-argument", "Please enter a valid email address.");
  if (publicAddress.endsWith(`@${INBOX_DOMAIN}`)) throw new HttpsError("invalid-argument", "Use your church's own email address here.");
  const fromName = String(request.data?.fromName ?? org.name ?? "").trim().slice(0, 80) || "Our team";
  const programName = String(request.data?.programName ?? "").trim().slice(0, 80);

  // Unique local part: <org-slug>-<4 chars>
  const base = slugify(org.name ?? orgId);
  let local = "";
  for (let i = 0; i < 10; i++) {
    const cand = `${base}-${crypto.randomBytes(3).toString("hex").slice(0, 4)}`;
    const exists = await db.collection("social_accounts").where("platform", "==", "email").where("credentials.inboxLocal", "==", cand).limit(1).get();
    if (exists.empty) { local = cand; break; }
  }
  if (!local) throw new HttpsError("internal", "Could not allocate an inbox address, please try again.");

  const now = new Date().toISOString();
  const ref = await db.collection("social_accounts").add({
    orgId,
    platform: "email",
    displayName: publicAddress || `${local}@${INBOX_DOMAIN}`,
    programName: programName || null,
    credentials: { inboxLocal: local, publicAddress, fromName },
    emailStatus: {},
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: "email_setup",
  });
  return { inbox: publicInbox(await ref.get()) };
});

export const updateEmailInbox = onCall(async (request) => {
  const orgId = String(request.data?.orgId ?? "");
  const id = String(request.data?.id ?? "");
  await requireOrgRole(request.auth?.uid, orgId, true);
  const ref = getDb().collection("social_accounts").doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.orgId !== orgId || doc.data()?.platform !== "email") throw new HttpsError("not-found", "Inbox not found.");
  const upd: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (typeof request.data?.isActive === "boolean") upd.isActive = request.data.isActive;
  if (typeof request.data?.fromName === "string") upd["credentials.fromName"] = request.data.fromName.trim().slice(0, 80);
  if (typeof request.data?.programName === "string") upd.programName = request.data.programName.trim().slice(0, 80) || null;
  if (typeof request.data?.publicAddress === "string") {
    const p = request.data.publicAddress.trim().toLowerCase().slice(0, 200);
    if (p && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)) throw new HttpsError("invalid-argument", "Please enter a valid email address.");
    upd["credentials.publicAddress"] = p;
    if (p) upd.displayName = p;
  }
  if (request.data?.clearVerification === true) upd["emailStatus.verification"] = admin.firestore.FieldValue.delete();
  await ref.update(upd);
  return { inbox: publicInbox(await ref.get()) };
});

export const sendEmailForwardingTest = onCall(async (request) => {
  const orgId = String(request.data?.orgId ?? "");
  const id = String(request.data?.id ?? "");
  await requireOrgRole(request.auth?.uid, orgId, true);
  const ref = getDb().collection("social_accounts").doc(id);
  const doc = await ref.get();
  const d = doc.data();
  if (!doc.exists || d?.orgId !== orgId || d?.platform !== "email") throw new HttpsError("not-found", "Inbox not found.");
  const publicAddress = d?.credentials?.publicAddress;
  if (!publicAddress) throw new HttpsError("failed-precondition", "Add your church's email address first.");

  const token = crypto.randomBytes(5).toString("hex");
  await ref.update({ "emailStatus.testToken": token, "emailStatus.testSentAt": new Date().toISOString() });
  await resendFetch("/emails", {
    method: "POST",
    body: JSON.stringify({
      from: `ReachTheSoul Setup <setup@${INBOX_DOMAIN}>`,
      to: [publicAddress],
      subject: `ReachTheSoul forwarding test ${TEST_TAG}${token}`,
      text: `This is a test from ReachTheSoul.\n\nIf forwarding is set up correctly, this email will be forwarded to your ReachTheSoul inbox automatically and your dashboard will show "Forwarding verified".\n\nYou can delete this email.`,
    }),
  });
  return { status: "sent" };
});

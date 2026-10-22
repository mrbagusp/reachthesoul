/**
 * ReachTheSoul AI platform layer
 * ─────────────────────────────────────────────────────────────────────────────
 * - Built-in AI: RTS's own OpenAI key (functions/.env OPENAI_API_KEY) for paid plans,
 *   counted per AI *session* against the plan quota.
 *     Starter → gpt-4o-mini (AI_MODEL_BASIC), Growth/Enterprise → gpt-4o (AI_MODEL_ADVANCED)
 * - BYOK: a church's own OpenAI/Anthropic key, stored server-side only in
 *   org_secrets/{orgId} (no client read/write — blocked by Firestore rules).
 *   BYOK sessions are counted for reporting but never blocked by the quota.
 * - Session = one ticket answered by AI within a 24h window, max N AI replies,
 *   then the conversation is handed to a human.
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { sendEmail, wrapInEmailTemplate } from "./emailService";

const REGION = "asia-southeast1";

function db() {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

// ── Plan limits (keep in sync with lib/plans.ts maxAIConversations) ──────────
export const AI_PLAN: Record<string, { sessions: number; advanced: boolean }> = {
  free: { sessions: 0, advanced: false },
  starter: { sessions: 300, advanced: false },
  growth: { sessions: 1500, advanced: true },
  enterprise: { sessions: 5000, advanced: true },
};
export const MAX_AI_REPLIES_PER_SESSION = 12;
const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;
const TEST_CALLS_PER_DAY = 40;

export const SAFETY_SUFFIX = `

Always-on safety rules (these override anything above):
- You are an AI assistant, not a human pastor or counselor. If someone asks, say so honestly.
- Never give medical, legal or financial advice; gently refer to qualified professionals.
- If someone may be in danger of harming themselves or others, encourage them to contact local emergency services or a crisis line right away, and tell them a member of the care team will follow up.`;

export interface AiCreds {
  provider: "openai" | "anthropic";
  apiKey: string;
  model: string;
  byok: boolean;
}

export function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function builtInModel(plan: string): string {
  const p = AI_PLAN[plan] ?? AI_PLAN.free;
  return p.advanced
    ? (process.env.AI_MODEL_ADVANCED || "gpt-4o")
    : (process.env.AI_MODEL_BASIC || "gpt-4o-mini");
}

/** Which key/model answers for this org. null = AI not available. */
export async function resolveAiCreds(orgId: string, org: any): Promise<AiCreds | null> {
  try {
    const secret = await db().doc(`org_secrets/${orgId}`).get();
    const s = secret.data()?.ai;
    if (s?.apiKey) {
      return {
        provider: s.provider === "anthropic" ? "anthropic" : "openai",
        apiKey: s.apiKey,
        model: s.model || (s.provider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o-mini"),
        byok: true,
      };
    }
  } catch (e) {
    logger.warn("[ai] org_secrets read failed", e);
  }

  // Legacy: key saved on the org doc before keys moved server-side
  const legacy = org?.aiConfig?.apiKey;
  if (legacy) {
    return {
      provider: org.aiConfig.provider === "anthropic" ? "anthropic" : "openai",
      apiKey: legacy,
      model: org.aiConfig.model || "gpt-4o-mini",
      byok: true,
    };
  }

  const plan = org?.plan ?? "free";
  if (!(AI_PLAN[plan]?.sessions > 0)) return null;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    logger.warn("[ai] OPENAI_API_KEY not set — built-in AI unavailable");
    return null;
  }
  return { provider: "openai", apiKey: key, model: builtInModel(plan), byok: false };
}

export function sessionLimit(org: any): number {
  const plan = org?.plan ?? "free";
  const base = AI_PLAN[plan]?.sessions ?? 0;
  if (base === 0) return 0;
  const override = Number(org?.limits?.maxAIConversations) || 0; // platform admin can grant more
  const topup = Number(org?.aiTopup?.[monthKey()]) || 0;          // prepaid packs (stage C)
  return Math.max(base, override) + topup;
}

export function sessionsUsed(org: any): number {
  const u = org?.usage ?? {};
  return u.aiMonth === monthKey() ? Number(u.aiConversationsThisMonth) || 0 : 0;
}

type Claim =
  | { ok: true; newSession: boolean; used: number; limit: number }
  | { ok: false; reason: "quota" | "reply_cap"; used: number; limit: number };

/** Reserve one AI reply: continues the ticket's session or opens a new one (counted). */
export async function claimAiReply(orgId: string, ticketId: string, channel: string, creds: AiCreds): Promise<Claim> {
  const orgRef = db().doc(`organizations/${orgId}`);
  const ticketRef = db().doc(`tickets/${ticketId}`);
  const month = monthKey();
  const now = Date.now();

  return db().runTransaction(async (tx) => {
    const [orgSnap, ticketSnap] = await Promise.all([tx.get(orgRef), tx.get(ticketRef)]);
    const org = orgSnap.data() ?? {};
    const ticket = ticketSnap.data() ?? {};
    const used = sessionsUsed(org);
    const limit = sessionLimit(org);
    const s = ticket.aiSession;

    if (s && s.month === month && now - (s.startedAtMs ?? 0) < SESSION_WINDOW_MS) {
      if ((s.replies ?? 0) >= MAX_AI_REPLIES_PER_SESSION) return { ok: false, reason: "reply_cap", used, limit };
      tx.update(ticketRef, { "aiSession.replies": (s.replies ?? 0) + 1 });
      return { ok: true, newSession: false, used, limit };
    }

    if (!creds.byok && used >= limit) return { ok: false, reason: "quota", used, limit };

    tx.update(orgRef, { "usage.aiMonth": month, "usage.aiConversationsThisMonth": used + 1 });
    tx.update(ticketRef, { aiSession: { month, startedAtMs: now, replies: 1, byok: creds.byok, model: creds.model } });
    tx.set(db().collection("ai_usage_log").doc(), {
      orgId, ticketId, channel, month, model: creds.model, byok: creds.byok,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, newSession: true, used: used + 1, limit };
  });
}

/** Give back a session that was opened but never produced a reply (AI call failed). */
export async function refundAiSession(orgId: string, ticketId: string): Promise<void> {
  try {
    await db().doc(`organizations/${orgId}`).update({ "usage.aiConversationsThisMonth": admin.firestore.FieldValue.increment(-1) });
    await db().doc(`tickets/${ticketId}`).update({ aiSession: admin.firestore.FieldValue.delete() });
  } catch (e) {
    logger.warn("[ai] refund failed", e);
  }
}

/** Email the org's admins once per month at 80% and 100% of the built-in AI quota. */
export async function maybeSendQuotaAlert(orgId: string, used: number, limit: number): Promise<void> {
  if (!limit) return;
  const level = used >= limit ? "100" : used >= Math.ceil(limit * 0.8) ? "80" : null;
  if (!level) return;
  const month = monthKey();
  const orgRef = db().doc(`organizations/${orgId}`);
  const sent = await db().runTransaction(async (tx) => {
    const org = (await tx.get(orgRef)).data() ?? {};
    if (org.aiQuotaAlerts?.[month]?.[level] || (level === "80" && org.aiQuotaAlerts?.[month]?.["100"])) return null;
    tx.update(orgRef, { [`aiQuotaAlerts.${month}.${level}`]: true });
    return org;
  });
  if (!sent) return;

  const to = sent.billingEmail || sent.ownerEmail;
  if (!to) return;
  const subject = level === "100"
    ? "Your ReachTheSoul AI sessions for this month are used up"
    : "You've used 80% of this month's AI sessions";
  const body = level === "100"
    ? `Hi,\n\n${sent.name ?? "Your organization"} has used all ${limit} AI sessions included this month. The AI first response is paused until the 1st of next month. New messages still arrive in your inbox and your team can reply as usual.\n\nTo keep the AI answering, upgrade your plan in Billing: https://reachthesoul.org/dashboard/billing\n\nGrace and peace,\nReachTheSoul`
    : `Hi,\n\n${sent.name ?? "Your organization"} has used ${used} of ${limit} AI sessions included this month (80%). When the limit is reached, the AI first response pauses until the 1st of next month and your team replies as usual.\n\nYou can review your plan in Billing: https://reachthesoul.org/dashboard/billing\n\nGrace and peace,\nReachTheSoul`;
  try {
    await sendEmail({ to, subject, html: wrapInEmailTemplate(body, subject, { lang: "en" }) });
  } catch (e) {
    logger.warn("[ai] quota alert email failed", e);
  }
}

// ── Provider call ────────────────────────────────────────────────────────────
export async function callModel(
  creds: AiCreds,
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  opts: { maxTokens?: number; temperature?: number; json?: boolean } = {},
): Promise<string> {
  const maxTokens = opts.maxTokens ?? 500;
  const temperature = opts.temperature ?? 0.7;
  if (creds.provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": creds.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: creds.model, max_tokens: maxTokens, temperature, system, messages }),
    });
    const j: any = await r.json();
    if (j.error) throw new Error(`Anthropic: ${j.error.message ?? JSON.stringify(j.error)}`);
    return j.content?.[0]?.text ?? "";
  }
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${creds.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: creds.model,
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: maxTokens,
      temperature,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const j: any = await r.json();
  if (j.error) throw new Error(`OpenAI: ${j.error.message ?? JSON.stringify(j.error)}`);
  return j.choices?.[0]?.message?.content ?? "";
}

// ── Callables ────────────────────────────────────────────────────────────────
async function requireOrgRole(uid: string | undefined, orgId: string, roles: string[]): Promise<any> {
  if (!uid) throw new HttpsError("unauthenticated", "Please sign in.");
  if (!orgId) throw new HttpsError("invalid-argument", "orgId is required.");
  const user = (await db().doc(`users/${uid}`).get()).data() ?? {};
  const role = user.orgRoles?.[orgId] ?? (user.orgId === orgId ? user.role : undefined);
  if (!user.isPlatformAdmin && !roles.includes(role)) {
    throw new HttpsError("permission-denied", "You don't have access to this organization's AI settings.");
  }
  const org = (await db().doc(`organizations/${orgId}`).get()).data();
  if (!org) throw new HttpsError("not-found", "Organization not found.");
  return { user, org };
}

function keyHint(k: string): string {
  return k.length > 12 ? `${k.slice(0, 7)}…${k.slice(-4)}` : "…";
}

/** Overview for the AI Settings page — never returns any key. */
export const getAiStatus = onCall({ region: REGION }, async (req) => {
  const orgId = String(req.data?.orgId ?? "");
  const { org } = await requireOrgRole(req.auth?.uid, orgId, ["admin", "supervisor"]);
  const secret = (await db().doc(`org_secrets/${orgId}`).get()).data()?.ai;
  const plan = org.plan ?? "free";
  const byok = !!secret?.apiKey || !!org.aiConfig?.apiKey;
  return {
    plan,
    engine: byok ? "byok" : (AI_PLAN[plan]?.sessions > 0 ? "builtin" : "none"),
    builtInAvailable: !!process.env.OPENAI_API_KEY && (AI_PLAN[plan]?.sessions ?? 0) > 0,
    builtInModel: (AI_PLAN[plan]?.sessions ?? 0) > 0 ? builtInModel(plan) : null,
    byokAllowed: plan === "enterprise" || org.byokAllowed === true || byok,
    byok: byok ? {
      provider: secret?.provider ?? org.aiConfig?.provider ?? "openai",
      model: secret?.model ?? org.aiConfig?.model ?? "",
      keyHint: secret?.keyHint ?? (org.aiConfig?.apiKey ? keyHint(org.aiConfig.apiKey) : ""),
    } : null,
    used: sessionsUsed(org),
    limit: sessionLimit(org),
    month: monthKey(),
    maxRepliesPerSession: MAX_AI_REPLIES_PER_SESSION,
    legacyKeyOnOrgDoc: !!org.aiConfig?.apiKey,
  };
});

/** Save a church's own key (BYOK). Key goes to org_secrets only; the org doc keeps a hint. */
export const saveAiKey = onCall({ region: REGION }, async (req) => {
  const orgId = String(req.data?.orgId ?? "");
  const { org } = await requireOrgRole(req.auth?.uid, orgId, ["admin"]);
  const provider = req.data?.provider === "anthropic" ? "anthropic" : "openai";
  const model = String(req.data?.model ?? "").trim();
  const apiKey = String(req.data?.apiKey ?? "").trim();
  if (!(org.plan === "enterprise" || org.byokAllowed === true || org.aiConfig?.apiKey)) {
    throw new HttpsError("failed-precondition", "Using your own AI key is available on Enterprise or by request. Please contact us.");
  }
  if (!apiKey || !model) throw new HttpsError("invalid-argument", "Provider, model and API key are required.");

  // Validate the key with a tiny request so a typo doesn't silently break replies
  try {
    await callModel({ provider, apiKey, model, byok: true }, "Reply with OK.", [{ role: "user", content: "ping" }], { maxTokens: 5, temperature: 0 });
  } catch (e: any) {
    throw new HttpsError("invalid-argument", `This key didn't work: ${String(e?.message ?? e).slice(0, 200)}`);
  }

  const hint = keyHint(apiKey);
  await db().doc(`org_secrets/${orgId}`).set({
    ai: { provider, model, apiKey, keyHint: hint, updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: req.auth!.uid },
  }, { merge: true });
  await db().doc(`organizations/${orgId}`).update({
    "aiConfig.engine": "byok",
    "aiConfig.provider": provider,
    "aiConfig.model": model,
    "aiConfig.byokKeyHint": hint,
    "aiConfig.apiKey": admin.firestore.FieldValue.delete(),
  });
  return { ok: true, keyHint: hint };
});

/** Remove BYOK key → back to built-in AI (if the plan includes it). */
export const removeAiKey = onCall({ region: REGION }, async (req) => {
  const orgId = String(req.data?.orgId ?? "");
  await requireOrgRole(req.auth?.uid, orgId, ["admin"]);
  await db().doc(`org_secrets/${orgId}`).set({ ai: admin.firestore.FieldValue.delete() }, { merge: true });
  await db().doc(`organizations/${orgId}`).update({
    "aiConfig.engine": "builtin",
    "aiConfig.byokKeyHint": admin.firestore.FieldValue.delete(),
    "aiConfig.apiKey": admin.firestore.FieldValue.delete(),
  });
  return { ok: true };
});

/** Move a legacy key from the org doc (readable by the whole team) into org_secrets. */
export const migrateAiKey = onCall({ region: REGION }, async (req) => {
  const orgId = String(req.data?.orgId ?? "");
  const { org } = await requireOrgRole(req.auth?.uid, orgId, ["admin"]);
  const k = org.aiConfig?.apiKey;
  if (!k) return { migrated: false };
  await db().doc(`org_secrets/${orgId}`).set({
    ai: {
      provider: org.aiConfig.provider === "anthropic" ? "anthropic" : "openai",
      model: org.aiConfig.model || "gpt-4o-mini",
      apiKey: k,
      keyHint: keyHint(k),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.auth!.uid,
    },
  }, { merge: true });
  await db().doc(`organizations/${orgId}`).update({
    "aiConfig.engine": "byok",
    "aiConfig.byokKeyHint": keyHint(k),
    "aiConfig.apiKey": admin.firestore.FieldValue.delete(),
  });
  return { migrated: true };
});

/**
 * Test the AI (AI Settings "Test AI" and the ticket "simulate" panel).
 * Not counted against the session quota; capped per org per day.
 * mode "reply" → AI answer using the given (unsaved) prompt; mode "crisis" → crisis JSON.
 */
export const aiTest = onCall({ region: REGION, timeoutSeconds: 60 }, async (req) => {
  const orgId = String(req.data?.orgId ?? "");
  const { org } = await requireOrgRole(req.auth?.uid, orgId, ["admin", "supervisor", "agent"]);
  const creds = await resolveAiCreds(orgId, org);
  if (!creds) {
    throw new HttpsError("failed-precondition", (org.plan ?? "free") === "free"
      ? "AI is available on Starter and above."
      : "AI is not available yet. Please contact support.");
  }

  // Daily cap
  const day = new Date().toISOString().slice(0, 10);
  const orgRef = db().doc(`organizations/${orgId}`);
  await db().runTransaction(async (tx) => {
    const o = (await tx.get(orgRef)).data() ?? {};
    const n = o.usage?.aiTestDay === day ? Number(o.usage?.aiTestCount) || 0 : 0;
    if (n >= TEST_CALLS_PER_DAY) throw new HttpsError("resource-exhausted", "Daily AI test limit reached. Please try again tomorrow.");
    tx.update(orgRef, { "usage.aiTestDay": day, "usage.aiTestCount": n + 1 });
  });

  const mode = req.data?.mode === "crisis" ? "crisis" : "reply";
  const history = (Array.isArray(req.data?.messages) ? req.data.messages : [])
    .slice(-12)
    .map((m: any) => ({ role: m?.role === "assistant" ? "assistant" : "user", content: String(m?.content ?? "").slice(0, 4000) }))
    .filter((m: any) => m.content);
  if (!history.length) throw new HttpsError("invalid-argument", "Message is required.");

  if (mode === "crisis") {
    const out = await callModel(creds, CRISIS_PROMPT, history, { maxTokens: 200, temperature: 0.1 });
    return { text: out };
  }
  const system = String(req.data?.systemPrompt ?? org.aiConfig?.systemPrompt ?? "You are a compassionate Christian care assistant.").slice(0, 20000) + SAFETY_SUFFIX;
  const text = await callModel(creds, system, history, { maxTokens: 500 });
  return { text, model: creds.model, byok: creds.byok };
});

export const CRISIS_PROMPT = `You are a crisis detection system for a Christian ministry counseling platform.
Analyze the respondent's latest message AND the conversation context to determine if this person needs IMMEDIATE human intervention.

Detect these situations even when NO explicit keywords are used:
- Suicidal ideation or self-harm intent (direct or indirect)
- Severe emotional crisis (hopelessness, despair, giving up)
- Domestic violence or abuse indicators
- Substance abuse emergency
- Immediate danger to self or others
- Grief crisis (sudden loss, death of loved one)
- Psychotic symptoms or severe mental health episode

Be sensitive to both Indonesian (Bahasa) and English, including indirect expressions such as
"sudah tidak kuat lagi", "lebih baik saya pergi", "semua akan lebih baik tanpa saya", "capek hidup",
"I can't do this anymore", "there's no point".

These are NOT a crisis on their own (return needsEscalation false): ordinary prayer requests
("please pray for my exam / my mother's surgery / my job"), being sick or worried, everyday stress
or sadness, questions about faith, Jesus, baptism or church, or talking about a death that happened
long ago without current distress. Escalate only when the person may be in danger or in acute crisis NOW.

Respond with ONLY valid JSON (no markdown, no backticks):
{"needsEscalation":true/false,"reason":"grief_or_crisis"|"counseling"|null,"confidence":0.0-1.0,"label":"short description","analysis":"brief explanation (1-2 sentences)"}

If the message is casual, informational, or does not indicate crisis, return:
{"needsEscalation":false,"reason":null,"confidence":0,"label":null,"analysis":null}`;

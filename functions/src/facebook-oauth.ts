// ────────────────────────────────────────────────────────────────────────────
// Facebook / Instagram OAuth "Connect" flow
//
// Two HTTP endpoints (Cloud Functions, region asia-southeast1):
//
//   fbConnectStart     GET  → validates plan, redirects to Facebook OAuth dialog
//   fbConnectCallback  GET  → receives ?code, exchanges tokens, saves social_accounts,
//                             auto-subscribes each page (and linked IG account) to the
//                             webhook, then redirects back to the RTS Social Accounts page.
//
// Token exchange chain (per Meta docs):
//   auth code → short-lived user token → long-lived user token
//   → GET /me/accounts (page list + PERMANENT page tokens)
//   → for each page: read linked IG business account, subscribe page + IG to webhooks
//
// Shares META_APP_SECRET with verify-signature.ts (one Meta App → one App Secret).
// ────────────────────────────────────────────────────────────────────────────

import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { Firestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";
import { clearSocialAccountCache } from "./social-accounts";

// ── Config ──────────────────────────────────────────────────────────────────
const GRAPH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const IG_GRAPH_VERSION = "v25.0";
const FB_OAUTH_DIALOG = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

const META_APP_ID = "1446857313831361"; // Blessing Media Global

// Permissions we request.
const SCOPES = [
  "pages_show_list",
  "pages_manage_metadata",
  "pages_messaging",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_messages",
  "business_management",
].join(",");

// Fields subscribed on each Facebook Page (Messenger).
const FB_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_deliveries",
  "message_reads",
  "messaging_referrals",
].join(",");

// Fields subscribed on each Instagram account.
const IG_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
  "messaging_seen",
  "message_reactions",
].join(",");

// ── Lazy admin init ─────────────────────────────────────────────────────────
function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp();
}
function getDb(): Firestore {
  return getApp().firestore();
}

// App secret — same env var used by verify-signature.ts.
function getAppSecret(): string {
  return process.env.META_APP_SECRET ?? "";
}

// Where to bounce the admin back to after connecting.
function getOmsReturnUrl(): string {
  return (
    (process.env.OMS_BASE_URL ?? "https://reachthesoul.org").replace(/\/$/, "") +
    "/dashboard/admin/social-accounts"
  );
}

// OAuth redirect_uri — must EXACTLY match Valid OAuth Redirect URI in Meta app.
function getCallbackUrl(): string {
  const region = "asia-southeast1";
  const projectId =
    process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "reachthesoul-prod";
  return `https://${region}-${projectId}.cloudfunctions.net/fbConnectCallback`;
}

// ── Plan gate ───────────────────────────────────────────────────────────────
const PAID_PLANS = new Set(["starter", "growth", "enterprise"]);

async function getOrgPlan(orgId: string): Promise<string> {
  try {
    const snap = await getDb().collection("organizations").doc(orgId).get();
    if (!snap.exists) return "free";
    return (snap.data()?.plan as string) ?? "free";
  } catch (err) {
    logger.error("[fbConnect] getOrgPlan failed", err);
    return "free";
  }
}

// ── CSRF state: signed, short-lived, carries orgId ──────────────────────────
function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function b64urlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function signState(payload: Record<string, any>): string {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", getAppSecret() || "dev-secret")
    .update(body)
    .digest("hex");
  return `${body}.${sig}`;
}

function verifyState(state: string): Record<string, any> | null {
  if (!state || !state.includes(".")) return null;
  const [body, sig] = state.split(".");
  const expected = crypto
    .createHmac("sha256", getAppSecret() || "dev-secret")
    .update(body)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8"));
    if (typeof payload.ts === "number" && Date.now() - payload.ts > 10 * 60_000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// ── Graph helpers ───────────────────────────────────────────────────────────
async function graphGet(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message ?? `Graph GET ${path} failed (${res.status})`);
  }
  return data;
}

async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message ?? `Graph POST ${path} failed (${res.status})`);
  }
  return data;
}

async function subscribeFacebookPage(pageId: string, pageToken: string): Promise<void> {
  await graphPost(`${pageId}/subscribed_apps`, {
    subscribed_fields: FB_SUBSCRIBED_FIELDS,
    access_token: pageToken,
  });
}

async function subscribeInstagram(igUserId: string, pageToken: string): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/${IG_GRAPH_VERSION}/${igUserId}/subscribed_apps`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        subscribed_fields: IG_SUBSCRIBED_FIELDS,
        access_token: pageToken,
      }).toString(),
    }
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message ?? `IG subscribe failed (${res.status})`);
  }
}

function bounce(res: any, params: Record<string, string>) {
  const url = new URL(getOmsReturnUrl());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  res.redirect(302, url.toString());
}

// ────────────────────────────────────────────────────────────────────────────
// STEP 1 — Start: validate plan, redirect to Facebook OAuth dialog.
// ────────────────────────────────────────────────────────────────────────────
export const fbConnectStart = onRequest(
  { region: "asia-southeast1", cors: true, secrets: ["META_APP_SECRET"] },
  async (req, res) => {
    const orgId = (req.query.org as string) ?? "";
    if (!orgId) {
      res.status(400).json({ error: "Missing org parameter" });
      return;
    }

    const plan = await getOrgPlan(orgId);
    if (!PAID_PLANS.has(plan)) {
      bounce(res, { fb_connect: "upgrade_required", plan });
      return;
    }

    const state = signState({ orgId, ts: Date.now(), nonce: crypto.randomUUID() });
    const url = new URL(FB_OAUTH_DIALOG);
    url.searchParams.set("client_id", META_APP_ID);
    url.searchParams.set("redirect_uri", getCallbackUrl());
    url.searchParams.set("state", state);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("auth_type", "rerequest");

    logger.info(`[fbConnectStart] org=${orgId} plan=${plan} → OAuth dialog`);
    res.redirect(302, url.toString());
  }
);

// ────────────────────────────────────────────────────────────────────────────
// STEP 2 — Callback: exchange tokens, persist pages + IG, subscribe webhooks.
// ────────────────────────────────────────────────────────────────────────────
export const fbConnectCallback = onRequest(
  { region: "asia-southeast1", cors: true, secrets: ["META_APP_SECRET"] },
  async (req, res) => {
    if (req.query.error) {
      logger.warn(`[fbConnectCallback] user denied: ${req.query.error_description ?? req.query.error}`);
      bounce(res, { fb_connect: "cancelled" });
      return;
    }

    const code = (req.query.code as string) ?? "";
    const state = (req.query.state as string) ?? "";
    const payload = verifyState(state);
    if (!code || !payload) {
      logger.warn("[fbConnectCallback] invalid code/state");
      bounce(res, { fb_connect: "error", reason: "invalid_state" });
      return;
    }
    const orgId = payload.orgId as string;

    const appSecret = getAppSecret();
    if (!appSecret) {
      logger.error("[fbConnectCallback] META_APP_SECRET not configured");
      bounce(res, { fb_connect: "error", reason: "server_config" });
      return;
    }

    try {
      // auth code → short-lived user token
      const short = await graphGet("oauth/access_token", {
        client_id: META_APP_ID,
        client_secret: appSecret,
        redirect_uri: getCallbackUrl(),
        code,
      });
      const shortToken = short.access_token as string;

      // short-lived → long-lived user token (~60 days)
      const long = await graphGet("oauth/access_token", {
        grant_type: "fb_exchange_token",
        client_id: META_APP_ID,
        client_secret: appSecret,
        fb_exchange_token: shortToken,
      });
      const longToken = long.access_token as string;

      // /me/accounts → pages + PERMANENT page tokens
      const accounts = await graphGet("me/accounts", {
        access_token: longToken,
        fields: "id,name,access_token,instagram_business_account{id,username}",
        limit: "100",
      });

      const pages: any[] = accounts.data ?? [];
      if (pages.length === 0) {
        logger.warn(`[fbConnectCallback] org=${orgId} granted 0 pages`);
        bounce(res, { fb_connect: "no_pages" });
        return;
      }

      const db = getDb();
      let fbCount = 0;
      let igCount = 0;

      for (const page of pages) {
        const pageId = String(page.id);
        const pageName = String(page.name ?? "");
        const pageToken = String(page.access_token ?? "");
        if (!pageToken) continue;

        // Debug: log what Graph API returned for this page's IG link
        const igRaw = page.instagram_business_account;
        logger.info(`[fbConnectCallback] page="${pageName}" (${pageId}) ig_raw=${JSON.stringify(igRaw ?? null)}`);

        // Subscribe Page to Messenger webhook
        try {
          await subscribeFacebookPage(pageId, pageToken);
          logger.info(`[fbConnectCallback] subscribed FB page ${pageName} (${pageId})`);
        } catch (subErr: any) {
          logger.error(`[fbConnectCallback] FB subscribe failed for ${pageId}: ${subErr.message}`);
        }

        // Upsert Facebook social_account
        await upsertSocialAccount(db, orgId, {
          platform: "facebook",
          programName: pageName,
          displayName: `${pageName} (Messenger)`,
          matchField: "credentials.pageId",
          matchValue: pageId,
          credentials: { pageId, pageName, pageAccessToken: pageToken },
        });
        fbCount++;

        // Linked IG business account → subscribe + save
        const ig = page.instagram_business_account;
        if (ig?.id) {
          const igUserId = String(ig.id);
          const igUsername = ig.username ? String(ig.username) : undefined;

          try {
            await subscribeInstagram(igUserId, pageToken);
            logger.info(`[fbConnectCallback] subscribed IG ${igUsername ?? igUserId}`);
          } catch (igErr: any) {
            logger.error(`[fbConnectCallback] IG subscribe failed for ${igUserId}: ${igErr.message}`);
          }

          await upsertSocialAccount(db, orgId, {
            platform: "instagram",
            programName: pageName,
            displayName: igUsername ? `@${igUsername}` : `IG ${igUserId.slice(-4)}`,
            matchField: "credentials.igUserId",
            matchValue: igUserId,
            credentials: {
              igUserId,
              igUsername,
              pageAccessToken: pageToken,
              linkedFacebookPageId: pageId,
            },
          });
          igCount++;
        }
      }

      clearSocialAccountCache();
      logger.info(`[fbConnectCallback] org=${orgId} saved fb=${fbCount} ig=${igCount}`);
      bounce(res, { fb_connect: "success", fb: String(fbCount), ig: String(igCount) });
    } catch (err: any) {
      logger.error("[fbConnectCallback] token exchange failed", err);
      bounce(res, { fb_connect: "error", reason: (err.message ?? "exchange_failed").slice(0, 120) });
    }
  }
);

// ── Upsert helper ────────────────────────────────────────────────────────────
async function upsertSocialAccount(
  db: Firestore,
  orgId: string,
  opts: {
    platform: "facebook" | "instagram";
    programName: string;
    displayName: string;
    matchField: string;
    matchValue: string;
    credentials: Record<string, any>;
  }
): Promise<void> {
  const existing = await db
    .collection("social_accounts")
    .where("orgId", "==", orgId)
    .where("platform", "==", opts.platform)
    .where(opts.matchField, "==", opts.matchValue)
    .limit(1)
    .get();

  if (!existing.empty) {
    await existing.docs[0].ref.update({
      credentials: opts.credentials,
      isActive: true,
      connectedVia: "oauth",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  await db.collection("social_accounts").add({
    orgId,
    platform: opts.platform,
    programName: opts.programName,
    displayName: opts.displayName,
    credentials: opts.credentials,
    aiSettings: { enabled: true, autoReply: false },
    isActive: true,
    connectedVia: "oauth",
    createdBy: "oauth",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
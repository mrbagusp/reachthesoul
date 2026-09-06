// whatsapp-onboard.ts — Self-service WhatsApp Embedded Signup (Tech Provider)
// ─────────────────────────────────────────────────────────────────────────────
//   waConnectStart     GET → validates plan, redirects to Meta Embedded Signup
//   waConnectCallback  GET → receives ?code, exchanges for business token,
//                            reads WABA + phone number, subscribes webhook,
//                            saves to social_accounts, bounces back to dashboard
//
// Flow (per Meta WhatsApp Embedded Signup docs):
//   auth code → business integration system-user access token
//   → debug_token to read granted WABA id  (OR read from signup return params)
//   → GET /{waba_id}/phone_numbers → phone_number_id + display number
//   → POST /{waba_id}/subscribed_apps  (subscribe our app to this WABA)
//   → register phone (POST /{phone_number_id}/register) if needed
//   → save social_accounts (platform=whatsapp_meta, orgId=client)
//
// NOTE: This reuses the same state-signing + bounce pattern as facebook-oauth.ts
// so behaviour is consistent. Requires META_APP_SECRET secret.

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import * as crypto from "crypto";

if (!getApps().length) initializeApp();

const GRAPH = "https://graph.facebook.com/v21.0";
const META_APP_ID = "1446857313831361"; // Blessing Media Global
const CONFIG_ID = "1595956545299633";   // Embedded Signup configuration
const REGION = "asia-southeast1";

function getAppSecret(): string {
  return process.env.META_APP_SECRET ?? "";
}

function getProjectId(): string {
  return process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "reachthesoul-prod";
}

function getCallbackUrl(): string {
  return `https://${REGION}-${getProjectId()}.cloudfunctions.net/waConnectCallback`;
}

function getDashboardUrl(): string {
  // Where to bounce the client back after connecting.
  return (process.env.OMS_BASE_URL ?? "https://reachthesoul.org") +
    "/dashboard/admin/social-accounts";
}

// ── State signing (carries orgId through the OAuth round-trip) ───────────────
function signState(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getAppSecret() || "dev-secret")
    .update(body)
    .digest("hex");
  return `${body}.${sig}`;
}

function verifyState(state: string): any | null {
  try {
    const [body, sig] = state.split(".");
    if (!body || !sig) return null;
    const expected = crypto
      .createHmac("sha256", getAppSecret() || "dev-secret")
      .update(body)
      .digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

function bounce(res: any, params: Record<string, string>): void {
  const url = new URL(getDashboardUrl());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  res.redirect(302, url.toString());
}

// ── Graph helpers ───────────────────────────────────────────────────────────
async function graphGet(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${GRAPH}/${path}?${qs}`);
  const data = await r.json();
  if (!r.ok || data.error) {
    throw new Error(data.error?.message ?? `graphGet ${path} failed`);
  }
  return data;
}

async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const r = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const data = await r.json();
  if (!r.ok || data.error) {
    throw new Error(data.error?.message ?? `graphPost ${path} failed`);
  }
  return data;
}

// ── Upsert social_accounts (same shape as facebook-oauth.ts) ────────────────
async function upsertWhatsappAccount(
  db: Firestore,
  orgId: string,
  opts: {
    displayName: string;
    programName: string;
    phoneNumberId: string;
    wabaId: string;
    accessToken: string;
    displayPhone: string;
  }
): Promise<void> {
  const existing = await db
    .collection("social_accounts")
    .where("orgId", "==", orgId)
    .where("platform", "==", "whatsapp_meta")
    .where("credentials.phoneNumberId", "==", opts.phoneNumberId)
    .limit(1)
    .get();

  const now = new Date().toISOString();
  const payload = {
    orgId,
    platform: "whatsapp_meta" as const,
    programName: opts.programName,
    displayName: opts.displayName,
    credentials: {
      accessToken: opts.accessToken,
      phoneNumberId: opts.phoneNumberId,
      businessId: opts.wabaId,
      displayPhone: opts.displayPhone,
    },
    isActive: true,
    updatedAt: now,
  };

  if (!existing.empty) {
    await existing.docs[0].ref.set(payload, { merge: true });
  } else {
    await db.collection("social_accounts").add({ ...payload, createdAt: now, createdBy: "embedded_signup" });
  }
}

// ── STEP 1 — Start: validate plan, redirect to Embedded Signup ──────────────
export const waConnectStart = onRequest(
  { region: REGION, cors: true, secrets: ["META_APP_SECRET"] },
  async (req, res) => {
    const orgId = String(req.query.orgId ?? "");
    if (!orgId) { bounce(res, { wa_connect: "error", reason: "missing_org" }); return; }

    // Plan gate — free accounts cannot connect WhatsApp.
    try {
      const db = getFirestore();
      const orgDoc = await db.collection("organizations").doc(orgId).get();
      const plan = orgDoc.data()?.plan ?? "free";
      if (plan === "free") {
        bounce(res, { wa_connect: "upgrade_required" });
        return;
      }
    } catch (e: any) {
      logger.error(`[waConnectStart] plan check failed: ${e.message}`);
      bounce(res, { wa_connect: "error", reason: "plan_check" });
      return;
    }

    const state = signState({ orgId, t: Date.now() });
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", META_APP_ID);
    url.searchParams.set("config_id", CONFIG_ID);
    url.searchParams.set("redirect_uri", getCallbackUrl());
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("override_default_response_type", "true");
    res.redirect(302, url.toString());
  }
);

// ── STEP 2 — Callback: exchange code, read WABA, subscribe, save ─────────────
export const waConnectCallback = onRequest(
  { region: REGION, cors: true, secrets: ["META_APP_SECRET"] },
  async (req, res) => {
    if (req.query.error) {
      logger.warn(`[waConnectCallback] user denied: ${req.query.error_description ?? req.query.error}`);
      bounce(res, { wa_connect: "cancelled" });
      return;
    }

    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    const payload = verifyState(state);
    if (!code || !payload?.orgId) {
      logger.warn("[waConnectCallback] invalid code/state");
      bounce(res, { wa_connect: "error", reason: "invalid_state" });
      return;
    }
    const orgId = payload.orgId as string;

    const appSecret = getAppSecret();
    if (!appSecret) {
      logger.error("[waConnectCallback] META_APP_SECRET not configured");
      bounce(res, { wa_connect: "error", reason: "server_config" });
      return;
    }

    try {
      // auth code → business integration access token
      const tok = await graphGet("oauth/access_token", {
        client_id: META_APP_ID,
        client_secret: appSecret,
        redirect_uri: getCallbackUrl(),
        code,
      });
      const accessToken = tok.access_token as string;

      // Read which WABA was granted, via debug_token
      const dbg = await graphGet("debug_token", {
        input_token: accessToken,
        access_token: `${META_APP_ID}|${appSecret}`,
      });
      // granular_scopes → find whatsapp_business_management → target_ids (WABA ids)
      let wabaId = "";
      const gs: any[] = dbg?.data?.granular_scopes ?? [];
      for (const s of gs) {
        if (String(s.scope).includes("whatsapp_business_management") && s.target_ids?.length) {
          wabaId = String(s.target_ids[0]);
          break;
        }
      }
      if (!wabaId) {
        // fallback: some flows return waba id in the signup params (not code flow)
        logger.error(`[waConnectCallback] org=${orgId} no WABA id in token scopes`);
        bounce(res, { wa_connect: "error", reason: "no_waba" });
        return;
      }

      // Read phone numbers on this WABA
      const phones = await graphGet(`${wabaId}/phone_numbers`, {
        access_token: accessToken,
        fields: "id,display_phone_number,verified_name",
      });
      const first = (phones.data ?? [])[0];
      if (!first?.id) {
        logger.error(`[waConnectCallback] org=${orgId} WABA ${wabaId} has no phone numbers`);
        bounce(res, { wa_connect: "error", reason: "no_phone" });
        return;
      }
      const phoneNumberId = String(first.id);
      const displayPhone = String(first.display_phone_number ?? "");
      const verifiedName = String(first.verified_name ?? "WhatsApp");

      // Subscribe our app to this WABA's webhooks
      try {
        await graphPost(`${wabaId}/subscribed_apps`, { access_token: accessToken });
        logger.info(`[waConnectCallback] subscribed app to WABA ${wabaId}`);
      } catch (subErr: any) {
        logger.error(`[waConnectCallback] subscribe failed for ${wabaId}: ${subErr.message}`);
        // continue — subscription can be retried; account still saved
      }

      // Register the phone number for Cloud API (best-effort; may already be registered)
      try {
        await graphPost(`${phoneNumberId}/register`, {
          messaging_product: "whatsapp",
          pin: "000000",
          access_token: accessToken,
        });
      } catch (regErr: any) {
        logger.info(`[waConnectCallback] register skipped/failed (often already registered): ${regErr.message}`);
      }

      // Save to social_accounts
      const db = getFirestore();
      await upsertWhatsappAccount(db, orgId, {
        displayName: verifiedName,
        programName: verifiedName,
        phoneNumberId,
        wabaId,
        accessToken,
        displayPhone,
      });

      logger.info(`[waConnectCallback] org=${orgId} saved WA phone=${displayPhone} (${phoneNumberId})`);
      bounce(res, { wa_connect: "success", phone: displayPhone });
    } catch (err: any) {
      logger.error("[waConnectCallback] failed", err);
      bounce(res, { wa_connect: "error", reason: (err.message ?? "exchange_failed").slice(0, 120) });
    }
  }
);
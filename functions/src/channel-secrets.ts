/**
 * Channel secrets (Fonnte / Meta tokens) live in org_secrets/{orgId}.channel — server-only.
 * The organization document (readable by every team member) keeps only non-secret
 * settings in channelConfig plus masked hints in channelConfigStatus.
 *
 * Legacy orgs still have tokens inside organizations/{orgId}.channelConfig; they are
 * read as a fallback and moved the next time an admin opens Integrations.
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

const REGION = "asia-southeast1";

export const CHANNEL_SECRET_KEYS = [
  "fonnte_token",
  "meta_access_token",
  "meta_app_secret",
  "whatsapp_access_token",
  "facebook_page_token",
  "facebook_page_access_token",
  "instagram_token",
  "instagram_access_token",
  "webhookSecret",
] as const;
const SECRET_SET = new Set<string>(CHANNEL_SECRET_KEYS);
const PUBLIC_KEYS = new Set(["active_whatsapp_provider", "fonnte_device_number", "meta_phone_number_id"]);

function db() {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

function hint(v: string): string {
  const s = String(v ?? "");
  return s.length > 10 ? `…${s.slice(-4)}` : "…";
}

/** Full channel config for server use: non-secret org fields + secrets (secrets win). */
export async function loadChannelConfig(orgId: string, orgData?: any): Promise<Record<string, any>> {
  const org = orgData ?? (await db().doc(`organizations/${orgId}`).get()).data() ?? {};
  const legacy = org.channelConfig ?? {};
  let secrets: Record<string, any> = {};
  try {
    secrets = (await db().doc(`org_secrets/${orgId}`).get()).data()?.channel ?? {};
  } catch { /* ignore */ }
  const cfg: Record<string, any> = { ...legacy, ...secrets };
  // The Integrations form historically saved these under shorter names
  cfg.facebook_page_access_token = cfg.facebook_page_access_token || cfg.facebook_page_token || undefined;
  cfg.instagram_access_token = cfg.instagram_access_token || cfg.instagram_token || undefined;
  for (const k of Object.keys(cfg)) if (cfg[k] === undefined || cfg[k] === "") delete cfg[k];
  return cfg;
}

async function requireAdmin(uid: string | undefined, orgId: string) {
  if (!uid) throw new HttpsError("unauthenticated", "Please sign in.");
  if (!orgId) throw new HttpsError("invalid-argument", "orgId is required.");
  const user = (await db().doc(`users/${uid}`).get()).data() ?? {};
  if (user.isPlatformAdmin === true) return;
  if (user.orgRoles?.[orgId] !== "admin") throw new HttpsError("permission-denied", "Only organization admins can do this.");
}

/** Move any tokens still sitting on the org document into org_secrets. */
async function migrate(orgId: string): Promise<void> {
  const orgRef = db().doc(`organizations/${orgId}`);
  const org = (await orgRef.get()).data() ?? {};
  const cc = org.channelConfig ?? {};
  const toMove: Record<string, string> = {};
  for (const k of CHANNEL_SECRET_KEYS) if (typeof cc[k] === "string" && cc[k].trim()) toMove[k] = cc[k].trim();
  const leftovers = CHANNEL_SECRET_KEYS.filter((k) => k in cc);
  if (!Object.keys(toMove).length && !leftovers.length) return;

  if (Object.keys(toMove).length) {
    const secretRef = db().doc(`org_secrets/${orgId}`);
    const existing = (await secretRef.get()).data()?.channel ?? {};
    // Don't overwrite a newer secret with an older copy
    const merged = { ...toMove, ...existing };
    await secretRef.set({ channel: merged }, { merge: true });
  }
  const upd: Record<string, any> = {};
  for (const k of leftovers) upd[`channelConfig.${k}`] = admin.firestore.FieldValue.delete();
  for (const [k, v] of Object.entries(toMove)) upd[`channelConfigStatus.${k}`] = hint(v);
  await orgRef.update(upd);
}

/** Integrations page: public settings + which secrets are saved (masked). Migrates legacy tokens. */
export const getChannelSettings = onCall({ region: REGION }, async (req) => {
  const orgId = String(req.data?.orgId ?? "");
  await requireAdmin(req.auth?.uid, orgId);
  await migrate(orgId);
  const org = (await db().doc(`organizations/${orgId}`).get()).data() ?? {};
  const secrets = (await db().doc(`org_secrets/${orgId}`).get()).data()?.channel ?? {};
  const cc = org.channelConfig ?? {};
  const pub: Record<string, string> = {};
  for (const k of PUBLIC_KEYS) pub[k] = cc[k] ?? "";
  const saved: Record<string, string> = {};
  for (const k of CHANNEL_SECRET_KEYS) if (secrets[k]) saved[k] = hint(secrets[k]);
  return { config: pub, saved };
});

/**
 * Save channel settings. For secret keys: a non-empty string replaces the secret,
 * null removes it, empty/undefined keeps the current value.
 */
export const saveChannelSettings = onCall({ region: REGION }, async (req) => {
  const orgId = String(req.data?.orgId ?? "");
  await requireAdmin(req.auth?.uid, orgId);
  const input: Record<string, any> = req.data?.config ?? {};
  await migrate(orgId);

  const secretRef = db().doc(`org_secrets/${orgId}`);
  const orgRef = db().doc(`organizations/${orgId}`);
  const secretUpd: Record<string, any> = {};
  const orgUpd: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  for (const [k, raw] of Object.entries(input)) {
    if (SECRET_SET.has(k)) {
      if (raw === null) {
        secretUpd[`channel.${k}`] = admin.firestore.FieldValue.delete();
        orgUpd[`channelConfigStatus.${k}`] = admin.firestore.FieldValue.delete();
      } else if (typeof raw === "string" && raw.trim()) {
        secretUpd[`channel.${k}`] = raw.trim();
        orgUpd[`channelConfigStatus.${k}`] = hint(raw.trim());
      }
    } else if (PUBLIC_KEYS.has(k)) {
      const v = String(raw ?? "").trim();
      orgUpd[`channelConfig.${k}`] = k === "fonnte_device_number" ? v.replace(/\D/g, "") : v;
    }
  }

  if (Object.keys(secretUpd).length) {
    await secretRef.set({}, { merge: true });
    await secretRef.update(secretUpd);
  }
  await orgRef.update(orgUpd);
  return { ok: true };
});

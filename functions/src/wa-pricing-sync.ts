// wa-pricing-sync.ts — pull Meta's OWN numbers (pricing_analytics) for each
// org's WhatsApp Business Account(s), so the Billing page can show the same
// "approximate charges" the client sees in WhatsApp Manager — including the
// messages Meta doesn't charge for (free customer service / free entry point).
//
// API: GET /{WABA_ID}?fields=pricing_analytics.start(..).end(..).granularity(DAILY)
//        .dimensions(PRICING_TYPE,PRICING_CATEGORY)
// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/analytics/
// Cost values are "approximate charges ... in your WABA's currency".
//
// Stored on organizations/{orgId}:
//   whatsappMetaReport.months.{YYYY-MM} = { volume, freeVolume, paidVolume, cost, currency, mixedCurrency }
//   whatsappMetaReport.lastSyncAt / lastSyncError
//
// Exports:
//   syncWhatsappPricingScheduled — every 6 hours, all orgs with a whatsapp_meta account
//   syncWhatsappPricingNow       — callable "Refresh" button for org members

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";

const GRAPH = "https://graph.facebook.com/v25.0";

function getDb() {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthRange(offset: number): { key: string; start: number; end: number } {
  const now = new Date();
  const startD = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const nextD = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1));
  const end = Math.min(Math.floor(nextD.getTime() / 1000), Math.floor(now.getTime() / 1000));
  return { key: monthKey(startD), start: Math.floor(startD.getTime() / 1000), end };
}

type MonthTotals = { volume: number; freeVolume: number; paidVolume: number; cost: number };

async function graphGet(url: string, token: string): Promise<any> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`${msg}${json?.error?.code ? ` (code ${json.error.code})` : ""}`);
  }
  return json;
}

async function fetchWabaCurrency(wabaId: string, token: string): Promise<string> {
  try {
    const j = await graphGet(`${GRAPH}/${wabaId}?fields=currency`, token);
    return String(j?.currency ?? "USD");
  } catch {
    return "USD";
  }
}

async function fetchMonth(wabaId: string, token: string, start: number, end: number): Promise<MonthTotals> {
  const totals: MonthTotals = { volume: 0, freeVolume: 0, paidVolume: 0, cost: 0 };
  if (end <= start) return totals;
  const field =
    `pricing_analytics.start(${start}).end(${end}).granularity(DAILY)` +
    `.dimensions(PRICING_TYPE,PRICING_CATEGORY)`;
  let url: string | null = `${GRAPH}/${wabaId}?fields=${encodeURIComponent(field)}`;
  let pages = 0;
  while (url && pages < 20) {
    const json = await graphGet(url, token);
    const block = json?.pricing_analytics ?? json;
    for (const d of block?.data ?? []) {
      for (const p of d?.data_points ?? []) {
        const vol = Number(p?.volume ?? 0) || 0;
        const cost = Number(p?.cost ?? 0) || 0;
        totals.volume += vol;
        totals.cost += cost;
        if (String(p?.pricing_type ?? "").startsWith("FREE")) totals.freeVolume += vol;
        else totals.paidVolume += vol;
      }
    }
    url = block?.paging?.next ?? null;
    pages++;
  }
  totals.cost = Math.round(totals.cost * 10000) / 10000;
  return totals;
}

/** Sync current + previous month for one org. Returns a short status string. */
export async function syncOrgWhatsappPricing(orgId: string): Promise<string> {
  const db = getDb();
  const FieldValue = admin.firestore.FieldValue;
  const orgRef = db.collection("organizations").doc(orgId);

  const accSnap = await db.collection("social_accounts")
    .where("orgId", "==", orgId)
    .where("platform", "==", "whatsapp_meta")
    .get();

  // One entry per WABA (several phone numbers can share a WABA)
  const wabas = new Map<string, string>();
  for (const doc of accSnap.docs) {
    const c = doc.data()?.credentials ?? {};
    const wabaId = String(c.businessId ?? c.wabaId ?? "").trim();
    const token = String(c.accessToken ?? "").trim();
    if (wabaId && token && !wabas.has(wabaId)) wabas.set(wabaId, token);
  }
  if (wabas.size === 0) return "no_waba";

  const months = [monthRange(0), monthRange(-1)];
  const update: Record<string, any> = {};
  const errors: string[] = [];

  for (const m of months) {
    const agg: MonthTotals = { volume: 0, freeVolume: 0, paidVolume: 0, cost: 0 };
    const costByCurrency: Record<string, number> = {};
    let ok = 0;
    for (const [wabaId, token] of wabas) {
      try {
        const [t, currency] = await Promise.all([
          fetchMonth(wabaId, token, m.start, m.end),
          fetchWabaCurrency(wabaId, token),
        ]);
        agg.volume += t.volume;
        agg.freeVolume += t.freeVolume;
        agg.paidVolume += t.paidVolume;
        agg.cost += t.cost;
        costByCurrency[currency] = Math.round(((costByCurrency[currency] ?? 0) + t.cost) * 10000) / 10000;
        ok++;
      } catch (err: any) {
        errors.push(`WABA ${wabaId}: ${err?.message ?? err}`);
      }
    }
    if (ok > 0) {
      const currencies = Object.keys(costByCurrency);
      const mixed = currencies.length > 1;
      update[`whatsappMetaReport.months.${m.key}`] = {
        ...agg,
        // Never add up different currencies: when mixed, read costByCurrency instead
        cost: mixed ? 0 : Math.round(agg.cost * 10000) / 10000,
        currency: mixed ? "MIXED" : (currencies[0] ?? "USD"),
        mixedCurrency: mixed,
        costByCurrency,
        wabaCount: ok,
        syncedAt: new Date().toISOString(),
      };
    }
  }

  update["whatsappMetaReport.lastSyncAt"] = FieldValue.serverTimestamp();
  update["whatsappMetaReport.lastSyncError"] = errors.length ? errors.join(" | ").substring(0, 500) : FieldValue.delete();
  await orgRef.update(update);

  if (errors.length) logger.warn(`[wa-pricing-sync] org=${orgId} errors: ${errors.join(" | ")}`);
  return errors.length ? "partial" : "ok";
}

// Every 6 hours: all orgs that have a WhatsApp Cloud API account
export const syncWhatsappPricingScheduled = onSchedule(
  { schedule: "every 6 hours", timeoutSeconds: 540, memory: "256MiB" },
  async () => {
    const snap = await getDb().collection("social_accounts").where("platform", "==", "whatsapp_meta").get();
    const orgIds = [...new Set(snap.docs.map((d) => String(d.data()?.orgId ?? "")).filter(Boolean))];
    logger.info(`[wa-pricing-sync] syncing ${orgIds.length} org(s)`);
    for (const orgId of orgIds) {
      try {
        const status = await syncOrgWhatsappPricing(orgId);
        logger.info(`[wa-pricing-sync] org=${orgId} → ${status}`);
      } catch (err) {
        logger.error(`[wa-pricing-sync] org=${orgId} failed:`, err);
      }
    }
  },
);

// "Refresh from Meta" button on the Billing page
export const syncWhatsappPricingNow = onCall({ timeoutSeconds: 120 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const orgId = String(request.data?.orgId ?? "").trim();
  if (!orgId) throw new HttpsError("invalid-argument", "orgId is required.");

  const db = getDb();
  const userDoc = await db.collection("users").doc(uid).get();
  const user = userDoc.data() ?? {};
  const isMember = !!user.orgRoles && Object.prototype.hasOwnProperty.call(user.orgRoles, orgId);
  if (!isMember && user.isPlatformAdmin !== true) {
    throw new HttpsError("permission-denied", "You are not a member of this organization.");
  }

  // Light rate limit: at most once per 2 minutes per org
  const org = (await db.collection("organizations").doc(orgId).get()).data() ?? {};
  const last = org?.whatsappMetaReport?.lastSyncAt?.toMillis?.() ?? 0;
  if (Date.now() - last < 2 * 60 * 1000) return { status: "recent" };

  const status = await syncOrgWhatsappPricing(orgId);
  return { status };
});

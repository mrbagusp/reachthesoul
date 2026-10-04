// wa-usage.ts — count outbound WhatsApp (Meta Cloud API) messages per org per
// month and per pricing market, and detect Meta payment problems.
//
// Stored on the organization doc (members can already read it):
//   whatsappUsage.{YYYY-MM}.total
//   whatsappUsage.{YYYY-MM}.byMarket.{MARKET}
//   whatsappBilling.{ paymentIssue, lastErrorCode, lastErrorMessage, lastErrorAt, lastSuccessAt }
//
// The dashboard turns counts into a cost ESTIMATE using system_config/whatsapp_rates.
// Meta bills the client directly; these numbers never charge anyone.
//
// ⚠️ Keep MARKET_PREFIXES in sync with lib/whatsapp-pricing.ts

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

function getDb() {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

const MARKET_PREFIXES: Record<string, string> = {
  "62": "ID", "91": "IN", "60": "MY", "65": "SG", "234": "NG", "55": "BR", "52": "MX",
  "1": "NA", "44": "GB", "49": "DE",
  // Rest of Africa
  "20": "AFRICA_OTHER", "27": "AFRICA_OTHER", "211": "AFRICA_OTHER", "212": "AFRICA_OTHER",
  "213": "AFRICA_OTHER", "216": "AFRICA_OTHER", "218": "AFRICA_OTHER", "220": "AFRICA_OTHER",
  "221": "AFRICA_OTHER", "222": "AFRICA_OTHER", "223": "AFRICA_OTHER", "224": "AFRICA_OTHER",
  "225": "AFRICA_OTHER", "226": "AFRICA_OTHER", "227": "AFRICA_OTHER", "228": "AFRICA_OTHER",
  "229": "AFRICA_OTHER", "230": "AFRICA_OTHER", "231": "AFRICA_OTHER", "232": "AFRICA_OTHER",
  "233": "AFRICA_OTHER", "235": "AFRICA_OTHER", "236": "AFRICA_OTHER", "237": "AFRICA_OTHER",
  "238": "AFRICA_OTHER", "239": "AFRICA_OTHER", "240": "AFRICA_OTHER", "241": "AFRICA_OTHER",
  "242": "AFRICA_OTHER", "243": "AFRICA_OTHER", "244": "AFRICA_OTHER", "245": "AFRICA_OTHER",
  "248": "AFRICA_OTHER", "249": "AFRICA_OTHER", "250": "AFRICA_OTHER", "251": "AFRICA_OTHER",
  "252": "AFRICA_OTHER", "253": "AFRICA_OTHER", "254": "AFRICA_OTHER", "255": "AFRICA_OTHER",
  "256": "AFRICA_OTHER", "257": "AFRICA_OTHER", "258": "AFRICA_OTHER", "260": "AFRICA_OTHER",
  "261": "AFRICA_OTHER", "262": "AFRICA_OTHER", "263": "AFRICA_OTHER", "264": "AFRICA_OTHER",
  "265": "AFRICA_OTHER", "266": "AFRICA_OTHER", "267": "AFRICA_OTHER", "268": "AFRICA_OTHER",
  "269": "AFRICA_OTHER",
  // Rest of Asia Pacific
  "63": "APAC_OTHER", "61": "APAC_OTHER", "64": "APAC_OTHER", "66": "APAC_OTHER", "81": "APAC_OTHER",
  "82": "APAC_OTHER", "84": "APAC_OTHER", "86": "APAC_OTHER", "852": "APAC_OTHER", "853": "APAC_OTHER",
  "855": "APAC_OTHER", "856": "APAC_OTHER", "880": "APAC_OTHER", "886": "APAC_OTHER", "92": "APAC_OTHER",
  "93": "APAC_OTHER", "94": "APAC_OTHER", "95": "APAC_OTHER", "977": "APAC_OTHER", "670": "APAC_OTHER",
  "673": "APAC_OTHER", "675": "APAC_OTHER", "679": "APAC_OTHER",
  // Rest of Latin America
  "54": "LATAM_OTHER", "56": "LATAM_OTHER", "57": "LATAM_OTHER", "58": "LATAM_OTHER", "51": "LATAM_OTHER",
  "53": "LATAM_OTHER", "591": "LATAM_OTHER", "593": "LATAM_OTHER", "595": "LATAM_OTHER", "598": "LATAM_OTHER",
  "502": "LATAM_OTHER", "503": "LATAM_OTHER", "504": "LATAM_OTHER", "505": "LATAM_OTHER", "506": "LATAM_OTHER",
  "507": "LATAM_OTHER", "509": "LATAM_OTHER",
  // Rest of Europe
  "30": "EUROPE_OTHER", "31": "EUROPE_OTHER", "32": "EUROPE_OTHER", "33": "EUROPE_OTHER", "34": "EUROPE_OTHER",
  "36": "EUROPE_OTHER", "39": "EUROPE_OTHER", "40": "EUROPE_OTHER", "41": "EUROPE_OTHER", "43": "EUROPE_OTHER",
  "45": "EUROPE_OTHER", "46": "EUROPE_OTHER", "47": "EUROPE_OTHER", "48": "EUROPE_OTHER", "351": "EUROPE_OTHER",
  "353": "EUROPE_OTHER", "358": "EUROPE_OTHER", "380": "EUROPE_OTHER", "420": "EUROPE_OTHER",
};

export function marketForPhone(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  for (let len = 4; len >= 1; len--) {
    const key = MARKET_PREFIXES[digits.slice(0, len)];
    if (key) return key;
  }
  return "OTHER";
}

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Meta error codes that mean "fix billing in WhatsApp Manager".
// 131042 = Business eligibility payment issue.
const PAYMENT_ERROR_CODES = new Set([131042]);

/**
 * Call after every WhatsApp Cloud API send attempt.
 * Never throws — usage tracking must not break message delivery.
 */
export async function recordWhatsappSend(
  orgId: string,
  phone: string,
  httpOk: boolean,
  result: any,
): Promise<void> {
  if (!orgId) return;
  const FieldValue = admin.firestore.FieldValue;
  try {
    const ref = getDb().collection("organizations").doc(orgId);
    const delivered = httpOk && Array.isArray(result?.messages) && result.messages.length > 0;

    if (delivered) {
      const month = monthKey();
      const market = marketForPhone(phone);
      // update() with dotted paths: counters are created on first increment
      await ref.update({
        [`whatsappUsage.${month}.total`]: FieldValue.increment(1),
        [`whatsappUsage.${month}.byMarket.${market}`]: FieldValue.increment(1),
        "whatsappBilling.paymentIssue": false,
        "whatsappBilling.lastSuccessAt": FieldValue.serverTimestamp(),
      });
      return;
    }

    const code = Number(result?.error?.code ?? 0) || null;
    const message = String(result?.error?.error_data?.details ?? result?.error?.message ?? "Unknown error").substring(0, 300);
    const paymentIssue = code !== null && PAYMENT_ERROR_CODES.has(code);
    await ref.update({
      "whatsappBilling.lastErrorCode": code,
      "whatsappBilling.lastErrorMessage": message,
      "whatsappBilling.lastErrorAt": FieldValue.serverTimestamp(),
      ...(paymentIssue ? { "whatsappBilling.paymentIssue": true } : {}),
    });
    if (paymentIssue) logger.warn(`[wa-usage] org=${orgId} WhatsApp payment issue (${code}): ${message}`);
  } catch (err) {
    logger.error("[wa-usage] Failed to record send:", err);
  }
}

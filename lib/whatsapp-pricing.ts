// WhatsApp (Meta) per-message fee estimates.
//
// Since Oct 1, 2026 Meta charges per message for WhatsApp Business Platform
// service messages (replies inside the 24h window). Fees are billed by Meta
// directly to the client's WhatsApp Business Account — ReachTheSoul adds no
// markup. The numbers here are ONLY used to show an estimate in the dashboard.
//
// The live rate table lives in Firestore: system_config/whatsapp_rates
// (editable by platform admins in Dashboard → Platform). DEFAULT_WA_RATES is
// the fallback when that doc doesn't exist yet.
//
// ⚠️ Keep MARKET_PREFIXES in sync with functions/src/wa-usage.ts

export const META_PRICING_URL = "https://business.whatsapp.com/products/platform-pricing";
export const WHATSAPP_MANAGER_URL = "https://business.facebook.com/wa/manage/home/";

export type WaMarket = { label: string; rate: number };
export type WaRateTable = {
  currency: "USD";
  markets: Record<string, WaMarket>;
  source?: string;
  checkedAt?: string; // ISO date the rates were last checked against Meta's rate card
};

// Utility/service message rates (USD per delivered message), Meta rate card
// effective Oct 1, 2026. Regional buckets marked "verify" are best-effort
// defaults — confirm against Meta's CSV rate card and adjust in Platform.
export const DEFAULT_WA_RATES: WaRateTable = {
  currency: "USD",
  source: "Meta rate card effective 2026-10-01",
  checkedAt: "2026-10-04",
  markets: {
    ID: { label: "Indonesia", rate: 0.025 },
    IN: { label: "India", rate: 0.0014 },
    MY: { label: "Malaysia", rate: 0.014 },
    SG: { label: "Singapore", rate: 0.016 },
    NG: { label: "Nigeria", rate: 0.0067 },
    BR: { label: "Brazil", rate: 0.0068 },
    MX: { label: "Mexico", rate: 0.0085 },
    NA: { label: "United States & Canada", rate: 0.0034 },
    GB: { label: "United Kingdom", rate: 0.022 },
    DE: { label: "Germany", rate: 0.055 },
    AFRICA_OTHER: { label: "Rest of Africa (Ghana, Kenya, …)", rate: 0.004 },
    APAC_OTHER: { label: "Rest of Asia Pacific (Philippines, …) — verify", rate: 0.0077 },
    LATAM_OTHER: { label: "Rest of Latin America — verify", rate: 0.0077 },
    EUROPE_OTHER: { label: "Rest of Europe — verify", rate: 0.0077 },
    OTHER: { label: "Other countries", rate: 0.0077 },
  },
};

// Calling-code prefixes → market key. Longest prefix wins.
export const MARKET_PREFIXES: Record<string, string> = {
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

export function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type WaMonthUsage = { total?: number; byMarket?: Record<string, number> };

export function estimateMonth(usage: WaMonthUsage | undefined, rates: WaRateTable) {
  const byMarket = usage?.byMarket ?? {};
  const rows = Object.entries(byMarket)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([key, count]) => {
      const m = rates.markets[key] ?? rates.markets.OTHER ?? { label: key, rate: 0 };
      return { key, label: m.label.replace(/ — verify$/, ""), count, rate: m.rate, cost: count * m.rate };
    })
    .sort((a, b) => b.cost - a.cost);
  const total = usage?.total ?? rows.reduce((s, r) => s + r.count, 0);
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  return { total, cost, rows };
}

export function formatUsd(n: number): string {
  if (n > 0 && n < 0.01) return "< $0.01";
  return `$${n.toFixed(2)}`;
}

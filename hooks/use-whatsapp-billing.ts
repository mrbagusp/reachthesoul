"use client";
import { useEffect, useState } from "react";
import { DEFAULT_WA_RATES, type WaRateTable, type WaMonthUsage } from "@/lib/whatsapp-pricing";

// Meta's own numbers (pricing_analytics), synced by functions/src/wa-pricing-sync.ts
export type MetaMonthReport = {
  volume: number;
  freeVolume: number;
  paidVolume: number;
  cost: number;
  currency: string;        // WABA currency (e.g. "USD", "IDR"), or "MIXED"
  mixedCurrency?: boolean;
  costByCurrency?: Record<string, number>;
  syncedAt?: string;
};

export type WhatsappBillingState = {
  loading: boolean;
  hasWhatsappMeta: boolean;            // org has at least one WhatsApp Cloud API (Meta) account
  usage: Record<string, WaMonthUsage>; // keyed by "YYYY-MM"
  billing: {
    paymentIssue?: boolean;
    paymentConfirmedAt?: any;
    lastErrorCode?: number | null;
    lastErrorMessage?: string;
    lastErrorAt?: any;
    lastSuccessAt?: any;
  };
  budgetUsd: number | null;            // optional monthly alert threshold set by org admin
  metaReport: {
    months: Record<string, MetaMonthReport>;
    lastSyncAt?: any;
    lastSyncError?: string;
  };
  rates: WaRateTable;
};

/**
 * Live WhatsApp fee data for one org:
 *  - organizations/{orgId}.whatsappUsage / whatsappBilling / whatsappBudgetUsd (live)
 *  - system_config/whatsapp_rates (rate table, falls back to DEFAULT_WA_RATES)
 *  - whether the org has a whatsapp_meta social account
 */
export function useWhatsappBilling(orgId: string | undefined): WhatsappBillingState {
  const [state, setState] = useState<WhatsappBillingState>({
    loading: true,
    hasWhatsappMeta: false,
    usage: {},
    billing: {},
    budgetUsd: null,
    metaReport: { months: {} },
    rates: DEFAULT_WA_RATES,
  });

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    let unsubOrg: (() => void) | undefined;

    (async () => {
      const [{ doc, getDoc, onSnapshot, collection, query, where, limit, getDocs }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);

      // Rate table + WA account check (one-time reads)
      const [ratesSnap, waSnap] = await Promise.all([
        getDoc(doc(db, "system_config", "whatsapp_rates")).catch(() => null),
        getDocs(query(
          collection(db, "social_accounts"),
          where("orgId", "==", orgId),
          where("platform", "==", "whatsapp_meta"),
          limit(1),
        )).catch(() => null),
      ]);
      if (cancelled) return;

      const ratesData = ratesSnap?.exists() ? (ratesSnap.data() as Partial<WaRateTable>) : null;
      const rates: WaRateTable = ratesData?.markets
        ? { ...DEFAULT_WA_RATES, ...ratesData, markets: { ...DEFAULT_WA_RATES.markets, ...ratesData.markets } } as WaRateTable
        : DEFAULT_WA_RATES;
      const hasWhatsappMeta = !!waSnap && !waSnap.empty;

      // Live org doc
      unsubOrg = onSnapshot(doc(db, "organizations", orgId), (snap) => {
        if (cancelled) return;
        const d = snap.data() ?? {};
        setState({
          loading: false,
          hasWhatsappMeta,
          usage: (d.whatsappUsage ?? {}) as Record<string, WaMonthUsage>,
          billing: d.whatsappBilling ?? {},
          budgetUsd: typeof d.whatsappBudgetUsd === "number" ? d.whatsappBudgetUsd : null,
          metaReport: {
            months: (d.whatsappMetaReport?.months ?? {}) as Record<string, MetaMonthReport>,
            lastSyncAt: d.whatsappMetaReport?.lastSyncAt,
            lastSyncError: d.whatsappMetaReport?.lastSyncError,
          },
          rates,
        });
      }, () => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, hasWhatsappMeta, rates }));
      });
    })();

    return () => { cancelled = true; unsubOrg?.(); };
  }, [orgId]);

  return state;
}

/** Org-admin actions (Firestore rules: only org admins / platform admins can update the org doc). */
export async function confirmWhatsappPaymentMethod(orgId: string, uid: string) {
  const [{ doc, updateDoc, serverTimestamp }, { db }] = await Promise.all([
    import("firebase/firestore"),
    import("@/lib/firebase"),
  ]);
  await updateDoc(doc(db, "organizations", orgId), {
    "whatsappBilling.paymentConfirmedAt": serverTimestamp(),
    "whatsappBilling.paymentConfirmedBy": uid,
  });
}

export async function setWhatsappBudget(orgId: string, budgetUsd: number | null) {
  const [{ doc, updateDoc, deleteField }, { db }] = await Promise.all([
    import("firebase/firestore"),
    import("@/lib/firebase"),
  ]);
  await updateDoc(doc(db, "organizations", orgId), {
    whatsappBudgetUsd: budgetUsd === null ? deleteField() : budgetUsd,
  });
}

/** Ask the backend to pull fresh numbers from Meta now (rate-limited to once per 2 min per org). */
export async function refreshWhatsappMetaReport(orgId: string): Promise<string> {
  const [{ httpsCallable }, { functions }] = await Promise.all([
    import("firebase/functions"),
    import("@/lib/firebase"),
  ]);
  const fn = httpsCallable<{ orgId: string }, { status: string }>(functions, "syncWhatsappPricingNow");
  const res = await fn({ orgId });
  return res.data?.status ?? "ok";
}

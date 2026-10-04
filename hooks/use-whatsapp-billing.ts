"use client";
import { useEffect, useState } from "react";
import { DEFAULT_WA_RATES, type WaRateTable, type WaMonthUsage } from "@/lib/whatsapp-pricing";

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

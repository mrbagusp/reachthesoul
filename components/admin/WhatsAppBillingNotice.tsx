"use client";
import { useState } from "react";
import { AlertTriangle, CreditCard, ExternalLink, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";
import { useWhatsappBilling, confirmWhatsappPaymentMethod } from "@/hooks/use-whatsapp-billing";
import { WHATSAPP_MANAGER_URL, estimateMonth, monthKey, formatUsd } from "@/lib/whatsapp-pricing";

/**
 * Shows (only when relevant):
 *  1. RED   — Meta rejected a WhatsApp send because of a payment problem
 *  2. AMBER — WhatsApp connected but no payment method confirmed yet ("last step")
 *  3. AMBER — this month's estimated Meta fees passed the org's alert threshold
 */
export function WhatsAppBillingNotice() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = useAuthStore((s) => s.role === "admin");
  const orgId = activeOrg?.orgId;
  const wa = useWhatsappBilling(orgId);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (wa.loading || !orgId) return null;

  const managerLink = (
    <a href={WHATSAPP_MANAGER_URL} target="_blank" rel="noopener noreferrer">
      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 bg-white">
        Open WhatsApp Manager <ExternalLink size={11} />
      </Button>
    </a>
  );

  // 1) Payment problem reported by Meta
  if (wa.billing.paymentIssue) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-red-800 leading-relaxed">
            <p className="font-semibold">WhatsApp replies are not being delivered — Meta reports a payment issue.</p>
            <p className="mt-0.5">
              Add or update the payment method on your WhatsApp Business Account in WhatsApp Manager
              (Billing &amp; payments). Messages from your team and AI will be delivered again once billing is fixed.
              WhatsApp fees are billed by Meta directly — not by ReachTheSoul.
            </p>
            {wa.billing.lastErrorCode ? (
              <p className="mt-1 text-[10px] text-red-700/80">Meta error {wa.billing.lastErrorCode}: {wa.billing.lastErrorMessage}</p>
            ) : null}
          </div>
        </div>
        <div className="pl-6">{managerLink}</div>
      </div>
    );
  }

  // 2) "Last step" after connecting WhatsApp
  const needsPaymentStep =
    wa.hasWhatsappMeta && !wa.billing.paymentConfirmedAt && !wa.billing.lastSuccessAt;
  if (needsPaymentStep && !dismissed) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <CreditCard size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold">Last step: add a payment method in WhatsApp Manager</p>
            <p className="mt-0.5">
              Meta requires a payment method on your WhatsApp Business Account before replies can be sent.
              Since Oct 1, 2026, Meta charges a small fee per WhatsApp message sent — billed by Meta directly to you,
              with no markup from ReachTheSoul. Open WhatsApp Manager → Billing &amp; payments → add a card.
            </p>
          </div>
        </div>
        <div className="pl-6 flex flex-wrap gap-2">
          {managerLink}
          {isAdmin ? (
            <Button
              size="sm"
              className="h-7 text-[11px] gap-1"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await confirmWhatsappPaymentMethod(orgId, currentUser?.uid ?? "");
                } catch {
                  setDismissed(true); // no permission / offline — hide for this session
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              I&apos;ve added a payment method
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  // 3) Budget alert
  if (wa.budgetUsd !== null && wa.budgetUsd > 0) {
    const est = estimateMonth(wa.usage[monthKey()], wa.rates);
    if (est.cost >= wa.budgetUsd) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">WhatsApp fee alert:</span> estimated Meta fees this month are{" "}
            <span className="font-semibold">{formatUsd(est.cost)}</span> ({est.total.toLocaleString()} messages),
            above your alert of {formatUsd(wa.budgetUsd)}. See Billing for details.
          </p>
        </div>
      );
    }
  }

  return null;
}

"use client";
import { useState } from "react";
import { MessageCircle, ExternalLink, Info, BellRing, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";
import { useWhatsappBilling, setWhatsappBudget } from "@/hooks/use-whatsapp-billing";
import {
  META_PRICING_URL, WHATSAPP_MANAGER_URL, estimateMonth, monthKey, formatUsd,
} from "@/lib/whatsapp-pricing";

function prevMonthKey(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return monthKey(d);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, 1)).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Billing page card: explains Meta's per-message fees + live estimate for this org. */
export function WhatsAppFeesCard() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const isAdmin = useAuthStore((s) => s.role === "admin");
  const orgId = activeOrg?.orgId;
  const wa = useWhatsappBilling(orgId);
  const [budgetInput, setBudgetInput] = useState<string>("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetMsg, setBudgetMsg] = useState<string | null>(null);

  const thisMonth = monthKey();
  const cur = estimateMonth(wa.usage[thisMonth], wa.rates);
  const prev = estimateMonth(wa.usage[prevMonthKey()], wa.rates);
  const hasAnyUsage = cur.total > 0 || prev.total > 0;

  const saveBudget = async () => {
    if (!orgId) return;
    const v = budgetInput.trim() === "" ? null : Number(budgetInput);
    if (v !== null && (!isFinite(v) || v < 0)) { setBudgetMsg("Enter a valid amount in USD."); return; }
    setSavingBudget(true);
    setBudgetMsg(null);
    try {
      await setWhatsappBudget(orgId, v);
      setBudgetMsg(v === null ? "Alert removed." : `Alert set at ${formatUsd(v)} / month.`);
      setBudgetInput("");
    } catch {
      setBudgetMsg("Could not save — only organization admins can change this.");
    } finally {
      setSavingBudget(false);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <MessageCircle size={14} className="text-emerald-600" /> WhatsApp message fees (Meta)
      </h3>
      <Card className="shadow-none">
        <CardContent className="p-5 flex flex-col gap-4">
          {/* Explanation */}
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
            <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-blue-900 leading-relaxed">
              <span className="font-semibold">About WhatsApp fees:</span> As of October 1, 2026, Meta charges a small fee for each
              WhatsApp message your team or AI sends. These fees are billed by Meta directly to your WhatsApp Business account —
              ReachTheSoul adds no markup. Rates depend on the recipient&apos;s country{" "}
              (<a href={META_PRICING_URL} target="_blank" rel="noopener noreferrer" className="underline">see Meta&apos;s rates</a>).
              The numbers below are an estimate; your official invoice is in{" "}
              <a href={WHATSAPP_MANAGER_URL} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp Manager</a>.
            </p>
          </div>

          {!wa.hasWhatsappMeta && !hasAnyUsage ? (
            <p className="text-xs text-muted-foreground">
              No WhatsApp Business account connected yet. Once connected, your estimated Meta fees appear here.
            </p>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{monthLabel(thisMonth)} (so far)</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatUsd(cur.cost)}</p>
                  <p className="text-[11px] text-muted-foreground">{cur.total.toLocaleString()} WhatsApp messages sent · estimated</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{monthLabel(prevMonthKey())}</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatUsd(prev.cost)}</p>
                  <p className="text-[11px] text-muted-foreground">{prev.total.toLocaleString()} WhatsApp messages sent · estimated</p>
                </div>
              </div>

              {/* Breakdown by country */}
              {cur.rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left font-semibold py-1.5">Recipient country</th>
                        <th className="text-right font-semibold py-1.5">Messages</th>
                        <th className="text-right font-semibold py-1.5">Rate / msg</th>
                        <th className="text-right font-semibold py-1.5">Estimate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cur.rows.map((r) => (
                        <tr key={r.key} className="border-b border-border/60">
                          <td className="py-1.5">{r.label}</td>
                          <td className="py-1.5 text-right">{r.count.toLocaleString()}</td>
                          <td className="py-1.5 text-right">${r.rate.toFixed(4)}</td>
                          <td className="py-1.5 text-right font-medium">{formatUsd(r.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Budget alert */}
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <BellRing size={12} className="text-amber-500" /> Monthly fee alert
                  <span className="font-normal text-muted-foreground">
                    {wa.budgetUsd ? `— currently ${formatUsd(wa.budgetUsd)} / month` : "— not set"}
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Show a warning on your dashboard when this month&apos;s estimated WhatsApp fees reach this amount.
                </p>
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      placeholder={wa.budgetUsd ? String(wa.budgetUsd) : "e.g. 20"}
                      className="h-8 text-xs w-28"
                      inputMode="decimal"
                    />
                    <Button size="sm" className="h-8 text-xs" onClick={saveBudget} disabled={savingBudget}>
                      {savingBudget ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                    </Button>
                    {wa.budgetUsd ? (
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setBudgetInput(""); setWhatsappBudget(orgId!, null).catch(() => {}); }}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">Only organization admins can change this.</p>
                )}
                {budgetMsg && <p className="text-[10px] text-muted-foreground">{budgetMsg}</p>}
              </div>

              <p className="text-[10px] text-muted-foreground">
                Rates: {wa.rates.source ?? "Meta rate card"}{wa.rates.checkedAt ? `, last checked ${wa.rates.checkedAt}` : ""}.
                Counts include messages sent by your team and by AI through the WhatsApp Business Platform.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

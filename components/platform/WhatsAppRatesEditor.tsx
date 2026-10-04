"use client";
import { useEffect, useState } from "react";
import { Loader2, Save, RotateCcw, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_WA_RATES, META_PRICING_URL, type WaRateTable } from "@/lib/whatsapp-pricing";

/**
 * Platform-admin editor for system_config/whatsapp_rates.
 * These rates only drive the fee ESTIMATE shown to orgs — Meta bills orgs directly.
 */
export function WhatsAppRatesEditor() {
  const [table, setTable] = useState<WaRateTable>(DEFAULT_WA_RATES);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ doc, getDoc }, { db }] = await Promise.all([import("firebase/firestore"), import("@/lib/firebase")]);
      try {
        const snap = await getDoc(doc(db, "system_config", "whatsapp_rates"));
        const data = snap.exists() ? (snap.data() as Partial<WaRateTable>) : null;
        const merged: WaRateTable = data?.markets
          ? { ...DEFAULT_WA_RATES, ...data, markets: { ...DEFAULT_WA_RATES.markets, ...data.markets } } as WaRateTable
          : DEFAULT_WA_RATES;
        setTable(merged);
        setDraft(Object.fromEntries(Object.entries(merged.markets).map(([k, m]) => [k, String(m.rate)])));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (reset = false) => {
    setSaving(true);
    setMsg(null);
    try {
      const markets: WaRateTable["markets"] = {};
      const base = reset ? DEFAULT_WA_RATES.markets : table.markets;
      for (const [k, m] of Object.entries(base)) {
        const v = reset ? m.rate : Number(draft[k]);
        if (!isFinite(v) || v < 0) throw new Error(`Invalid rate for ${m.label}`);
        markets[k] = { label: m.label, rate: v };
      }
      const next: WaRateTable = {
        currency: "USD",
        markets,
        source: reset ? DEFAULT_WA_RATES.source : "Meta rate card (updated by platform admin)",
        checkedAt: new Date().toISOString().slice(0, 10),
      };
      const [{ doc, setDoc, serverTimestamp }, { db }] = await Promise.all([import("firebase/firestore"), import("@/lib/firebase")]);
      await setDoc(doc(db, "system_config", "whatsapp_rates"), { ...next, updatedAt: serverTimestamp() });
      setTable(next);
      setDraft(Object.fromEntries(Object.entries(next.markets).map(([k, m]) => [k, String(m.rate)])));
      setMsg(reset ? "Reset to default rates and saved." : "Rates saved. All organizations now see estimates based on these rates.");
    } catch (e: any) {
      setMsg(e?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading rates…</div>;
  }

  return (
    <div className="space-y-3 max-w-3xl">
      <div>
        <h3 className="text-sm font-semibold text-foreground">WhatsApp fee rates (estimate only)</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          USD per delivered service/utility message, by recipient market. Used only to show organizations an estimate of what Meta
          bills them directly. Check against Meta&apos;s rate card CSV when Meta announces changes{" "}
          <a href={META_PRICING_URL} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
            (Meta pricing <ExternalLink size={10} />)
          </a>.
          {table.checkedAt ? ` Last checked: ${table.checkedAt}.` : ""}
        </p>
      </div>
      <Card className="shadow-none">
        <CardContent className="p-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left font-semibold py-1.5">Market</th>
                <th className="text-left font-semibold py-1.5 w-40">USD / message</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(table.markets).map(([k, m]) => (
                <tr key={k} className="border-b border-border/60">
                  <td className="py-1.5">{m.label} <span className="text-[10px] text-muted-foreground">({k})</span></td>
                  <td className="py-1.5">
                    <Input
                      value={draft[k] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                      className="h-7 text-xs font-mono w-32"
                      inputMode="decimal"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => save(false)} disabled={saving}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save rates
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => save(true)} disabled={saving}>
              <RotateCcw size={12} /> Reset to defaults
            </Button>
          </div>
          {msg && <p className="text-[11px] text-muted-foreground mt-2">{msg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

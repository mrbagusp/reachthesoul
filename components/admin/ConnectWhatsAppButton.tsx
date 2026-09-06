"use client";
import { useState } from "react";
import { MessageCircle, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrgStore } from "@/store/org-store";

// Cloud Function base (same region/project as fbConnect)
const FN_BASE = "https://asia-southeast1-reachthesoul-prod.cloudfunctions.net";

/**
 * ConnectWhatsAppButton — self-service WhatsApp onboarding via Meta Embedded Signup.
 * - plan === "free"  → locked button + upgrade nudge
 * - plan !== "free"  → active; opens waConnectStart (which redirects to Meta signup)
 */
export function ConnectWhatsAppButton() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const orgId = activeOrg?.orgId;
  const plan = (activeOrg as any)?.plan ?? "free";
  const [loading, setLoading] = useState(false);

  const isFree = plan === "free";

  const handleConnect = () => {
    if (!orgId || isFree) return;
    setLoading(true);
    // Redirect to our start function; it validates plan server-side too, then
    // bounces to Meta Embedded Signup, then back to this page with ?wa_connect=...
    window.location.href = `${FN_BASE}/waConnectStart?orgId=${encodeURIComponent(orgId)}`;
  };

  if (isFree) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1.5 text-muted-foreground"
        onClick={() => {
          // Send them to billing/upgrade — adjust path to your upgrade page
          window.location.href = "/dashboard/billing";
        }}
        title="Upgrade your plan to connect WhatsApp"
      >
        <Lock size={12} /> Connect WhatsApp
        <span className="ml-1 text-[10px] font-semibold text-amber-600">Upgrade</span>
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
      onClick={handleConnect}
      disabled={loading || !orgId}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
      Connect WhatsApp
    </Button>
  );
}

/**
 * WhatsAppConnectResult — reads ?wa_connect=... from the URL after the round-trip
 * and shows a small status banner. Mirrors MetaConnectResult.
 */
export function WhatsAppConnectResult({ onSuccess }: { onSuccess?: () => void }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (typeof window !== "undefined" && !msg) {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("wa_connect");
    if (status) {
      let result: { ok: boolean; text: string } | null = null;
      if (status === "success") {
        const phone = params.get("phone") ?? "";
        result = { ok: true, text: `WhatsApp connected ✓ ${phone}` };
        onSuccess?.();
      } else if (status === "upgrade_required") {
        result = { ok: false, text: "Upgrade your plan to connect WhatsApp." };
      } else if (status === "cancelled") {
        result = { ok: false, text: "WhatsApp connection cancelled." };
      } else if (status === "error") {
        result = { ok: false, text: `WhatsApp connection failed: ${params.get("reason") ?? "unknown"}` };
      }
      if (result) {
        setMsg(result);
        // Clean the URL so the banner doesn't persist on refresh
        params.delete("wa_connect");
        params.delete("phone");
        params.delete("reason");
        const clean = window.location.pathname + (params.toString() ? `?${params}` : "");
        window.history.replaceState({}, "", clean);
      }
    }
  }

  if (!msg) return null;
  return (
    <div className={`text-xs rounded-md px-3 py-2 border ${msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600"}`}>
      {msg.text}
    </div>
  );
}
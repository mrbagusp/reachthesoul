"use client";
import { useState } from "react";
import { FileText, Download, Loader2, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";
import { getPlanConfig } from "@/lib/plans";
import type { PlanTier } from "@/types";
import { AGREEMENT_VERSION, PROVIDER, buildAgreementPdf } from "@/lib/service-agreement";

/**
 * Billing page card: org admin fills in the legal details, accepts, and downloads
 * a basic bilingual Service Agreement PDF. Acceptance is recorded on the org doc.
 */
export function ServiceAgreementCard() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = useAuthStore((s) => s.role === "admin");

  const plan = (activeOrg?.plan ?? "free") as PlanTier;
  const planCfg = getPlanConfig(plan);
  const last = (activeOrg as any)?.serviceAgreement as
    | { agreementId?: string; signatoryName?: string; acceptedAtIso?: string; planName?: string }
    | undefined;

  const [orgLegalName, setOrgLegalName] = useState<string>(activeOrg?.name ?? "");
  const [orgAddress, setOrgAddress] = useState("");
  const [signatoryName, setSignatoryName] = useState<string>(currentUser?.displayName ?? "");
  const [signatoryTitle, setSignatoryTitle] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = !!activeOrg && orgLegalName.trim() && signatoryName.trim() && signatoryTitle.trim() && agree && !busy;

  const generate = async () => {
    if (!activeOrg || !canSubmit) return;
    setBusy(true);
    setMsg(null);
    try {
      const acceptedAt = new Date();
      const { pdf, id, filename } = await buildAgreementPdf({
        orgId: activeOrg.orgId,
        orgLegalName: orgLegalName.trim(),
        orgAddress: orgAddress.trim(),
        signatoryName: signatoryName.trim(),
        signatoryTitle: signatoryTitle.trim(),
        signatoryEmail: currentUser?.email ?? "",
        planName: planCfg.name,
        planPriceUsd: planCfg.price,
        acceptedAt,
      });

      // Record acceptance (who / when / what) — best effort, download still happens
      try {
        const [{ doc, updateDoc, arrayUnion, serverTimestamp }, { db }] = await Promise.all([
          import("firebase/firestore"),
          import("@/lib/firebase"),
        ]);
        const record = {
          agreementId: id,
          version: AGREEMENT_VERSION,
          orgLegalName: orgLegalName.trim(),
          orgAddress: orgAddress.trim(),
          signatoryName: signatoryName.trim(),
          signatoryTitle: signatoryTitle.trim(),
          signatoryEmail: currentUser?.email ?? "",
          acceptedByUid: currentUser?.uid ?? "",
          planName: planCfg.name,
          planPriceUsd: planCfg.price,
          acceptedAtIso: acceptedAt.toISOString(),
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : "",
        };
        await updateDoc(doc(db, "organizations", activeOrg.orgId), {
          serviceAgreement: { ...record, recordedAt: serverTimestamp() },
          serviceAgreementHistory: arrayUnion(record),
        });
      } catch {
        /* non-admins can't write the org doc; the PDF is still generated */
      }

      pdf.save(filename);
      setMsg(`Downloaded ${filename}`);
    } catch (e: any) {
      setMsg(`Could not generate the PDF: ${e?.message ?? "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <FileText size={14} className="text-primary" /> Service Agreement
      </h3>
      <Card className="shadow-none">
        <CardContent className="p-5 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Download a basic service agreement (English &amp; Bahasa Indonesia) between your organization and {PROVIDER.name} for
            your finance or audit records. It covers the service, fees (including third-party fees such as Meta&apos;s WhatsApp
            charges), data ownership, and both parties&apos; rights and obligations. Official payment invoices are issued by Paddle.
          </p>

          {last?.agreementId && (
            <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              Last accepted: {last.agreementId} by {last.signatoryName}
              {last.acceptedAtIso ? ` on ${new Date(last.acceptedAtIso).toLocaleDateString()}` : ""} ({last.planName} plan).
            </p>
          )}

          {isAdmin ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Organization legal name *</span>
                  <Input value={orgLegalName} onChange={(e) => setOrgLegalName(e.target.value)} className="h-8 text-xs" placeholder="e.g. Yayasan Gereja Kasih" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Organization address</span>
                  <Input value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} className="h-8 text-xs" placeholder="Street, city, country" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Signatory name *</span>
                  <Input value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} className="h-8 text-xs" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Signatory title / position *</span>
                  <Input value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} className="h-8 text-xs" placeholder="e.g. Senior Pastor, Finance Director" />
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Plan: <span className="font-semibold text-foreground">{planCfg.name}</span>
                {planCfg.price ? ` — USD ${planCfg.price}/month` : " — free"}
              </p>
              <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
                <span>
                  I am authorized to act on behalf of this organization, and I have read and agree to the Service Agreement,
                  the <a href="/terms" target="_blank" className="underline">Terms of Service</a> and the{" "}
                  <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>.
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={generate} disabled={!canSubmit}>
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Accept &amp; download PDF
                </Button>
                <a href={`mailto:${PROVIDER.email}?subject=${encodeURIComponent("Service agreement request — " + (activeOrg?.name ?? ""))}`}>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                    <Mail size={12} /> Need changes? Contact us
                  </Button>
                </a>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Your acceptance (name, title, account email, date and time) is recorded with your organization.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">Only organization admins can accept and download the service agreement.</p>
          )}
          {msg && <p className="text-[11px] text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

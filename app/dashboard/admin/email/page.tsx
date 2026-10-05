"use client";
import { useCallback, useEffect, useState } from "react";
import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Mail, Copy, Check, Loader2, Send, ArrowRight, ShieldCheck, Clock, KeyRound, ExternalLink,
  Plus, Lock, Info, Filter, Power,
} from "lucide-react";

type Inbox = {
  id: string;
  inboxAddress: string;
  publicAddress: string;
  fromName: string;
  programName: string;
  isActive: boolean;
  status: {
    forwardingVerifiedAt: string | null;
    lastReceivedAt: string | null;
    testSentAt: string | null;
    verification: { provider: string; code: string; link: string; receivedAt: string } | null;
    lastSkipped: { reason: string; from: string; subject: string; at: string } | null;
  };
};

async function call<T = any>(name: string, data: Record<string, any>): Promise<T> {
  const [{ httpsCallable }, { functions }] = await Promise.all([import("firebase/functions"), import("@/lib/firebase")]);
  const res = await httpsCallable(functions, name)(data);
  return res.data as T;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!ms) return "";
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : new Date(ms).toLocaleDateString();
}

function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 bg-gray-900 text-green-400 font-mono text-xs rounded-lg px-3 py-2">
      <span className="truncate flex-1">{value}</span>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="text-gray-300 hover:text-white flex items-center gap-1 text-[10px] font-sans"
      >
        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  );
}

const PROVIDERS = ["Gmail", "Google Workspace", "Outlook.com", "Microsoft 365", "Website form", "Other / Hosting"] as const;
type Provider = (typeof PROVIDERS)[number];

function ForwardingSteps({ provider, inbox }: { provider: Provider; inbox: string }) {
  const Code = ({ children }: { children: React.ReactNode }) => (
    <code className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono break-all">{children}</code>
  );
  const steps: Record<Provider, React.ReactNode[]> = {
    "Gmail": [
      <>Open Gmail → click the ⚙️ gear → <b>See all settings</b>.</>,
      <>Go to the <b>Forwarding and POP/IMAP</b> tab → <b>Add a forwarding address</b>.</>,
      <>Paste <Code>{inbox}</Code> → <b>Next</b> → <b>Proceed</b>.</>,
      <>Gmail sends a confirmation code to ReachTheSoul — <b>it will appear on this page within a minute</b>. Enter it in Gmail (or click the confirmation link shown here).</>,
      <>Back in Gmail, choose <b>Forward a copy of incoming mail to</b> {inbox} and <b>keep Gmail&apos;s copy in the Inbox</b> → <b>Save Changes</b>.</>,
    ],
    "Google Workspace": [
      <>Follow the <b>Gmail</b> steps from the mailbox you want to forward (e.g. prayer@yourchurch.org).</>,
      <>If you don&apos;t see the forwarding option, your Google Workspace admin must allow it once: <b>Admin console → Apps → Google Workspace → Gmail → End User Access → Automatic forwarding → On</b>.</>,
      <>The Gmail confirmation code will appear on this page — enter it in Gmail to finish.</>,
    ],
    "Outlook.com": [
      <>Open Outlook.com → ⚙️ <b>Settings</b> → <b>Mail</b> → <b>Forwarding</b>.</>,
      <>Turn on <b>Enable forwarding</b> and paste <Code>{inbox}</Code>.</>,
      <>Tick <b>Keep a copy of forwarded messages</b> → <b>Save</b>. No confirmation code needed.</>,
    ],
    "Microsoft 365": [
      <>In Outlook on the web: ⚙️ <b>Settings</b> → <b>Mail</b> → <b>Forwarding</b> → enable and paste <Code>{inbox}</Code> → keep a copy → <b>Save</b>.</>,
      <>Microsoft 365 often <b>blocks forwarding to outside addresses by default</b>. Your IT admin can allow it once in <b>Microsoft Defender → Email &amp; collaboration → Policies → Anti-spam → Outbound spam policy → Automatic forwarding rules → On</b> (for this mailbox or the whole organization).</>,
      <>Use <b>Send test email</b> below to confirm it works.</>,
    ],
    "Website form": [
      <>Most website contact or counseling forms (WordPress, Wix, Squarespace…) send each submission to your church email. Once that email is forwarded here, <b>every form submission becomes a ticket automatically</b> — nothing to change on your website.</>,
      <>Prefer a direct route? In your form settings, add <Code>{inbox}</Code> as a notification recipient.</>,
      <>ReachTheSoul uses the person&apos;s email from the form (the Reply-To) so your replies go to them, not to your website.</>,
    ],
    "Other / Hosting": [
      <>In your email hosting panel (cPanel, Plesk, Zoho, your domain host…), find <b>Forwarders</b> or <b>Email forwarding</b>.</>,
      <>Add a forwarder from your church address to <Code>{inbox}</Code>. Keep delivering to the original mailbox if you can.</>,
      <>Use <b>Send test email</b> below to confirm it works.</>,
    ],
  };
  return (
    <ol className="list-decimal pl-5 space-y-1.5 text-xs text-foreground leading-relaxed">
      {steps[provider].map((s, i) => <li key={i}>{s}</li>)}
    </ol>
  );
}

function InboxCard({ inbox, orgId, isAdmin, onChange }: { inbox: Inbox; orgId: string; isAdmin: boolean; onChange: () => void }) {
  const [provider, setProvider] = useState<Provider>("Gmail");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ publicAddress: inbox.publicAddress, fromName: inbox.fromName, programName: inbox.programName });
  const verified = !!inbox.status.forwardingVerifiedAt || !!inbox.status.lastReceivedAt;

  const act = async (key: string, fn: () => Promise<any>, ok?: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); if (ok) setMsg(ok); onChange(); }
    catch (e: any) { setMsg(e?.message ?? "Something went wrong."); }
    finally { setBusy(null); }
  };

  return (
    <Card className={cn("shadow-none", !inbox.isActive && "opacity-60")}>
      <CardHeader className="py-3 px-5 border-b border-border">
        <CardTitle className="text-xs font-semibold flex flex-wrap items-center gap-2">
          <Mail size={14} className="text-cyan-600" />
          <span>{inbox.publicAddress || "Your church email"}</span>
          <ArrowRight size={12} className="text-muted-foreground" />
          <span className="font-mono text-[11px] text-muted-foreground">{inbox.inboxAddress}</span>
          <span className={cn(
            "ml-auto text-[10px] font-semibold rounded-full px-2 py-0.5 border flex items-center gap-1",
            !inbox.isActive ? "bg-gray-50 border-gray-200 text-gray-500" :
            verified ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700",
          )}>
            {!inbox.isActive ? <><Power size={10} /> Paused</> : verified ? <><ShieldCheck size={10} /> Receiving email</> : <><Clock size={10} /> Waiting for first email</>}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 flex flex-col gap-5">
        {/* Gmail confirmation code captured by the webhook */}
        {inbox.status.verification && (
          <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4 flex flex-col gap-2">
            <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5"><KeyRound size={14} /> Gmail sent your forwarding confirmation</p>
            {inbox.status.verification.code && (
              <p className="text-xs text-blue-900">Confirmation code: <span className="font-mono text-base font-bold tracking-wider">{inbox.status.verification.code}</span></p>
            )}
            <p className="text-[11px] text-blue-800">Enter this code in Gmail&apos;s forwarding settings, or click the link to confirm. Then select <b>Forward a copy of incoming mail</b> and save.</p>
            <div className="flex flex-wrap gap-2">
              {inbox.status.verification.link && (
                <a href={inbox.status.verification.link} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="h-7 text-[11px] gap-1">Open confirmation link <ExternalLink size={11} /></Button>
                </a>
              )}
              {isAdmin && (
                <Button size="sm" variant="outline" className="h-7 text-[11px] bg-white" disabled={busy === "clear"}
                  onClick={() => act("clear", () => call("updateEmailInbox", { orgId, id: inbox.id, clearVerification: true }))}>
                  Done
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 1 — address */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">1 · Your ReachTheSoul inbox address</p>
          <CopyBox value={inbox.inboxAddress} />
          <p className="text-[11px] text-muted-foreground">Emails sent or forwarded to this address become tickets in your dashboard.</p>
        </div>

        {/* Step 2 — forwarding guide */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">2 · Forward your church email here</p>
          <div className="flex flex-wrap gap-1.5">
            {PROVIDERS.map((p) => (
              <button key={p} type="button" onClick={() => setProvider(p)}
                className={cn("text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                  provider === p ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-muted-foreground hover:text-foreground")}>
                {p}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <ForwardingSteps provider={provider} inbox={inbox.inboxAddress} />
          </div>
        </div>

        {/* Step 3 — test */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">3 · Test it</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="h-8 text-xs gap-1.5" disabled={!isAdmin || !inbox.publicAddress || busy === "test"}
              onClick={() => act("test", () => call("sendEmailForwardingTest", { orgId, id: inbox.id }),
                `Test email sent to ${inbox.publicAddress}. If forwarding is on, it will arrive here in about a minute.`)}>
              {busy === "test" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send test email
            </Button>
            {inbox.status.forwardingVerifiedAt && (
              <span className="text-[11px] text-emerald-700 flex items-center gap-1"><ShieldCheck size={12} /> Forwarding verified {timeAgo(inbox.status.forwardingVerifiedAt)}</span>
            )}
            {!inbox.status.forwardingVerifiedAt && inbox.status.testSentAt && (
              <span className="text-[11px] text-amber-700 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Waiting for the test email… (sent {timeAgo(inbox.status.testSentAt)})</span>
            )}
          </div>
          {!inbox.publicAddress && <p className="text-[11px] text-muted-foreground">Add your church email address in Settings below to use the automatic test — or simply send any email to {inbox.inboxAddress} from your phone.</p>}
          {inbox.status.lastReceivedAt && <p className="text-[11px] text-muted-foreground">Last email received {timeAgo(inbox.status.lastReceivedAt)}.</p>}
          {inbox.status.lastSkipped && (
            <p className="text-[11px] text-muted-foreground flex items-start gap-1">
              <Filter size={11} className="mt-0.5 flex-shrink-0" />
              Filtered out (not a ticket): &quot;{inbox.status.lastSkipped.subject}&quot; from {inbox.status.lastSkipped.from} — {inbox.status.lastSkipped.reason.replace(/-/g, " ")}. Newsletters, auto-replies and bounces are ignored automatically.
            </p>
          )}
          {msg && <p className="text-[11px] text-muted-foreground">{msg}</p>}
        </div>

        {/* Settings */}
        <div className="border-t border-border pt-4 flex flex-col gap-3">
          {!edit ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
              <span>Replies sent as: <b className="text-foreground">{inbox.fromName || "—"} via ReachTheSoul</b></span>
              <span>Program: <b className="text-foreground">{inbox.programName || "—"}</b></span>
              {isAdmin && (
                <span className="flex gap-2 ml-auto">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEdit(true)}>Settings</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" disabled={busy === "toggle"}
                    onClick={() => act("toggle", () => call("updateEmailInbox", { orgId, id: inbox.id, isActive: !inbox.isActive }))}>
                    {inbox.isActive ? "Pause" : "Resume"}
                  </Button>
                </span>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Church email address</span>
                <Input className="h-8 text-xs" value={form.publicAddress} onChange={(e) => setForm({ ...form, publicAddress: e.target.value })} placeholder="prayer@yourchurch.org" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Sender name on replies</span>
                <Input className="h-8 text-xs" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Program (ticket tag)</span>
                <Input className="h-8 text-xs" value={form.programName} onChange={(e) => setForm({ ...form, programName: e.target.value })} placeholder="e.g. Prayer Ministry" />
              </label>
              <div className="md:col-span-3 flex gap-2">
                <Button size="sm" className="h-8 text-xs" disabled={busy === "save"}
                  onClick={() => act("save", () => call("updateEmailInbox", { orgId, id: inbox.id, ...form }).then(() => setEdit(false)), "Saved.")}>
                  {busy === "save" ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEdit(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmailInboxPage() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const isAdmin = useAuthStore((s) => s.role === "admin" || !!s.currentUser?.isPlatformAdmin);
  const orgId = activeOrg?.orgId ?? "";
  const isFree = (activeOrg?.plan ?? "free") === "free";

  const [inboxes, setInboxes] = useState<Inbox[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ publicAddress: "", fromName: "", programName: "" });

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await call<{ inboxes: Inbox[] }>("listEmailInboxes", { orgId });
      setInboxes(res.inboxes ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load inboxes.");
      setInboxes((v) => v ?? []);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setForm((f) => ({ ...f, fromName: f.fromName || activeOrg?.name || "" })); }, [activeOrg?.name]);

  // Poll while something is pending (no email yet / test sent / confirmation shown)
  const pending = (inboxes ?? []).some((i) => i.isActive && (!i.status.lastReceivedAt || (i.status.testSentAt && !i.status.forwardingVerifiedAt) || i.status.verification));
  useEffect(() => {
    if (!pending) return;
    const t = window.setInterval(() => { if (!document.hidden) load(); }, 5000);
    return () => window.clearInterval(t);
  }, [pending, load]);

  const create = async () => {
    setCreating(true); setError(null);
    try {
      await call("createEmailInbox", { orgId, ...form });
      setShowCreate(false);
      setForm({ publicAddress: "", fromName: activeOrg?.name ?? "", programName: "" });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Could not create inbox.");
    } finally {
      setCreating(false);
    }
  };

  const createForm = (
    <Card className="shadow-none border-2 border-primary/20">
      <CardContent className="p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Church email people already write to</span>
            <Input className="h-8 text-xs" value={form.publicAddress} onChange={(e) => setForm({ ...form, publicAddress: e.target.value })} placeholder="prayer@yourchurch.org" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Sender name on replies</span>
            <Input className="h-8 text-xs" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="Grace Church" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Program (optional)</span>
            <Input className="h-8 text-xs" value={form.programName} onChange={(e) => setForm({ ...form, programName: e.target.value })} placeholder="e.g. Counseling" />
          </label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={create} disabled={creating || !isAdmin}>
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Create my ReachTheSoul inbox
          </Button>
          {(inboxes?.length ?? 0) > 0 && <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowCreate(false)}>Cancel</Button>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-base font-semibold text-foreground">Email Inbox</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Receive emails — including your website&apos;s contact and counseling forms — as tickets, next to WhatsApp, Instagram, Facebook and chat.
          Works with any email provider. No developer needed: just set up forwarding.
        </p>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex gap-2">
        <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <ul className="text-[11px] text-blue-900 space-y-1">
          <li>• Your team replies from the ticket; the person receives it from <b>&quot;{activeOrg?.name || "Your church"} via ReachTheSoul&quot;</b>. Their answer comes back into the same ticket.</li>
          <li>• Newsletters, auto-replies and bounces are filtered out automatically. Attachments (up to 10 MB) are kept.</li>
          <li>• AI auto-reply for email is <b>off</b> by default — turn it on in AI Settings → Email if you want it.</li>
        </ul>
      </div>

      {isFree ? (
        <Card className="shadow-none">
          <CardContent className="p-6 flex flex-col items-start gap-3">
            <p className="text-sm font-semibold flex items-center gap-2"><Lock size={14} /> Email inbox is available on paid plans</p>
            <p className="text-xs text-muted-foreground">Upgrade to Starter or higher to receive and reply to email from your dashboard.</p>
            <a href="/dashboard/billing"><Button size="sm" className="h-8 text-xs">See plans</Button></a>
          </CardContent>
        </Card>
      ) : inboxes === null ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading…</div>
      ) : inboxes.length === 0 ? (
        <>
          <p className="text-xs font-semibold text-foreground">Create your inbox to get started</p>
          {createForm}
        </>
      ) : (
        <>
          {inboxes.map((i) => <InboxCard key={i.id} inbox={i} orgId={orgId} isAdmin={isAdmin} onChange={load} />)}
          {showCreate ? createForm : isAdmin && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 w-fit" onClick={() => setShowCreate(true)}>
              <Plus size={12} /> Add another address (e.g. counseling@)
            </Button>
          )}
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

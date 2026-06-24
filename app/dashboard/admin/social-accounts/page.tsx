"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Pencil, CheckCircle2, XCircle, Wifi, WifiOff,
  MessageCircle, Instagram, Facebook, Phone, Mail, Globe, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrgStore } from "@/store/org-store";
import {
  fetchSocialAccounts,
  addSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
} from "@/lib/firestore-services";
import { useAuthStore } from "@/store/auth-store";
import type { SocialPlatform } from "@/types";
import { cn } from "@/lib/utils";

type SocialAccountRow = {
  id: string;
  platform: SocialPlatform;
  programName: string;
  displayName: string;
  credentials: Record<string, any>;
  isActive: boolean;
  createdAt?: any;
};

const PLATFORM_OPTIONS: { value: SocialPlatform; label: string; icon: React.ReactNode }[] = [
  { value: "whatsapp_fonnte", label: "WhatsApp (Fonnte)",      icon: <MessageCircle size={14} className="text-emerald-600" /> },
  { value: "whatsapp_meta",   label: "WhatsApp (Meta Cloud)",  icon: <MessageCircle size={14} className="text-emerald-600" /> },
  { value: "facebook",        label: "Facebook Messenger",     icon: <Facebook size={14} className="text-blue-600" /> },
  { value: "instagram",       label: "Instagram DM",           icon: <Instagram size={14} className="text-pink-600" /> },
  { value: "email",           label: "Email",                  icon: <Mail size={14} className="text-cyan-600" /> },
  { value: "call",            label: "Phone / Call",           icon: <Phone size={14} className="text-amber-600" /> },
];

const CREDENTIAL_FIELDS: Record<SocialPlatform, { key: string; label: string; type?: string }[]> = {
  whatsapp_fonnte: [
    { key: "token",        label: "Fonnte API Token" },
    { key: "deviceNumber", label: "Device Phone Number (e.g. 628xxx)" },
  ],
  whatsapp_meta: [
    { key: "accessToken",    label: "Access Token" },
    { key: "phoneNumberId",  label: "Phone Number ID" },
    { key: "businessId",     label: "Business Account ID (optional)" },
  ],
  facebook: [
    { key: "pageAccessToken", label: "Page Access Token" },
    { key: "pageId",          label: "Page ID" },
  ],
  instagram: [
    { key: "pageAccessToken", label: "Page Access Token (same as FB)" },
    { key: "igUserId",        label: "Instagram Business Account ID" },
  ],
  email: [
    { key: "smtpHost", label: "SMTP Host" },
    { key: "smtpPort", label: "SMTP Port" },
    { key: "smtpUser", label: "Username" },
    { key: "smtpPass", label: "Password", type: "password" },
  ],
  call: [
    { key: "provider", label: "Provider (twilio/voip/manual)" },
    { key: "apiKey",   label: "API Key (if applicable)" },
  ],
};

const getPlatformIcon = (platform: SocialPlatform) => {
  const opt = PLATFORM_OPTIONS.find((p) => p.value === platform);
  return opt?.icon ?? <Globe size={14} />;
};

const getPlatformLabel = (platform: SocialPlatform) => {
  const opt = PLATFORM_OPTIONS.find((p) => p.value === platform);
  return opt?.label ?? platform;
};

export default function SocialAccountsPage() {
  const orgId = useOrgStore((s) => s.activeOrg?.orgId);
  const user = useAuthStore((s) => s.user);

  const [accounts, setAccounts] = useState<SocialAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [platform, setPlatform] = useState<SocialPlatform>("whatsapp_fonnte");
  const [programName, setProgramName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  const loadAccounts = useCallback(async () => {
    console.log("loadAccounts called, orgId:", orgId);
    if (!orgId) { console.log("orgId is null/empty, skipping"); return; }
    setLoading(true);
    try {
      const data = await fetchSocialAccounts(orgId);
      setAccounts(data as SocialAccountRow[]);
    } catch (err) {
      console.error("Failed to load social accounts:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const resetForm = () => {
    setPlatform("whatsapp_fonnte");
    setProgramName("");
    setDisplayName("");
    setCredentials({});
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (acc: SocialAccountRow) => {
    setPlatform(acc.platform);
    setProgramName(acc.programName);
    setDisplayName(acc.displayName);
    setCredentials(acc.credentials as Record<string, string>);
    setEditingId(acc.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!orgId || !user) return;
    setSaving(true);
    try {
      const payload = { platform, programName, displayName, credentials };
      if (editingId) {
        await updateSocialAccount(editingId, payload);
      } else {
        await addSocialAccount(orgId, payload, user.uid);
      }
      resetForm();
      await loadAccounts();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this social account? This won't delete existing tickets.")) return;
    try {
      await deleteSocialAccount(id);
      await loadAccounts();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleToggleActive = async (acc: SocialAccountRow) => {
    try {
      await updateSocialAccount(acc.id, { isActive: !acc.isActive });
      await loadAccounts();
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  const handleTestConnection = async (acc: SocialAccountRow) => {
    setTestingId(acc.id);
    setTestResult(null);
    try {
      let ok = false;
      let msg = "Unknown error";

      if (acc.platform === "whatsapp_fonnte") {
        const token = acc.credentials?.token ?? "";
        if (!token) { setTestResult({ id: acc.id, ok: false, msg: "No token configured" }); return; }
        const resp = await fetch("https://api.fonnte.com/device", {
          method: "POST",
          headers: { "Authorization": token },
        });
        const data = await resp.json();
        ok = data.status === true;
        msg = ok ? `Connected ✓ (${data.device ?? "ok"})` : `Failed: ${data.reason ?? JSON.stringify(data)}`;
      } else if (acc.platform === "facebook" || acc.platform === "instagram") {
        const pageToken = acc.credentials?.pageAccessToken ?? "";
        if (!pageToken) { setTestResult({ id: acc.id, ok: false, msg: "No page access token" }); return; }
        const resp = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${pageToken}`);
        const data = await resp.json();
        ok = !!data.id;
        msg = ok ? `Connected ✓ — ${data.name ?? data.id}` : `Failed: ${data.error?.message ?? "Invalid token"}`;
      } else if (acc.platform === "whatsapp_meta") {
        const waToken = acc.credentials?.accessToken ?? "";
        const waPhoneId = acc.credentials?.phoneNumberId ?? "";
        if (!waToken || !waPhoneId) { setTestResult({ id: acc.id, ok: false, msg: "Missing access token or phone number ID" }); return; }
        const resp = await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}?access_token=${waToken}`);
        const data = await resp.json();
        ok = !!data.id;
        msg = ok ? `Connected ✓ — ${data.display_phone_number ?? data.id}` : `Failed: ${data.error?.message ?? "Invalid credentials"}`;
      } else {
        msg = "Test not available for this platform";
      }

      setTestResult({ id: acc.id, ok, msg });
    } catch (err: any) {
      setTestResult({ id: acc.id, ok: false, msg: `Error: ${err.message}` });
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading social accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Social Accounts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect your WhatsApp, Facebook, Instagram accounts. Each account can have a unique program name for ticket tagging.
          </p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={12} /> Add Account
        </Button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <Card className="border border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{editingId ? "Edit Account" : "New Social Account"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Platform</label>
                <Select value={platform} onValueChange={(v) => { setPlatform(v as SocialPlatform); setCredentials({}); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">{opt.icon}{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Program Name</label>
                <Input placeholder="e.g. Solusi, Superyouth" value={programName} onChange={(e) => setProgramName(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
                <Input placeholder="e.g. WA Solusi, FB Main Page" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            {/* Dynamic credential fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(CREDENTIAL_FIELDS[platform] ?? []).map((field) => (
                <div key={field.key}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label}</label>
                  <Input
                    type={field.type ?? "text"}
                    placeholder={field.label}
                    value={credentials[field.key] ?? ""}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving || !programName.trim() || !displayName.trim()}>
                {saving ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                {editingId ? "Update" : "Create"}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts list */}
      {accounts.length === 0 && !showForm ? (
        <Card className="border border-dashed border-muted-foreground/30">
          <CardContent className="py-12 text-center">
            <Globe size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No social accounts configured yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click "Add Account" to connect your first channel.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((acc) => (
            <Card key={acc.id} className={cn("border shadow-none transition-colors", acc.isActive ? "border-border" : "border-dashed border-muted-foreground/20 opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5">{getPlatformIcon(acc.platform)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{acc.displayName}</span>
                        <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                          {acc.programName}
                        </span>
                        {acc.isActive ? (
                          <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><CheckCircle2 size={9} />Active</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><XCircle size={9} />Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{getPlatformLabel(acc.platform)}</p>
                      {/* Test result */}
                      {testResult && testResult.id === acc.id && (
                        <p className={cn("text-xs mt-1.5 flex items-center gap-1", testResult.ok ? "text-emerald-600" : "text-red-500")}>
                          {testResult.ok ? <Wifi size={10} /> : <WifiOff size={10} />}
                          {testResult.msg}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="outline" size="sm" className="h-7 text-xs gap-1 px-2"
                      onClick={() => handleTestConnection(acc)}
                      disabled={testingId === acc.id}
                    >
                      {testingId === acc.id ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
                      Test
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => openEdit(acc)}>
                      <Pencil size={10} /> Edit
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className={cn("h-7 text-xs px-2", acc.isActive ? "text-amber-600" : "text-emerald-600")}
                      onClick={() => handleToggleActive(acc)}
                    >
                      {acc.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2 text-destructive" onClick={() => handleDelete(acc.id)}>
                      <Trash2 size={10} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrgStore } from "@/store/org-store";
import { cn } from "@/lib/utils";

type TemplateRow = {
  name: string;
  status: string;      // PENDING | APPROVED | REJECTED | ...
  category: string;
  language: string;
};

const CATEGORY_OPTIONS = [
  { value: "UTILITY",        label: "Utility (notifikasi, update, reminder)" },
  { value: "MARKETING",      label: "Marketing (promosi, pengumuman)" },
  { value: "AUTHENTICATION", label: "Authentication (kode OTP)" },
];

const LANGUAGE_OPTIONS = [
  { value: "id",    label: "Indonesian (id)" },
  { value: "en",    label: "English (en)" },
  { value: "en_US", label: "English US (en_US)" },
];

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toUpperCase();
  if (s === "APPROVED") {
    return <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><CheckCircle2 size={9} />Approved</span>;
  }
  if (s === "REJECTED") {
    return <span className="text-[10px] text-red-500 flex items-center gap-0.5"><XCircle size={9} />Rejected</span>;
  }
  return <span className="text-[10px] text-amber-600 flex items-center gap-0.5"><Clock size={9} />{s || "Pending"}</span>;
}

export default function WhatsappTemplatesPage() {
  const orgId = useOrgStore((s) => s.activeOrg?.orgId);

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("UTILITY");
  const [language, setLanguage] = useState("id");
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/whatsapp/templates?orgId=${orgId}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Failed to load");
      setTemplates(data.templates ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const resetForm = () => {
    setName("");
    setCategory("UTILITY");
    setLanguage("id");
    setBodyText("");
    setFooterText("");
    setShowForm(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, name, category, language, bodyText, footerText }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Failed to create template");
      resetForm();
      await loadTemplates();
    } catch (err: any) {
      setError(err.message ?? "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">WhatsApp Message Templates</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create reusable message templates and submit them to Meta for approval. Templates are required for business-initiated messages outside the 24-hour window.
          </p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={12} /> Create Template
        </Button>
      </div>

      {error && (
        <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <Card className="border border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Message Template</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Template Name</label>
                <Input
                  placeholder="e.g. reminder_konseling"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground/60 mt-1">lowercase &amp; underscore only</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Language</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Body Text</label>
              <textarea
                placeholder="Contoh: Halo, ini pengingat dari tim kami. Semoga harimu diberkati."
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Use {"{{1}}"}, {"{{2}}"} for variables (optional). Meta reviews within 1–2 days.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Footer Text (optional)</label>
              <Input
                placeholder="e.g. ReachTheSoul"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm" className="h-8 text-xs"
                onClick={handleSave}
                disabled={saving || !name.trim() || !bodyText.trim()}
              >
                {saving ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                Submit for Approval
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates list */}
      {templates.length === 0 && !showForm ? (
        <Card className="border border-dashed border-muted-foreground/30">
          <CardContent className="py-12 text-center">
            <MessageSquare size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No templates yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click "Create Template" to submit your first one to Meta.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((tpl) => (
            <Card key={tpl.name} className="border shadow-none">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare size={14} className="text-emerald-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-foreground truncate">{tpl.name}</span>
                        <StatusBadge status={tpl.status} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {tpl.category} · {tpl.language}
                      </p>
                    </div>
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
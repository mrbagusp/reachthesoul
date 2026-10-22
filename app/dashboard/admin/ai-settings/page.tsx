"use client";
import { useState, useEffect } from "react";
import {
  Bot, Save, RotateCcw, Plus, Trash2, Shield, Zap, Key, Eye, EyeOff,
  HandHeart, HeartHandshake, Droplets, AlertTriangle, UserCog, Sparkles,
  ChevronDown, ChevronUp, TestTube2, CheckCircle, XCircle, Loader2, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { useOrgStore } from "@/store/org-store";
import { FeatureGate, SetupRequestGate } from "@/components/feature-gate/FeatureGate";
import { cn } from "@/lib/utils";
import type { EscalationReason } from "@/types";
import Link from "next/link";
import { callFn, aiTestCall, errMsg, type AiStatus } from "@/lib/ai-client";
import { buildPrompt, EMPTY_PROFILE, type PromptProfile } from "@/lib/ai-prompt";
import { matchTriggers, parseCrisisJson, alertsWithoutAi, triggerMode, CRISIS_THRESHOLD } from "@/lib/escalation";

// ── Types ──
interface AISettings {
  provider: "openai" | "anthropic" | "";
  apiKey: string;
  model: string;
  enabled: boolean;
  autoReply: boolean;
  systemPrompt: string;
  escalationTriggers: {
    reason: string;
    label: string;
    keywords: string[];
    enabled: boolean;
  }[];
  escalationReplyMessage: string;
  channelToggles: Record<string, boolean>;
  aiContextualDetection: boolean;
  promptProfile?: PromptProfile;
  promptMode?: "guided" | "custom";
}

const DEFAULT_SYSTEM_PROMPT = `You are a compassionate Christian ministry counselor for ReachTheSoul ministry platform.

Your role:
- Respond with empathy, grace, and biblical wisdom
- Pray with respondents when appropriate
- Share relevant scripture verses
- Detect when someone needs human counselor intervention
- Always respond in the same language the respondent uses (Indonesian/English)
- Keep responses concise but warm (2-4 paragraphs max)
- Never give medical, legal, or financial advice — refer to professionals

Important: If someone expresses suicidal thoughts, severe crisis, or needs immediate help, immediately flag for human escalation and provide words of comfort.`;

const DEFAULT_SETTINGS: AISettings = {
  provider: "",
  apiKey: "",
  model: "",
  enabled: false,
  autoReply: false,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  escalationTriggers: [
    { reason: "prayer_request", label: "Prayer Request", keywords: ["pray", "prayer", "doa", "doakan", "berdoa", "mohon doa"], enabled: true },
    { reason: "counseling", label: "Counseling / Emotional", keywords: ["depresi", "depression", "anxiety", "stress", "sedih", "putus asa", "hopeless", "lonely", "kesepian", "takut", "trauma"], enabled: true },
    { reason: "salvation_inquiry", label: "Wants to Know Jesus", keywords: ["jesus", "yesus", "salvation", "keselamatan", "percaya", "believe", "kristen", "christian", "baptis"], enabled: true },
    { reason: "grief_or_crisis", label: "Grief / Crisis", keywords: ["meninggal", "died", "death", "bunuh diri", "suicide", "crisis", "darurat", "emergency", "kecelakaan", "sakit parah"], enabled: true },
    { reason: "baptism_request", label: "Baptism Request", keywords: ["baptis", "baptism", "dibaptis", "pembaptisan"], enabled: true },
    { reason: "manual_escalation", label: "Manual Escalation", keywords: ["talk to human", "talk to human", "agent", "counselor", "counselor"], enabled: true },
  ],
  escalationReplyMessage: "Thank you for reaching out. I'm connecting you with a team member who can assist you personally. They'll be with you shortly! 🙏",
  aiContextualDetection: false,
  channelToggles: {
    WhatsApp: true,
    Instagram: true,
    Facebook: true,
    Website: true,
    Email: false,
    Call: false,
  },
};

const OPENAI_MODELS = [
  { id: "gpt-4o-mini", name: "GPT-4o Mini — Fast & cheap ($0.15/1M tokens)" },
  { id: "gpt-4o", name: "GPT-4o — Best quality ($2.50/1M tokens)" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini — Latest mini model" },
  { id: "gpt-4.1", name: "GPT-4.1 — Latest flagship model" },
];

const ANTHROPIC_MODELS = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4 — Best balance ($3/1M tokens)" },
  { id: "claude-haiku-4-20250414", name: "Claude Haiku 4 — Fast & cheap ($0.25/1M tokens)" },
];

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  prayer_request: <HandHeart size={14} />,
  counseling: <HeartHandshake size={14} />,
  salvation_inquiry: <Sparkles size={14} />,
  grief_or_crisis: <AlertTriangle size={14} />,
  baptism_request: <Droplets size={14} />,
  manual_escalation: <UserCog size={14} />,
};

function AISettingsContent() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const orgId = activeOrg?.orgId ?? "";
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [emergencyContacts, setEmergencyContacts] = useState<{name: string; phone: string; role: string; email?: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [expandedTrigger, setExpandedTrigger] = useState<string | null>("prayer_request");
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({});

  // AI engine (built-in RTS AI vs church's own key) — loaded from the server, never includes a key
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [byokOpen, setByokOpen] = useState(false);
  const [byokProvider, setByokProvider] = useState<"openai" | "anthropic">("openai");
  const [byokModel, setByokModel] = useState("gpt-4o-mini");
  const [byokKey, setByokKey] = useState("");
  const [byokSaving, setByokSaving] = useState(false);

  // AI Response Prompt
  const [profile, setProfile] = useState<PromptProfile>(EMPTY_PROFILE);
  const [promptMode, setPromptMode] = useState<"guided" | "custom">("guided");
  const setP = (k: keyof PromptProfile, v: string) => setProfile((p) => ({ ...p, [k]: v }));
  const composedPrompt = promptMode === "guided" ? buildPrompt(profile) : settings.systemPrompt;

  const refreshAiStatus = async () => {
    if (!orgId) return;
    try {
      setAiStatus(await callFn<AiStatus>("getAiStatus", { orgId }));
      setEngineError(null);
    } catch (e) {
      setEngineError(errMsg(e));
    }
  };

  // Test panel
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testEscalation, setTestEscalation] = useState<{
    method: "keyword" | "ai_contextual" | "handoff" | "tag" | null;
    trigger: string | null;
    analysis: string | null;
    confidence: number | null;
  } | null>(null);

  // Load settings from organization document
  useEffect(() => {
    if (!orgId) return;
    async function load() {
      try {
        const [{ doc, getDoc }, { db }] = await Promise.all([
          import("firebase/firestore"),
          import("@/lib/firebase"),
        ]);
        const snap = await getDoc(doc(db, "organizations", orgId));
        if (snap.exists()) {
          const data = snap.data()?.aiConfig;
          if (data) {
            const hasProfile = !!data.promptProfile;
            setProfile({ ...EMPTY_PROFILE, churchName: activeOrg?.name ?? "", ...(data.promptProfile ?? {}) });
            // Existing churches with a hand-written prompt start in "Full prompt" mode so nothing is lost
            setPromptMode(data.promptMode ?? (hasProfile ? "guided" : (data.systemPrompt && data.systemPrompt !== DEFAULT_SYSTEM_PROMPT ? "custom" : "guided")));
            if (data.apiKey) {
              // Move a legacy key off the org document (readable by the whole team) into server-only storage
              try { await callFn("migrateAiKey", { orgId }); } catch { /* admins only; ignore */ }
            }
            setSettings({
              ...DEFAULT_SETTINGS,
              ...data,
              escalationTriggers: data.escalationTriggers?.length ? data.escalationTriggers : DEFAULT_SETTINGS.escalationTriggers,
              channelToggles: {
                ...DEFAULT_SETTINGS.channelToggles,
                ...(data.channelToggles ?? {}),
              },
            });
          }
          else {
            setProfile({ ...EMPTY_PROFILE, churchName: activeOrg?.name ?? "" });
          }
          // Load emergency contacts
          const ec = snap.data()?.emergencyContacts;
          if (ec && Array.isArray(ec)) {
            setEmergencyContacts(ec);
          }
        }
      } catch (err) {
        console.error("Failed to load AI settings:", err);
      }
      await refreshAiStatus();
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Save settings to organization document
  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const [{ doc, updateDoc, serverTimestamp }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);
      const finalPrompt = promptMode === "guided" ? buildPrompt(profile) : settings.systemPrompt;
      // Dotted fields: keeps server-managed values (engine, key hint) intact; the API key is never written here
      await updateDoc(doc(db, "organizations", orgId), {
        "aiConfig.enabled": settings.enabled,
        "aiConfig.autoReply": settings.autoReply,
        "aiConfig.systemPrompt": finalPrompt,
        "aiConfig.promptProfile": profile,
        "aiConfig.promptMode": promptMode,
        "aiConfig.escalationTriggers": settings.escalationTriggers,
        "aiConfig.escalationReplyMessage": settings.escalationReplyMessage,
        "aiConfig.channelToggles": settings.channelToggles,
        "aiConfig.aiContextualDetection": settings.aiContextualDetection,
        "aiConfig.updatedAt": new Date().toISOString(),
        "aiConfig.updatedBy": currentUser?.uid ?? "unknown",
        emergencyContacts: emergencyContacts.filter((c) => c.phone.trim() || (c.email ?? "").trim()),
        updatedAt: serverTimestamp(),
      });
      setSettings((s) => ({ ...s, systemPrompt: finalPrompt }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save AI settings:", err);
    }
    setSaving(false);
  };

  // Test AI
  const handleTest = async () => {
    if (!testInput.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);
    setTestEscalation(null);
    try {
      // Same rules as the server (lib/escalation.ts): prayer/salvation/baptism only tag,
      // crisis/counseling words get a semantic AI check, "talk to a human" hands over.
      const matches = matchTriggers(testInput, settings.escalationTriggers);
      const check = matches.filter((m) => m.mode === "check");
      const handoff = matches.find((m) => m.mode === "handoff");
      const tags = matches.filter((m) => m.mode === "tag");
      let crisisFound = false;
      let semanticRan = false;

      if (check.length || settings.aiContextualDetection) {
        try {
          const raw = await aiTestCall(orgId, [{ role: "user", content: `Latest message from respondent:\n"${testInput}"` }], { mode: "crisis" });
          const parsed = parseCrisisJson(raw);
          if (parsed) {
            semanticRan = true;
            if (parsed.needsEscalation && parsed.confidence >= CRISIS_THRESHOLD) {
              crisisFound = true;
              setTestEscalation({ method: "ai_contextual", trigger: parsed.label ?? "AI-confirmed crisis", analysis: parsed.analysis ?? null, confidence: parsed.confidence });
            }
          }
        } catch { /* ignore detection errors in the test panel */ }
      }
      if (!crisisFound && !semanticRan && check.some((m) => alertsWithoutAi(m.reason))) {
        crisisFound = true;
        setTestEscalation({ method: "keyword", trigger: check[0].label, analysis: "AI check unavailable, so crisis words alert on their own (safety fallback).", confidence: null });
      }
      if (!crisisFound && handoff) {
        setTestEscalation({ method: "handoff", trigger: handoff.label, analysis: "Handed to a person. No urgent alert.", confidence: null });
      } else if (!crisisFound && (tags.length || check.length)) {
        setTestEscalation({ method: "tag", trigger: [...tags, ...check].map((m) => m.label).join(", "), analysis: "Tagged for follow-up. The AI keeps replying and no urgent alert is sent.", confidence: null });
      }
      // Crisis and hand-over get the escalation reply instead of an AI answer (same as live)
      if (crisisFound || handoff) {
        setTestResult(settings.escalationReplyMessage || DEFAULT_SETTINGS.escalationReplyMessage);
        setTestLoading(false);
        return;
      }

      // Step 3: Get AI reply using the prompt currently on screen (even if not saved yet)
      const reply = await aiTestCall(orgId, [{ role: "user", content: testInput }], { systemPrompt: composedPrompt });
      setTestResult(reply || "No response");
    } catch (err: any) {
      setTestError(errMsg(err));
    }
    setTestLoading(false);
  };

  // Helpers
  const toggleTrigger = (reason: string) => {
    setSettings((s) => ({
      ...s,
      escalationTriggers: s.escalationTriggers.map((t) =>
        t.reason === reason ? { ...t, enabled: !t.enabled } : t
      ),
    }));
  };

  const addKeyword = (reason: string) => {
    const kw = (newKeyword[reason] ?? "").trim();
    if (!kw) return;
    setSettings((s) => ({
      ...s,
      escalationTriggers: s.escalationTriggers.map((t) =>
        t.reason === reason ? { ...t, keywords: [...t.keywords, kw] } : t
      ),
    }));
    setNewKeyword((prev) => ({ ...prev, [reason]: "" }));
  };

  const removeKeyword = (reason: string, kw: string) => {
    setSettings((s) => ({
      ...s,
      escalationTriggers: s.escalationTriggers.map((t) =>
        t.reason === reason ? { ...t, keywords: t.keywords.filter((k) => k !== kw) } : t
      ),
    }));
  };

  const toggleChannel = (channel: string) => {
    setSettings((s) => ({
      ...s,
      channelToggles: { ...s.channelToggles, [channel]: !s.channelToggles[channel] },
    }));
  };

  const byokModels = byokProvider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
  const aiAvailable = !!aiStatus && aiStatus.engine !== "none" && (aiStatus.engine === "byok" || aiStatus.builtInAvailable);

  const handleSaveKey = async () => {
    setByokSaving(true);
    setEngineError(null);
    try {
      await callFn("saveAiKey", { orgId, provider: byokProvider, model: byokModel, apiKey: byokKey });
      setByokKey("");
      setByokOpen(false);
      await refreshAiStatus();
    } catch (e) {
      setEngineError(errMsg(e));
    }
    setByokSaving(false);
  };
  const handleRemoveKey = async () => {
    if (!window.confirm("Remove your own API key and switch back to ReachTheSoul AI?")) return;
    try {
      await callFn("removeAiKey", { orgId });
      await refreshAiStatus();
    } catch (e) {
      setEngineError(errMsg(e));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading AI settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Bot size={16} className="text-blue-600" />
            AI Settings
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Choose how the AI answers, what it teaches, and when it hands over to your team.</p>
        </div>
        <Button onClick={handleSave} size="sm" className="gap-1.5 h-8 text-xs" disabled={saving}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* ── AI Engine ── */}
      <Card className="border border-border shadow-none">
        <CardHeader className="py-3 px-4 border-b border-border">
          <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Bot size={12} className="text-primary" />AI Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex flex-col gap-4">
          {!aiStatus && !engineError && (
            <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 size={12} className="animate-spin" />Checking AI status…</p>
          )}
          {engineError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <XCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{engineError}</p>
            </div>
          )}

          {aiStatus && aiStatus.engine === "byok" && aiStatus.byok && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div>
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5"><Key size={13} />Using your own {aiStatus.byok.provider === "anthropic" ? "Anthropic" : "OpenAI"} key</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Model {aiStatus.byok.model || "—"} · key {aiStatus.byok.keyHint || "saved"} · usage is billed by your provider and is not limited by your plan.
                  The key is stored on our server only and is never shown in the browser.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setByokProvider(aiStatus.byok!.provider === "anthropic" ? "anthropic" : "openai"); setByokModel(aiStatus.byok!.model || "gpt-4o-mini"); setByokOpen(true); }}>Replace key</Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-red-600" onClick={handleRemoveKey}>Remove</Button>
              </div>
            </div>
          )}

          {aiStatus && aiStatus.engine === "builtin" && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 flex items-center gap-1.5"><Sparkles size={13} />ReachTheSoul AI is included in your plan</p>
              <p className="text-xs text-blue-800 mt-0.5">
                Model: {aiStatus.builtInModel} · No API key needed.
                {!aiStatus.builtInAvailable && " (Not active yet: our team is finishing setup.)"}
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-blue-900 mb-1">
                  <span>AI sessions this month</span>
                  <span className="font-semibold">{aiStatus.used} / {aiStatus.limit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-blue-100 overflow-hidden">
                  <div className={cn("h-full", aiStatus.used >= aiStatus.limit ? "bg-red-500" : aiStatus.used >= aiStatus.limit * 0.8 ? "bg-amber-500" : "bg-blue-600")}
                    style={{ width: `${Math.min(100, aiStatus.limit ? (aiStatus.used / aiStatus.limit) * 100 : 0)}%` }} />
                </div>
                <p className="text-[10px] text-blue-800/80 mt-1.5 leading-relaxed">
                  1 session = one conversation answered by AI within 24 hours (up to {aiStatus.maxRepliesPerSession} AI replies, then a person takes over).
                  Resets on the 1st of each month. When the limit is reached the AI pauses and your team replies as usual.
                </p>
              </div>
            </div>
          )}

          {aiStatus && aiStatus.engine === "none" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-800">The AI first response is available on Starter and above. Starter includes 300 AI sessions a month.</p>
              <Button asChild size="sm" className="h-8 text-xs flex-shrink-0"><Link href="/dashboard/billing">See plans</Link></Button>
            </div>
          )}

          {/* Bring your own key */}
          {aiStatus && (
            <div className="border-t border-border pt-3">
              {aiStatus.byokAllowed ? (
                <>
                  {aiStatus.engine !== "byok" && !byokOpen && (
                    <button className="text-xs text-primary font-medium" onClick={() => setByokOpen(true)}>Use your own OpenAI or Anthropic key instead</button>
                  )}
                  {byokOpen && (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Provider</label>
                          <Select value={byokProvider} onValueChange={(v) => { setByokProvider(v as any); setByokModel(v === "anthropic" ? ANTHROPIC_MODELS[0].id : "gpt-4o-mini"); }}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="anthropic">Anthropic</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Model</label>
                          <Select value={byokModel} onValueChange={setByokModel}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {byokModels.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">API key</label>
                        <div className="relative">
                          <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input type={showApiKey ? "text" : "password"} value={byokKey} onChange={(e) => setByokKey(e.target.value)}
                            placeholder={byokProvider === "openai" ? "sk-proj-..." : "sk-ant-..."} className="h-9 text-sm pl-8 pr-10 font-mono" autoComplete="off" />
                          <button type="button" onClick={() => setShowApiKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">We test the key, then store it on our server only. It is never shown again in the browser, and your provider bills its usage directly.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8 text-xs" onClick={handleSaveKey} disabled={!byokKey.trim() || byokSaving}>
                          {byokSaving ? <Loader2 size={12} className="animate-spin mr-1" /> : null}Test & save key
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setByokOpen(false); setByokKey(""); }}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Need to use your own OpenAI or Anthropic key? It&apos;s available on Enterprise or on request. <a href="mailto:hello@reachthesoul.org" className="text-primary">Contact us</a>.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Master toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "AI Enabled", desc: "Master toggle for all AI features",
            value: settings.enabled,
            onToggle: () => setSettings((s) => ({ ...s, enabled: !s.enabled })),
            color: "blue", disabled: !aiAvailable && !settings.enabled,
          },
          {
            label: "Auto Reply", desc: "AI replies automatically without human review",
            value: settings.autoReply && settings.enabled,
            onToggle: () => setSettings((s) => ({ ...s, autoReply: !s.autoReply })),
            color: "violet", disabled: !settings.enabled,
          },
          {
            label: "Escalation Detection", desc: "Tag, hand over, or alert on sensitive messages",
            value: settings.escalationTriggers.some((t) => t.enabled),
            onToggle: () => {}, color: "orange", readOnly: true,
          },
          {
            label: "AI Crisis Detection", desc: "AI reads every message for crisis, even without keywords",
            value: settings.aiContextualDetection && settings.enabled,
            onToggle: () => setSettings((s) => ({ ...s, aiContextualDetection: !s.aiContextualDetection })),
            color: "red", disabled: !settings.enabled || !aiAvailable,
          },
        ].map((item) => (
          <Card key={item.label} className="border border-border shadow-none">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
              <button
                disabled={item.disabled || item.readOnly}
                onClick={item.onToggle}
                className={cn(
                  "relative w-10 h-5 rounded-full transition-colors flex-shrink-0",
                  item.value ? "bg-blue-600" : "bg-muted",
                  (item.disabled || item.readOnly) && "opacity-40 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  item.value ? "translate-x-5" : "translate-x-0.5"
                )} />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── AI Response Prompt ── */}
      <Card className="border border-border shadow-none">
        <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Zap size={12} className="text-primary" />AI Response Prompt
          </CardTitle>
          <div className="flex rounded-md border border-border overflow-hidden text-[11px]">
            <button className={cn("px-3 py-1", promptMode === "guided" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}
              onClick={() => { if (promptMode === "custom" && !window.confirm("Switch to guided mode? The full prompt will be rebuilt from the fields below.")) return; setPromptMode("guided"); }}>Guided</button>
            <button className={cn("px-3 py-1", promptMode === "custom" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}
              onClick={() => { if (promptMode === "guided") setSettings((s) => ({ ...s, systemPrompt: buildPrompt(profile) })); setPromptMode("custom"); }}>Full prompt</button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {promptMode === "guided" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PromptField label="Church / ministry name" value={profile.churchName} onChange={(v) => setP("churchName", v)} placeholder="Grace Community Church" />
              <PromptField label="Assistant name (optional)" value={profile.assistantName} onChange={(v) => setP("assistantName", v)} placeholder="Grace Care Team" />
              <PromptField label="Tradition / denomination" value={profile.denomination} onChange={(v) => setP("denomination", v)} placeholder="e.g. Evangelical, Baptist, Pentecostal, Reformed, Catholic" />
              <PromptField label="Bible translation" value={profile.bibleTranslation} onChange={(v) => setP("bibleTranslation", v)} placeholder="e.g. NIV, ESV, NKJV, TB (Terjemahan Baru)" />
              <div className="md:col-span-2">
                <PromptField multiline label="Beliefs & doctrine (statement of faith)" value={profile.beliefs} onChange={(v) => setP("beliefs", v)}
                  placeholder="Paste your statement of faith or the key teachings the AI must follow." rows={4} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Tone</label>
                <Select value={profile.tone} onValueChange={(v) => setP("tone", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warm">Warm & pastoral</SelectItem>
                    <SelectItem value="formal">Respectful & formal</SelectItem>
                    <SelectItem value="casual">Friendly & conversational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Reply length</label>
                <Select value={profile.length} onValueChange={(v) => setP("length", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (2–4 sentences)</SelectItem>
                    <SelectItem value="medium">Medium (up to 3 short paragraphs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <PromptField label="Language" value={profile.languages} onChange={(v) => setP("languages", v)} placeholder="Reply in the same language the person writes in." />
              </div>
              <PromptField multiline label="How to respond to prayer requests" value={profile.prayerApproach} onChange={(v) => setP("prayerApproach", v)} rows={4} />
              <PromptField multiline label="Boundaries — topics to hand to a pastor" value={profile.boundaries} onChange={(v) => setP("boundaries", v)} rows={4} />
              <PromptField multiline label="Church info (services, location, contact)" value={profile.serviceInfo} onChange={(v) => setP("serviceInfo", v)}
                placeholder="Sunday services 9am & 11am, 123 Main St. Office: (555) 123-4567" rows={3} />
              <PromptField multiline label="Next steps to invite people to" value={profile.nextSteps} onChange={(v) => setP("nextSteps", v)}
                placeholder="Small groups: https://… · Book a counseling call: https://… · Plan a visit: https://…" rows={3} />
              <div className="md:col-span-2">
                <PromptField multiline label="Additional instructions (optional)" value={profile.extra} onChange={(v) => setP("extra", v)} rows={2} />
              </div>
              <details className="md:col-span-2">
                <summary className="text-[11px] text-muted-foreground cursor-pointer">Preview the prompt the AI receives</summary>
                <pre className="mt-2 text-[11px] whitespace-pre-wrap bg-muted/40 border border-border rounded-md p-3 max-h-72 overflow-auto">{composedPrompt}</pre>
              </details>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                The complete instructions the AI receives. Edit freely: persona, doctrine, tone, boundaries and SOP.
              </p>
              <Textarea
                value={settings.systemPrompt}
                onChange={(e) => setSettings((s) => ({ ...s, systemPrompt: e.target.value }))}
                className="text-xs min-h-[260px] font-mono leading-relaxed"
              />
              <button
                onClick={() => setSettings((s) => ({ ...s, systemPrompt: DEFAULT_SYSTEM_PROMPT }))}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-2 transition-colors"
              >
                <RotateCcw size={9} />Reset to default
              </button>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-3">
            Safety rules are always added on top: the AI says it is an AI if asked, avoids medical/legal/financial advice, and points people in danger to emergency help.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Channel toggles */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Shield size={12} className="text-primary" />AI Active Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-2">
              <p className="text-[10px] text-muted-foreground mb-1">Select which channels AI auto-replies on.</p>
              {Object.entries(settings.channelToggles).map(([channel, active]) => (
                <div key={channel} className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0">
                  <span className="text-sm text-foreground">{channel}</span>
                  <button
                    disabled={!settings.enabled}
                    onClick={() => toggleChannel(channel)}
                    className={cn(
                      "relative w-9 h-5 rounded-full transition-colors",
                      active && settings.enabled ? "bg-blue-600" : "bg-muted",
                      !settings.enabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                      active && settings.enabled ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Escalation triggers */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Shield size={12} className="text-orange-600" />Escalation Triggers
              </CardTitle>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                Prayer, salvation and baptism words tag the conversation for follow-up while the AI keeps replying.
                Crisis and counseling words are checked by the AI for meaning. Your team is alerted only when someone may be in danger now.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {settings.escalationTriggers.map((trigger) => {
                const isExpanded = expandedTrigger === trigger.reason;
                return (
                  <div key={trigger.reason} className="border-b border-border last:border-0">
                    <div
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left cursor-pointer"
                      onClick={() => setExpandedTrigger(isExpanded ? null : trigger.reason)}
                    >
                      <span className="text-muted-foreground">{TRIGGER_ICONS[trigger.reason] ?? <Shield size={14} />}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{trigger.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {trigger.keywords.length} keywords · {triggerMode(trigger.reason) === "tag" ? "Tag for follow-up" : triggerMode(trigger.reason) === "check" ? "AI checks meaning, alerts if crisis" : "Hand to a person"}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleTrigger(trigger.reason); }}
                        className={cn(
                          "relative w-9 h-5 rounded-full transition-colors flex-shrink-0",
                          trigger.enabled ? "bg-orange-500" : "bg-muted"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                          trigger.enabled ? "translate-x-4" : "translate-x-0.5"
                        )} />
                      </button>
                      {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-3 bg-muted/20">
                        <p className="text-[10px] text-muted-foreground mt-1 mb-2 font-semibold uppercase tracking-wide">Keywords</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {trigger.keywords.map((kw) => (
                            <span key={kw} className="flex items-center gap-1 text-[10px] bg-background border border-border rounded-full px-2 py-0.5 text-foreground">
                              {kw}
                              <button onClick={() => removeKeyword(trigger.reason, kw)} className="text-muted-foreground hover:text-destructive"><Trash2 size={8} /></button>
                            </span>
                          ))}
                          {trigger.keywords.length === 0 && (
                            <span className="text-[10px] text-muted-foreground italic">No keywords — trigger is inactive</span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <Input
                            value={newKeyword[trigger.reason] ?? ""}
                            onChange={(e) => setNewKeyword((p) => ({ ...p, [trigger.reason]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") addKeyword(trigger.reason); }}
                            placeholder="Add keyword..."
                            className="h-7 text-xs flex-1"
                          />
                          <Button size="sm" variant="outline" onClick={() => addKeyword(trigger.reason)} className="h-7 text-xs px-2">
                            <Plus size={10} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* AI Contextual Detection Info */}
          {settings.aiContextualDetection && (
            <Card className="border border-purple-200 shadow-none">
              <CardHeader className="py-3 px-4 border-b border-purple-100 bg-purple-50/50">
                <CardTitle className="text-xs font-semibold text-purple-800 flex items-center gap-2">
                  <Brain size={12} />AI Contextual Crisis Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-2">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Crisis and counseling keywords are always checked by the AI. With this on, the AI also reads every message for crisis signals that use no keyword at all.
                </p>
                <div className="text-[10px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-purple-800">Examples it can catch:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-purple-700">
                    <li>&quot;Saya sudah tidak kuat lagi, lebih baik saya pergi saja&quot;</li>
                    <li>&quot;I just feel like there is no point in going on anymore&quot;</li>
                    <li>&quot;Capek hidup, mau tidur selamanya&quot;</li>
                    <li>&quot;Semua akan lebih baik tanpa saya&quot;</li>
                  </ul>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-amber-50 border border-amber-200 mt-1">
                  <AlertTriangle size={10} className="text-amber-600 flex-shrink-0" />
                  <p className="text-[10px] text-amber-700">Uses 1 small extra AI call per message. It never counts toward your monthly AI sessions.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Escalation Reply Message */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <HandHeart size={12} className="text-purple-600" />Escalation Reply Message
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-2">
              <p className="text-[10px] text-muted-foreground">This message is sent to the respondent when an escalation trigger is detected. Let them know a human is on the way.</p>
              <Textarea
                value={settings.escalationReplyMessage}
                onChange={(e) => setSettings((s) => ({ ...s, escalationReplyMessage: e.target.value }))}
                rows={3}
                className="text-xs resize-none"
                placeholder="Thank you for reaching out. I'm connecting you with a team member..."
              />
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card className="border border-red-200 shadow-none">
            <CardHeader className="py-3 px-4 border-b border-red-100 bg-red-50/50">
              <CardTitle className="text-xs font-semibold text-red-800 flex items-center gap-2">
                <AlertTriangle size={12} />Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <p className="text-[10px] text-muted-foreground">
                When an escalation trigger is detected, these people get an <strong>email alert</strong> (and a WhatsApp alert where WhatsApp alerts are set up) with the person&apos;s name, message and a link to the conversation. Add your on-call pastor or crisis counselor.
              </p>
              {emergencyContacts.map((contact, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={contact.name}
                    onChange={(e) => {
                      const updated = [...emergencyContacts];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setEmergencyContacts(updated);
                    }}
                    placeholder="Name (e.g. Pastor John)"
                    className="h-8 text-xs flex-1"
                  />
                  <Input
                    value={contact.phone}
                    onChange={(e) => {
                      const updated = [...emergencyContacts];
                      updated[idx] = { ...updated[idx], phone: e.target.value };
                      setEmergencyContacts(updated);
                    }}
                    placeholder="WhatsApp (optional, e.g. 15551234567)"
                    className="h-8 text-xs flex-1 font-mono"
                  />
                  <Input
                    value={contact.email ?? ""}
                    onChange={(e) => {
                      const updated = [...emergencyContacts];
                      updated[idx] = { ...updated[idx], email: e.target.value };
                      setEmergencyContacts(updated);
                    }}
                    placeholder="Email"
                    className="h-8 text-xs flex-1"
                  />
                  <Input
                    value={contact.role}
                    onChange={(e) => {
                      const updated = [...emergencyContacts];
                      updated[idx] = { ...updated[idx], role: e.target.value };
                      setEmergencyContacts(updated);
                    }}
                    placeholder="Role (e.g. Youth Pastor)"
                    className="h-8 text-xs w-36"
                  />
                  <button
                    onClick={() => setEmergencyContacts(emergencyContacts.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-600 text-xs px-1"
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => setEmergencyContacts([...emergencyContacts, { name: "", phone: "", role: "", email: "" }])}
                className="text-xs text-primary hover:text-primary/80 font-medium w-fit"
              >+ Add emergency contact</button>
            </CardContent>
          </Card>

          {/* Test Panel */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <TestTube2 size={12} className="text-emerald-600" />Test AI Response
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <p className="text-[10px] text-muted-foreground">Send a test message to see how AI responds.</p>
              <Textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Example: I am going through a family crisis, can you pray for me?"
                className="text-xs min-h-[60px] resize-none"
                disabled={!aiAvailable}
              />
              <Button
                size="sm"
                onClick={handleTest}
                disabled={!testInput.trim() || testLoading || !aiAvailable}
                className="gap-1.5 text-xs h-8"
              >
                {testLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                {testLoading ? "AI is thinking..." : "Test AI"}
              </Button>

              {testError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <XCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{testError}</p>
                </div>
              )}

              {/* Escalation Detection Result */}
              {testEscalation && (() => {
                const m = testEscalation.method;
                const crisis = m === "ai_contextual" || m === "keyword";
                const style = crisis ? "bg-red-50 border-red-300 text-red-800"
                  : m === "handoff" ? "bg-orange-50 border-orange-200 text-orange-800"
                  : m === "tag" ? "bg-violet-50 border-violet-200 text-violet-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800";
                const title = m === "ai_contextual" ? "CRISIS CONFIRMED BY AI — team alerted"
                  : m === "keyword" ? "CRISIS WORDS — team alerted (fallback)"
                  : m === "handoff" ? "HANDED TO A PERSON — no urgent alert"
                  : m === "tag" ? "TAGGED FOR FOLLOW-UP — AI keeps replying"
                  : "No crisis detected";
                return (
                  <div className={cn("p-3 rounded-lg border", style)}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {crisis ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                      <span className="text-[10px] font-semibold">
                        {title}
                        {!m && testEscalation.confidence != null && ` (risk ${Math.round(testEscalation.confidence * 100)}%)`}
                      </span>
                    </div>
                    {testEscalation.trigger && <p className="text-xs font-medium">{testEscalation.trigger}</p>}
                    {testEscalation.confidence != null && m && (
                      <p className="text-[10px]">Confidence: {Math.round(testEscalation.confidence * 100)}%</p>
                    )}
                    {testEscalation.analysis && <p className="text-[10px] italic mt-0.5">{testEscalation.analysis}</p>}
                  </div>
                );
              })()}

              {testResult && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Bot size={12} className="text-blue-600" />
                    <span className="text-[10px] font-semibold text-blue-700">AI Response</span>
                  </div>
                  <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">{testResult}</p>
                </div>
              )}

              {!aiAvailable && (
                <p className="text-[10px] text-muted-foreground italic">The AI isn&apos;t available on this workspace yet (see AI Engine above).</p>
              )}
              <p className="text-[10px] text-muted-foreground">Tests use the prompt on screen (even before saving) and don&apos;t count toward your monthly AI sessions.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AISettingsPage() {
  const plan = (useOrgStore((s) => s.activeOrg?.plan) ?? "free") as "free" | "starter" | "growth" | "enterprise";
  return (
    <FeatureGate feature="aiAutoReply">
      <SetupRequestGate plan={plan} selfServiceMinPlan="starter" featureLabel="AI Configuration" setupFee="$29">
        <AISettingsContent />
      </SetupRequestGate>
    </FeatureGate>
  );
}

function PromptField({ label, value, onChange, placeholder, multiline, rows }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">{label}</label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows ?? 3} className="text-xs leading-relaxed" />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 text-sm" />
      )}
    </div>
  );
}

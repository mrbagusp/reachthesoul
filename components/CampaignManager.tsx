"use client";

import React, { useState, useCallback, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import Papa from "papaparse";

// ============================================================
// TYPES
// ============================================================

interface Recipient {
  name: string;
  church: string;
  city: string;
  email: string;
  whatsapp: string;
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  stats: {
    total: number;
    sent: number;
    failed: number;
    opened: number;
    clicked: number;
    replied: number;
    signedUp: number;
  };
  createdAt: any;
}

interface CustomTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
  createdAt?: any;
}

// ============================================================
// EMAIL TEMPLATES
// ============================================================

const EMAIL_TEMPLATES: Record<string, { label: string; subject: string; body: string }> = {
  id_problem: {
    label: "🇮🇩 Sentuh Hati (ID)",
    subject: "Ada jiwa yang mengirim pesan jam 2 pagi ke gereja Anda. Siapa yang menjawab?",
    body: `Shalom {{name}},

Perkenalkan, saya dari ReachTheSoul — Prayer & Counseling Software untuk Gereja dan Ministry.

Saya ingin bertanya — apakah gereja {{church}} pernah mengalami situasi di mana ada jemaat yang mengirim pesan prayer request di malam hari, tapi baru terbalas keesokan harinya?

ReachTheSoul hadir untuk mengatasi itu:

✅ AI First Responder 24/7 — setiap pesan prayer & konseling langsung direspons dalam hitungan menit, dengan empati, sesuai doktrin gereja Anda
✅ Omnichannel Inbox — WhatsApp, Instagram, Facebook, website chat — semua masuk ke satu dashboard
✅ Counseling Journal — riwayat lengkap setiap jiwa yang dilayani, tidak ada yang terlewat
✅ Crisis Detection — AI deteksi pesan darurat dan langsung eskalasi ke konselor
✅ Tim Management — assign konselor, jadwal shift, follow-up otomatis

Bisa langsung dicoba gratis tanpa kartu kredit.
Daftar dan buat akun di 👉 reachthesoul.org/register

Sistem onboarding kami akan memandu Bapak/Ibu langkah demi langkah setelah login.

Terima kasih 🙏
Tim ReachTheSoul`,
  },
  en_story: {
    label: "🇺🇸 Storytelling (EN)",
    subject: "The prayer cards on your desk that never got a follow-up",
    body: `Dear {{name}},

Let me paint a picture you probably know too well.

Sunday morning: your altar call is powerful. Dozens come forward. They fill out prayer cards. They cry. They feel seen.

Monday morning: those cards sit on someone's desk. By Wednesday, half are forgotten. By next Sunday, new cards replace them.

Meanwhile, throughout the week, messages are trickling in — a single mom on Instagram asking for prayer at midnight. A teenager on WhatsApp hinting at dark thoughts. A grieving widow leaving a message on your Facebook page.

Most of these messages won't get a response for hours. Some never will.

It's not because {{church}} doesn't care. It's because you don't have a system.

ReachTheSoul is that system.

We built a Prayer & Counseling platform specifically for churches that takes every prayer request — from WhatsApp, Instagram, Facebook, and your website — and brings them into one inbox where your team can see, respond, track, and follow up on every single soul.

Our AI First Responder answers every message within minutes, 24/7, with empathy and aligned to your church's doctrine. When it detects a crisis, it immediately escalates to your human counselors.

Every soul gets a counseling journal. Every conversation is tracked. No one falls through the cracks.

Free to try. No credit card needed. Set up in minutes.
Start now: reachthesoul.org/register

One soul reached because your church responded in time — that's reason enough.

God bless,
ReachTheSoul Team`,
  },
  en_direct: {
    label: "🇺🇸 Direct (EN)",
    subject: "Someone messaged your church at 2 AM. Who answered?",
    body: `Dear {{name}},

I'm writing from ReachTheSoul — Prayer & Counseling Software for Churches and Ministries.

One simple question: when someone messages {{church}} at 2 AM saying "please pray for me, I can't do this anymore" — who answers?

For most churches, the honest answer is: no one, until the next morning.

ReachTheSoul changes that.

Our AI responds to every prayer request and counseling message within minutes — 24/7 — with empathy and in alignment with your church's doctrine. It doesn't replace your pastors. It makes sure no soul ever feels ignored.

Every message from WhatsApp, Instagram, Facebook, and your website flows into one dashboard. Your counseling team can see the complete journey of every soul, assign follow-ups, and get instant alerts when the AI detects a crisis.

Free to try. No credit card required.
Sign up at: reachthesoul.org/register

Our onboarding system will guide you step by step.

God bless,
ReachTheSoul Team`,
  },
  id_urgent: {
    label: "🇮🇩 Urgent & Data (ID)",
    subject: "83% prayer request di gereja tidak pernah di-follow up",
    body: `Shalom {{name}},

Tahukah Anda bahwa sebagian besar prayer request yang masuk ke gereja — lewat WhatsApp, Instagram, atau formulir website — tidak pernah mendapat follow-up yang konsisten?

Bukan karena gereja tidak peduli. Tapi karena tidak ada sistem.

Pesan masuk dari 5 channel berbeda. Admin mencatat di spreadsheet yang tidak pernah di-update. Konselor tidak tahu siapa yang sudah ditangani dan siapa yang belum. Dan ketika jemaat mengirim pesan di luar jam kerja — tidak ada yang menjawab.

Hasilnya? Jiwa-jiwa yang memberanikan diri untuk minta tolong, justru merasa diabaikan oleh gereja.

ReachTheSoul mengubah itu.

Kami membangun platform prayer dan counseling yang dirancang khusus untuk gereja:

• AI First Responder yang merespons setiap pesan dalam hitungan menit, 24/7, dengan empati dan sesuai doktrin gereja Anda
• Semua channel (WhatsApp, Instagram, Facebook, website) masuk ke satu inbox
• Counseling journal dengan riwayat lengkap setiap jiwa — dari prayer pertama sampai pemuridan
• Deteksi otomatis pesan darurat dengan eskalasi langsung ke konselor
• Dashboard untuk assign tim, jadwal follow-up, dan pantau pelayanan

Gratis untuk dicoba. Tidak perlu kartu kredit.
Daftar sekarang di: reachthesoul.org/register

Satu jiwa yang terjangkau karena gereja Anda merespons tepat waktu — itu sudah cukup alasan untuk mencoba.

Tuhan memberkati,
Tim ReachTheSoul`,
  },
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CampaignManager() {
  const [tab, setTab] = useState<"create" | "campaigns">("campaigns");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("id_problem");
  const [customSubject, setCustomSubject] = useState(EMAIL_TEMPLATES.id_problem.subject);
  const [customBody, setCustomBody] = useState(EMAIL_TEMPLATES.id_problem.body);
  const [channel, setChannel] = useState<"email" | "whatsapp" | "both">("email");
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── Custom templates (stored in Firestore: email_templates) ──
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newTemplateLabel, setNewTemplateLabel] = useState("");

  // Combined list: built-in + custom
  const allTemplates: Record<string, { label: string; subject: string; body: string; custom?: boolean }> = {
    ...EMAIL_TEMPLATES,
    ...Object.fromEntries(
      customTemplates.map((t) => [t.id, { label: `⭐ ${t.label}`, subject: t.subject, body: t.body, custom: true }])
    ),
  };

  // Load template into editor
  useEffect(() => {
    const tpl = allTemplates[selectedTemplate];
    if (tpl) {
      setCustomSubject(tpl.subject);
      setCustomBody(tpl.body);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, customTemplates]);

  // Listen to custom templates real-time
  useEffect(() => {
    const q = query(collection(db, "email_templates"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setCustomTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomTemplate)));
    });
    return () => unsub();
  }, []);

  // Save current subject/body as a new custom template
  const handleSaveTemplate = async () => {
    if (!newTemplateLabel.trim()) { setUploadError("Beri nama template dulu."); return; }
    if (!customSubject.trim() || !customBody.trim()) { setUploadError("Subject dan body tidak boleh kosong."); return; }
    setSavingTemplate(true);
    setUploadError("");
    try {
      await addDoc(collection(db, "email_templates"), {
        label: newTemplateLabel.trim(),
        subject: customSubject,
        body: customBody,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewTemplateLabel("");
      setSuccessMsg("Template tersimpan ✓");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setUploadError("Gagal simpan template: " + (err?.message ?? "error"));
    } finally {
      setSavingTemplate(false);
    }
  };

  // Update an existing custom template with current editor content
  const handleUpdateTemplate = async () => {
    if (!editingTemplateId) return;
    setSavingTemplate(true);
    setUploadError("");
    try {
      await updateDoc(doc(db, "email_templates", editingTemplateId), {
        subject: customSubject,
        body: customBody,
        ...(newTemplateLabel.trim() ? { label: newTemplateLabel.trim() } : {}),
        updatedAt: serverTimestamp(),
      });
      setSuccessMsg("Template diperbarui ✓");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setUploadError("Gagal update template: " + (err?.message ?? "error"));
    } finally {
      setSavingTemplate(false);
    }
  };

  // Delete the selected custom template
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Hapus template ini?")) return;
    try {
      await deleteDoc(doc(db, "email_templates", id));
      setSelectedTemplate("id_problem"); // reset to a built-in
      setSuccessMsg("Template dihapus ✓");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setUploadError("Gagal hapus template: " + (err?.message ?? "error"));
    }
  };

  const selectedIsCustom = allTemplates[selectedTemplate]?.custom === true;

  // Listen to campaigns real-time
  useEffect(() => {
    const q = query(
      collection(db, "campaigns"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setCampaigns(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign))
      );
    });
    return unsub;
  }, []);

  // CSV Upload
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadError("");

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed: Recipient[] = results.data.map((row: any) => ({
            name: row.name || row.Name || row.nama || row.Nama || "",
            church: row.church || row.Church || row.gereja || row.Gereja || row["Nama Gereja"] || "",
            city: row.city || row.City || row.kota || row.Kota || "",
            email: row.email || row.Email || row["E-mail"] || "",
            whatsapp: row.whatsapp || row.WhatsApp || row.wa || row.WA || row.phone || row.Phone || row.telepon || row.Telepon || "",
          }));

          const valid = parsed.filter((r) => r.name && (r.email || r.whatsapp));

          if (valid.length === 0) {
            setUploadError("Tidak ada data valid. Pastikan CSV memiliki kolom: name, church, city, email, whatsapp");
            return;
          }
          setRecipients(valid);
        },
        error: (err) => setUploadError(`Error parsing file: ${err.message}`),
      });
    },
    []
  );

  const removeRecipient = (index: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  // Send Campaign
  const handleSendCampaign = async () => {
    if (!campaignName) { setUploadError("Campaign name wajib diisi"); return; }
    if (recipients.length === 0) { setUploadError("Upload recipients terlebih dahulu"); return; }

    setSending(true);
    setUploadError("");
    setSuccessMsg("");

    try {
      const createCampaignFn = httpsCallable(functions, "createCampaign");
      await createCampaignFn({
        name: campaignName,
        channel,
        subject: customSubject,
        templateBody: customBody,
        recipients,
      });

      setSuccessMsg(`Campaign "${campaignName}" dibuat! ${recipients.length} recipients akan dikirim secara bertahap.`);
      setRecipients([]);
      setCampaignName("");
      setTab("campaigns");
    } catch (err: any) {
      setUploadError(err.message || "Gagal membuat campaign");
    } finally {
      setSending(false);
    }
  };

  // Stat progress bar
  const StatBar = ({ stats }: { stats: Campaign["stats"] }) => {
    const total = stats.total || 1;
    return (
      <div className="space-y-1.5">
        <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
          <span>📤 Sent: {stats.sent}</span>
          <span>📭 Opened: {stats.opened}</span>
          <span>🖱️ Clicked: {stats.clicked}</span>
          <span>💬 Replied: {stats.replied}</span>
          <span>✅ Signed Up: {stats.signedUp}</span>
          {stats.failed > 0 && <span className="text-red-500">❌ Failed: {stats.failed}</span>}
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
          <div className="bg-emerald-500 transition-all" style={{ width: `${(stats.sent / total) * 100}%` }} />
          <div className="bg-amber-400 transition-all" style={{ width: `${(stats.opened / total) * 100}%` }} />
          <div className="bg-blue-500 transition-all" style={{ width: `${(stats.clicked / total) * 100}%` }} />
          <div className="bg-purple-500 transition-all" style={{ width: `${(stats.signedUp / total) * 100}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Manager</h1>
        <p className="text-sm text-gray-500 mt-1">Upload leads, pilih template, kirim email — track hasilnya</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("campaigns")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === "campaigns" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          📊 Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => setTab("create")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === "create" ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          ✉️ New Campaign
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-lg text-sm">✅ {successMsg}</div>
      )}
      {uploadError && (
        <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg text-sm">⚠️ {uploadError}</div>
      )}

      {/* ======== CREATE TAB ======== */}
      {tab === "create" && (
        <div className="space-y-6">
          {/* Campaign name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. Outreach Gereja Jakarta Batch 1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
            <div className="flex gap-3">
              {(["email", "whatsapp", "both"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${channel === ch ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {ch === "email" ? "📧 Email" : ch === "whatsapp" ? "💬 WhatsApp" : "📧💬 Both"}
                </button>
              ))}
            </div>
          </div>

          {/* Upload CSV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Leads (CSV)</label>
            <p className="text-xs text-gray-400 mb-2">Kolom: name, church, city, email, whatsapp</p>
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-medium hover:file:bg-emerald-100 file:cursor-pointer"
            />
          </div>

          {/* Recipients preview */}
          {recipients.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recipients ({recipients.length})</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600">Name</th>
                      <th className="px-3 py-2 text-left text-gray-600">Church</th>
                      <th className="px-3 py-2 text-left text-gray-600">City</th>
                      <th className="px-3 py-2 text-left text-gray-600">Email</th>
                      <th className="px-3 py-2 text-left text-gray-600">WA</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recipients.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">{r.church}</td>
                        <td className="px-3 py-1.5">{r.city}</td>
                        <td className="px-3 py-1.5 text-blue-600">{r.email}</td>
                        <td className="px-3 py-1.5">{r.whatsapp}</td>
                        <td className="px-3 py-1.5">
                          <button onClick={() => removeRecipient(i)} className="text-red-400 hover:text-red-600">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Template selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Email Template</label>
              {selectedIsCustom && (
                <button
                  onClick={() => handleDeleteTemplate(selectedTemplate)}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline"
                >
                  🗑 Hapus template ini
                </button>
              )}
            </div>
            <select
              value={selectedTemplate}
              onChange={(e) => { setSelectedTemplate(e.target.value); setEditingTemplateId(null); setNewTemplateLabel(""); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <optgroup label="Template Bawaan">
                {Object.entries(EMAIL_TEMPLATES).map(([key, tpl]) => (
                  <option key={key} value={key}>{tpl.label}</option>
                ))}
              </optgroup>
              {customTemplates.length > 0 && (
                <optgroup label="Template Saya">
                  {customTemplates.map((t) => (
                    <option key={t.id} value={t.id}>⭐ {t.label}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Body <span className="text-gray-400 font-normal">(variabel: {"{{name}}"}, {"{{church}}"}, {"{{city}}"})</span>
            </label>
            <textarea
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              rows={14}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Save / Update template */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-gray-600">💾 Simpan sebagai template</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTemplateLabel}
                onChange={(e) => setNewTemplateLabel(e.target.value)}
                placeholder={selectedIsCustom ? "Nama baru (opsional untuk update)" : "Nama template baru, mis. 'Lead Batch Jkt'"}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="bg-white border border-emerald-600 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 disabled:opacity-50 whitespace-nowrap"
              >
                {savingTemplate ? "..." : "+ Simpan Baru"}
              </button>
              {selectedIsCustom && (
                <button
                  onClick={() => { setEditingTemplateId(selectedTemplate); handleUpdateTemplate(); }}
                  disabled={savingTemplate}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {savingTemplate ? "..." : "✓ Update Ini"}
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400">
              {selectedIsCustom
                ? "\"Update Ini\" menyimpan perubahan subject/body ke template yang dipilih. \"Simpan Baru\" membuat template baru dari editor."
                : "Edit subject & body di atas, beri nama, lalu simpan sebagai template baru untuk dipakai lagi."}
            </p>
          </div>

          {/* Send */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSendCampaign}
              disabled={sending || recipients.length === 0}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {sending ? "Membuat campaign..." : `🚀 Kirim ke ${recipients.length} recipients`}
            </button>
            <p className="text-xs text-gray-400">Email dikirim bertahap (10/batch setiap 30 menit)</p>
          </div>
        </div>
      )}

      {/* ======== CAMPAIGNS TAB ======== */}
      {tab === "campaigns" && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p>Belum ada campaign. Buat campaign pertama Anda!</p>
              <button
                onClick={() => setTab("create")}
                className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                + New Campaign
              </button>
            </div>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.channel === "email" ? "📧" : c.channel === "whatsapp" ? "💬" : "📧💬"} {c.stats.total} recipients
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    c.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                    c.status === "sending" ? "bg-amber-50 text-amber-700" :
                    c.status === "scheduled" ? "bg-blue-50 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {c.status === "sending" && "⏳ "}{c.status}
                  </span>
                </div>
                <StatBar stats={c.stats} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
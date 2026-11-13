"use client";

import React, { useState, useEffect, useMemo } from "react";
import { httpsCallable } from "firebase/functions";
import {
  collection, query, orderBy, onSnapshot, limit,
  addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { DEFAULT_CITIES } from "@/components/auto-outreach-cities";

// ============================================================
// TYPES
// ============================================================
interface City {
  id: string;
  order: number;
  city: string;
  country: string;
  countryCode?: string;
  searchTerms: string[];
  active: boolean;
  lastProcessedAt?: any;
  lastResult?: { found: number; at: string };
}

interface RunSummary {
  id: string;
  cities: string[];
  placesFound: number;
  newEmails: number;
  prospectsSaved: number;
  alreadySent: number;
  optedOut: number;
  noEmail: number;
  campaignId: string | null;
  ranAt: any;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AutoOutreach() {
  const [cities, setCities] = useState<City[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [configLoaded, setConfigLoaded] = useState(false);

  const [running, setRunning] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // New-city form
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newTerms, setNewTerms] = useState("church, ministry, prayer center");

  // ── Listen to cities (realtime) ──
  useEffect(() => {
    const q = query(collection(db, "outreach_cities"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setCities(snap.docs.map((d) => ({ id: d.id, ...d.data() } as City)));
    });
    return () => unsub();
  }, []);

  // ── Listen to recent runs (realtime) ──
  useEffect(() => {
    const q = query(collection(db, "outreach_runs"), orderBy("ranAt", "desc"), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setRuns(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RunSummary)));
    });
    return () => unsub();
  }, []);

  // ── Load ON/OFF config once ──
  useEffect(() => {
    (async () => {
      try {
        const d = await getDoc(doc(db, "platform_config", "outreach"));
        setEnabled(d.exists() ? (d.data()?.enabled ?? true) : true);
      } catch { /* default true */ }
      setConfigLoaded(true);
    })();
  }, []);

  const flash = (text: string, isError = false) => {
    if (isError) { setErr(text); setMsg(""); } else { setMsg(text); setErr(""); }
    setTimeout(() => { setMsg(""); setErr(""); }, 4000);
  };

  // ── Toggle ON/OFF (kill switch) ──
  const toggleEnabled = async () => {
    const next = !enabled;
    setEnabled(next);
    try {
      await setDoc(doc(db, "platform_config", "outreach"), { enabled: next }, { merge: true });
      flash(next ? "Otomasi DINYALAKAN ✓" : "Otomasi DIMATIKAN ✓");
    } catch (e: any) {
      setEnabled(!next);
      flash("Gagal ubah status: " + (e?.message ?? "error"), true);
    }
  };

  // ── Run now (callable) ──
  const runNow = async () => {
    if (!confirm("Jalankan outreach sekarang? Ini akan mencari gereja/ministry di 2 kota berikutnya dan mulai mengirim email (10/jam).")) return;
    setRunning(true);
    setErr(""); setMsg("");
    try {
      const fn = httpsCallable(functions, "runDailyOutreachNow");
      const res: any = await fn({});
      const r = res.data ?? {};
      if (r.skipped) {
        flash(`Dilewati: ${r.skipped === "disabled" ? "otomasi sedang OFF" : r.skipped}`, true);
      } else {
        flash(`Selesai: ${r.newEmails ?? 0} email baru diantrikan, ${r.prospectsSaved ?? 0} prospek disimpan (kota: ${(r.cities ?? []).join(", ")}).`);
      }
    } catch (e: any) {
      flash(e?.message ?? "Gagal menjalankan", true);
    } finally {
      setRunning(false);
    }
  };

  // ── Seed 100 default cities ──
  const seedCities = async () => {
    if (cities.length > 0 && !confirm(`Sudah ada ${cities.length} kota. Tetap tambahkan kota default yang belum ada?`)) return;
    setSeeding(true);
    setErr(""); setMsg("");
    try {
      const existing = new Set(cities.map((c) => `${c.city}|${c.country}`.toLowerCase()));
      let added = 0;
      for (const c of DEFAULT_CITIES) {
        if (existing.has(`${c.city}|${c.country}`.toLowerCase())) continue;
        await addDoc(collection(db, "outreach_cities"), {
          order: c.order,
          city: c.city,
          country: c.country,
          countryCode: c.countryCode,
          searchTerms: c.searchTerms,
          active: true,
          lastProcessedAt: null,
        });
        added++;
      }
      flash(`${added} kota default ditambahkan ✓`);
    } catch (e: any) {
      flash("Gagal seed kota: " + (e?.message ?? "error"), true);
    } finally {
      setSeeding(false);
    }
  };

  // ── Add one city ──
  const addCity = async () => {
    if (!newCity.trim() || !newCountry.trim()) { flash("Isi nama kota dan negara.", true); return; }
    const terms = newTerms.split(",").map((t) => t.trim()).filter(Boolean);
    if (terms.length === 0) { flash("Isi minimal 1 kata kunci.", true); return; }
    try {
      const nextOrder = (cities.reduce((max, c) => Math.max(max, c.order ?? 0), 0)) + 1;
      await addDoc(collection(db, "outreach_cities"), {
        order: nextOrder,
        city: newCity.trim(),
        country: newCountry.trim(),
        countryCode: "",
        searchTerms: terms,
        active: true,
        lastProcessedAt: null,
      });
      setNewCity(""); setNewCountry(""); setNewTerms("church, ministry, prayer center");
      flash("Kota ditambahkan ✓");
    } catch (e: any) {
      flash("Gagal tambah kota: " + (e?.message ?? "error"), true);
    }
  };

  const toggleCityActive = async (c: City) => {
    try { await updateDoc(doc(db, "outreach_cities", c.id), { active: !c.active }); }
    catch (e: any) { flash("Gagal: " + (e?.message ?? "error"), true); }
  };

  const removeCity = async (c: City) => {
    if (!confirm(`Hapus ${c.city}, ${c.country} dari daftar?`)) return;
    try { await deleteDoc(doc(db, "outreach_cities", c.id)); flash("Kota dihapus ✓"); }
    catch (e: any) { flash("Gagal hapus: " + (e?.message ?? "error"), true); }
  };

  const fmtDate = (ts: any) => {
    const d = ts?.toDate?.();
    if (!d) return "-";
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const stats = useMemo(() => ({
    total: cities.length,
    active: cities.filter((c) => c.active).length,
    processed: cities.filter((c) => c.lastProcessedAt).length,
  }), [cities]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto Outreach</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tiap jam 09:00 WIB: cari gereja &amp; ministry di 2 kota berikutnya, ambil email, kirim pelan (10/jam). Email yang sudah pernah dikirim tidak dikirim ulang.
          </p>
        </div>
        {/* ON/OFF */}
        <button
          onClick={toggleEnabled}
          disabled={!configLoaded}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
            enabled ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
          }`}
        >
          {configLoaded ? (enabled ? "● Otomasi: ON" : "○ Otomasi: OFF") : "..."}
        </button>
      </div>

      {msg && <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-lg text-sm">✅ {msg}</div>}
      {err && <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg text-sm">⚠️ {err}</div>}

      {/* Stats + actions */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-5 py-3">
        <div className="flex gap-6 text-sm">
          <span className="text-gray-600">Kota: <strong>{stats.total}</strong></span>
          <span className="text-emerald-600">Aktif: <strong>{stats.active}</strong></span>
          <span className="text-blue-600">Sudah diproses: <strong>{stats.processed}</strong></span>
        </div>
        <div className="flex gap-2">
          <button onClick={runNow} disabled={running}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
            {running ? "Menjalankan..." : "▶ Jalankan sekarang"}
          </button>
          <button onClick={seedCities} disabled={seeding}
            className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-300 disabled:opacity-50">
            {seeding ? "Mengisi..." : "Isi 100 kota default"}
          </button>
        </div>
      </div>

      {/* Add city */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">+ Tambah kota</p>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1">Kota</label>
            <input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Jakarta"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1">Negara</label>
            <input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="Indonesia"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Kata kunci (pisahkan koma)</label>
            <input value={newTerms} onChange={(e) => setNewTerms(e.target.value)} placeholder="gereja, pelayanan doa, media ministry"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={addCity}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 whitespace-nowrap">
            + Tambah
          </button>
        </div>
      </div>

      {/* Cities table */}
      {cities.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🌍</p>
          <p>Belum ada kota. Klik "Isi 100 kota default" untuk mulai.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600">#</th>
                  <th className="px-3 py-2 text-left text-gray-600">Kota</th>
                  <th className="px-3 py-2 text-left text-gray-600">Negara</th>
                  <th className="px-3 py-2 text-left text-gray-600">Kata kunci</th>
                  <th className="px-3 py-2 text-left text-gray-600">Terakhir diproses</th>
                  <th className="px-3 py-2 text-left text-gray-600">Hasil</th>
                  <th className="px-3 py-2 text-left text-gray-600">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cities.map((c) => (
                  <tr key={c.id} className={`hover:bg-gray-50 ${!c.active ? "opacity-50" : ""}`}>
                    <td className="px-3 py-1.5 text-gray-400">{c.order}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-900">{c.city}</td>
                    <td className="px-3 py-1.5 text-gray-600">{c.country}</td>
                    <td className="px-3 py-1.5 text-gray-500">{(c.searchTerms ?? []).join(", ")}</td>
                    <td className="px-3 py-1.5 text-gray-500">{fmtDate(c.lastProcessedAt)}</td>
                    <td className="px-3 py-1.5 text-gray-500">{c.lastResult ? `${c.lastResult.found} tempat` : "-"}</td>
                    <td className="px-3 py-1.5">
                      <button onClick={() => toggleCityActive(c)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          c.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                        {c.active ? "aktif" : "nonaktif"}
                      </button>
                    </td>
                    <td className="px-3 py-1.5">
                      <button onClick={() => removeCity(c)} className="text-red-400 hover:text-red-600">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent runs */}
      {runs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Riwayat 10 run terakhir</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600">Waktu</th>
                  <th className="px-3 py-2 text-left text-gray-600">Kota</th>
                  <th className="px-3 py-2 text-left text-gray-600">Ditemukan</th>
                  <th className="px-3 py-2 text-left text-gray-600">Email baru</th>
                  <th className="px-3 py-2 text-left text-gray-600">Prospek</th>
                  <th className="px-3 py-2 text-left text-gray-600">Sudah pernah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-gray-500">{fmtDate(r.ranAt)}</td>
                    <td className="px-3 py-1.5 text-gray-600">{(r.cities ?? []).join(", ")}</td>
                    <td className="px-3 py-1.5 text-gray-600">{r.placesFound ?? 0}</td>
                    <td className="px-3 py-1.5 text-emerald-600 font-medium">{r.newEmails ?? 0}</td>
                    <td className="px-3 py-1.5 text-blue-600">{r.prospectsSaved ?? 0}</td>
                    <td className="px-3 py-1.5 text-gray-400">{r.alreadySent ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Note */}
      <p className="text-xs text-gray-400">
        Catatan: Google Places paling kuat untuk tempat yang punya alamat (gereja). Media ministry / prayer center yang murni online bisa muncul lebih sedikit — itu wajar. Gereja/ministry tanpa email tersimpan di daftar prospek untuk didekati manual lewat DM/form.
      </p>
    </div>
  );
}

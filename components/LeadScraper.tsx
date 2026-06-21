"use client";

import React, { useState, useCallback } from "react";

interface Lead {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviews: number;
  email: string;
  emailStatus: "pending" | "searching" | "found" | "not_found";
  city: string;
}

const PRESET_SEARCHES = [
  { label: "Gereja di Indonesia", queries: [{ q: "church", cities: "Jakarta,Surabaya,Bandung,Medan,Semarang" }, { q: "gereja", cities: "Jakarta,Surabaya,Bandung" }] },
  { label: "Jakarta (detail)", queries: [{ q: "church", cities: "Jakarta Selatan,Jakarta Utara,Jakarta Barat,Jakarta Timur,Jakarta Pusat" }] },
  { label: "Churches in USA", queries: [{ q: "church", cities: "Dallas,Nashville,Atlanta,Houston,Charlotte" }] },
  { label: "Churches in Africa", queries: [{ q: "church", cities: "Lagos,Nairobi,Accra,Kampala,Johannesburg" }] },
  { label: "Churches in Asia Pacific", queries: [{ q: "church", cities: "Manila,Singapore,Kuala Lumpur,Seoul,Sydney" }] },
  { label: "Christian Ministry", queries: [{ q: "christian ministry", cities: "Dallas,Nashville,Atlanta" }] },
  { label: "Prayer Ministry", queries: [{ q: "prayer ministry", cities: "Jakarta,Lagos,Manila" }] },
];

export default function LeadScraper() {
  const [query, setQuery] = useState("church");
  const [cities, setCities] = useState("Jakarta");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searching, setSearching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [searchLog, setSearchLog] = useState<string[]>([]);

  // Search Google Places
  const handleSearch = useCallback(async (searchQuery?: string, searchCities?: string) => {
    const q = searchQuery || query;
    const c = searchCities || cities;

    if (!q || !c) { setError("Query and cities required"); return; }

    setSearching(true);
    setError("");

    const cityList = c.split(",").map(city => city.trim());
    const newLeads: Lead[] = [];
    const seenIds = new Set(leads.map(l => l.id));

    for (const city of cityList) {
      setSearchLog(prev => [...prev, `Searching "${q}" in ${city}...`]);

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, city }),
        });

        const data = await res.json();

        if (data.error) {
          setSearchLog(prev => [...prev, `  Error: ${data.error}`]);
          continue;
        }

        let added = 0;
        for (const place of data.places || []) {
          if (seenIds.has(place.id)) continue;
          seenIds.add(place.id);
          newLeads.push({
            ...place,
            email: "",
            emailStatus: place.website ? "pending" : "not_found",
            city,
          });
          added++;
        }

        setSearchLog(prev => [...prev, `  Found ${data.total} places, ${added} new`]);
      } catch (err: any) {
        setSearchLog(prev => [...prev, `  Error: ${err.message}`]);
      }
    }

    setLeads(prev => [...prev, ...newLeads]);
    setSearching(false);
    setSearchLog(prev => [...prev, `Done! ${newLeads.length} new leads added.`]);
  }, [query, cities, leads]);

  // Run preset search
  const handlePreset = async (preset: typeof PRESET_SEARCHES[0]) => {
    setSearchLog([`Running preset: ${preset.label}`]);
    for (const q of preset.queries) {
      await handleSearch(q.q, q.cities);
    }
  };

  // Enrich emails one by one
  const handleEnrichAll = useCallback(async () => {
    const toEnrich = leads.filter(l => l.emailStatus === "pending" && l.website);
    if (toEnrich.length === 0) return;

    setEnriching(true);
    setEnrichProgress({ done: 0, total: toEnrich.length });

    for (let i = 0; i < toEnrich.length; i++) {
      const lead = toEnrich[i];

      setLeads(prev => prev.map(l =>
        l.id === lead.id ? { ...l, emailStatus: "searching" } : l
      ));

      try {
        const res = await fetch("/api/scrape/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ website: lead.website }),
        });

        const data = await res.json();
        const email = data.emails?.[0] || "";

        setLeads(prev => prev.map(l =>
          l.id === lead.id ? { ...l, email, emailStatus: email ? "found" : "not_found" } : l
        ));
      } catch (err) {
        setLeads(prev => prev.map(l =>
          l.id === lead.id ? { ...l, emailStatus: "not_found" } : l
        ));
      }

      setEnrichProgress({ done: i + 1, total: toEnrich.length });
    }

    setEnriching(false);
  }, [leads]);

  // Export to CSV
  const handleExport = useCallback(() => {
    const validLeads = leads.filter(l => l.email || l.phone);
    const csv = "name,church,city,email,whatsapp\n" +
      validLeads.map(l =>
        `"Team ${l.name}","${l.name}","${l.city}","${l.email}","${l.phone.replace(/[\s\-()]/g, "")}"`
      ).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [leads]);

  // Clear all
  const handleClear = () => {
    setLeads([]);
    setSearchLog([]);
    setError("");
  };

  // Stats
  const stats = {
    total: leads.length,
    withEmail: leads.filter(l => l.email).length,
    withPhone: leads.filter(l => l.phone).length,
    pending: leads.filter(l => l.emailStatus === "pending").length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lead Scraper</h1>
        <p className="text-sm text-gray-500 mt-1">Search churches and ministries worldwide, extract contact info, export to Campaign Manager</p>
      </div>

      {/* Preset buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Quick Search</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_SEARCHES.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              disabled={searching}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50 transition"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom search */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Query</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="church, gereja, prayer ministry..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cities (comma separated)</label>
          <input
            type="text"
            value={cities}
            onChange={(e) => setCities(e.target.value)}
            placeholder="Jakarta, Surabaya, Lagos..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={searching}
          className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Stats bar */}
      {leads.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-5 py-3">
          <div className="flex gap-6 text-sm">
            <span className="text-gray-600">Total: <strong>{stats.total}</strong></span>
            <span className="text-emerald-600">Email: <strong>{stats.withEmail}</strong></span>
            <span className="text-blue-600">Phone: <strong>{stats.withPhone}</strong></span>
            {stats.pending > 0 && (
              <span className="text-amber-600">Pending email: <strong>{stats.pending}</strong></span>
            )}
          </div>
          <div className="flex gap-2">
            {stats.pending > 0 && (
              <button
                onClick={handleEnrichAll}
                disabled={enriching}
                className="bg-amber-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                {enriching
                  ? `Enriching ${enrichProgress.done}/${enrichProgress.total}...`
                  : `Find Emails (${stats.pending})`}
              </button>
            )}
            <button
              onClick={handleExport}
              className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700"
            >
              Export CSV
            </button>
            <button
              onClick={handleClear}
              className="bg-gray-200 text-gray-600 px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Enrich progress bar */}
      {enriching && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all"
            style={{ width: `${(enrichProgress.done / enrichProgress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Results table */}
      {leads.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600">#</th>
                  <th className="px-3 py-2 text-left text-gray-600">Name</th>
                  <th className="px-3 py-2 text-left text-gray-600">City</th>
                  <th className="px-3 py-2 text-left text-gray-600">Phone</th>
                  <th className="px-3 py-2 text-left text-gray-600">Email</th>
                  <th className="px-3 py-2 text-left text-gray-600">Website</th>
                  <th className="px-3 py-2 text-left text-gray-600">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead, i) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-900">{lead.name}</td>
                    <td className="px-3 py-1.5 text-gray-600">{lead.city}</td>
                    <td className="px-3 py-1.5 text-gray-600">{lead.phone || "-"}</td>
                    <td className="px-3 py-1.5">
                      {lead.emailStatus === "searching" && (
                        <span className="text-amber-500">searching...</span>
                      )}
                      {lead.emailStatus === "found" && (
                        <span className="text-emerald-600">{lead.email}</span>
                      )}
                      {lead.emailStatus === "not_found" && (
                        <span className="text-gray-400">-</span>
                      )}
                      {lead.emailStatus === "pending" && (
                        <span className="text-gray-300">pending</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block max-w-[200px]">
                          {lead.website.replace(/https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                        </a>
                      ) : "-"}
                    </td>
                    <td className="px-3 py-1.5 text-gray-600">
                      {lead.rating > 0 ? `${lead.rating} (${lead.reviews})` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {leads.length === 0 && !searching && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>Search for churches or use a Quick Search preset above</p>
        </div>
      )}

      {/* Search log */}
      {searchLog.length > 0 && (
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">Search log ({searchLog.length} entries)</summary>
          <pre className="mt-2 p-3 bg-gray-50 rounded-lg overflow-auto max-h-40">
            {searchLog.join("\n")}
          </pre>
        </details>
      )}
    </div>
  );
}

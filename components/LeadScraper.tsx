"use client";

import React, { useState, useCallback, useRef } from "react";

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

const QUERY_VARIATIONS: Record<string, string[]> = {
  "church": ["church", "christian church", "protestant church", "catholic church", "pentecostal church", "chapel", "cathedral", "baptist church", "methodist church", "evangelical church"],
  "gereja": ["gereja", "gereja kristen", "gereja protestan", "gereja katolik", "gereja pantekosta", "kapel", "gereja baptis", "gereja injili"],
  "christian ministry": ["christian ministry", "ministry", "christian organization", "bible ministry", "evangelism ministry", "outreach ministry"],
  "prayer ministry": ["prayer ministry", "prayer center", "prayer hotline", "christian counseling", "pastoral care center"],
};

const PRESET_SEARCHES = [
  { label: "Gereja di Indonesia", queries: [{ q: "church", cities: "Jakarta,Surabaya,Bandung,Medan,Semarang" }, { q: "gereja", cities: "Jakarta,Surabaya,Bandung" }] },
  { label: "Jakarta (detail)", queries: [{ q: "church", cities: "Jakarta Selatan,Jakarta Utara,Jakarta Barat,Jakarta Timur,Jakarta Pusat" }, { q: "gereja", cities: "Jakarta Selatan,Jakarta Utara,Jakarta Barat,Jakarta Timur" }] },
  { label: "Churches in USA", queries: [{ q: "church", cities: "Dallas,Nashville,Atlanta,Houston,Charlotte" }] },
  { label: "Churches in Africa", queries: [{ q: "church", cities: "Lagos,Nairobi,Accra,Kampala,Johannesburg" }] },
  { label: "Churches in Asia Pacific", queries: [{ q: "church", cities: "Manila,Singapore,Kuala Lumpur,Seoul,Sydney" }] },
  { label: "Churches in Europe", queries: [{ q: "church", cities: "London,Amsterdam,Berlin,Paris,Stockholm" }] },
  { label: "Christian Ministry", queries: [{ q: "christian ministry", cities: "Dallas,Nashville,Atlanta,Houston" }] },
  { label: "Prayer Ministry", queries: [{ q: "prayer ministry", cities: "Jakarta,Lagos,Manila,Nairobi" }] },
];

export default function LeadScraper() {
  const [query, setQuery] = useState("church");
  const [cities, setCities] = useState("Jakarta");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searching, setSearching] = useState(false);
  const [deepSearching, setDeepSearching] = useState(false);
  const [deepProgress, setDeepProgress] = useState({ done: 0, total: 0, current: "" });
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [searchLog, setSearchLog] = useState<string[]>([]);
  const stopRef = useRef(false);

  const seenIdsRef = useRef<Set<string>>(new Set());

  // Core search function
  const doSearch = useCallback(async (q: string, city: string): Promise<Lead[]> => {
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, city }),
      });
      const data = await res.json();
      if (data.error) return [];

      const newLeads: Lead[] = [];
      for (const place of data.places || []) {
        if (seenIdsRef.current.has(place.id)) continue;
        seenIdsRef.current.add(place.id);
        newLeads.push({
          ...place,
          email: "",
          emailStatus: place.website ? "pending" : "not_found",
          city,
        });
      }
      return newLeads;
    } catch {
      return [];
    }
  }, []);

  // Simple search (1 query)
  const handleSearch = useCallback(async () => {
    if (!query || !cities) { setError("Query and cities required"); return; }
    setSearching(true);
    setError("");

    const cityList = cities.split(",").map(c => c.trim());
    for (const city of cityList) {
      setSearchLog(prev => [...prev, `Searching "${query}" in ${city}...`]);
      const newLeads = await doSearch(query, city);
      setLeads(prev => [...prev, ...newLeads]);
      setSearchLog(prev => [...prev, `  Found ${newLeads.length} new places`]);
    }
    setSearching(false);
  }, [query, cities, doSearch]);

  // Deep search (multiple query variations)
  const handleDeepSearch = useCallback(async () => {
    if (!query || !cities) { setError("Query and cities required"); return; }
    setDeepSearching(true);
    setError("");
    stopRef.current = false;

    const variations = QUERY_VARIATIONS[query.toLowerCase()] || [query, `${query} near me`, `best ${query}`, `local ${query}`];
    const cityList = cities.split(",").map(c => c.trim());
    const totalQueries = variations.length * cityList.length;

    setDeepProgress({ done: 0, total: totalQueries, current: "" });
    setSearchLog(prev => [...prev, `Deep Search: ${variations.length} variations x ${cityList.length} cities = ${totalQueries} queries`]);

    let done = 0;
    let totalNew = 0;

    for (const v of variations) {
      if (stopRef.current) break;
      for (const city of cityList) {
        if (stopRef.current) break;
        setDeepProgress({ done, total: totalQueries, current: `"${v}" in ${city}` });
        setSearchLog(prev => [...prev, `  "${v}" in ${city}...`]);

        const newLeads = await doSearch(v, city);
        if (newLeads.length > 0) {
          setLeads(prev => [...prev, ...newLeads]);
          totalNew += newLeads.length;
          setSearchLog(prev => [...prev, `    +${newLeads.length} new`]);
        }
        done++;
        setDeepProgress({ done, total: totalQueries, current: "" });
      }
    }

    setDeepSearching(false);
    setSearchLog(prev => [...prev, `Deep Search done! ${totalNew} total new leads.`]);
  }, [query, cities, doSearch]);

  // Preset search
  const handlePreset = async (preset: typeof PRESET_SEARCHES[0]) => {
    setSearching(true);
    setSearchLog(prev => [...prev, `Preset: ${preset.label}`]);
    for (const q of preset.queries) {
      const cityList = q.cities.split(",").map(c => c.trim());
      for (const city of cityList) {
        setSearchLog(prev => [...prev, `  "${q.q}" in ${city}...`]);
        const newLeads = await doSearch(q.q, city);
        setLeads(prev => [...prev, ...newLeads]);
        if (newLeads.length > 0) setSearchLog(prev => [...prev, `    +${newLeads.length} new`]);
      }
    }
    setSearching(false);
  };

  // Stop deep search
  const handleStop = () => { stopRef.current = true; };

  // Enrich emails
  const handleEnrichAll = useCallback(async () => {
    const toEnrich = leads.filter(l => l.emailStatus === "pending" && l.website);
    if (toEnrich.length === 0) return;
    setEnriching(true);
    setEnrichProgress({ done: 0, total: toEnrich.length });

    for (let i = 0; i < toEnrich.length; i++) {
      const lead = toEnrich[i];
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, emailStatus: "searching" } : l));

      try {
        const res = await fetch("/api/scrape/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ website: lead.website }),
        });
        const data = await res.json();
        const email = data.emails?.[0] || "";
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, email, emailStatus: email ? "found" : "not_found" } : l));
      } catch {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, emailStatus: "not_found" } : l));
      }
      setEnrichProgress({ done: i + 1, total: toEnrich.length });
    }
    setEnriching(false);
  }, [leads]);

  // Export CSV
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

  // Clear
  const handleClear = () => {
    setLeads([]);
    setSearchLog([]);
    setError("");
    seenIdsRef.current.clear();
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lead Scraper</h1>
        <p className="text-sm text-gray-500 mt-1">Search churches and ministries worldwide, extract contact info, export to Campaign Manager</p>
      </div>

      {/* Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Quick Search</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_SEARCHES.map((preset) => (
            <button key={preset.label} onClick={() => handlePreset(preset)} disabled={searching || deepSearching}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50 transition">
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search form */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Query</label>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="church, gereja, prayer ministry..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cities (comma separated)</label>
          <input type="text" value={cities} onChange={(e) => setCities(e.target.value)}
            placeholder="Jakarta, Singapore, Lagos..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={handleSearch} disabled={searching || deepSearching}
          className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap">
          {searching ? "Searching..." : "Search"}
        </button>
        <button onClick={handleDeepSearch} disabled={searching || deepSearching}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
          {deepSearching ? "Deep Searching..." : "Deep Search (50+)"}
        </button>
        {deepSearching && (
          <button onClick={handleStop}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 whitespace-nowrap">
            Stop
          </button>
        )}
      </div>

      {/* Deep search progress */}
      {deepSearching && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{deepProgress.current}</span>
            <span>{deepProgress.done}/{deepProgress.total} queries</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${(deepProgress.done / (deepProgress.total || 1)) * 100}%` }} />
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Stats bar */}
      {leads.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-5 py-3">
          <div className="flex gap-6 text-sm">
            <span className="text-gray-600">Total: <strong>{stats.total}</strong></span>
            <span className="text-emerald-600">Email: <strong>{stats.withEmail}</strong></span>
            <span className="text-blue-600">Phone: <strong>{stats.withPhone}</strong></span>
            {stats.pending > 0 && <span className="text-amber-600">Pending email: <strong>{stats.pending}</strong></span>}
          </div>
          <div className="flex gap-2">
            {stats.pending > 0 && (
              <button onClick={handleEnrichAll} disabled={enriching}
                className="bg-amber-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-600 disabled:opacity-50">
                {enriching ? `Enriching ${enrichProgress.done}/${enrichProgress.total}...` : `Find Emails (${stats.pending})`}
              </button>
            )}
            <button onClick={handleExport}
              className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700">
              Export CSV
            </button>
            <button onClick={handleClear}
              className="bg-gray-200 text-gray-600 px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-300">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Enrich progress */}
      {enriching && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-amber-500 h-2 rounded-full transition-all"
            style={{ width: `${(enrichProgress.done / (enrichProgress.total || 1)) * 100}%` }} />
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
                      {lead.emailStatus === "searching" && <span className="text-amber-500">searching...</span>}
                      {lead.emailStatus === "found" && <span className="text-emerald-600">{lead.email}</span>}
                      {lead.emailStatus === "not_found" && <span className="text-gray-400">-</span>}
                      {lead.emailStatus === "pending" && <span className="text-gray-300">pending</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer"
                          className="text-blue-500 hover:underline truncate block max-w-[200px]">
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
      {leads.length === 0 && !searching && !deepSearching && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>Search for churches or use a Quick Search preset above</p>
        </div>
      )}

      {/* Search log */}
      {searchLog.length > 0 && (
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">Search log ({searchLog.length} entries)</summary>
          <pre className="mt-2 p-3 bg-gray-50 rounded-lg overflow-auto max-h-40">{searchLog.join("\n")}</pre>
        </details>
      )}
    </div>
  );
}
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, Users, UserPlus, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useLeadSources } from "@/hooks/use-firestore-config";
import { cn } from "@/lib/utils";
import type { Respondent } from "@/types";

// ── Pagination constants ────────────────────────────────────────────────────
const RESPONDENTS_PER_PAGE = 25;

// ── Period presets (server-friendly) ────────────────────────────────────────
type PeriodKey = "all" | "today" | "this_week" | "this_month";
const PERIOD_LABELS: Record<PeriodKey, string> = {
  all:        "All Time",
  today:      "Today",
  this_week:  "This Week",
  this_month: "This Month",
};

function startOfPeriod(key: PeriodKey): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (key === "today") return d.getTime();
  if (key === "this_week") {
    const day = d.getDay(); // 0 = Sun
    const diff = (day + 6) % 7; // Mon-based
    d.setDate(d.getDate() - diff);
    return d.getTime();
  }
  if (key === "this_month") {
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }
  return 0;
}

type SortMode = "all" | "new";

// ── Determine first contact date (createdAt fallback to firstContactAt) ─────
function contactDate(r: Respondent): number {
  const raw = r.firstContactAt ?? (r as any).createdAt ?? (r as any).created_at;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

// ── Age computation ────────────────────────────────────────────────────────
function calcAge(dobRaw: any): number | null {
  if (!dobRaw) return null;
  const dob = new Date(dobRaw);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

// ── Color pool for avatars ─────────────────────────────────────────────────
const AVATAR_PALETTE = [
  "bg-rose-100 text-rose-600",
  "bg-amber-100 text-amber-600",
  "bg-emerald-100 text-emerald-600",
  "bg-sky-100 text-sky-600",
  "bg-violet-100 text-violet-600",
  "bg-fuchsia-100 text-fuchsia-600",
  "bg-teal-100 text-teal-600",
];
function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export default function RespondentsPage() {
  const { respondents, loading }  = useRespondents();
  const { items: leadSources, loading: sourcesLoading } = useLeadSources();

  const [search, setSearch]        = useState("");
  const [sourceFilter, setSource]  = useState<string>("all");
  const [sortMode, setSortMode]    = useState<SortMode>("all");
  const [period, setPeriod]        = useState<PeriodKey>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Compute source counts (only in-range respondents) ───────────────────
  const periodStart = useMemo(() => startOfPeriod(period), [period]);

  const filtered = useMemo<Respondent[]>(() => {
    if (loading) return [];

    return respondents
      .filter((r) => {
        // Text search: name, phone, WA number
        const q = search.trim().toLowerCase();
        if (q) {
          const hay = (
            r.fullName + " " +
            (r.phones?.join(" ") ?? "") + " " +
            (r.whatsappNumber ?? "")
          ).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        // Source filter (matches leadSourceId or the label-normalized value)
        if (sourceFilter !== "all") {
          const ls = (r as any).leadSourceId ?? (r as any).leadSource ?? "";
          if (String(ls) !== sourceFilter) return false;
        }
        // Period filter
        if (period !== "all") {
          const t = contactDate(r);
          if (t < periodStart) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortMode === "new") return contactDate(b) - contactDate(a);
        // default: alphabetical
        return a.fullName.localeCompare(b.fullName);
      });
  }, [respondents, search, sourceFilter, sortMode, period, periodStart, loading]);

  // ── Pagination logic ────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / RESPONDENTS_PER_PAGE));

  const paginatedRespondents = useMemo(() => {
    const start = (currentPage - 1) * RESPONDENTS_PER_PAGE;
    return filtered.slice(start, start + RESPONDENTS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sourceFilter, sortMode, period]);

  // Clamp currentPage if it exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * RESPONDENTS_PER_PAGE + 1;
  const rangeEnd   = Math.min(currentPage * RESPONDENTS_PER_PAGE, filtered.length);

  // Generate compact page number list: [1, 2, "...", 5, 6, 7, "...", 12]
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [];
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end   = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

  // ── Source counts (respect current period & search, but NOT sourceFilter) ──
  const sourceCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    respondents.forEach((r) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const hay = (r.fullName + " " + (r.phones?.join(" ") ?? "") + " " + (r.whatsappNumber ?? "")).toLowerCase();
        if (!hay.includes(q)) return;
      }
      if (period !== "all") {
        const t = contactDate(r);
        if (t < periodStart) return;
      }
      const ls = String((r as any).leadSourceId ?? (r as any).leadSource ?? "unknown");
      counts[ls] = (counts[ls] ?? 0) + 1;
    });
    return counts;
  }, [respondents, search, period, periodStart]);

  const filterTabs = [
    { key: "all", label: "All", count: filtered.length },
    ...leadSources
      .filter((ls: any) => (sourceCounts[ls.id] ?? sourceCounts[ls.leadSourceId] ?? 0) > 0)
      .map((ls: any) => ({ key: ls.id || ls.leadSourceId, label: ls.name, count: sourceCounts[ls.id] ?? sourceCounts[ls.leadSourceId] ?? 0 })),
  ];

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" />
            Respondents
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length === 0
              ? "No respondents found"
              : `Showing ${rangeStart}–${rangeEnd} of ${filtered.length}`}
          </p>
        </div>
        <Link href="/dashboard/respondents/new">
          <Button size="sm" className="h-8 text-xs gap-1.5">
            <UserPlus size={12} />
            Add Respondent
          </Button>
        </Link>
      </div>

      {/* ── Filters card ───────────────────────────────────────────────────── */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-4 flex flex-col gap-3">
          {/* Row 1: search + sort + source */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or WhatsApp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Sort toggle: All (alphabetical) vs New (recency) */}
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              {(["all", "new"] as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={cn(
                    "px-3 py-1 text-xs transition-colors",
                    sortMode === mode
                      ? "bg-primary text-white"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {mode === "all" ? "A–Z" : "Newest"}
                </button>
              ))}
            </div>

            <Filter size={13} className="text-muted-foreground" />
            <Select value={sourceFilter} onValueChange={setSource}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {leadSources.map((ls: any) => (
                  <SelectItem key={ls.id || ls.leadSourceId} value={ls.id || ls.leadSourceId}>
                    {ls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: period pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={13} className="text-muted-foreground flex-shrink-0" />
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  period === key
                    ? "bg-primary text-white border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {PERIOD_LABELS[key]}
              </button>
            ))}
          </div>

          {/* Row 3: source tabs (only shown if we have any results) */}
          {filterTabs.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/40">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSource(tab.key)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5",
                    sourceFilter === tab.key
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    sourceFilter === tab.key ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Grid of respondents ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Loading respondents...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border border-border shadow-none">
          <CardContent className="p-12 text-center">
            <Users size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No respondents found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your filters or search.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginatedRespondents.map((r) => {
              const fcd = contactDate(r);
              const age = calcAge((r as any).dateOfBirth ?? (r as any).dob);
              const source = leadSources.find((ls: any) =>
                (ls.id && ls.id === (r as any).leadSourceId) ||
                (ls.leadSourceId && ls.leadSourceId === (r as any).leadSourceId)
              );
              const sourceName = source ? (source as any).name : null;

              return (
                <Link
                  key={r.respondentId}
                  href={`/dashboard/respondents/${r.respondentId}`}
                  className="group"
                >
                  <Card className="border border-border shadow-none hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                        pickAvatarColor(r.respondentId)
                      )}>
                        {initials(r.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {r.fullName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {age !== null && (
                            <span className="text-[10px] text-muted-foreground">{age} yo</span>
                          )}
                          {r.city && (
                            <span className="text-[10px] text-muted-foreground truncate">{r.city}</span>
                          )}
                        </div>
                        {sourceName && (
                          <span className="inline-block mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide">
                            {sourceName}
                          </span>
                        )}
                        {fcd > 0 && (
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            First contact: {new Date(fcd).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* ── Pagination controls ─────────────────────────────────────── */}
          {filtered.length > RESPONDENTS_PER_PAGE && (
            <div className="flex items-center justify-between gap-3 px-1 pr-24">
              <p className="text-xs text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center rounded-md border border-border transition-colors",
                    currentPage === 1
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "text-foreground hover:bg-muted"
                  )}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>

                {getPageNumbers().map((p, i) =>
                  p === "ellipsis" ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={cn(
                        "h-8 min-w-[32px] px-2 rounded-md border text-xs font-medium transition-colors",
                        p === currentPage
                          ? "bg-primary text-white border-primary"
                          : "border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center rounded-md border border-border transition-colors",
                    currentPage === totalPages
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "text-foreground hover:bg-muted"
                  )}
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
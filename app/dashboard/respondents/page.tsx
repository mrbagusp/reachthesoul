"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronRight, ChevronLeft, ArrowUpDown, Calendar, Ticket as TicketIcon, Phone, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useTickets }     from "@/hooks/use-firestore-tickets";
import { cn } from "@/lib/utils";

const PALETTE = [
  { bg: "bg-blue-50",    text: "text-blue-600"    },
  { bg: "bg-purple-50",  text: "text-purple-600"  },
  { bg: "bg-emerald-50", text: "text-emerald-600" },
  { bg: "bg-amber-50",   text: "text-amber-600"   },
  { bg: "bg-rose-50",    text: "text-rose-600"    },
  { bg: "bg-cyan-50",    text: "text-cyan-600"    },
  { bg: "bg-indigo-50",  text: "text-indigo-600"  },
];
const colorOf = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
};

// ─── Period options (like Tickets page) ────────────────────────────────────
type Period = "all" | "today" | "this_week" | "this_month" | "custom";
function getPeriodRange(period: Period, from: string, to: string): [Date | null, Date | null] {
  const now = new Date();
  const s = (d: Date) => { d.setHours(0, 0, 0, 0); return d; };
  const e = (d: Date) => { d.setHours(23, 59, 59, 999); return d; };
  if (period === "today")      return [s(new Date(now)), e(new Date(now))];
  if (period === "this_week")  { const m = new Date(now); m.setDate(now.getDate() - ((now.getDay() + 6) % 7)); return [s(m), e(new Date(now))]; }
  if (period === "this_month") return [s(new Date(now.getFullYear(), now.getMonth(), 1)), e(new Date(now))];
  if (period === "custom" && from && to) return [s(new Date(from)), e(new Date(to))];
  return [null, null];
}

// ── Pagination constants ────────────────────────────────────────────────────
const RESPONDENTS_PER_PAGE = 25;

export default function RespondentsPage() {
  const { respondents, loading } = useRespondents();
  const { tickets }              = useTickets();

  const [query, setQuery]           = useState("");
  const [srcFilter, setSrcFilter]   = useState<string>("all");
  const [sortMode, setSortMode]     = useState<"all" | "new">("all"); // new = most recent first
  const [period, setPeriod]         = useState<Period>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Ticket count per respondent (for filter + display) ────────────────
  const ticketsByRespondent = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => map.set(t.respondentId, (map.get(t.respondentId) ?? 0) + 1));
    return map;
  }, [tickets]);

  // ── Compute first contact date (createdAt fallback) ───────────────────
  const contactDate = (r: any): Date | null => {
    const raw = r.firstContactAt ?? r.createdAt ?? r.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  // ── Available sources for filter (only ones with respondents) ─────────
  const availableSources = useMemo(() => {
    const s = new Set<string>();
    respondents.forEach((r: any) => { if (r.leadSource) s.add(String(r.leadSource)); });
    return Array.from(s).sort();
  }, [respondents]);

  const filtered = useMemo(() => {
    const [pFrom, pTo] = getPeriodRange(period, customFrom, customTo);
    return respondents
      .filter((r: any) => {
        const name  = (r.fullName ?? "").toLowerCase();
        const phone = (r.phones?.join(" ") ?? "").toLowerCase();
        const email = (r.email ?? "").toLowerCase();
        const city  = (r.city ?? "").toLowerCase();
        const q     = query.trim().toLowerCase();
        const matchQuery = !q || name.includes(q) || phone.includes(q) || email.includes(q) || city.includes(q);

        const matchSrc = srcFilter === "all" || r.leadSource === srcFilter;

        // Period filter (by first contact / created)
        const cd = contactDate(r);
        const matchPeriod = !pFrom || !pTo ? true : (cd && cd >= pFrom && cd <= pTo);

        return matchQuery && matchSrc && matchPeriod;
      })
      .sort((a: any, b: any) => {
        if (sortMode === "new") {
          const ad = contactDate(a)?.getTime() ?? 0;
          const bd = contactDate(b)?.getTime() ?? 0;
          return bd - ad;
        }
        return (a.fullName ?? "").localeCompare(b.fullName ?? "");
      });
  }, [respondents, query, srcFilter, sortMode, period, customFrom, customTo]);

  // ── Pagination logic ────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / RESPONDENTS_PER_PAGE));

  const paginatedRespondents = useMemo(() => {
    const start = (currentPage - 1) * RESPONDENTS_PER_PAGE;
    return filtered.slice(start, start + RESPONDENTS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, srcFilter, sortMode, period, customFrom, customTo]);

  // Clamp currentPage if it exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * RESPONDENTS_PER_PAGE + 1;
  const rangeEnd   = Math.min(currentPage * RESPONDENTS_PER_PAGE, filtered.length);

  // Generate compact page number list
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

  // ── Source pill counts (based on current search+period, not srcFilter) ───
  const sourceCounts = useMemo(() => {
    const [pFrom, pTo] = getPeriodRange(period, customFrom, customTo);
    const map: Record<string, number> = { all: 0 };
    respondents.forEach((r: any) => {
      const name  = (r.fullName ?? "").toLowerCase();
      const phone = (r.phones?.join(" ") ?? "").toLowerCase();
      const email = (r.email ?? "").toLowerCase();
      const city  = (r.city ?? "").toLowerCase();
      const q     = query.trim().toLowerCase();
      const matchQuery = !q || name.includes(q) || phone.includes(q) || email.includes(q) || city.includes(q);
      if (!matchQuery) return;
      const cd = contactDate(r);
      if (pFrom && pTo && (!cd || cd < pFrom || cd > pTo)) return;
      map.all = (map.all ?? 0) + 1;
      const src = String(r.leadSource ?? "");
      if (src) map[src] = (map[src] ?? 0) + 1;
    });
    return map;
  }, [respondents, query, period, customFrom, customTo]);

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Respondents</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length === 0
              ? "No respondents found"
              : `${filtered.length} respondent${filtered.length !== 1 ? "s" : ""} • Showing ${rangeStart}–${rangeEnd}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort toggle */}
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <button
              onClick={() => setSortMode("all")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                sortMode === "all" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              onClick={() => setSortMode("new")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                sortMode === "new" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowUpDown size={10} /> New
            </button>
          </div>

          {/* Period dropdown-style button (opens the pills below) */}
          <button
            onClick={() => setPeriod(period === "all" ? "today" : "all")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors",
              period !== "all" ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <Calendar size={12} />
            {period === "all"        ? "All Time"    :
             period === "today"      ? "Today"       :
             period === "this_week"  ? "This Week"   :
             period === "this_month" ? "This Month"  :
             "Custom"}
          </button>
        </div>
      </div>

      {/* ── Filter row: search + source pills ───────────────────────────── */}
      <Card className="p-3 border border-border shadow-none">
        <div className="flex flex-col gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone, email, city..."
              className="pl-9 h-9 text-sm bg-transparent border-border"
            />
          </div>

          {/* Period pills (only visible when non-all) */}
          {period !== "all" && (
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/60">
              {(["all", "today", "this_week", "this_month", "custom"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors",
                    period === p
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {p === "all"        ? "All Time"    :
                   p === "today"      ? "Today"       :
                   p === "this_week"  ? "This Week"   :
                   p === "this_month" ? "This Month"  :
                   "Custom"}
                </button>
              ))}
              {period === "custom" && (
                <div className="flex items-center gap-1.5">
                  <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                         className="h-7 text-[11px] rounded-md border border-border bg-background px-2" />
                  <span className="text-[11px] text-muted-foreground">to</span>
                  <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                         className="h-7 text-[11px] rounded-md border border-border bg-background px-2" />
                </div>
              )}
            </div>
          )}

          {/* Source filter pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSrcFilter("all")}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors flex items-center gap-1.5",
                srcFilter === "all"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent border-border text-muted-foreground hover:bg-muted"
              )}
            >
              All
              <span className={cn("text-[10px] px-1 rounded", srcFilter === "all" ? "bg-background/20" : "bg-muted")}>
                {sourceCounts.all ?? 0}
              </span>
            </button>
            {availableSources.map((src) => (
              <button
                key={src}
                onClick={() => setSrcFilter(src)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors flex items-center gap-1.5 capitalize",
                  srcFilter === src
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {src}
                <span className={cn("text-[10px] px-1 rounded", srcFilter === src ? "bg-primary/20" : "bg-muted")}>
                  {sourceCounts[src] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── List ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Loading respondents...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border border-border shadow-none">
          <p className="text-sm text-muted-foreground">No respondents match your filters.</p>
        </Card>
      ) : (
        <>
        <Card className="border border-border shadow-none overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[minmax(220px,2fr)_minmax(140px,1fr)_minmax(160px,1fr)_120px_80px_120px_28px] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Name</div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Phone</div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Email</div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Lead Source</div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tickets</div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">First Contact</div>
            <div />
          </div>

          {/* Rows */}
          {paginatedRespondents.map((r: any) => {
            const c = colorOf(r.fullName ?? "?");
            const initial = (r.fullName ?? "?").trim().charAt(0).toUpperCase();
            const phone   = r.phones?.[0] ?? null;
            const email   = r.email ?? null;
            const ticketCount = ticketsByRespondent.get(r.respondentId) ?? 0;
            const fcd     = contactDate(r);

            return (
              <Link
                key={r.respondentId}
                href={`/dashboard/respondents/${r.respondentId}`}
                className="grid grid-cols-[minmax(220px,2fr)_minmax(140px,1fr)_minmax(160px,1fr)_120px_80px_120px_28px] gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors group items-center"
              >
                {/* Name + avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0", c.bg, c.text)}>
                    {initial}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {r.fullName}
                  </p>
                </div>

                {/* Phone */}
                <div className="text-xs text-muted-foreground truncate">
                  {phone ? (
                    <span className="flex items-center gap-1"><Phone size={10} />{phone}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>

                {/* Email */}
                <div className="text-xs text-muted-foreground truncate">
                  {email ? (
                    <span className="flex items-center gap-1"><Mail size={10} />{email}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>

                {/* Lead Source */}
                <div className="text-xs">
                  {r.leadSource ? (
                    <span className="text-primary capitalize">{r.leadSource}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>

                {/* Tickets */}
                <div className="text-xs text-foreground font-medium">
                  {ticketCount > 0 ? (
                    <span className="flex items-center gap-1"><TicketIcon size={10} className="text-muted-foreground" />{ticketCount}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>

                {/* First Contact */}
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {fcd
                    ? fcd.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                    : <span className="text-muted-foreground/40">—</span>}
                </div>

                {/* Arrow */}
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            );
          })}
        </Card>

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
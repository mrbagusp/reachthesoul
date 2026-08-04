"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Filter, Search, ChevronLeft, ChevronRight, Download,
  CheckSquare, X, UserCheck, CheckCircle2, XCircle, Trash2,
  LayoutList, Columns, Bot, ShieldAlert, ChevronUp, ChevronDown as ChevronDownIcon,
  Calendar, Globe, MessageCircle, Instagram, Facebook, Phone, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { KanbanBoard } from "@/components/tickets/KanbanBoard";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useUsers, useLeadSources } from "@/hooks/use-firestore-config";
import type { Ticket, TicketStatus } from "@/types";
import { cn } from "@/lib/utils";

const HOD_LABELS: Record<string, string> = {
  prayer_request:    "Prayer Request",
  counseling:        "Counseling",
  salvation_inquiry: "Wants to Know Jesus",
  grief_or_crisis:   "Grief / Crisis",
  baptism_request:   "Baptism Request",
  manual_escalation: "Manual",
};

const SOURCE_STYLE: Record<string, { color: string; bg: string }> = {
  whatsapp:  { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  instagram: { color: "text-pink-700",    bg: "bg-pink-50 border-pink-200" },
  facebook:  { color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  youtube:   { color: "text-red-700",     bg: "bg-red-50 border-red-200" },
  website:   { color: "text-slate-700",   bg: "bg-slate-50 border-slate-200" },
  referral:  { color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  event:     { color: "text-violet-700",  bg: "bg-violet-50 border-violet-200" },
  tiktok:    { color: "text-gray-700",    bg: "bg-gray-50 border-gray-200" },
  email:     { color: "text-cyan-700",    bg: "bg-cyan-50 border-cyan-200" },
  call:      { color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
};

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  facebook:        { label: "Facebook",  icon: <Facebook size={10} />,      color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  instagram:       { label: "Instagram", icon: <Instagram size={10} />,     color: "text-pink-700",    bg: "bg-pink-50 border-pink-200" },
  whatsapp_fonnte: { label: "WhatsApp",  icon: <MessageCircle size={10} />, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  whatsapp_meta:   { label: "WhatsApp",  icon: <MessageCircle size={10} />, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  email:           { label: "Email",     icon: <Mail size={10} />,          color: "text-cyan-700",    bg: "bg-cyan-50 border-cyan-200" },
  call:            { label: "Call",      icon: <Phone size={10} />,         color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
};

type Period = "all" | "today" | "this_week" | "this_month" | "custom";

function getPeriodRange(period: Period, customFrom: string, customTo: string): [Date | null, Date | null] {
  const now   = new Date();
  const start = (d: Date) => { d.setHours(0, 0, 0, 0); return d; };
  const end   = (d: Date) => { d.setHours(23, 59, 59, 999); return d; };

  if (period === "today") {
    return [start(new Date(now)), end(new Date(now))];
  }
  if (period === "this_week") {
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return [start(mon), end(new Date(now))];
  }
  if (period === "this_month") {
    return [start(new Date(now.getFullYear(), now.getMonth(), 1)), end(new Date(now))];
  }
  if (period === "custom" && customFrom && customTo) {
    return [start(new Date(customFrom)), end(new Date(customTo))];
  }
  return [null, null];
}

type SortKey = "date" | "ticketNumber";
type SortDir = "asc" | "desc";

const TICKETS_PER_PAGE = 25;

export default function TicketsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { tickets: firestoreTickets, loading: ticketsLoading } = useTickets();
  const { respondents, loading: respLoading } = useRespondents();
  const { items: users, loading: usersLoading } = useUsers();
  const { items: leadSources } = useLeadSources();

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [period, setPeriod]               = useState<Period>("all");
  const [customFrom, setCustomFrom]       = useState("");
  const [customTo, setCustomTo]           = useState("");
  const [sortKey, setSortKey]             = useState<SortKey>("date");
  const [sortDir, setSortDir]             = useState<SortDir>("desc");
  const [tickets, setTickets]             = useState<Ticket[]>([]);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction]       = useState<string>("");
  const [view, setView]                   = useState<"list" | "kanban">("list");

  // ── URL-based pagination ─────────────────────────────────────────────────
  const currentPage = useMemo(() => {
    const p = parseInt(searchParams.get("page") ?? "1", 10);
    return Number.isFinite(p) && p >= 1 ? p : 1;
  }, [searchParams]);

  const setCurrentPage = useCallback(
    (page: number | ((prev: number) => number)) => {
      const nextPage = typeof page === "function" ? page(currentPage) : page;
      const params = new URLSearchParams(searchParams.toString());
      if (nextPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(nextPage));
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [currentPage, pathname, router, searchParams]
  );

  // Sync Firestore tickets into local state
  useMemo(() => {
    if (firestoreTickets.length > 0) setTickets(firestoreTickets);
  }, [firestoreTickets]);

  const agents = users.filter((u: any) => u.role === "agent" && u.isActive);

  const programNames = useMemo(() => {
    const names = new Set(
      tickets.map((t) => (t as any).programName).filter(Boolean) as string[]
    );
    return Array.from(names).sort();
  }, [tickets]);

  const getRespondentName = (id: string) =>
    respondents.find((r) => r.respondentId === id)?.fullName ?? "Unknown";

  const getSourceName = (ticket: Ticket) => {
    if (ticket.leadSourceId) {
      const ls = leadSources.find((s: any) => s.id === ticket.leadSourceId);
      if (ls) return (ls as any).name as string;
    }
    const ch = (ticket as any).channel as string | undefined;
    if (ch) {
      const MAP: Record<string, string> = {
        whatsapp_meta: "WhatsApp", whatsapp_fonnte: "WhatsApp",
        instagram: "Instagram", facebook: "Facebook", call: "Call",
      };
      return MAP[ch] ?? ch;
    }
    return null;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    const [from, to] = getPeriodRange(period, customFrom, customTo);

    return tickets
      .filter((t) => {
        const rName = getRespondentName(t.respondentId);
        const matchSearch =
          (t.ticketNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
          rName.toLowerCase().includes(search.toLowerCase()) ||
          (t.subject ?? "").toLowerCase().includes(search.toLowerCase());
        const matchStatus   = statusFilter   === "all" || t.status   === statusFilter;
        const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
        const matchProgram  = programFilter  === "all" || (t as any).programName === programFilter;
        const matchPeriod   = !from || !to
          ? true
          : new Date(t.createdAt) >= from && new Date(t.createdAt) <= to;
        return matchSearch && matchStatus && matchPriority && matchProgram && matchPeriod;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortKey === "date") {
          diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else {
          diff = a.ticketNumber.localeCompare(b.ticketNumber);
        }
        return sortDir === "asc" ? diff : -diff;
      });
  }, [tickets, search, statusFilter, priorityFilter, programFilter, period, customFrom, customTo, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TICKETS_PER_PAGE));

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * TICKETS_PER_PAGE;
    return filtered.slice(start, start + TICKETS_PER_PAGE);
  }, [filtered, currentPage]);

  // ── Reset to page 1 when filters CHANGE (compare snapshot, not just re-runs) ──
  // We track a "signature" of all filter values. Only reset when the signature
  // actually changes. Re-mounts and re-renders with same filter values won't
  // trigger a reset — so back button after ticket detail navigation preserves the URL page.
  const filterSignature = `${search}|${statusFilter}|${priorityFilter}|${programFilter}|${period}|${customFrom}|${customTo}`;
  const prevFilterSignature = useRef<string | null>(null);
  useEffect(() => {
    if (prevFilterSignature.current === null) {
      // First render: just record the signature, don't reset.
      prevFilterSignature.current = filterSignature;
      return;
    }
    if (prevFilterSignature.current !== filterSignature) {
      // Signature changed: user actually modified a filter — reset to page 1.
      prevFilterSignature.current = filterSignature;
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSignature]);

  // Clamp currentPage if it exceeds totalPages — but skip when data isn't loaded yet,
  // otherwise we'd clamp to page 1 during initial mount before Firestore data arrives.
  useEffect(() => {
    if (filtered.length === 0) return;
    if (currentPage > totalPages) setCurrentPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, filtered.length]);
  
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * TICKETS_PER_PAGE + 1;
  const rangeEnd   = Math.min(currentPage * TICKETS_PER_PAGE, filtered.length);

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

  const allSelected   = filtered.length > 0 && filtered.every((t) => selected.has(t.ticketId));
  const someSelected  = filtered.some((t) => selected.has(t.ticketId));
  const selectedCount = [...selected].filter((id) => filtered.some((t) => t.ticketId === id)).length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected((s) => { const n = new Set(s); filtered.forEach((t) => n.delete(t.ticketId)); return n; });
    } else {
      setSelected((s) => { const n = new Set(s); filtered.forEach((t) => n.add(t.ticketId)); return n; });
    }
  };
  const toggleOne = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelection = () => setSelected(new Set());

  const applyBulkAction = () => {
    if (!bulkAction || selected.size === 0) return;
    setTickets((prev) => prev.map((t) => {
      if (!selected.has(t.ticketId)) return t;
      if (bulkAction === "close")   return { ...t, status: "closed"   as TicketStatus };
      if (bulkAction === "resolve") return { ...t, status: "resolved" as TicketStatus };
      if (bulkAction === "open")    return { ...t, status: "open"     as TicketStatus };
      if (bulkAction.startsWith("assign:")) {
        const agentId = bulkAction.replace("assign:", "");
        const agent   = agents.find((a) => a.uid === agentId);
        return { ...t, assignedAgentId: agentId, assignedAgentName: agent?.displayName ?? null };
      }
      return t;
    }));
    if (bulkAction === "delete") setTickets((prev) => prev.filter((t) => !selected.has(t.ticketId)));
    clearSelection();
    setBulkAction("");
  };

  const handleKanbanStatusChange = (ticketId: string, newStatus: TicketStatus) =>
    setTickets((prev) => prev.map((t) => t.ticketId === ticketId ? { ...t, status: newStatus } : t));

  const exportCSV = () => {
    const rows = [
      ["Ticket #", "Respondent", "Subject", "Status", "Priority", "Channel", "Program", "Agent", "Date", "Time"],
      ...filtered.map((t) => {
        const d = new Date(t.createdAt);
        const ch = (t as any).channel ?? "";
        const chLabel = CHANNEL_CONFIG[ch]?.label ?? getSourceName(t) ?? ch;
        const prog = (t as any).programName ?? "";
        return [
          t.ticketNumber, getRespondentName(t.respondentId), `"${t.subject}"`,
          t.status, t.priority, chLabel, prog, t.assignedAgentName ?? "Unassigned",
          d.toLocaleDateString("id-ID"), d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        ];
      }),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "tickets.csv"; a.click();
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="inline-flex flex-col ml-1 opacity-60">
      <ChevronUp   size={8} className={cn(sortKey === col && sortDir === "asc"  && "opacity-100 text-primary")} />
      <ChevronDownIcon size={8} className={cn(sortKey === col && sortDir === "desc" && "opacity-100 text-primary")} />
    </span>
  );

  const PERIOD_OPTS: { value: Period; label: string }[] = [
    { value: "all",        label: "All Time" },
    { value: "today",      label: "Today" },
    { value: "this_week",  label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "custom",     label: "Custom Range" },
  ];

  if (ticketsLoading || respLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Ticket Queue</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length === 0
              ? "No tickets found"
              : `Showing ${rangeStart}–${rangeEnd} of ${filtered.length} ticket${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors",
                view === "list" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted")}
            >
              <LayoutList size={12} />List
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors",
                view === "kanban" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted")}
            >
              <Columns size={12} />Kanban
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs gap-1.5">
            <Download size={12} /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="border border-border shadow-none">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets, respondents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Filter size={13} className="text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            {programNames.length > 0 && (
              <Select value={programFilter} onValueChange={setProgramFilter}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Program" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Calendar size={13} className="text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {PERIOD_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    period === opt.value
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {period === "custom" && (
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-7 text-xs rounded-md border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-7 text-xs rounded-md border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare size={14} className="text-primary flex-shrink-0" />
          <span className="text-xs font-semibold text-primary">{selectedCount} ticket{selectedCount > 1 ? "s" : ""} selected</span>
          <div className="flex-1" />
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="h-7 w-48 text-xs border-primary/30">
              <SelectValue placeholder="Choose action..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open"><span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-blue-500" />Mark as Open</span></SelectItem>
              <SelectItem value="resolve"><span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-500" />Mark as Resolved</span></SelectItem>
              <SelectItem value="close"><span className="flex items-center gap-1.5"><XCircle size={11} className="text-slate-500" />Mark as Closed</span></SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.uid} value={`assign:${a.uid}`}>
                  <span className="flex items-center gap-1.5"><UserCheck size={11} className="text-amber-500" />Assign to {a.displayName}</span>
                </SelectItem>
              ))}
              <SelectItem value="delete"><span className="flex items-center gap-1.5 text-destructive"><Trash2 size={11} />Delete</span></SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs px-3" onClick={applyBulkAction} disabled={!bulkAction}>
            Apply
          </Button>
          <button onClick={clearSelection} className="p-1 rounded hover:bg-primary/10 transition-colors">
            <X size={13} className="text-muted-foreground" />
          </button>
        </div>
      )}

      {view === "kanban" && (
        <KanbanBoard tickets={filtered} onStatusChange={handleKanbanStatusChange} />
      )}

      {view === "list" && (
        <>
          <Card className="border border-border shadow-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1200px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded cursor-pointer accent-primary"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-2 py-3">Ticket #</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Respondent</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Subject</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Priority</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">
                      <span className="flex items-center gap-1"><Globe size={10} />Channel</span>
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Agent</th>
                    <th
                      className="text-left text-xs font-medium text-muted-foreground px-3 py-3 cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => handleSort("date")}
                    >
                      <span className="flex items-center gap-0.5">
                        Date <SortIcon col="date" />
                      </span>
                    </th>
                    <th
                      className="text-left text-xs font-medium text-muted-foreground px-3 py-3 cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => handleSort("date")}
                    >
                      <span className="flex items-center gap-0.5">
                        Time <SortIcon col="date" />
                      </span>
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">
                      <span className="flex items-center gap-1"><Bot size={10} />HoD</span>
                    </th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={12} className="text-center py-14 text-sm text-muted-foreground">
                        No tickets match your filters.
                      </td>
                    </tr>
                  )}
                  {paginatedTickets.map((ticket) => {
                    const isSelected  = selected.has(ticket.ticketId);
                    const isNew       = (ticket as any).hasUnread === true;
                    const isHoD       = ticket.handledBy === "escalated" && ticket.escalation;
                    const createdDate = new Date(ticket.createdAt);
                    const lastMsg     = (ticket as any).lastMessage ?? "";
                    const lastMsgSender = (ticket as any).lastMessageSender ?? "";
                    const channel     = (ticket as any).channel as string ?? "";
                    const programName = (ticket as any).programName as string ?? "";
                    const chConfig    = CHANNEL_CONFIG[channel];

                    return (
                      <tr
                        key={ticket.ticketId}
                        className={cn(
                          "border-b border-border last:border-0 hover:bg-muted/20 transition-colors group",
                          isSelected && "bg-primary/5",
                          isNew && "border-l-2 border-l-blue-400 bg-blue-50/30"
                        )}
                      >
                        <td className="w-10 px-4 py-3">
                          <input type="checkbox" className="w-3.5 h-3.5 rounded cursor-pointer accent-primary"
                            checked={isSelected} onChange={() => toggleOne(ticket.ticketId)} />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/dashboard/tickets/${ticket.ticketId}`}
                              className="text-primary font-mono text-xs font-semibold hover:underline whitespace-nowrap"
                            >
                              {ticket.ticketNumber}
                            </Link>
                            {isNew && (
                              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blue-500 text-white leading-none animate-pulse">
                                New
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                          {getRespondentName(ticket.respondentId)}
                        </td>
                        <td className="px-3 py-3 max-w-[220px]">
                          <p className="text-xs text-foreground truncate font-medium">{ticket.subject}</p>
                          {lastMsg && lastMsg !== ticket.subject && (
                            <p className={cn(
                              "text-[10px] truncate mt-0.5",
                              isNew ? "text-blue-600 font-semibold" : "text-muted-foreground"
                            )}>
                              {lastMsgSender ? `${lastMsgSender}: ` : ""}{lastMsg}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3"><TicketStatusBadge status={ticket.status} /></td>
                        <td className="px-3 py-3"><TicketPriorityBadge priority={ticket.priority} /></td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            {chConfig ? (
                              <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap w-fit", chConfig.color, chConfig.bg)}>
                                {chConfig.icon}
                                {chConfig.label}
                              </span>
                            ) : (
                              (() => {
                                const src = getSourceName(ticket);
                                if (!src) return <span className="text-[10px] text-muted-foreground/40">—</span>;
                                const style = SOURCE_STYLE[src.toLowerCase()] ?? { color: "text-slate-700", bg: "bg-slate-50 border-slate-200" };
                                return <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", style.color, style.bg)}>{src}</span>;
                              })()
                            )}
                            {programName && (
                              <span className="text-[9px] font-semibold text-primary/70 uppercase tracking-wide truncate max-w-[120px]">
                                {programName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {ticket.assignedAgentName ?? <span className="italic text-muted-foreground/40">Unassigned</span>}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {createdDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                          {createdDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-3 py-3">
                          {isHoD ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 whitespace-nowrap">
                              <ShieldAlert size={9} />
                              {HOD_LABELS[ticket.escalation!.reason] ?? "Escalated"}
                            </span>
                          ) : ticket.aiMessageCount && ticket.aiMessageCount > 0 ? (
                            <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                              <Bot size={9} />AI
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Link href={`/dashboard/tickets/${ticket.ticketId}`}>
                            <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {filtered.length > TICKETS_PER_PAGE && (
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
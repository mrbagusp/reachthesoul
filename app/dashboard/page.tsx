"use client";
import Link from "next/link";
import { Ticket, Users, CheckCircle2, Clock, AlertCircle, Plus, ArrowRight, Bot, ShieldAlert, Zap, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useAuthStore } from "@/store/auth-store";
import { useSetupProgress } from "@/hooks/use-setup-progress";
import { useOrgStore } from "@/store/org-store";
import { Rocket } from "lucide-react";
import { UpgradeWelcome } from "@/components/onboarding/UpgradeWelcome";
import { cn } from "@/lib/utils";
import { WhatsAppBillingNotice } from "@/components/admin/WhatsAppBillingNotice";

export default function OverviewPage() {
  const { tickets, loading: ticketsLoading } = useTickets();
  const { respondents, loading: respLoading } = useRespondents();
  const currentUser = useAuthStore((s) => s.currentUser);
  const firstName   = currentUser?.displayName?.split(" ")[0] ?? "there";

  if (ticketsLoading || respLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Compute stats from real data
  const openCount       = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount   = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const respondentCount = respondents.length;

  const stats = [
    { label: "Open Tickets", value: openCount, icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "In Progress", value: inProgressCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Resolved", value: resolvedCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Respondents", value: respondentCount, icon: Users, color: "text-primary", bg: "bg-primary/5" },
  ];

  const recentTickets = tickets.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground text-balance">Welcome back, {firstName}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Here is your prayer & counseling summary for today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/respondents/new">
              <Plus size={14} className="mr-1.5" />New Respondent
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/tickets/new">
              <Plus size={14} className="mr-1.5" />New Ticket
            </Link>
          </Button>
        </div>
      </div>
      {/* Post-upgrade welcome banner */}
      <UpgradeWelcome />

      {/* Onboarding wizard — shows until all steps complete */}
      <WhatsAppBillingNotice />
      <SetupBanner />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-border shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <Icon size={18} className={s.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AIStatusCard />

      {/* Recent Tickets */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent Tickets</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
            <Link href="/dashboard/tickets">
              View all <ArrowRight size={12} className="ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentTickets.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No tickets yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-2.5">Ticket</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Respondent</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Subject</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Priority</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Agent</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((ticket) => (
                  <tr key={ticket.ticketId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/dashboard/tickets/${ticket.ticketId}`} className="text-primary font-mono text-xs font-semibold hover:underline">
                        {ticket.ticketNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground">{ticket.respondentName ?? "—"}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground max-w-[220px] truncate">{ticket.subject}</td>
                    <td className="px-3 py-3"><TicketStatusBadge status={ticket.status} /></td>
                    <td className="px-3 py-3"><TicketPriorityBadge priority={ticket.priority} /></td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{ticket.assignedAgentName ?? <span className="italic text-muted-foreground/50">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


// ─── Setup banner: points admins to "How to Start" until setup is done ───
function SetupBanner() {
  const setup = useSetupProgress();
  const role = useAuthStore((s) => s.currentUser?.role);
  if (role !== "admin" || setup.loading || setup.complete) return null;
  return (
    <Card className="border border-primary/30 bg-primary/5 shadow-none">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Rocket size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Finish setting up ReachTheSoul ({setup.doneCount} of {setup.total} done)
            </p>
            {setup.next && (
              <p className="text-xs text-muted-foreground mt-0.5">Next step: {setup.next.title}</p>
            )}
          </div>
        </div>
        <Button asChild size="sm" className="flex-shrink-0">
          <Link href="/dashboard/start">Continue setup <ArrowRight size={13} className="ml-1" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── AI status: on/off at a glance, with a link to settings ───
function AIStatusCard() {
  const activeOrg = useOrgStore((s) => s.activeOrg) as any;
  const enabled = !!activeOrg?.aiConfig?.enabled;
  return (
    <Card className="border border-border shadow-none">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Bot size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">AI first response</p>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? "On. AI acknowledges new messages and escalates urgent ones to your team."
                : "Off. Turn it on so every message is acknowledged, even at night."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn(
            "flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border",
            enabled ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-muted border-border text-muted-foreground",
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", enabled ? "bg-emerald-500" : "bg-muted-foreground")} />
            {enabled ? "On" : "Off"}
          </span>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
            <Link href="/dashboard/admin/ai-settings">
              <Settings size={11} className="mr-1" />Configure
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

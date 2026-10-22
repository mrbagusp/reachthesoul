"use client";
import { useMemo } from "react";
import { useOrgStore } from "@/store/org-store";
import { useUsers } from "@/hooks/use-firestore-config";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { getPlanConfig } from "@/lib/plans";
import { isDemoRespondent, isDemoTicket } from "@/lib/demo-data";
import type { PlanTier } from "@/types";

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  time: string;
  done: boolean;
  /** Plan name required to use this step, when the current plan doesn't include it. */
  lockedUntil?: "Starter" | "Growth";
  optional?: boolean;
}

/**
 * The "How to Start" checklist. Steps complete themselves from real activity
 * (e.g. the first website-chat ticket), so nobody has to tick boxes by hand.
 */
export function useSetupProgress() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const { items: users } = useUsers();
  const { tickets, loading: ticketsLoading } = useTickets();
  const { respondents, loading: respLoading } = useRespondents();

  return useMemo(() => {
    const plan = (activeOrg?.plan ?? "free") as PlanTier;
    const cfg = getPlanConfig(plan);
    const org: any = activeOrg ?? {};

    const demoIds = new Set(respondents.filter((r) => isDemoRespondent(r as any)).map((r) => r.respondentId));
    const realTickets = tickets.filter((t) => !isDemoTicket(t as any, demoIds));
    const hasChannel = (...ch: string[]) => realTickets.some((t: any) => ch.includes(t.channel));
    const demoCount = {
      respondents: demoIds.size,
      tickets: tickets.length - realTickets.length,
    };

    const steps: SetupStep[] = [
      {
        id: "website_chat",
        title: "Add a prayer & counseling chat to your website",
        description: "Copy one line of code into your website, then send yourself a test message. It will appear in Tickets within seconds. This is the fastest way to see ReachTheSoul working.",
        href: "/dashboard/admin/widget",
        cta: "Set up chat",
        time: "5 min",
        done: hasChannel("website"),
      },
      {
        id: "care_team",
        title: "Invite your care team",
        description: "Add pastors, counselors and volunteers. Each request can then be assigned to a real person.",
        href: "/dashboard/admin/users",
        cta: "Invite team",
        time: "2 min",
        done: (users?.length ?? 0) >= 2,
        lockedUntil: cfg.maxUsers <= 1 ? "Starter" : undefined,
      },
      {
        id: "ai",
        title: "Turn on the AI first response",
        description: "Let AI acknowledge every message at any hour and alert your team about urgent ones. You choose which channels it answers on.",
        href: "/dashboard/admin/ai-settings",
        cta: "Set up AI",
        time: "5 min",
        done: !!org.aiConfig?.enabled,
        lockedUntil: cfg.features.aiAutoReply ? undefined : "Starter",
      },
      {
        id: "email",
        title: "Bring in your church email & website forms",
        description: "Forward your church inbox (or your website's prayer form emails) to ReachTheSoul, so every request lands in the same place.",
        href: "/dashboard/admin/email",
        cta: "Set up email",
        time: "10 min",
        done: hasChannel("email"),
        lockedUntil: plan === "free" ? "Starter" : undefined,
      },
      {
        id: "social",
        title: "Connect Instagram & Facebook messages",
        description: "Prayer requests sent by DM become tracked conversations your whole team can see.",
        href: "/dashboard/admin/social-accounts",
        cta: "Connect",
        time: "5 min",
        done: hasChannel("instagram", "facebook"),
        lockedUntil: cfg.features.instagram ? undefined : "Growth",
      },
      {
        id: "whatsapp",
        title: "Connect WhatsApp",
        description: "For ministries whose community uses WhatsApp. Meta bills message fees directly to your organization.",
        href: "/dashboard/admin/social-accounts",
        cta: "Connect",
        time: "10 min",
        done: hasChannel("whatsapp") || !!org.channelConfigStatus?.meta_access_token || !!org.channelConfigStatus?.fonnte_token || !!org.channelConfig?.whatsapp_access_token,
        lockedUntil: cfg.features.whatsapp ? undefined : "Starter",
        optional: true,
      },
    ];

    const counted = steps.filter((s) => !s.optional && !s.lockedUntil);
    const doneCount = counted.filter((s) => s.done).length;
    const total = counted.length;
    const next = steps.find((s) => !s.done && !s.lockedUntil && !s.optional) ?? null;

    return {
      loading: ticketsLoading || respLoading,
      plan,
      planConfig: cfg,
      steps,
      doneCount,
      total,
      percent: total ? Math.round((doneCount / total) * 100) : 100,
      complete: total > 0 && doneCount === total,
      next,
      demoCount,
    };
  }, [activeOrg, users, tickets, respondents, ticketsLoading, respLoading]);
}

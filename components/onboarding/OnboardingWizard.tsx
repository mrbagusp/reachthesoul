"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";
import { useUsers } from "@/hooks/use-firestore-config";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { getPlanConfig } from "@/lib/plans";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  Bot,
  MessageCircle,
  UserCheck,
  ChevronRight,
  CheckCircle2,
  Circle,
  Sparkles,
  X,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PlanTier } from "@/types";

// ─── Onboarding Steps ────────────────────────────────────────────────

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  checkComplete: (ctx: OnboardingContext) => boolean;
  selfService: boolean; // Can user complete without admin help?
  estimatedTime: string;
}

interface OnboardingContext {
  teamSize: number;
  hasAIConfigured: boolean;
  hasWhatsApp: boolean;
  hasRespondents: boolean;
  plan: PlanTier;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "invite_team",
    title: "Invite your team",
    description: "Add counselors, supervisors, and agents to your workspace. They'll get an email invite to join.",
    icon: UserPlus,
    href: "/dashboard/admin/users",
    checkComplete: (ctx) => ctx.teamSize >= 2,
    selfService: true,
    estimatedTime: "2 min",
  },
  {
    id: "configure_ai",
    title: "Configure AI counselor",
    description: "Set your AI personality, church denomination, language, and escalation triggers. Your AI will match your church's tone and theology.",
    icon: Bot,
    href: "/dashboard/admin/ai-settings",
    checkComplete: (ctx) => ctx.hasAIConfigured,
    selfService: true,
    estimatedTime: "5 min",
  },
  {
    id: "connect_whatsapp",
    title: "Connect WhatsApp",
    description: "Link your WhatsApp Business number to receive messages in the dashboard. Our team will help set this up within 12 hours.",
    icon: MessageCircle,
    href: "/dashboard/admin/integrations",
    checkComplete: (ctx) => ctx.hasWhatsApp,
    selfService: false,
    estimatedTime: "12 hrs (we set up for you)",
  },
  {
    id: "add_respondent",
    title: "Add your first respondent",
    description: "Create a respondent profile to start tracking prayer requests and counseling interactions.",
    icon: UserCheck,
    href: "/dashboard/respondents/new",
    checkComplete: (ctx) => ctx.hasRespondents,
    selfService: true,
    estimatedTime: "1 min",
  },
];

// ─── Component ───────────────────────────────────────────────────────

export function OnboardingWizard() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { items: users } = useUsers();
  const { respondents } = useRespondents();
  const [dismissed, setDismissed] = useState(false);

  const plan = (activeOrg?.plan ?? "free") as PlanTier;
  const planConfig = getPlanConfig(plan);

  // Check onboarding context
  const ctx = useMemo<OnboardingContext>(() => ({
    teamSize: users?.length ?? 0,
    hasAIConfigured:
      !!activeOrg?.aiConfig?.enabled ||
      !!activeOrg?.aiConfig?.apiKey ||
      (activeOrg?.aiConfig?.systemPrompt?.length ?? 0) > 50,
    hasWhatsApp:
      !!activeOrg?.integrations?.fonnte_token ||
      !!activeOrg?.integrations?.whatsapp_access_token,
    hasRespondents: (respondents?.length ?? 0) > 0,
    plan,
  }), [users, activeOrg, respondents, plan]);

  const completedSteps = ONBOARDING_STEPS.filter((s) => s.checkComplete(ctx));
  const totalSteps = ONBOARDING_STEPS.length;
  const allComplete = completedSteps.length === totalSteps;
  const progressPct = Math.round((completedSteps.length / totalSteps) * 100);

  // Check localStorage for dismissal (per org)
  useEffect(() => {
    if (typeof window === "undefined" || !activeOrg?.orgId) return;
    const key = `rts_onboarding_dismissed_${activeOrg.orgId}`;
    if (localStorage.getItem(key) === "true") setDismissed(true);
  }, [activeOrg?.orgId]);

  const handleDismiss = () => {
    if (activeOrg?.orgId && typeof window !== "undefined") {
      localStorage.setItem(`rts_onboarding_dismissed_${activeOrg.orgId}`, "true");
    }
    setDismissed(true);
  };

  // Don't show if dismissed, all complete, or user is not admin
  if (dismissed || allComplete || currentUser?.role !== "admin") return null;

  // Find the first incomplete step
  const nextStep = ONBOARDING_STEPS.find((s) => !s.checkComplete(ctx));

  return (
    <Card className="border-2 shadow-none overflow-hidden" style={{ borderColor: planConfig.color + "40" }}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: planConfig.color + "15" }}
            >
              <Sparkles size={18} style={{ color: planConfig.color }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Get started with ReachTheSoul
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {completedSteps.length} of {totalSteps} steps complete
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1"
            aria-label="Dismiss onboarding"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-4">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: planConfig.color,
              }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="border-t border-border/50">
          {ONBOARDING_STEPS.map((step, i) => {
            const isComplete = step.checkComplete(ctx);
            const isNext = step.id === nextStep?.id;
            const Icon = step.icon;

            return (
              <Link
                key={step.id}
                href={step.href}
                className={cn(
                  "flex items-center gap-3.5 px-5 py-3.5 transition-colors border-b border-border/30 last:border-0",
                  isComplete
                    ? "bg-muted/20"
                    : isNext
                    ? "bg-primary/[0.03] hover:bg-primary/[0.06]"
                    : "hover:bg-muted/30"
                )}
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {isComplete ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : (
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        isNext ? "border-primary" : "border-muted-foreground/30"
                      )}
                    >
                      {isNext && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: planConfig.color }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Step icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    isComplete ? "bg-emerald-50" : "bg-muted/60"
                  )}
                >
                  <Icon
                    size={15}
                    className={isComplete ? "text-emerald-600" : "text-muted-foreground"}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      isComplete
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">
                    {step.description}
                  </p>
                </div>

                {/* Time estimate + arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isComplete && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                      <Clock size={10} />
                      {step.estimatedTime}
                    </span>
                  )}
                  <ChevronRight
                    size={14}
                    className={cn(
                      "transition-colors",
                      isComplete
                        ? "text-muted-foreground/20"
                        : isNext
                        ? "text-primary"
                        : "text-muted-foreground/40"
                    )}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* WhatsApp setup notice */}
        {!ctx.hasWhatsApp && plan !== "free" && (
          <div className="px-5 py-3 bg-blue-50/50 border-t border-blue-100">
            <div className="flex items-start gap-2.5">
              <MessageCircle size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold text-blue-900">
                  WhatsApp setup is being prepared
                </p>
                <p className="text-[10px] text-blue-700 mt-0.5 leading-relaxed">
                  Our team will configure your WhatsApp Business connection within 12 hours.
                  You&apos;ll receive a WhatsApp notification when it&apos;s ready.
                  In the meantime, complete the other steps above — they&apos;re all self-service!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

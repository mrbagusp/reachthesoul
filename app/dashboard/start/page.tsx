"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, Circle, Lock, ArrowRight, Clock, Rocket, Sparkles, Trash2, MessageCircle, Mail, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OnboardingQuiz from "@/components/onboarding/OnboardingQuiz";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useSetupProgress } from "@/hooks/use-setup-progress";
import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";
import { clearDemoData } from "@/lib/demo-data";
import { openSupportChat, SUPPORT_EMAIL } from "@/lib/support";
import { cn } from "@/lib/utils";

export default function HowToStartPage() {
  const setup = useSetupProgress();
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const role = useAuthStore((s) => s.currentUser?.role);
  const quiz = useOnboardingStore();
  const [clearing, setClearing] = useState(false);
  const [clearMsg, setClearMsg] = useState("");

  const isAdmin = role === "admin";
  const hasDemo = setup.demoCount.respondents + setup.demoCount.tickets > 0;

  const retakeQuiz = () => {
    quiz.reset();
    quiz.setStep(0);
    quiz.setIsOpen(true);
  };

  const handleClearDemo = async () => {
    if (!activeOrg?.orgId) return;
    if (!window.confirm("Remove all demo people and demo conversations? Your real data is not affected.")) return;
    setClearing(true);
    setClearMsg("");
    try {
      const r = await clearDemoData(activeOrg.orgId);
      setClearMsg(`Removed ${r.respondents} demo people and ${r.tickets} demo conversations.`);
    } catch (e: any) {
      setClearMsg(`Could not clear demo data: ${e?.message ?? "error"}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <OnboardingQuiz />

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Rocket size={20} className="text-primary" /> How to Start
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set up ReachTheSoul in a few short steps. Each step checks itself off automatically once it&apos;s working.
        </p>
      </div>

      {/* Progress */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">
              {setup.complete ? "You're all set up 🎉" : `${setup.doneCount} of ${setup.total} ${setup.total === 1 ? "step" : "steps"} done`}
            </p>
            <p className="text-xs text-muted-foreground">{setup.percent}%</p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${setup.percent}%` }} />
          </div>
          {setup.next && (
            <p className="text-xs text-muted-foreground mt-3">
              Next: <span className="font-medium text-foreground">{setup.next.title}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        {setup.steps.map((s, i) => {
          const locked = !!s.lockedUntil;
          const isNext = setup.next?.id === s.id;
          return (
            <Card
              key={s.id}
              className={cn(
                "border shadow-none transition",
                isNext ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
                (s.done || locked) && "bg-muted/30",
              )}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className="pt-0.5">
                  {s.done ? (
                    <CheckCircle2 size={22} className="text-emerald-600" />
                  ) : locked ? (
                    <Lock size={20} className="text-muted-foreground" />
                  ) : (
                    <Circle size={22} className={isNext ? "text-primary" : "text-muted-foreground/50"} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-sm font-semibold", s.done ? "text-muted-foreground line-through" : "text-foreground")}>
                      {i + 1}. {s.title}
                    </p>
                    {s.optional && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Optional</span>
                    )}
                    {locked && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                        {s.lockedUntil} plan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                  {!s.done && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Clock size={11} /> {s.time}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {s.done ? (
                    <Button asChild variant="ghost" size="sm" className="text-xs h-8">
                      <Link href={s.href}>Open</Link>
                    </Button>
                  ) : locked ? (
                    <Button asChild variant="outline" size="sm" className="text-xs h-8">
                      <Link href="/dashboard/billing">Upgrade</Link>
                    </Button>
                  ) : isAdmin ? (
                    <Button asChild size="sm" variant={isNext ? "default" : "outline"} className="text-xs h-8">
                      <Link href={s.href}>{s.cta} <ArrowRight size={12} className="ml-1" /></Link>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Ask your admin</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Plan */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles size={15} className="text-primary" /> Your plan
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-sm text-foreground">
              You are on the <span className="font-semibold">{setup.planConfig.name}</span> plan
              {setup.planConfig.price > 0 ? ` ($${setup.planConfig.price}/month)` : " (free)"}.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Not sure which plan fits your church? Answer 6 quick questions and we&apos;ll recommend one.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={retakeQuiz}>Take the 1-minute quiz</Button>
            <Button asChild size="sm" className="text-xs h-8">
              <Link href="/dashboard/billing">Compare plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demo data */}
      {(hasDemo || clearMsg) && (
        <Card className="border border-border shadow-none">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Demo data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasDemo
                  ? `Your workspace includes ${setup.demoCount.respondents} demo people and ${setup.demoCount.tickets} demo conversations so you can explore. Remove them when you're ready to go live.`
                  : clearMsg}
              </p>
              {hasDemo && clearMsg && <p className="text-xs text-red-600 mt-1">{clearMsg}</p>}
            </div>
            {hasDemo && isAdmin && (
              <Button variant="outline" size="sm" className="text-xs h-8 flex-shrink-0" onClick={handleClearDemo} disabled={clearing}>
                {clearing ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : <Trash2 size={12} className="mr-1.5" />}
                Clear demo data
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Need a hand?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Our team is happy to help you set up, at no cost.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" className="text-xs h-8" onClick={openSupportChat}>
              <MessageCircle size={12} className="mr-1.5" /> Chat with us
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs h-8">
              <a href={`mailto:${SUPPORT_EMAIL}`}><Mail size={12} className="mr-1.5" /> Email</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

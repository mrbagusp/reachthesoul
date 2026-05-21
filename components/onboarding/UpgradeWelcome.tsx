"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useOrgStore } from "@/store/org-store";
import { getPlanConfig } from "@/lib/plans";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  X,
  Sparkles,
  Clock,
  MessageCircle,
  Bot,
  UserPlus,
} from "lucide-react";
import type { PlanTier } from "@/types";

/**
 * Post-upgrade welcome banner. Shows on the dashboard after a successful
 * Paddle checkout, setting expectations for what happens next.
 *
 * Triggered by ?upgraded=true or ?upgraded=<plan> in the URL.
 */
export function UpgradeWelcome() {
  const searchParams = useSearchParams();
  const upgraded = searchParams.get("upgraded");
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const [visible, setVisible] = useState(false);

  const plan = (activeOrg?.plan ?? "free") as PlanTier;
  const planConfig = getPlanConfig(plan);

  useEffect(() => {
    if (upgraded) setVisible(true);
  }, [upgraded]);

  if (!visible || !upgraded) return null;

  return (
    <div
      className="relative rounded-xl border-2 overflow-hidden"
      style={{ borderColor: planConfig.color + "50" }}
    >
      {/* Dismiss */}
      <button
        onClick={() => setVisible(false)}
        className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors z-10"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>

      {/* Top gradient banner */}
      <div
        className="px-6 py-5"
        style={{
          background: `linear-gradient(135deg, ${planConfig.color}, ${planConfig.color}CC)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Welcome to {planConfig.name}! 🎉
            </h3>
            <p className="text-xs text-white/80 mt-0.5">
              Your subscription is now active. Here&apos;s what happens next:
            </p>
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div className="px-6 py-4 bg-background">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground">Plan activated</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                All {planConfig.name} features are now unlocked.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock size={14} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground">WhatsApp setup</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Our team will configure your WhatsApp within 12 hours. We&apos;ll notify you when it&apos;s ready.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot size={14} className="text-purple-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground">Start configuring now</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Set up your AI counselor, invite your team, and add respondents while we prepare WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

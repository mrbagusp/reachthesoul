"use client";
import { useState, useEffect } from "react";
import { User, Lock, Bell, Shield, Check, Eye, EyeOff, CreditCard, AlertTriangle, Pause, XCircle, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { useOrgStore } from "@/store/org-store";
import { getPlanConfig } from "@/lib/plans";
import type { PlanTier } from "@/types";
import { cn } from "@/lib/utils";

type Tab = "profile" | "security" | "notifications" | "subscription";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Profile",       icon: User       },
  { id: "security",      label: "Security",      icon: Lock       },
  { id: "notifications", label: "Notifications", icon: Bell       },
  { id: "subscription",  label: "Subscription",  icon: CreditCard },
];

const roleColors: Record<string, string> = {
  admin:      "bg-emerald-100 text-emerald-700",
  supervisor: "bg-amber-100  text-amber-700",
  agent:      "bg-blue-100   text-blue-700",
};

const PLAN_COLORS: Record<string, string> = {
  free:       "#6B7280",
  starter:    "#2563EB",
  growth:     "#7C3AED",
  enterprise: "#D97706",
};

// ─── Subscription Settings Tab ──────────────────────────────────────

function SubscriptionTab() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentPlan = (activeOrg?.plan ?? "free") as PlanTier;
  const config = getPlanConfig(currentPlan);
  const subscription = (activeOrg as any)?.subscription;
  const isOrgAdmin = currentUser?.role === "admin";

  const [pauseLoading, setPauseLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [actionResult, setActionResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const subscriptionStatus = subscription?.status ?? (currentPlan === "free" ? "free" : "active");
  const isPaused = subscriptionStatus === "paused";
  const isCanceled = subscriptionStatus === "canceled";
  const isActive = subscriptionStatus === "active";
  const subscriptionId = subscription?.subscriptionId ?? "";
  const dataDeleteAt = subscription?.dataDeleteAt;

  // Format date helper
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  // Calculate days remaining for data retention
  const daysRemaining = dataDeleteAt
    ? Math.max(0, Math.ceil((new Date(dataDeleteAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // ─── Pause Subscription ─────────────────────────────────────────

  const handlePause = async () => {
    if (!subscriptionId || !activeOrg?.orgId) return;
    setPauseLoading(true);
    setActionResult(null);
    try {
      const res = await fetch("/api/paddle/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: activeOrg.orgId,
          subscriptionId,
          userId: currentUser?.uid,
          userName: currentUser?.displayName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionResult({
          type: "success",
          message: `Subscription paused. Your data will be retained until ${formatDate(data.resumeAt)}. After that, all data will be permanently removed.`,
        });
        setShowPauseConfirm(false);
        // Reload to reflect changes
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setActionResult({
          type: "error",
          message: data.error ?? "Failed to pause subscription. Please try again.",
        });
      }
    } catch (err) {
      setActionResult({
        type: "error",
        message: "Something went wrong. Please contact hello@reachthesoul.org",
      });
    }
    setPauseLoading(false);
  };

  // ─── Cancel Subscription ────────────────────────────────────────

  const handleCancel = async () => {
    if (!subscriptionId || !activeOrg?.orgId) return;
    setCancelLoading(true);
    setActionResult(null);
    try {
      const res = await fetch("/api/paddle/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: activeOrg.orgId,
          subscriptionId,
          userId: currentUser?.uid,
          userName: currentUser?.displayName,
          reason: cancelReason || "user_requested",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionResult({
          type: "success",
          message: `Subscription canceled. Your current billing period will continue until it ends. Your data will be kept until ${formatDate(data.dataDeleteAt)}, after which it will be permanently deleted.`,
        });
        setShowCancelConfirm(false);
        setCancelReason("");
        // Reload to reflect changes
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setActionResult({
          type: "error",
          message: data.error ?? "Failed to cancel subscription. Please try again.",
        });
      }
    } catch (err) {
      setActionResult({
        type: "error",
        message: "Something went wrong. Please contact hello@reachthesoul.org",
      });
    }
    setCancelLoading(false);
  };

  // ─── Free plan — no subscription to manage ─────────────────────

  if (currentPlan === "free") {
    return (
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: PLAN_COLORS.free }}
            >
              F
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Free Plan</p>
              <p className="text-xs text-muted-foreground">No active subscription</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            You are on the free plan. Upgrade from the{" "}
            <a href="/dashboard/billing" className="text-primary underline font-medium">Billing page</a>{" "}
            to unlock more features.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ─── Paid plan — subscription management ────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Current Subscription Info */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold">Current Subscription</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: PLAN_COLORS[currentPlan] }}
            >
              {config.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{config.name} Plan</p>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                    isActive && "bg-emerald-100 text-emerald-700",
                    isPaused && "bg-amber-100 text-amber-700",
                    isCanceled && "bg-red-100 text-red-700",
                  )}
                >
                  {subscriptionStatus}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">${config.price}/month</p>
            </div>
          </div>

          {/* Subscription details grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {subscription?.currentPeriodEnd && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar size={12} />
                <span>Next billing: {formatDate(subscription.currentPeriodEnd)}</span>
              </div>
            )}
            {subscription?.pausedAt && (
              <div className="flex items-center gap-2 text-amber-600">
                <Pause size={12} />
                <span>Paused since: {formatDate(subscription.pausedAt)}</span>
              </div>
            )}
            {subscription?.resumeAt && (
              <div className="flex items-center gap-2 text-blue-600">
                <Clock size={12} />
                <span>Resumes: {formatDate(subscription.resumeAt)}</span>
              </div>
            )}
            {dataDeleteAt && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={12} />
                <span>Data removal: {formatDate(dataDeleteAt)}</span>
              </div>
            )}
          </div>

          {/* Data retention warning */}
          {(isPaused || isCanceled) && daysRemaining !== null && (
            <div className={cn(
              "mt-4 p-3 rounded-lg text-xs",
              daysRemaining <= 14 ? "bg-red-50 border border-red-200 text-red-700" : "bg-amber-50 border border-amber-200 text-amber-700"
            )}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">
                    {daysRemaining <= 0
                      ? "Your data is being processed for deletion."
                      : `${daysRemaining} days remaining before permanent data deletion.`
                    }
                  </p>
                  <p className="mt-1 opacity-80">
                    {isPaused
                      ? "Your subscription is paused. All your data (respondents, tickets, messages, reports) will be permanently removed after the retention period ends. Resume your subscription to keep your data."
                      : "Your subscription has been canceled. All your data will be permanently removed after the retention period. Resubscribe from the Billing page to keep your data."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action result message */}
      {actionResult && (
        <div className={cn(
          "p-3 rounded-lg text-xs border",
          actionResult.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-700"
        )}>
          {actionResult.message}
        </div>
      )}

      {/* Subscription Actions — only for org admins */}
      {isOrgAdmin && isActive && (
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-foreground">Manage Subscription</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-col gap-4">
            {/* Pause Subscription */}
            {!showPauseConfirm ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Pause size={14} className="text-amber-500" />
                    Pause Subscription
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pause for up to 3 months. Your data stays safe during the pause period.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={() => setShowPauseConfirm(true)}
                >
                  Pause
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50">
                <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} />
                  Confirm Pause Subscription
                </p>
                <div className="text-xs text-amber-700 space-y-1.5 mb-4">
                  <p>Your subscription will be paused at the end of the current billing period.</p>
                  <p>During the pause (max 3 months):</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Your data (respondents, tickets, messages) will be safely stored</li>
                    <li>You and your team will not be able to access the dashboard</li>
                    <li>No charges will be applied</li>
                    <li>AI, WhatsApp, and all integrations will be disabled</li>
                  </ul>
                  <p className="font-semibold mt-2">
                    After 3 months, if not resumed, all data will be permanently deleted.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handlePause}
                    disabled={pauseLoading}
                  >
                    {pauseLoading ? "Pausing..." : "Yes, Pause My Subscription"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPauseConfirm(false)}
                    disabled={pauseLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Cancel Subscription */}
            {!showCancelConfirm ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-red-200/50">
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <XCircle size={14} className="text-red-500" />
                    Cancel Subscription
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cancel your plan. Data is kept for 3 months, then permanently removed.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel Plan
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-red-200 bg-red-50/50">
                <p className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} />
                  Confirm Cancel Subscription
                </p>
                <div className="text-xs text-red-700 space-y-1.5 mb-3">
                  <p>Are you sure you want to cancel? Here is what happens:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Your current billing period will continue until it ends</li>
                    <li>After that, your plan will revert to Free</li>
                    <li>Your data will be retained for 3 months</li>
                    <li className="font-semibold">After 3 months, ALL data will be permanently deleted: respondents, tickets, messages, reports, and configurations</li>
                  </ul>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-red-700 uppercase tracking-wide block mb-1">
                      Reason for canceling (optional)
                    </label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full h-8 rounded-md border border-red-200 bg-white px-2 text-xs text-red-800"
                    >
                      <option value="">Select a reason...</option>
                      <option value="too_expensive">Too expensive</option>
                      <option value="not_using">Not using the platform enough</option>
                      <option value="switching_provider">Switching to another provider</option>
                      <option value="ministry_closed">Ministry/organization closing</option>
                      <option value="missing_features">Missing features I need</option>
                      <option value="temporary_break">Just need a temporary break</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {cancelReason === "temporary_break" && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                      💡 If you just need a break, consider <strong>Pausing</strong> instead! Pausing keeps everything exactly as-is for up to 3 months with no charges.
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleCancel}
                      disabled={cancelLoading}
                    >
                      {cancelLoading ? "Canceling..." : "Yes, Cancel My Subscription"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowCancelConfirm(false); setCancelReason(""); }}
                      disabled={cancelLoading}
                    >
                      Keep Subscription
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Non-admin notice */}
      {!isOrgAdmin && isActive && (
        <Card className="border border-border shadow-none">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">
              Only organization admins can manage the subscription. Contact your admin to make changes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Profile Page ──────────────────────────────────────────────

export default function ProfilePage() {
  const { currentUser } = useAuthStore();
  const [tab, setTab] = useState<Tab>("profile");

  // Profile state
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? "");
  const [email]                        = useState(currentUser?.email ?? "");
  const [phone, setPhone]              = useState("+62 812 3456 7890");
  const [savedProfile, setSavedProfile] = useState(false);

  // Security state
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [pwError, setPwError]       = useState("");
  const [pwSaved, setPwSaved]       = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    newTicket:       true,
    ticketAssigned:  true,
    newMessage:      true,
    ticketResolved:  false,
    newComment:      true,
    systemUpdates:   false,
    emailDigest:     true,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  const handleSaveProfile = () => {
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  };

  const handleSavePw = () => {
    setPwError("");
    if (!currentPw) { setPwError("Enter your current password."); return; }
    if (newPw.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    setPwSaved(true);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setPwSaved(false), 2000);
  };

  const handleSaveNotifs = () => {
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  };

  const togglePref = (key: keyof typeof notifPrefs) =>
    setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="text-base font-semibold text-foreground">Profile & Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your account, security, and notification preferences.</p>
      </div>

      {/* Avatar + name card */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl text-primary font-bold flex-shrink-0">
              {(currentUser?.displayName ?? "U").charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{currentUser?.displayName}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              <span className={cn("inline-flex items-center mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", roleColors[currentUser?.role ?? "agent"])}>
                <Shield size={9} className="mr-1" />
                {currentUser?.role}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Profile */}
      {tab === "profile" && (
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                <Input value={email} disabled className="h-9 text-sm bg-muted/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 text-sm" placeholder="+62..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <Input value={currentUser?.role ?? ""} disabled className="h-9 text-sm bg-muted/50 capitalize" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              {savedProfile && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Check size={12} /> Saved
                </span>
              )}
              <Button size="sm" onClick={handleSaveProfile}>Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Security */}
      {tab === "security" && (
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Change Password</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Current Password</label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="h-9 text-sm pr-9"
                  placeholder="Enter current password"
                />
                <button onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">New Password</label>
              <Input
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="h-9 text-sm"
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Confirm New Password</label>
              <Input
                type={showPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="h-9 text-sm"
                placeholder="Repeat new password"
              />
            </div>
            {pwError && <p className="text-xs text-destructive font-medium">{pwError}</p>}
            <div className="flex items-center justify-end gap-3 pt-1">
              {pwSaved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Check size={12} /> Password updated
                </span>
              )}
              <Button size="sm" onClick={handleSavePw}>Update Password</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Notifications */}
      {tab === "notifications" && (
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-col gap-0">
            {([
              { key: "newTicket",      label: "New ticket created",         desc: "When a new ticket is opened in the system" },
              { key: "ticketAssigned", label: "Ticket assigned to me",       desc: "When a ticket is assigned to you" },
              { key: "newMessage",     label: "New message on my tickets",   desc: "When someone replies on a ticket you own" },
              { key: "ticketResolved", label: "Ticket resolved",             desc: "When a ticket you own is marked resolved" },
              { key: "systemUpdates",  label: "System updates",              desc: "Maintenance notices and system announcements" },
              { key: "emailDigest",    label: "Daily email digest",          desc: "Summary of activity sent to your email every morning" },
            ] as { key: keyof typeof notifPrefs; label: string; desc: string }[]).map((item, i, arr) => (
              <div
                key={item.key}
                className={cn("flex items-center justify-between py-3.5", i < arr.length - 1 && "border-b border-border")}
              >
                <div>
                  <p className="text-sm text-foreground font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => togglePref(item.key)}
                  className={cn(
                    "relative w-9 h-5 rounded-full transition-colors flex-shrink-0",
                    notifPrefs[item.key] ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    notifPrefs[item.key] ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-end gap-3 pt-4">
              {notifSaved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Check size={12} /> Preferences saved
                </span>
              )}
              <Button size="sm" onClick={handleSaveNotifs}>Save Preferences</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Subscription */}
      {tab === "subscription" && <SubscriptionTab />}
    </div>
  );
}

"use client";
import { useEffect } from "react";
import Script from "next/script";
import { useAuthStore } from "@/store/auth-store";
import { useOrgStore } from "@/store/org-store";

/**
 * ReachTheSoul's own support chat (the RTS website widget, org "reachthesoul-admin").
 * Mounted once in app/layout.tsx so it shows on every page — public pages AND the
 * dashboard — instead of WhatsApp, whose replies Meta now charges per message.
 *
 * - Shown to everyone (visitors, clients, and the RTS team) on every page.
 * - Logged-in users: support tickets carry their name + organization (window.rtsWidgetVisitor).
 */
export function RtsSupportWidget() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const activeOrg = useOrgStore((s) => s.activeOrg);

  // Tell the widget who is chatting (read by public/widget.js when sending)
  useEffect(() => {
    const w = window as any;
    if (currentUser) {
      const org = activeOrg?.name ? ` · ${activeOrg.name}` : "";
      w.rtsWidgetVisitor = {
        name: `${currentUser.displayName || currentUser.email}${org}`.slice(0, 100),
        email: currentUser.email ?? "",
        orgId: activeOrg?.orgId ?? "",
      };
    } else {
      delete w.rtsWidgetVisitor;
    }
  }, [currentUser, activeOrg]);


  return (
    <Script
      src="/widget.js"
      data-org="reachthesoul-admin"
      data-color="#2B6CB0"
      data-title="Chat with us"
      data-subtitle="We usually reply within minutes"
      data-greeting="Hi there! 👋 Questions about ReachTheSoul — pricing, setup, or using the dashboard? Ask us anything right here."
      strategy="lazyOnload"
    />
  );
}
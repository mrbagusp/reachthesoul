"use client";
import { useState, useRef, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import {
  ChevronsUpDown,
  Check,
  Building2,
  Loader2,
} from "lucide-react";
import type { Organization, OrgMembership } from "@/types";

export function OrgSwitcher() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const memberships = useOrgStore((s) => s.memberships);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);
  const setLoading = useOrgStore((s) => s.setLoading);
  const currentUser = useAuthStore((s) => s.currentUser);
  const setUser = useAuthStore((s) => s.setUser);

  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Only show if user has 2+ org memberships
  if (!memberships || memberships.length < 2) return null;

  const handleSwitch = async (membership: OrgMembership) => {
    if (membership.orgId === activeOrg?.orgId) {
      setOpen(false);
      return;
    }

    setSwitching(membership.orgId);
    try {
      // Fetch new org document
      const orgSnap = await getDoc(doc(db, "organizations", membership.orgId));
      if (orgSnap.exists()) {
        const orgData = orgSnap.data();
        const newOrg = { orgId: orgSnap.id, ...orgData } as Organization;
        setActiveOrg(newOrg);

        // Update current user's role to match the new org
        if (currentUser) {
          const newRole = currentUser.orgRoles?.[membership.orgId] ?? membership.role;
          setUser({
            ...currentUser,
            role: newRole,
            primaryOrgId: membership.orgId,
          });
        }

        // Persist the switch — update primaryOrgId in Firestore
        try {
          const { updateDoc, doc: firestoreDoc } = await import("firebase/firestore");
          await updateDoc(firestoreDoc(db, "users", currentUser!.uid), {
            primaryOrgId: membership.orgId,
          });
        } catch (err) {
          console.warn("[OrgSwitcher] Failed to persist primaryOrgId:", err);
        }
      }
    } catch (err) {
      console.error("[OrgSwitcher] Failed to switch org:", err);
    }
    setSwitching(null);
    setOpen(false);
  };

  // Get initials for org avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div ref={dropdownRef} className="relative px-3 pt-2">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150",
          "bg-sidebar-accent/40 hover:bg-sidebar-accent/70",
          "border border-sidebar-border/50",
          "group"
        )}
      >
        <div className="w-7 h-7 rounded-md bg-sidebar-primary/60 flex items-center justify-center flex-shrink-0">
          <Building2 size={13} className="text-white/90" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[11px] font-semibold text-white truncate leading-tight">
            {activeOrg?.name ?? "Select Org"}
          </p>
          <p className="text-[9px] text-sidebar-foreground/40 leading-tight capitalize">
            {currentUser?.role ?? "member"}
          </p>
        </div>
        <ChevronsUpDown
          size={13}
          className={cn(
            "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70 transition-colors flex-shrink-0",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute left-3 right-3 top-full mt-1 z-[100]",
            "bg-popover border border-border rounded-lg shadow-xl",
            "py-1.5 max-h-64 overflow-y-auto",
            "animate-in fade-in-0 zoom-in-95 duration-100",
          )}
        >
          <p className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Switch Organization
          </p>

          {memberships.map((m) => {
            const isActive = m.orgId === activeOrg?.orgId;
            const isSwitching = switching === m.orgId;

            return (
              <button
                key={m.orgId}
                onClick={() => handleSwitch(m)}
                disabled={isSwitching}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent",
                  isSwitching && "opacity-60 cursor-wait",
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {getInitials(m.orgName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{m.orgName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{m.role}</p>
                </div>
                {isSwitching ? (
                  <Loader2 size={13} className="animate-spin text-muted-foreground flex-shrink-0" />
                ) : isActive ? (
                  <Check size={13} className="text-primary flex-shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";

/**
 * Generic real-time Firestore collection hook — MULTI-TENANT version.
 * Automatically filters by active orgId.
 */
export function useFirestoreCollection<T extends Record<string, any>>(
  collectionName: string,
  idField: string = "id"
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const orgId = activeOrg?.orgId;

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      try {
        const [{ collection, query, orderBy, where, onSnapshot }, { db }] =
          await Promise.all([
            import("firebase/firestore"),
            import("@/lib/firebase"),
          ]);

        const q = query(
          collection(db, collectionName),
          where("orgId", "==", orgId),
          orderBy("createdAt", "asc")
        );

        unsubscribe = onSnapshot(
          q,
          (snap) => {
            if (cancelled) return;
            const docs = snap.docs.map((d) => {
              const data = d.data();
              return {
                ...data,
                [idField]: d.id,
                id: d.id,
                createdAt:
                  data.createdAt?.toDate?.()?.toISOString() ??
                  data.createdAt ?? "",
                updatedAt:
                  data.updatedAt?.toDate?.()?.toISOString() ??
                  data.updatedAt ?? "",
              } as unknown as T;
            });
            setItems(docs);
            setLoading(false);
          },
          (err) => {
            if (cancelled) return;
            console.error(`[useFirestoreCollection] ${collectionName}:`, err);
            setError(err.message);
            setLoading(false);
          }
        );
      } catch (err: any) {
        if (!cancelled) {
          console.error(`[useFirestoreCollection] ${collectionName}:`, err);
          setError(err.message);
          setLoading(false);
        }
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [collectionName, idField, orgId]);

  return { items, loading, error };
}

// ─── Convenience hooks ─────────────────────────────────────────────

export function useCategories() {
  return useFirestoreCollection("categories", "categoryId");
}

export function useLeadSources() {
  const result = useFirestoreCollection("lead_sources", "leadSourceId");
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const currentUser = useAuthStore((s) => s.currentUser);
  const seeded = useRef(false);

  useEffect(() => {
    if (result.loading || seeded.current) return;
    if (!activeOrg?.orgId || !currentUser?.uid) return;
    if (result.items.length > 0) return;

    // Lead sources empty for this org — seed defaults
    seeded.current = true;
    import("@/lib/firestore-services").then(({ seedDefaultLeadSources }) => {
      seedDefaultLeadSources(activeOrg.orgId, currentUser.uid).catch(console.error);
    });
  }, [result.loading, result.items.length, activeOrg?.orgId, currentUser?.uid]);

  return result;
}

export function useProgramSources() {
  const result = useFirestoreCollection("program_sources", "programSourceId");
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const currentUser = useAuthStore((s) => s.currentUser);
  const seeded = useRef(false);

  useEffect(() => {
    if (result.loading || seeded.current) return;
    if (!activeOrg?.orgId || !currentUser?.uid) return;
    if (result.items.length > 0) return;

    // Program sources empty for this org — seed defaults
    seeded.current = true;
    import("@/lib/firestore-services").then(({ seedDefaultProgramSources }) => {
      seedDefaultProgramSources(activeOrg.orgId, currentUser.uid).catch(console.error);
    });
  }, [result.loading, result.items.length, activeOrg?.orgId, currentUser?.uid]);

  return result;
}

export function useOutcomes() {
  return useFirestoreCollection("interaction_outcomes", "outcomeId");
}

export function useProgressSteps() {
  const result = useFirestoreCollection("progress_steps", "stepId");
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const currentUser = useAuthStore((s) => s.currentUser);
  const seeded = useRef(false);

  useEffect(() => {
    if (result.loading || seeded.current) return;
    if (!activeOrg?.orgId || !currentUser?.uid) return;
    if (result.items.length > 0) return;

    // Progress steps empty for this org — seed defaults
    seeded.current = true;
    import("@/lib/firestore-services").then(({ seedDefaultProgressSteps }) => {
      seedDefaultProgressSteps(activeOrg.orgId, currentUser.uid).catch(console.error);
    });
  }, [result.loading, result.items.length, activeOrg?.orgId, currentUser?.uid]);

  // Sort by order field
  const sorted = useMemo(() => {
    return [...result.items].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  }, [result.items]);

  return { ...result, items: sorted };
}

export function useUsers() {
  // Users don't have an orgId field — they use orgRoles map.
  // We query users where orgMemberships array contains the active orgId,
  // since orgRoles map keys can't be queried with where() directly.
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const orgId = activeOrg?.orgId;

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      try {
        const [{ collection, query, onSnapshot }, { db }] =
          await Promise.all([
            import("firebase/firestore"),
            import("@/lib/firebase"),
          ]);

        // Firestore can't query orgRoles map keys or orgMemberships array of objects,
        // so we query all users and filter client-side. This is fine for org-scoped
        // user lists (typically < 100 users per org).
        const qAll = query(collection(db, "users"));

        unsubscribe = onSnapshot(
          qAll,
          (snap) => {
            if (cancelled) return;
            const docs = snap.docs
              .map((d) => {
                const data = d.data();
                return {
                  ...data,
                  uid: d.id,
                  id: d.id,
                  createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? "",
                  updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt ?? "",
                };
              })
              .filter((u: any) => {
                // Filter by orgRoles map (primary) or orgMemberships array (fallback)
                if (u.orgRoles && orgId in u.orgRoles) return true;
                if (u.orgMemberships && Array.isArray(u.orgMemberships)) {
                  return u.orgMemberships.some((m: any) => m.orgId === orgId);
                }
                return false;
              });
            setItems(docs);
            setLoading(false);
          },
          (err) => {
            if (cancelled) return;
            console.error("[useUsers]", err);
            setError(err.message);
            setLoading(false);
          },
        );
      } catch (err: any) {
        if (!cancelled) {
          console.error("[useUsers]", err);
          setError(err.message);
          setLoading(false);
        }
      }
    }

    subscribe();
    return () => { cancelled = true; unsubscribe?.(); };
  }, [orgId]);

  return { items, loading, error };
}

/**
 * Demo data helpers. New workspaces are seeded with a few "(Demo)" people and
 * conversations (lib/seed-dummy-data.ts) so the dashboard isn't empty.
 */
import type { Respondent, Ticket } from "@/types";

export function isDemoRespondent(r: Partial<Respondent> & { isDemo?: boolean; email?: string }): boolean {
  return r.isDemo === true || (r.fullName ?? "").startsWith("(Demo)");
}

export function isDemoTicket(
  t: Partial<Ticket> & { isDemo?: boolean; respondentName?: string },
  demoRespondentIds?: Set<string>,
): boolean {
  if (t.isDemo === true) return true;
  if ((t.respondentName ?? "").startsWith("(Demo)")) return true;
  return !!(t.respondentId && demoRespondentIds?.has(t.respondentId));
}

/** Delete all demo tickets and demo respondents of an org. Admin only (Firestore rules). */
export async function clearDemoData(orgId: string): Promise<{ respondents: number; tickets: number }> {
  const [{ collection, query, where, getDocs, writeBatch }, { db }] = await Promise.all([
    import("firebase/firestore"),
    import("@/lib/firebase"),
  ]);

  const respSnap = await getDocs(query(collection(db, "respondents"), where("orgId", "==", orgId)));
  const demoResp = respSnap.docs.filter((d) => isDemoRespondent(d.data() as any));
  const demoIds = new Set(demoResp.map((d) => d.id));

  const ticketSnap = await getDocs(query(collection(db, "tickets"), where("orgId", "==", orgId)));
  const demoTickets = ticketSnap.docs.filter((d) => isDemoTicket(d.data() as any, demoIds));

  const all = [...demoTickets, ...demoResp];
  for (let i = 0; i < all.length; i += 400) {
    const batch = writeBatch(db);
    all.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return { respondents: demoResp.length, tickets: demoTickets.length };
}

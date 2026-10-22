/** Client helpers for the AI Cloud Functions (functions/src/ai-platform.ts). */
export async function callFn<T = any>(name: string, data: Record<string, any>): Promise<T> {
  const [{ httpsCallable }, { functions }] = await Promise.all([import("firebase/functions"), import("@/lib/firebase")]);
  const res = await httpsCallable(functions, name)(data);
  return res.data as T;
}

export interface AiStatus {
  plan: string;
  engine: "builtin" | "byok" | "none";
  builtInAvailable: boolean;
  builtInModel: string | null;
  byokAllowed: boolean;
  byok: { provider: string; model: string; keyHint: string } | null;
  used: number;
  limit: number;
  month: string;
  maxRepliesPerSession: number;
  legacyKeyOnOrgDoc: boolean;
}

/** Ask the AI through the server (never exposes keys). Not counted against the monthly quota. */
export async function aiTestCall(
  orgId: string,
  messages: { role: "user" | "assistant"; content: string }[],
  opts: { mode?: "reply" | "crisis"; systemPrompt?: string } = {},
): Promise<string> {
  const r = await callFn<{ text: string }>("aiTest", { orgId, messages, mode: opts.mode ?? "reply", systemPrompt: opts.systemPrompt });
  return r.text ?? "";
}

export function errMsg(e: any): string {
  const m = String(e?.message ?? e ?? "Something went wrong").replace(/^FirebaseError:\s*/, "");
  if (m === "internal" || m === "not-found" || m.toLowerCase().includes("not found")) {
    return "Couldn't reach the AI service right now. Please try again in a moment.";
  }
  return m;
}

/** AI sessions counted this calendar month (UTC), matching the server's counter. */
export function aiSessionsThisMonth(usage: any): number {
  const d = new Date();
  const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return usage?.aiMonth === month ? Number(usage?.aiConversationsThisMonth) || 0 : 0;
}

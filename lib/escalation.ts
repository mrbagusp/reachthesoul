/**
 * How escalation triggers behave (keep in sync with functions/src/escalation.ts):
 *
 *  - "tag"      prayer / salvation / baptism → the ticket is tagged for follow-up,
 *               the AI keeps replying, NO emergency alert.
 *  - "handoff"  "talk to a human" and custom triggers → a person takes over, no alert.
 *  - "check"    grief / crisis / counseling words → the AI reads the conversation
 *               (semantic check). Only a confirmed crisis escalates + sends alerts.
 *               Without AI available, grief/crisis words still alert (safety fallback).
 */
export type TriggerMode = "tag" | "handoff" | "check";

const MODES: Record<string, TriggerMode> = {
  prayer_request: "tag",
  salvation_inquiry: "tag",
  baptism_request: "tag",
  counseling: "check",
  grief_or_crisis: "check",
  manual_escalation: "handoff",
};

export function triggerMode(reason: string): TriggerMode {
  return MODES[reason] ?? "handoff";
}

/** Fallback when no AI is available: which "check" triggers still alert on keyword alone. */
export function alertsWithoutAi(reason: string): boolean {
  return reason === "grief_or_crisis";
}

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word match ("agent" no longer matches "agenda"), allowing common suffixes (doa→doanya, prayers). */
export function keywordHit(text: string, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc(kw)}(?:nya|ku|mu|lah|kah|s|es|ed|ing)?(?![\\p{L}\\p{N}])`, "iu");
  return re.test(text);
}

export interface TriggerMatch { reason: string; label: string; mode: TriggerMode; keywords: string[] }

export function matchTriggers(text: string, triggers: any[]): TriggerMatch[] {
  const out: TriggerMatch[] = [];
  for (const t of triggers ?? []) {
    if (!t?.enabled) continue;
    const kws = ((t.keywords ?? []) as string[]).filter((k) => keywordHit(text, k));
    if (kws.length) out.push({ reason: t.reason, label: t.label ?? t.reason, mode: triggerMode(t.reason), keywords: kws });
  }
  return out;
}

export function parseCrisisJson(raw: string): { needsEscalation: boolean; confidence: number; reason?: string; label?: string; analysis?: string } | null {
  try {
    const cleaned = String(raw ?? "").replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    const p = JSON.parse(m ? m[0] : cleaned);
    return { ...p, needsEscalation: !!p.needsEscalation, confidence: Number(p.confidence) || 0 };
  } catch {
    return null;
  }
}

export const CRISIS_THRESHOLD = 0.7;

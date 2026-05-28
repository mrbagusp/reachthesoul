import type { EscalationReason, EscalationTrigger, AIConfig, Message } from "@/types";

// ─── Internal route handler (keeps credentials server-side) ─────────────────
const AI_ENDPOINT = "/api/ai/chat";

// ─── Escalation trigger detection ───────────────────────────────────────────
export function detectEscalation(
  text: string,
  config: AIConfig
): EscalationTrigger | null {
  const lower = text.toLowerCase();

  for (const trigger of config.escalationTriggers) {
    if (!trigger.enabled) continue;
    const matched = trigger.keywords.filter((kw) => lower.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      const confidence = Math.min(0.6 + matched.length * 0.15, 0.99);
      return {
        reason:            trigger.reason as EscalationReason,
        label:             trigger.label,
        detectedKeywords:  matched,
        confidence,
      };
    }
  }
  return null;
}

// ─── AI Contextual Crisis Detection ─────────────────────────────────────────
// Uses the LLM to analyze message + conversation context for crisis signals
// that keyword matching might miss (e.g. "saya tidak ingin hidup lagi")
// ─────────────────────────────────────────────────────────────────────────────

const CRISIS_DETECTION_PROMPT = `You are a crisis detection system for a Christian ministry counseling platform.
Analyze the respondent's latest message AND the conversation context to determine if this person needs IMMEDIATE human intervention.

Detect these situations even when NO explicit keywords are used:
- Suicidal ideation or self-harm intent (direct or indirect, e.g. "I don't want to live anymore", "saya ingin mengakhiri semuanya")
- Severe emotional crisis (hopelessness, despair, giving up)
- Domestic violence or abuse indicators
- Substance abuse emergency
- Immediate danger to self or others
- Grief crisis (sudden loss, death of loved one)
- Psychotic symptoms or severe mental health episode

IMPORTANT: Be sensitive to both Indonesian (Bahasa) and English expressions. Indonesian speakers may use indirect language like:
- "sudah tidak kuat lagi" (can't take it anymore)
- "lebih baik saya pergi" (better if I leave/go)
- "tidak ada gunanya" (there's no point)
- "semua akan lebih baik tanpa saya" (everything would be better without me)
- "saya sudah menyerah" (I've given up)
- "capek hidup" (tired of living)

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "needsEscalation": true/false,
  "reason": "grief_or_crisis" | "counseling" | null,
  "confidence": 0.0-1.0,
  "label": "short description of detected issue",
  "analysis": "brief explanation of why this was flagged (1-2 sentences)"
}

If the message is casual, informational, or does not indicate crisis, return:
{"needsEscalation": false, "reason": null, "confidence": 0, "label": null, "analysis": null}`;

export async function detectEscalationWithAI(
  incomingMessage: string,
  conversationHistory: Message[],
): Promise<EscalationTrigger | null> {
  const recentMessages = conversationHistory
    .filter((m) => !m.isInternal)
    .slice(-6)
    .map((m) => `[${m.senderRole}]: ${m.content}`)
    .join("\n");

  const userPrompt = `Conversation context:\n${recentMessages}\n\nLatest message from respondent:\n"${incomingMessage}"`;

  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: CRISIS_DETECTION_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw);

    if (parsed.needsEscalation && parsed.confidence >= 0.7) {
      return {
        reason: parsed.reason ?? "grief_or_crisis",
        label: parsed.label ?? "AI-detected crisis",
        detectedKeywords: [],
        confidence: parsed.confidence,
        method: "ai_contextual",
        aiAnalysis: parsed.analysis,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Build conversation history for the API ─────────────────────────────────
function buildHistory(messages: Message[], systemPrompt: string) {
  const history: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of messages) {
    if (msg.senderRole === "system") continue;
    if (msg.isInternal) continue; // don't include internal notes
    if (msg.senderRole === "ai") {
      history.push({ role: "assistant", content: msg.content });
    } else if (msg.senderRole === "agent") {
      history.push({ role: "assistant", content: msg.content });
    } else {
      // respondent messages would go here in production
      // for now map any non-agent as user
    }
  }

  return history;
}

// ─── Generate AI reply ───────────────────────────────────────────────────────
export async function generateAIReply(
  incomingMessage: string,
  conversationHistory: Message[],
  config: AIConfig,
  respondentName?: string
): Promise<{ reply: string; escalation: EscalationTrigger | null }> {
  // Always check for escalation first, regardless of AI reply
  const escalation = detectEscalation(incomingMessage, config);

  const systemPrompt = config.systemPrompt +
    (respondentName ? `\n\nYou are speaking with ${respondentName}. Address them by name.` : "");

  const history = buildHistory(conversationHistory, systemPrompt);

  // Add the new incoming message
  history.push({ role: "user", content: incomingMessage });

  const response = await fetch(AI_ENDPOINT, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ messages: history }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content ?? "";

  return { reply, escalation };
}

// ─── Simulate AI processing delay (for UX — typing indicator) ───────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Escalation reason labels ────────────────────────────────────────────────
export const ESCALATION_LABELS: Record<EscalationReason, string> = {
  prayer_request:    "Prayer Request",
  counseling:        "Counseling / Emotional Support",
  salvation_inquiry: "Wants to Know Jesus",
  grief_or_crisis:   "Grief / Crisis",
  baptism_request:   "Baptism Request",
  manual_escalation: "Manually Escalated",
};

export const ESCALATION_COLORS: Record<EscalationReason, string> = {
  prayer_request:    "bg-violet-50 border-violet-200 text-violet-800",
  counseling:        "bg-red-50 border-red-200 text-red-800",
  salvation_inquiry: "bg-amber-50 border-amber-200 text-amber-800",
  grief_or_crisis:   "bg-red-100 border-red-300 text-red-900",
  baptism_request:   "bg-blue-50 border-blue-200 text-blue-800",
  manual_escalation: "bg-orange-50 border-orange-200 text-orange-800",
};

export const ESCALATION_ICONS: Record<EscalationReason, string> = {
  prayer_request:    "Hands",
  counseling:        "HeartHandshake",
  salvation_inquiry: "Cross",
  grief_or_crisis:   "AlertTriangle",
  baptism_request:   "Droplets",
  manual_escalation: "UserCog",
};

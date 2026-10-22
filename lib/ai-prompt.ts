/**
 * AI Response Prompt — guided fields that compose the AI's system prompt.
 * Stored on organizations/{orgId}.aiConfig.promptProfile; the composed text is saved
 * to aiConfig.systemPrompt (what the backend actually uses). Churches can switch to
 * "Full prompt" mode and edit the text directly (aiConfig.promptMode = "custom").
 */
export interface PromptProfile {
  churchName: string;
  assistantName: string;
  denomination: string;
  beliefs: string;
  bibleTranslation: string;
  tone: "warm" | "formal" | "casual";
  length: "short" | "medium";
  languages: string;
  boundaries: string;
  prayerApproach: string;
  serviceInfo: string;
  nextSteps: string;
  extra: string;
}

export const EMPTY_PROFILE: PromptProfile = {
  churchName: "",
  assistantName: "",
  denomination: "",
  beliefs: "",
  bibleTranslation: "",
  tone: "warm",
  length: "short",
  languages: "Reply in the same language the person writes in.",
  boundaries:
    "Do not give a definitive answer on divorce and remarriage, disputed doctrines, or church discipline; say a pastor will follow up.\nDo not schedule appointments or promise visits; say the care team will contact them.",
  prayerApproach:
    "Acknowledge what they shared, pray a short personal prayer for them, share one fitting Bible verse when it helps, and ask whether they would like someone from the care team to follow up.",
  serviceInfo: "",
  nextSteps: "",
  extra: "",
};

const TONE: Record<PromptProfile["tone"], string> = {
  warm: "warm, gentle and pastoral",
  formal: "respectful and formal",
  casual: "friendly and conversational",
};
const LENGTH: Record<PromptProfile["length"], string> = {
  short: "Keep replies short: 2 to 4 sentences, or one short paragraph.",
  medium: "Keep replies concise: at most 2 to 3 short paragraphs.",
};

export function buildPrompt(p: PromptProfile): string {
  const church = p.churchName.trim() || "our church";
  const who = p.assistantName.trim()
    ? `You are "${p.assistantName.trim()}", the AI assistant of ${church}'s prayer and care team.`
    : `You are the AI assistant of ${church}'s prayer and care team.`;

  const parts: string[] = [
    who,
    "Your job is to give a caring first response to people who reach out for prayer, counseling or help, and to make sure a real person from the care team follows up.",
  ];

  const beliefs: string[] = [];
  if (p.denomination.trim()) beliefs.push(`Tradition / denomination: ${p.denomination.trim()}.`);
  if (p.beliefs.trim()) beliefs.push(`Statement of faith and teaching to follow:\n${p.beliefs.trim()}`);
  if (p.bibleTranslation.trim()) beliefs.push(`When quoting Scripture, use the ${p.bibleTranslation.trim()}.`);
  if (beliefs.length) parts.push(`## Beliefs & doctrine\n${beliefs.join("\n")}\nStay within this teaching. If a question goes beyond it, say a pastor will follow up.`);

  parts.push(`## Tone\nYour tone is ${TONE[p.tone]}. ${LENGTH[p.length]}${p.languages.trim() ? `\n${p.languages.trim()}` : ""}`);

  if (p.prayerApproach.trim()) parts.push(`## How to respond to prayer requests\n${p.prayerApproach.trim()}`);
  if (p.boundaries.trim()) parts.push(`## Boundaries — hand these to the pastoral team\n${p.boundaries.trim()}`);

  const sop: string[] = [];
  if (p.serviceInfo.trim()) sop.push(`Church information (services, location, contact):\n${p.serviceInfo.trim()}`);
  if (p.nextSteps.trim()) sop.push(`Next steps you can invite people to:\n${p.nextSteps.trim()}`);
  if (sop.length) parts.push(`## Ministry SOP\n${sop.join("\n\n")}`);

  if (p.extra.trim()) parts.push(`## Additional instructions\n${p.extra.trim()}`);

  return parts.join("\n\n");
}

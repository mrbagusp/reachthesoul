import type { Metadata } from "next";
import { SEOLandingPage } from "@/components/seo/SEOLandingPage";

export const metadata: Metadata = {
  title: "Prayer CRM — Track Every Prayer Request & Follow-Up",
  description: "Stop losing prayer requests in WhatsApp groups. ReachTheSoul is a prayer CRM that tracks every request, assigns follow-ups, and ensures no one is forgotten. Free to start.",
  keywords: ["prayer CRM", "prayer request management", "prayer tracking software", "church prayer management", "prayer follow up system", "prayer request tracker"],
  openGraph: {
    title: "Prayer CRM — Track Every Prayer Request & Follow-Up | ReachTheSoul",
    description: "Stop losing prayer requests in WhatsApp groups. A CRM built specifically for prayer ministry teams.",
    url: "https://reachthesoul.org/prayer-crm",
  },
};

export default function PrayerCRMPage() {
  return (
    <SEOLandingPage
      badge="Prayer CRM"
      headline="Your church receives dozens of prayer requests.<br/><em>How many actually get a follow-up?</em>"
      subheadline="ReachTheSoul is a prayer CRM that turns every request into a tracked conversation — so no one who reaches out is ever forgotten."
      heroStats={[
        { value: "70%", label: "Prayer requests never followed up" },
        { value: "< 1 min", label: "AI first response time" },
        { value: "100%", label: "Follow-up rate with RTS" },
      ]}
      problemTitle="The prayer request black hole"
      problemBody={`
        <p>We talked to churches of every size — 50 members to 5,000. The pattern was always the same.</p>
        <p>Prayer requests come in through <strong>WhatsApp groups, Instagram DMs, Sunday cards, phone calls, and walk-ins</strong>. They're scattered across five different phones, three notebooks, and someone's memory.</p>
        <p>A counselor screenshots a request and means to follow up. But by Wednesday, it’s buried under 200 new messages. The person who poured their heart out? They never hear back.</p>
        <p>This isn’t a heart problem. Your team cares deeply. <strong>It’s a systems problem.</strong> You don’t have a prayer CRM — you have prayer chaos.</p>
      `}
      problemStats={[
        { stat: "70%+", desc: "Prayer requests in most churches never receive a follow-up response." },
        { stat: "5+", desc: "Different channels where prayer requests arrive — scattered, untracked." },
        { stat: "0", desc: "Churches we've met that had a real system before ReachTheSoul." },
      ]}
      solutionTitle="A CRM built for prayer, not sales"
      solutionBody="ReachTheSoul is the prayer CRM your ministry team has been doing without. Every prayer request — from any channel — becomes a tracked ticket with an owner, a follow-up date, and a complete conversation history."
      features={[
        { icon: "🎫", title: "Every request becomes a ticket", desc: "WhatsApp message, Instagram DM, website form, phone call — everything flows into one inbox and becomes a tracked ticket with priority, category, and assignee." },
        { icon: "👤", title: "Respondent profiles", desc: "Every person who reaches out gets a comprehensive profile. Their prayer history, counseling sessions, progress steps, and notes — all in one place. Your counselors never start from zero." },
        { icon: "🤖", title: "AI first response", desc: "While your team is unavailable, our AI responds instantly with empathy, Scripture, and genuine care. Not a chatbot — an AI trained for pastoral conversation." },
        { icon: "📊", title: "Dashboard & reports", desc: "How many requests this week? Which channels produce the most? Who on your team needs help? Real data for real pastoral decisions." },
        { icon: "🔔", title: "Follow-up reminders", desc: "Every ticket has a follow-up date. Your team gets reminders. Leadership sees what's open. Nothing slips through the cracks." },
        { icon: "⚡", title: "Crisis escalation", desc: "When AI detects self-harm, suicidal language, or severe distress — it instantly alerts your pastoral team via WhatsApp. No delay." },
      ]}
      steps={[
        { num: "1", title: "Connect your channels", desc: "Link WhatsApp, Instagram, Facebook, or your website chat. Takes 3 minutes." },
        { num: "2", title: "Requests flow in", desc: "Every prayer request automatically becomes a tracked ticket in your dashboard." },
        { num: "3", title: "AI responds instantly", desc: "Your AI counselor provides immediate care while your team is notified." },
        { num: "4", title: "Team follows up", desc: "Counselors pick up with full context. Schedule follow-ups. Track progress. Nobody forgotten." },
      ]}
      whyTitle="Why churches choose ReachTheSoul over spreadsheets"
      whyPoints={[
        { title: "Built for ministry, not sales teams", desc: "Unlike Salesforce or HubSpot, ReachTheSoul speaks the language of pastoral care. Prayer points, not deals. Respondents, not leads. Progress steps, not pipeline stages." },
        { title: "AI that prays, not just replies", desc: "Our AI doesn’t send generic auto-responses. It listens, empathizes, shares Scripture, and knows when to escalate to a human. Trained specifically for pastoral conversation." },
        { title: "WhatsApp-first (because that’s where your people are)", desc: "Most church communication happens on WhatsApp — not email. ReachTheSoul is built around WhatsApp from day one, with Instagram, Facebook, and website chat as bonus channels." },
        { title: "Founding Church pricing — locked forever", desc: "Churches that join now keep their pricing permanently as founding partners. Start free, upgrade to $29/mo when ready. Prices will increase for future subscribers." },
      ]}
      ctaTitle="Stop losing prayer requests"
      ctaDesc="Start free. Connect WhatsApp. See every prayer request in one dashboard. Your first 50 respondents are free — forever."
      schemaType="SoftwareApplication"
      schemaName="ReachTheSoul Prayer CRM"
      schemaDesc="AI-powered prayer request management CRM for churches and ministries. Track every prayer request, assign follow-ups, and ensure no one is forgotten."
    />
  );
}

import type { Metadata } from "next";
import { SEOLandingPage } from "@/components/seo/SEOLandingPage";

export const metadata: Metadata = {
  title: "Pastoral Care Platform — Manage Your Entire Pastoral Care Workflow",
  description: "The complete pastoral care platform for churches. Track respondents, manage prayer requests, coordinate counseling, and monitor team performance. AI-powered. WhatsApp-ready.",
  keywords: ["pastoral care platform", "pastoral care software", "pastoral care management", "church care management", "pastoral care tracking", "church pastoral care system"],
  openGraph: {
    title: "Pastoral Care Platform — Complete Church Care Infrastructure | ReachTheSoul",
    description: "From first contact to long-term discipleship. One platform for your entire pastoral care workflow.",
    url: "https://reachthesoul.org/pastoral-care-platform",
  },
};

export default function PastoralCarePlatformPage() {
  return (
    <SEOLandingPage
      badge="Pastoral Care Platform"
      headline="Pastoral care is the heart of your church.<br/><em>It deserves more than a spreadsheet.</em>"
      subheadline="ReachTheSoul is the pastoral care platform that tracks every person, every conversation, and every follow-up — from first contact to long-term spiritual growth."
      heroStats={[
        { value: "100%", label: "Follow-up rate" },
        { value: "1", label: "Unified dashboard" },
        { value: "24/7", label: "AI first response" },
      ]}
      problemTitle="Pastoral care without a system is pastoral care without accountability"
      problemBody={`
        <p>We've seen the pattern in hundreds of churches. The senior pastor asks: <strong>"How many people reached out for help this month?"</strong> And nobody can answer with a real number.</p>
        <p>Counseling notes live in someone's personal notebook. Prayer requests are scattered across WhatsApp groups. Follow-up commitments exist only in someone's memory. There's no visibility, no accountability, no way to know if someone slipped through the cracks.</p>
        <p>Meanwhile, the people who reached out — the single mom struggling with depression, the teenager questioning their faith, the couple on the edge of divorce — they're waiting. And hoping someone remembers them.</p>
        <p><strong>Good intentions without a system will always produce inconsistent results.</strong> Your people deserve better. Your team deserves better.</p>
      `}
      problemStats={[
        { stat: "0%", desc: "Visibility most pastors have into their pastoral care pipeline. No dashboard. No data. No accountability." },
        { stat: "5", desc: "Average number of places where pastoral care data is scattered — notebooks, phones, WhatsApp, email, memory." },
        { stat: "87%", desc: "Of church visitors who don't return say they didn't feel cared for personally. Follow-up matters." },
      ]}
      solutionTitle="The pastoral care operating system your church needs"
      solutionBody="ReachTheSoul brings every aspect of pastoral care into one platform. Not just prayer requests — the entire lifecycle of caring for your people. From the moment they reach out to their ongoing spiritual journey."
      features={[
        { icon: "👤", title: "Comprehensive respondent profiles", desc: "Every person who reaches out gets a full profile. Contact info, prayer history, counseling sessions, progress steps, notes, lead source, and family connections. Your team sees the whole person, not just a message." },
        { icon: "🎫", title: "Ticket-based care tracking", desc: "Every interaction becomes a tracked ticket — categorized, prioritized, assigned, and scheduled for follow-up. Leadership sees the full pipeline: open, in progress, resolved. Nothing invisible." },
        { icon: "📊", title: "Customizable progress steps", desc: "Define your own pastoral care journey — Data, Prayer, Counseling, Salvation, Discipleship, or whatever fits your church. Track where each person is and celebrate their progress." },
        { icon: "📱", title: "Omnichannel inbox", desc: "WhatsApp, Instagram, Facebook, website chat, phone calls — every channel flows into one inbox. Your team doesn't need to monitor five different apps." },
        { icon: "🤖", title: "AI first response + human handoff", desc: "AI ensures no message goes unanswered. It provides immediate empathetic care, identifies the situation, and seamlessly hands off to your counselor with full context." },
        { icon: "🏢", title: "Multi-campus support", desc: "Each location gets their own workspace — own team, own respondents, own data. But leadership sees the cross-campus dashboard. One subscription for your entire ministry network." },
      ]}
      steps={[
        { num: "1", title: "Create your workspace", desc: "3 minutes to set up. Add your church name, invite your team, configure your AI personality." },
        { num: "2", title: "Connect your channels", desc: "Link WhatsApp, Instagram, Facebook, or embed a chat widget on your website." },
        { num: "3", title: "Care flows automatically", desc: "Every message becomes a ticket. AI responds instantly. Your team follows up with full context." },
        { num: "4", title: "Track the journey", desc: "Monitor progress steps, review dashboards, generate reports. Data-driven pastoral care without losing the human touch." },
      ]}
      whyTitle="Why pastoral teams love ReachTheSoul"
      whyPoints={[
        { title: "Finally, real visibility for leadership", desc: "Senior pastors can see exactly how many people reached out, which cases are open, who needs urgent attention, and how the team is performing. Real data for real leadership decisions." },
        { title: "Your counselors are more effective", desc: "When a counselor opens a case, they see the full history — previous AI conversations, past sessions, prayer points, family context. They don't waste the first 10 minutes catching up." },
        { title: "Nobody falls through the cracks", desc: "Every request gets a ticket. Every ticket gets an owner. Every owner gets reminders. It's not that your team didn't care before — they just didn't have a system that matched their heart." },
        { title: "Scales with your church", desc: "Start free with 1 user and 50 respondents. Grow to 15 users and 2,000 respondents on Growth. Scale to unlimited with Enterprise. The platform grows as your ministry grows." },
      ]}
      ctaTitle="Build a pastoral care system worthy of your people"
      ctaDesc="From first contact to long-term discipleship. One platform. One dashboard. Every person cared for."
      schemaType="SoftwareApplication"
      schemaName="ReachTheSoul Pastoral Care Platform"
      schemaDesc="Complete pastoral care management platform for churches. Respondent profiles, ticket tracking, AI first response, progress steps, multi-campus support, and comprehensive reporting."
    />
  );
}

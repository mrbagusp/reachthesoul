import type { Metadata } from "next";
import { SEOLandingPage } from "@/components/seo/SEOLandingPage";

export const metadata: Metadata = {
  title: "Church Counseling Software — AI-Powered Pastoral Counseling Platform",
  description: "Manage counseling conversations across WhatsApp, Instagram & web. AI provides instant first response, detects crisis situations, and escalates to your pastoral team. Built for churches.",
  keywords: ["church counseling software", "pastoral counseling platform", "christian counseling software", "church counseling management", "online counseling for churches", "pastoral care software"],
  openGraph: {
    title: "Church Counseling Software — AI-Powered Pastoral Care | ReachTheSoul",
    description: "AI handles the first response. Your team handles the deeper care. No message left unanswered.",
    url: "https://reachthesoul.org/church-counseling-software",
  },
};

export default function ChurchCounselingSoftwarePage() {
  return (
    <SEOLandingPage
      badge="Church Counseling Software"
      headline="Your counselors can't be available 24/7.<br/><em>But your counseling system can.</em>"
      subheadline="ReachTheSoul gives your pastoral counseling team a platform that responds instantly, tracks every conversation, and never lets a cry for help go unanswered."
      heroStats={[
        { value: "24/7", label: "AI first response" },
        { value: "< 1 min", label: "Response time" },
        { value: "0", label: "Messages left unanswered" },
      ]}
      problemTitle="The counseling gap nobody talks about"
      problemBody={`
        <p>Your church has counselors. Good ones. People who genuinely care, who give their time, who sit with people in their darkest moments.</p>
        <p>But they can't be everywhere. They can't answer WhatsApp at 2 AM. They can't respond to every Instagram DM within minutes. They can't remember every detail from a counseling session three months ago.</p>
        <p>So what happens? <strong>Someone sends a desperate message on a Tuesday night. Nobody sees it until Thursday.</strong> By then, the moment has passed — and so has the trust.</p>
        <p>Or worse: someone expresses thoughts of self-harm, and it sits in an unread message queue for hours. That's not a counseling failure. That's a <strong>systems failure</strong>.</p>
      `}
      problemStats={[
        { stat: "2 AM", desc: "The most common time people reach out with crisis messages. When nobody's watching the inbox." },
        { stat: "48 hrs", desc: "Average response time for prayer requests in churches without a system. Two days of silence." },
        { stat: "3x", desc: "People are 3x more likely to open up digitally than in person. Your inbox is your counseling room." },
      ]}
      solutionTitle="Counseling software that never sleeps"
      solutionBody="ReachTheSoul is not replacing your counselors — it's making sure every person gets immediate care while your team prepares to provide deeper support. AI handles the first response. Your team handles the rest."
      features={[
        { icon: "🤖", title: "AI first responder", desc: "When someone reaches out, AI responds within seconds — with empathy, with Scripture, with genuine listening. Not a chatbot. An AI trained for pastoral conversation that knows when to comfort and when to escalate." },
        { icon: "⚡", title: "Crisis detection & escalation", desc: "AI detects signs of self-harm, suicidal ideation, severe distress, or urgent need. Instantly sends a WhatsApp alert to your on-call counselor with full context. No delay. No missed signals." },
        { icon: "📋", title: "Complete counseling history", desc: "Every conversation is saved. Every session documented. When a counselor picks up, they see the full history — AI conversations, previous sessions, prayer points, progress. No more 'so what's your situation again?'" },
        { icon: "📱", title: "Meet people where they are", desc: "WhatsApp, Instagram DM, Facebook Messenger, website chat — people reach out on whatever feels comfortable. All messages flow into one counseling inbox." },
        { icon: "📈", title: "Track counseling progress", desc: "Custom progress steps for each respondent. From first contact through counseling, recommitment, and follow-up. Visualize the journey. Celebrate the wins." },
        { icon: "🔒", title: "Confidential & role-based", desc: "Role-based access ensures only authorized counselors see sensitive conversations. Admin, supervisor, agent roles. Complete audit trail." },
      ]}
      steps={[
        { num: "1", title: "Someone reaches out", desc: "Via WhatsApp, Instagram, or your website. Any time of day or night." },
        { num: "2", title: "AI responds instantly", desc: "Empathetic, Scripture-grounded first response. Listens, comforts, identifies the situation." },
        { num: "3", title: "Crisis? Instant escalation", desc: "AI detects urgency and sends WhatsApp alert to your pastoral team — within seconds." },
        { num: "4", title: "Counselor continues with context", desc: "Your team picks up the conversation with full history. Schedules follow-up. Tracks progress over time." },
      ]}
      whyTitle="Why churches switch to ReachTheSoul"
      whyPoints={[
        { title: "AI that understands pastoral context", desc: "Our AI doesn't give generic advice. It's trained on pastoral counseling patterns — knowing when to share Scripture, when to simply listen, and when human intervention is critical." },
        { title: "Not a replacement — a partner", desc: "ReachTheSoul doesn't replace your counselors. It ensures no message goes unanswered while your team is unavailable, and gives them full context when they're ready to engage." },
        { title: "Crisis response that saves lives", desc: "When someone types 'I can't do this anymore' at 2 AM, our AI doesn't just reply with nice words. It immediately alerts your pastoral team via WhatsApp. Some churches have told us this feature alone is worth the entire subscription." },
        { title: "HIPAA-mindful data handling", desc: "Pastoral conversations are sacred. Role-based access, encrypted storage, org-level data isolation. Your congregation's trust is our highest priority." },
      ]}
      ctaTitle="Give your counseling team superpowers"
      ctaDesc="AI handles the first response. Your team handles the deeper care. Together, no one is ever forgotten."
      schemaType="SoftwareApplication"
      schemaName="ReachTheSoul Church Counseling Software"
      schemaDesc="AI-powered church counseling and pastoral care software. Instant AI response, crisis detection, WhatsApp escalation, and comprehensive counseling history tracking."
    />
  );
}

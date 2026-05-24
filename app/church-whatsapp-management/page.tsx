import type { Metadata } from "next";
import { SEOLandingPage } from "@/components/seo/SEOLandingPage";

export const metadata: Metadata = {
  title: "Church WhatsApp Management — One Inbox for All Your Ministry Messages",
  description: "Stop managing church WhatsApp from personal phones. ReachTheSoul connects your WhatsApp Business to a shared dashboard with AI auto-reply, ticket tracking, and team collaboration.",
  keywords: ["church WhatsApp management", "church WhatsApp integration", "WhatsApp ministry", "church WhatsApp CRM", "WhatsApp for churches", "church messaging platform", "ministry WhatsApp management"],
  openGraph: {
    title: "Church WhatsApp Management — Shared Inbox with AI Auto-Reply | ReachTheSoul",
    description: "Your church WhatsApp shouldn't live on one person's phone. Shared inbox. AI auto-reply. Team collaboration.",
    url: "https://reachthesoul.org/church-whatsapp-management",
  },
};

export default function ChurchWhatsAppManagementPage() {
  return (
    <SEOLandingPage
      badge="Church WhatsApp Management"
      headline="Your church WhatsApp shouldn't live<br/><em>on one person's phone.</em>"
      subheadline="ReachTheSoul connects your WhatsApp Business to a shared team dashboard — with AI auto-reply, ticket tracking, and zero messages lost."
      heroStats={[
        { value: "∞", label: "Incoming WA messages included" },
        { value: "< 1 min", label: "AI auto-reply" },
        { value: "1", label: "Shared inbox for the whole team" },
      ]}
      problemTitle="The WhatsApp chaos inside every church"
      problemBody={`
        <p>Let's be honest about what's really happening with WhatsApp in your church right now.</p>
        <p>Prayer requests come into <strong>three different phones</strong>. The senior pastor's personal WhatsApp. The church admin's phone. A shared phone that nobody can find on Sundays.</p>
        <p>There are at least <strong>five WhatsApp groups</strong> — prayer team, pastoral team, admin, volunteers, and that one group nobody remembers creating. Messages cross-post between them. Things get missed. People double-respond. Or worse — nobody responds at all.</p>
        <p>When someone messages the church number at 10 PM, it sits there until whoever has the phone checks it. Maybe tomorrow morning. Maybe never, if the phone is on silent.</p>
        <p><strong>WhatsApp is the most powerful ministry tool your church has. But without a system, it’s also the most chaotic.</strong></p>
      `}
      problemStats={[
        { stat: "3+", desc: "Number of personal phones managing church WhatsApp messages in most churches." },
        { stat: "200+", desc: "Unread messages in the average church WhatsApp group at any given time." },
        { stat: "0", desc: "Accountability for who responded to what. No tracking. No history. No dashboard." },
      ]}
      solutionTitle="WhatsApp management built for ministry teams"
      solutionBody="ReachTheSoul connects your WhatsApp Business API to a shared dashboard that your entire pastoral team can access — from any device, with AI handling the first response."
      features={[
        { icon: "📱", title: "Shared team inbox", desc: "Every WhatsApp message arrives in one dashboard. Multiple team members can see, respond, and collaborate — no more passing phones around or forwarding screenshots." },
        { icon: "🤖", title: "AI auto-reply 24/7", desc: "When your team is unavailable, AI responds with empathetic, Scripture-based care. Visitors feel heard instantly — even at 2 AM. AI identifies the situation and flags what needs human attention." },
        { icon: "🎫", title: "Auto-ticket creation", desc: "Every WhatsApp conversation automatically becomes a tracked ticket. Categorized, prioritized, assigned to a team member. No manual data entry needed." },
        { icon: "👤", title: "Respondent recognition", desc: "Returning contacts are automatically matched to their profile. Your counselor sees their full history before responding — previous conversations, prayer points, progress." },
        { icon: "📊", title: "Message analytics", desc: "How many messages this week? Average response time? Which team member handles the most conversations? Real data for your ministry." },
        { icon: "⚡", title: "Crisis escalation", desc: "When AI detects a crisis message — self-harm, suicidal language, emergency — it sends an instant WhatsApp alert to your designated pastoral team member." },
      ]}
      steps={[
        { num: "1", title: "Connect WhatsApp Business", desc: "We set up your WhatsApp Business API connection. You keep your existing number. Takes less than 12 hours." },
        { num: "2", title: "Team accesses the dashboard", desc: "Your pastoral team logs in from any device. All WhatsApp messages visible in one shared inbox." },
        { num: "3", title: "AI handles first response", desc: "Incoming messages get an instant AI reply. Your team is notified. Tickets are created automatically." },
        { num: "4", title: "Team follows up personally", desc: "Counselors respond with full context. Schedule follow-ups. Track progress. No message is ever lost." },
      ]}
      whyTitle="Why churches move their WhatsApp to ReachTheSoul"
      whyPoints={[
        { title: "No more phone dependency", desc: "When the admin is on vacation, WhatsApp doesn’t stop. When the pastor changes phones, nothing is lost. The system runs on the platform, not on personal devices." },
        { title: "Unlimited incoming messages", desc: "Every plan includes unlimited incoming WhatsApp messages. Your respondents can message as much as they need. You only pay for outbound initiative conversations." },
        { title: "Works alongside Instagram & Facebook", desc: "ReachTheSoul isn’t just WhatsApp — it’s omnichannel. Instagram DMs, Facebook messages, and website chat all flow into the same inbox. One dashboard for all your digital ministry." },
        { title: "We set it up for you", desc: "WhatsApp Business API integration can be tricky. We handle the entire setup for you — within 12 hours of signing up. No technical knowledge required." },
      ]}
      ctaTitle="Take your church WhatsApp from chaos to clarity"
      ctaDesc="Shared inbox. AI auto-reply. Ticket tracking. Zero messages lost. We set it up for you."
      schemaType="SoftwareApplication"
      schemaName="ReachTheSoul Church WhatsApp Management"
      schemaDesc="Church WhatsApp management platform with shared team inbox, AI auto-reply, automatic ticket creation, and crisis escalation. Built for pastoral care teams."
    />
  );
}

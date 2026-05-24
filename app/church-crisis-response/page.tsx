import type { Metadata } from "next";
import { SEOLandingPage } from "@/components/seo/SEOLandingPage";

export const metadata: Metadata = {
  title: "Church Crisis Response System — AI Detects, Alerts, Saves Lives",
  description: "When someone sends your church a crisis message at 2 AM, who responds? ReachTheSoul's AI detects self-harm, suicidal intent, and severe distress — then instantly alerts your pastoral team via WhatsApp.",
  keywords: ["church crisis response", "church crisis management", "pastoral crisis response", "church suicide prevention", "church mental health", "crisis counseling church", "church emergency response system"],
  openGraph: {
    title: "Church Crisis Response System — AI That Detects & Escalates | ReachTheSoul",
    description: "AI detects crisis language. Instantly alerts your pastoral team via WhatsApp. Because some messages can't wait until morning.",
    url: "https://reachthesoul.org/church-crisis-response",
  },
};

export default function ChurchCrisisResponsePage() {
  return (
    <SEOLandingPage
      badge="Church Crisis Response"
      headline="Someone just messaged your church:<br/><em>\"I can't do this anymore.\"</em>"
      subheadline="It's 2 AM. Who responds? ReachTheSoul's AI detects crisis language, responds with immediate care, and alerts your pastoral team via WhatsApp — within seconds."
      heroStats={[
        { value: "< 30s", label: "Crisis detection & alert" },
        { value: "24/7", label: "Always watching" },
        { value: "0", label: "Crisis messages missed" },
      ]}
      problemTitle="The crisis messages your church is missing"
      problemBody={`
        <p>This is not hypothetical. This is happening in churches right now.</p>
        <p>A teenager sends an Instagram DM to the church account at 11 PM: <strong>"I don't want to be here anymore."</strong> Nobody sees it until the next morning. The social media volunteer doesn't know what to do. They screenshot it and send it to a WhatsApp group. The counselor sees it at lunch. By then, it's been 15 hours.</p>
        <p>A widow messages the church WhatsApp at 3 AM during a panic attack. The automated response says: <strong>"Thank you for your message. We'll get back to you during business hours."</strong> Business hours. For a panic attack.</p>
        <p>Your church is not equipped for the crisis messages that come through digital channels. Not because your people don't care — but because <strong>no human team can monitor every channel, 24 hours a day, 7 days a week</strong>.</p>
        <p>But an AI can.</p>
      `}
      problemStats={[
        { stat: "2 AM", desc: "Peak time for crisis messages. The darkest thoughts come when everyone else is asleep." },
        { stat: "15 hrs", desc: "Average time between a crisis message and a human response in churches without an automated system." },
        { stat: "79%", desc: "Of people who attempt suicide showed warning signs beforehand. Digital messages are often those signs." },
      ]}
      solutionTitle="AI crisis detection that never sleeps"
      solutionBody="ReachTheSoul's AI doesn't just respond to messages — it reads between the lines. It's trained to detect signs of self-harm, suicidal ideation, severe depression, panic attacks, domestic violence, and other crisis situations. And when it detects one, it acts immediately."
      features={[
        { icon: "🧠", title: "Trained for crisis language", desc: "Our AI recognizes patterns that indicate crisis — direct statements ('I want to end it'), indirect signals ('nobody would miss me'), emotional escalation, and contextual cues across multiple messages." },
        { icon: "⚡", title: "Instant WhatsApp escalation", desc: "The moment AI detects a crisis, it sends a WhatsApp alert to your designated on-call pastoral team member — with the person's name, message content, and conversation context. Within seconds, not hours." },
        { icon: "💬", title: "Immediate empathetic response", desc: "While alerting your team, AI simultaneously responds to the person with genuine care. Not 'we'll get back to you.' Real empathy. Real Scripture. Real acknowledgment of their pain." },
        { icon: "📋", title: "Urgent ticket creation", desc: "A high-priority ticket is automatically created, marked as crisis, and assigned to your senior counselor. Complete audit trail for accountability and follow-up." },
        { icon: "📞", title: "Call integration ready", desc: "For churches with call integration enabled, the system can initiate an immediate callback to the person in crisis. Human voice within minutes." },
        { icon: "📊", title: "Crisis analytics", desc: "How many crisis situations this month? What channels do they come from? What times? What patterns? Data that helps your church be more proactively prepared." },
      ]}
      steps={[
        { num: "1", title: "Message arrives", desc: "Someone reaches out via WhatsApp, Instagram, or website — at any hour, day or night." },
        { num: "2", title: "AI analyzes in real-time", desc: "AI reads the message, identifies emotional state, and detects crisis indicators." },
        { num: "3", title: "Crisis detected → instant alert", desc: "WhatsApp notification sent to your pastoral team within seconds. Full context included." },
        { num: "4", title: "Human counselor engages", desc: "Your team responds with full AI conversation history. The person in crisis knows they're not alone." },
      ]}
      whyTitle="Why this matters more than any other feature"
      whyPoints={[
        { title: "One caught message can save a life", desc: "We built this feature because we heard too many stories of missed messages. A teenager's DM that sat unread. A midnight text that nobody saw. These aren't edge cases — they happen every week in churches worldwide." },
        { title: "Your volunteers aren't trained for crisis", desc: "The person monitoring your church Instagram is probably a volunteer. They see 'I can't do this anymore' and don't know if it's a bad day or a suicide risk. AI removes the guesswork and escalates to trained counselors instantly." },
        { title: "Liability protection for your church", desc: "Having a documented crisis response system with audit trails protects your church legally. Every detection, every alert, every response is logged." },
        { title: "Complements — doesn't replace — your care team", desc: "AI is the detection layer. Your pastors and counselors are the care layer. Together, they form a crisis response system that operates 24/7/365." },
      ]}
      ctaTitle="Because some messages can't wait until morning"
      ctaDesc="AI detects crisis. Instantly alerts your team. Your counselor responds with full context. Every minute matters."
      schemaType="SoftwareApplication"
      schemaName="ReachTheSoul Church Crisis Response System"
      schemaDesc="AI-powered church crisis response system. Detects self-harm, suicidal intent, and severe distress in incoming messages. Instantly escalates to pastoral team via WhatsApp alert."
    />
  );
}

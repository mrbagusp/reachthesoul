import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ReachTheSoul — Prayer & Counseling CRM that Follows Every Soul from First Message to Lasting Faith',
    template: '%s | ReachTheSoul',
  },
  description: 'Make sure no prayer request, counseling need, or faith decision goes unanswered. ReachTheSoul is a prayer and counseling CRM with an omnichannel inbox — WhatsApp, Instagram, Facebook, website chat, and voice calls — with 24/7 AI first response and human counselor escalation. Then track each person\'s journey from first message through prayer, counseling, and spiritual growth, so no one is followed up once and forgotten. Built for churches and ministries of any size.',
  other: {
    'facebook-domain-verification': '9qqpzy8cg5bd70dh0mpvyhvjaxnpr0',
  },
  keywords: [
    // Journey & discipleship — THE differentiator (what makes RTS unique)
    'pastoral care journey tracking', 'discipleship journey software',
    'soul journey tracking', 'faith journey follow up', 'new believer follow up',
    'discipleship tracking software', 'spiritual growth tracking',
    'salvation follow up', 'convert follow up software',
    'from first contact to discipleship', 'measure ministry outcomes',
    'ministry impact tracking', 'soul winning follow up', 'new convert care',

    // Primary — function-centered (what it IS, works for church AND ministry)
    'prayer and counseling software', 'prayer and counseling CRM', 'prayer and counseling platform',
    'prayer request management software', 'prayer center software', 'prayer center tool',
    'online prayer platform', 'church prayer management', 'christian prayer tool',

    // Follow-up / response system (the shared church + ministry need)
    'follow up system for church and ministry', 'prayer follow up system', 'ministry follow up software',
    'prayer response management', 'prayer response time', 'response operations ministry',
    '24/7 prayer response', 'prayer request never missed', 'no prayer goes unanswered',
    'church prayer follow up', 'prayer request tracking',

    // Omnichannel + AI + messaging (our unique advantage, long-tail / AEO)
    'omnichannel prayer inbox', 'prayer and counseling software WhatsApp',
    'prayer software with omnichannel call and whatsapp', 'church WhatsApp integration',
    'AI prayer response', 'automated prayer response', 'AI church counseling', 'AI pastoral care',
    'church omnichannel inbox', 'WhatsApp ministry',

    // Ministry / evangelism language (reaches media + evangelistic ministries, not just churches)
    'ministry response platform', 'digital evangelism tools', 'evangelism follow up software',
    'decision follow up software', 'altar call follow up', 'media ministry software',
    'high volume prayer requests', 'ministry CRM',

    // Pastoral care
    'pastoral care software', 'pastoral care tool', 'pastoral care tracking', 'pastoral counseling software',
    'church member care', 'congregation care software', 'spiritual care platform', 'church care management',

    // Church management (kept — proven traffic)
    'church counseling software', 'church communication tool', 'ministry management software',
    'church CRM', 'church software', 'digital ministry tool', 'church engagement platform',
    'church outreach software',

    // Problem-based (what people feel)
    'reduce prayer response time', '24/7 prayer coverage', 'respond to prayer requests at night',
    'church crisis response', 'counseling notes software', 'church volunteer management',

    // Brand + variations + competitor alternatives
    'ReachTheSoul', 'reach the soul', 'prayer ministry software',
    'soul care software', 'church soul care', 'iPrayerCenter alternative',
    'Notebird alternative', 'CareNote alternative',
  ],
  authors: [{ name: 'ReachTheSoul', url: 'https://reachthesoul.org' }],
  creator: 'ReachTheSoul',
  publisher: 'ReachTheSoul',
  metadataBase: new URL('https://reachthesoul.org'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://reachthesoul.org',
    siteName: 'ReachTheSoul',
    title: 'ReachTheSoul — Every Prayer Heard. Every Soul Followed Home.',
    description: 'From first message to lasting faith — track every soul\'s journey. Prayer and counseling CRM for churches and ministries: omnichannel inbox (WhatsApp, Instagram, Facebook, website chat, voice calls), 24/7 AI first response, counseling journal, ministry progress steps, and follow-up that never forgets.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ReachTheSoul — Prayer & Counseling Platform for Churches and Ministries',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReachTheSoul — Every Prayer Heard. Every Soul Followed Home.',
    description: 'Track every soul from first message to lasting faith. Prayer & counseling CRM: omnichannel inbox (WhatsApp + Instagram + Facebook + calls), 24/7 AI first response, counseling journal, discipleship follow-up.',
    images: ['/og-image.png'],
    creator: '@reachthesoul',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'RYyJAK4FT8Ztg8SthQSDkUTPuunAhpm7b5Wb0EwLeFg',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  category: 'technology',
  classification: 'Prayer & Counseling Software, Ministry Tools, Church Software',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "ReachTheSoul",
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "Prayer, Counseling & Discipleship Journey CRM",
        "description": "Prayer and counseling CRM for churches and ministries. Make sure no prayer request, counseling need, or faith decision goes unanswered — with an omnichannel inbox (WhatsApp, Instagram, Facebook, website chat, voice calls), 24/7 AI first response, and seamless human counselor escalation. Then follow each person's journey from first message through prayer, counseling, and spiritual growth — so no one is followed up once and forgotten.",
        "url": "https://reachthesoul.org",
        "operatingSystem": "Web",
        "offers": [
          { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD", "description": "Website chat, 1 user, 50 respondents" },
          { "@type": "Offer", "name": "Starter", "price": "29", "priceCurrency": "USD", "description": "WhatsApp + AI auto-reply, 3 users, 500 respondents" },
          { "@type": "Offer", "name": "Growth", "price": "97", "priceCurrency": "USD", "description": "Omnichannel + advanced AI, 15 users, 2000 respondents" },
          { "@type": "Offer", "name": "Enterprise", "price": "249", "priceCurrency": "USD", "description": "Unlimited users, all channels, dedicated support" },
        ],
        "featureList": "Soul Journey Tracking, Counseling Journal, Discipleship Follow-up, Ministry Progress Steps, Outcome Tracking, Omnichannel Inbox, WhatsApp Integration, Instagram DM, Facebook Messenger, Website Chat, Voice Call Integration, 24/7 AI First Response, Crisis Detection, Human Counselor Escalation, Prayer Follow-up, Team Management",
      },
      {
        "@type": "Organization",
        "name": "ReachTheSoul",
        "url": "https://reachthesoul.org",
        "logo": "https://reachthesoul.org/og-image.png",
        "parentOrganization": {
          "@type": "Organization",
          "name": "Blessing Media Global"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "hello@reachthesoul.org",
          "contactType": "sales",
        },
        "sameAs": [],
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Can I track a person's journey from first contact to salvation?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes — this is what sets ReachTheSoul apart from a simple chatbot. Every person becomes a respondent profile with a full history: every conversation across every channel, a counseling journal, and ministry progress steps (from first contact through prayer, counseling, recommitment, salvation, and beyond). You see not just what was said, but where each soul is on their journey — and what follow-up they still need."
            }
          },
          {
            "@type": "Question",
            "name": "How is ReachTheSoul different from a church chatbot or shared inbox?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A chatbot answers a message and forgets it. A shared inbox routes conversations but loses the person once the chat closes. ReachTheSoul records the whole journey: it links every conversation to one person over time, tracks their spiritual progress and outcomes, and makes sure follow-up actually happens. It's the difference between answering messages and discipling people."
            }
          },
          {
            "@type": "Question",
            "name": "What is a prayer and counseling CRM?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A prayer and counseling CRM is software that helps churches and ministries receive, respond to, and follow up on every prayer request, counseling need, and faith decision in one place. ReachTheSoul does this with an omnichannel inbox, 24/7 AI first response, a counseling journal, and human counselor escalation — so no message is missed and every person is followed up."
            }
          },
          {
            "@type": "Question",
            "name": "Is there prayer and counseling software with omnichannel, calls, and WhatsApp?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. ReachTheSoul is a prayer and counseling platform with a single omnichannel inbox that brings WhatsApp, Instagram DM, Facebook Messenger, website chat, and voice calls together. AI provides an immediate first response 24/7, and conversations escalate to your human counselors for prayer, deeper counseling, or urgent situations."
            }
          },
          {
            "@type": "Question",
            "name": "How do I make sure no prayer request goes unanswered, even at night?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "ReachTheSoul provides 24/7 coverage: when a message arrives at any hour, the AI responds immediately with empathy, gathers context, and detects urgent or crisis situations. If your team is offline, it acknowledges the person, promises a follow-up time, and creates a prioritized ticket so a human follows up — ensuring no prayer request is ever missed."
            }
          },
          {
            "@type": "Question",
            "name": "Does the AI replace human counselors?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Never. The AI serves as a first responder — providing immediate care and empathy so no message goes unanswered. For prayer, deeper counseling, or urgent situations, it seamlessly escalates to your human team, who see the full conversation context."
            }
          },
          {
            "@type": "Question",
            "name": "Is ReachTheSoul for local churches or large ministries?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Both. Local churches and large media or evangelistic ministries share the same need: responding to and following up on spiritual conversations without letting anyone fall through the cracks. ReachTheSoul scales from a single church using website chat to high-volume ministries handling thousands of responses across every channel."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI be trained on our church's theology?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. You can customize the AI's system prompt to align with your church's doctrine, values, and pastoral approach — whether Reformed, Charismatic, Catholic, Evangelical, or any tradition."
            }
          },
          {
            "@type": "Question",
            "name": "What channels does ReachTheSoul support?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "WhatsApp, Instagram DM, Facebook Messenger, website chat, and voice calls. All messages flow into one unified inbox for your prayer and counseling team."
            }
          },
          {
            "@type": "Question",
            "name": "Is there a free plan?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. The Free plan is free forever with no credit card required. It includes website chat, 1 user, and 50 respondents. Upgrade anytime."
            }
          },
        ],
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
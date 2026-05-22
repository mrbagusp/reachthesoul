// ─── Seed Dummy Data for New Organizations ──────────────────────────
// Called after registration to give new users a feel for the dashboard.
// Creates 5 dummy respondents with realistic tickets and messages.

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

// ─── Dummy Respondents ───────────────────────────────────────────────

const DUMMY_RESPONDENTS = [
  {
    fullName: "(Demo) Sarah Johnson",
    phone: "+1-555-0101",
    email: "sarah.demo@example.com",
    city: "Dallas, TX",
    age: 34,
    leadSourceName: "WhatsApp",
    notes: "This is a demo respondent. Feel free to delete or archive when ready.",
    problemCategories: ["anxiety", "family"],
  },
  {
    fullName: "(Demo) David Okonkwo",
    phone: "+234-800-0002",
    email: "david.demo@example.com",
    city: "Lagos, Nigeria",
    age: 28,
    leadSourceName: "Instagram",
    notes: "Demo respondent — sample prayer request through Instagram DM.",
    problemCategories: ["career", "direction"],
  },
  {
    fullName: "(Demo) Maria Chen",
    phone: "+65-9000-0003",
    email: "maria.demo@example.com",
    city: "Singapore",
    age: 41,
    leadSourceName: "Website",
    notes: "Demo respondent — came through website chat widget.",
    problemCategories: ["grief", "loss"],
  },
  {
    fullName: "(Demo) James Park",
    phone: "+82-10-0004-0004",
    email: "james.demo@example.com",
    city: "Seoul, South Korea",
    age: 22,
    leadSourceName: "YouTube",
    notes: "Demo respondent — young adult seeking guidance after watching sermon online.",
    problemCategories: ["faith", "doubt"],
  },
  {
    fullName: "(Demo) Ana Rivera",
    phone: "+52-55-0005-0005",
    email: "ana.demo@example.com",
    city: "Mexico City, Mexico",
    age: 37,
    leadSourceName: "Referral",
    notes: "Demo respondent — referred by a friend from small group.",
    problemCategories: ["marriage", "relationship"],
  },
];

// ─── Dummy Tickets per Respondent ────────────────────────────────────

interface DummyTicket {
  subject: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved" | "closed";
  handledBy: "ai" | "human" | "escalated";
  messages: { sender: "respondent" | "ai" | "agent"; text: string }[];
}

const DUMMY_TICKETS: DummyTicket[][] = [
  // Sarah Johnson — 2 tickets
  [
    {
      subject: "Prayer for anxiety and sleepless nights",
      category: "Prayer Request",
      priority: "high",
      status: "in_progress",
      handledBy: "escalated",
      messages: [
        { sender: "respondent", text: "Hi, I've been struggling with really bad anxiety lately. I can't sleep at night and my thoughts keep racing. Can someone please pray for me?" },
        { sender: "ai", text: "Thank you for reaching out, Sarah. I'm so sorry to hear you're going through this. You are not alone — the Lord is close to the brokenhearted (Psalm 34:18). I'm praying for peace over your mind and restful sleep tonight. Would you like me to connect you with one of our counselors for a deeper conversation?" },
        { sender: "respondent", text: "Yes please, I think I need to talk to someone." },
        { sender: "agent", text: "Hi Sarah, this is Pastor Mike. I've read your message and I want you to know we care about you. Let's schedule a call this week — what time works best for you?" },
      ],
    },
    {
      subject: "Thank you for last week's prayer",
      category: "Testimony",
      priority: "low",
      status: "resolved",
      handledBy: "human",
      messages: [
        { sender: "respondent", text: "I just wanted to say thank you! After our call last week, I felt so much peace. I slept through the whole night for the first time in weeks. God is good!" },
        { sender: "agent", text: "Praise God, Sarah! That's wonderful to hear. We'll continue to keep you in our prayers. Don't hesitate to reach out anytime. 🙏" },
      ],
    },
  ],

  // David Okonkwo — 2 tickets
  [
    {
      subject: "Need direction for my career",
      category: "Counseling",
      priority: "medium",
      status: "open",
      handledBy: "ai",
      messages: [
        { sender: "respondent", text: "I just graduated university and I have no idea what to do next. I've been praying but I feel like God is silent. I need guidance." },
        { sender: "ai", text: "David, thank you for trusting us with this. Seasons of waiting can feel overwhelming, but remember — 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you' (Jeremiah 29:11). God's timing is perfect even when we can't see the path ahead. Would you like to speak with a counselor who can help you explore this further?" },
      ],
    },
    {
      subject: "Follow-up: career counseling session",
      category: "Follow-up",
      priority: "low",
      status: "in_progress",
      handledBy: "human",
      messages: [
        { sender: "agent", text: "Hi David, following up on our counseling session. How are you feeling about the action steps we discussed? Have you started the journaling exercise?" },
        { sender: "respondent", text: "Yes! I've been journaling every morning. It's been really helpful to write down what I'm grateful for. Still waiting to hear back from that job application though." },
        { sender: "agent", text: "That's great progress, David! Keep going with the journaling. And remember, God is working even in the waiting. Let me know how the application goes — we're praying for you!" },
      ],
    },
  ],

  // Maria Chen — 2 tickets
  [
    {
      subject: "Lost my mother last week",
      category: "Counseling",
      priority: "high",
      status: "in_progress",
      handledBy: "escalated",
      messages: [
        { sender: "respondent", text: "My mother passed away last Tuesday. I don't know how to cope. Everything feels empty. I need someone to talk to." },
        { sender: "ai", text: "Maria, I am deeply sorry for the loss of your mother. Grief is one of the hardest journeys, and you don't have to walk it alone. 'The Lord is close to the brokenhearted and saves those who are crushed in spirit' (Psalm 34:18). I'm connecting you with one of our grief counselors right now. They will reach out to you shortly. Please know that we are here for you. 🙏" },
        { sender: "agent", text: "Maria, my name is Sister Grace. I just read your message and my heart goes out to you. I'd love to listen and walk with you through this season. Can we talk tomorrow at 3pm your time?" },
      ],
    },
    {
      subject: "Grief support group inquiry",
      category: "General Inquiry",
      priority: "medium",
      status: "open",
      handledBy: "ai",
      messages: [
        { sender: "respondent", text: "Do you have any grief support groups? I think it would help to talk with others who understand what I'm going through." },
        { sender: "ai", text: "That's a really brave step, Maria. Community can be incredibly healing during grief. Let me check with our team about available grief support groups in your area or online. Someone will get back to you within 24 hours with options. You're doing the right thing by reaching out. 💛" },
      ],
    },
  ],

  // James Park — 1 ticket
  [
    {
      subject: "Struggling with faith and doubt",
      category: "Counseling",
      priority: "medium",
      status: "open",
      handledBy: "ai",
      messages: [
        { sender: "respondent", text: "I watched your pastor's sermon on YouTube about trusting God. But honestly, I'm struggling. I grew up in church but lately I've been questioning everything. Is it wrong to have doubts?" },
        { sender: "ai", text: "James, thank you for being so honest. Having doubts doesn't mean you've lost your faith — it often means your faith is growing deeper. Even in the Bible, people like Thomas and David had questions for God. 'Lord, I believe; help my unbelief!' (Mark 9:24). Your honesty is actually a sign of courage, not weakness. Would you like to explore these questions with one of our counselors? No judgment, just an open conversation." },
        { sender: "respondent", text: "That actually makes me feel a lot better. Yes, I'd like to talk to someone. Thank you." },
      ],
    },
  ],

  // Ana Rivera — 2 tickets
  [
    {
      subject: "Marriage struggles — need prayer",
      category: "Prayer Request",
      priority: "high",
      status: "in_progress",
      handledBy: "human",
      messages: [
        { sender: "respondent", text: "My husband and I have been fighting a lot. We have two kids and I'm afraid of what this is doing to them. I don't want our family to fall apart. Please pray for us." },
        { sender: "ai", text: "Ana, thank you for trusting us with something so personal. Marriage is precious and worth fighting for, and so is your family. 'Above all, love each other deeply, because love covers over a multitude of sins' (1 Peter 4:8). I'm lifting your family up in prayer right now. Would you and your husband be open to speaking with one of our marriage counselors?" },
        { sender: "respondent", text: "I would, but I'm not sure my husband will agree. Can I start on my own first?" },
        { sender: "agent", text: "Absolutely, Ana. You taking this step is already courageous. Let's start with you, and when the time is right, your husband is welcome to join. I'll send you some resources and we can schedule our first session. You're not alone in this. 🙏" },
      ],
    },
    {
      subject: "Small group recommendation for couples",
      category: "General Inquiry",
      priority: "low",
      status: "resolved",
      handledBy: "human",
      messages: [
        { sender: "respondent", text: "My friend Ana from church recommended your platform. Do you know of any couples' small groups we could join?" },
        { sender: "agent", text: "Welcome! We're glad Ana referred you. We have several couples' small groups meeting weekly — both in-person and online. Let me send you the details. Which day of the week works best for you and your partner?" },
        { sender: "respondent", text: "Wednesday or Thursday evenings would be great." },
        { sender: "agent", text: "Perfect! We have a 'Marriage Builders' group on Wednesdays at 7:30pm. I'll send you the link to register. Looking forward to having you both!" },
      ],
    },
  ],
];

// ─── Seed Function ───────────────────────────────────────────────────

export async function seedDummyData(
  db: Firestore,
  orgId: string,
  createdByUid: string,
) {
  const now = new Date();
  let ticketCounter = 0;

  for (let i = 0; i < DUMMY_RESPONDENTS.length; i++) {
    const resp = DUMMY_RESPONDENTS[i];
    const tickets = DUMMY_TICKETS[i];

    // Create respondent — stagger createdAt over past 14 days
    const respCreatedAt = new Date(now.getTime() - (14 - i * 3) * 24 * 60 * 60 * 1000);

    const respRef = await addDoc(collection(db, "respondents"), {
      orgId,
      fullName: resp.fullName,
      phone: resp.phone,
      email: resp.email,
      city: resp.city,
      age: resp.age,
      leadSourceId: "",
      leadSourceName: resp.leadSourceName,
      notes: resp.notes,
      problemCategories: resp.problemCategories,
      isArchived: false,
      isBlocked: false,
      ticketCount: tickets.length,
      firstContactDate: Timestamp.fromDate(respCreatedAt),
      createdAt: Timestamp.fromDate(respCreatedAt),
      updatedAt: Timestamp.fromDate(respCreatedAt),
      createdBy: createdByUid,
      progress: {
        currentStep: tickets.some((t) => t.status === "resolved") ? "Konseling" : "Data",
        steps: ["Data", "Doa", "Konseling", "Rekomitmen", "Salvation", "POP"],
        completedSteps: tickets.some((t) => t.status === "resolved") ? ["Data", "Doa"] : ["Data"],
        updatedAt: Timestamp.fromDate(respCreatedAt),
      },
    });

    // Create tickets for this respondent
    for (let t = 0; t < tickets.length; t++) {
      const ticket = tickets[t];
      ticketCounter++;

      const ticketCreatedAt = new Date(respCreatedAt.getTime() + t * 2 * 24 * 60 * 60 * 1000);
      const ticketNumber = `TIX-${String(ticketCounter).padStart(4, "0")}`;

      const ticketRef = await addDoc(collection(db, "tickets"), {
        orgId,
        ticketNumber,
        respondentId: respRef.id,
        respondentName: resp.fullName,
        assignedAgentId: ticket.handledBy === "human" || ticket.handledBy === "escalated" ? createdByUid : null,
        assignedAgentName: ticket.handledBy === "human" || ticket.handledBy === "escalated" ? "You" : null,
        status: ticket.status,
        categoryId: null,
        categoryName: ticket.category,
        interactionOutcomeId: null,
        outcomeName: null,
        leadSourceId: null,
        subject: ticket.subject,
        priority: ticket.priority,
        handledBy: ticket.handledBy,
        direction: "inbound",
        aiMessageCount: ticket.messages.filter((m) => m.sender === "ai").length,
        createdAt: Timestamp.fromDate(ticketCreatedAt),
        updatedAt: Timestamp.fromDate(ticketCreatedAt),
        resolvedAt: ticket.status === "resolved" ? Timestamp.fromDate(new Date(ticketCreatedAt.getTime() + 3 * 24 * 60 * 60 * 1000)) : null,
        createdBy: createdByUid,
      });

      // Create messages for this ticket
      for (let m = 0; m < ticket.messages.length; m++) {
        const msg = ticket.messages[m];
        const msgTime = new Date(ticketCreatedAt.getTime() + m * 15 * 60 * 1000); // 15 min apart

        await addDoc(collection(db, "tickets", ticketRef.id, "messages"), {
          ticketId: ticketRef.id,
          senderRole: msg.sender === "respondent" ? "respondent" : msg.sender === "ai" ? "ai" : "agent",
          senderName: msg.sender === "respondent"
            ? resp.fullName
            : msg.sender === "ai"
            ? "AI Counselor"
            : "You",
          senderId: msg.sender === "agent" ? createdByUid : msg.sender === "ai" ? "ai-system" : "respondent",
          text: msg.text,
          channel: resp.leadSourceName === "WhatsApp" ? "whatsapp"
            : resp.leadSourceName === "Instagram" ? "instagram"
            : resp.leadSourceName === "Website" ? "widget"
            : "manual",
          createdAt: Timestamp.fromDate(msgTime),
        });
      }
    }
  }

  // Update ticket counter
  const { setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "counters", `${orgId}_tickets`), {
    count: ticketCounter,
    orgId,
  }, { merge: true });

  console.log(`[Seed] Created ${DUMMY_RESPONDENTS.length} respondents, ${ticketCounter} tickets for org ${orgId}`);
}

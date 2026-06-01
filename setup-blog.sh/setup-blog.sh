#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ReachTheSoul — Blog AEO Setup (All-in-One)
# ═══════════════════════════════════════════════════════════════
#
#   1. Download file ini
#   2. Taruh di ROOT project reachthesoul (sejajar package.json)
#   3. Buka VS Code terminal
#   4. Jalankan:  bash setup-blog.sh
#   5. Selesai!
#
# ═══════════════════════════════════════════════════════════════

set -e

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ReachTheSoul — Blog & AEO Setup (All-in-One)"
echo "  Creating 5 articles + blog pages + SEO schema"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Cek lokasi ──────────────────────────────────────────
if [ ! -f "package.json" ]; then
  echo "❌ ERROR: package.json tidak ditemukan!"
  echo "   Pastikan kamu jalankan dari root project."
  echo "   Contoh: cd ~/projects/reachthesoul && bash setup-blog.sh"
  exit 1
fi
echo "✅ package.json ditemukan — lokasi benar."
echo ""

# ── Step 1: Install dependencies ────────────────────────
echo "📦 Step 1/5 — Installing dependencies..."
npm install next-mdx-remote gray-matter @tailwindcss/typography 2>/dev/null
echo "✅ Dependencies installed."
echo ""

# ── Step 2: Buat folder ────────────────────────────────
echo "📁 Step 2/5 — Creating folders..."
mkdir -p content/blog
mkdir -p "app/blog/[slug]"
echo "✅ Folders created."
echo ""

# ── Step 3: Buat 5 artikel ─────────────────────────────
echo "📝 Step 3/5 — Writing 5 blog articles..."

# ── ARTIKEL 1 ──────────────────────────────────────────
cat > content/blog/why-every-church-needs-a-crm.mdx << 'ARTICLE1'
---
title: "Why Every Church Needs a CRM (And Most Pastors Don't Realize It Until Someone Falls Through the Cracks)"
description: "Your church has a prayer and counseling ministry. But how many messages are sitting unanswered right now — buried under hundreds of chats? Here's why a CRM changes everything."
slug: "why-every-church-needs-a-crm"
date: "2026-06-01"
canonical: "https://reachthesoul.org/why-every-church-needs-a-crm"
ogImage: "/images/blog/why-church-needs-crm.jpg"
keywords:
  - church CRM
  - ministry CRM
  - church management software
  - prayer request management
  - do churches need a CRM
---

# Why Every Church Needs a CRM (And Most Pastors Don't Realize It Until Someone Falls Through the Cracks)

There's a moment most pastors know but rarely talk about.

Someone reaches out — maybe through WhatsApp, maybe through Instagram DM, maybe through an old contact form on the church website. They're struggling. They need prayer. They need someone to talk to. And they trusted your church enough to ask.

Then life happens. Sunday comes. Three other urgent things happen. And that message — the one from someone genuinely hurting — gets buried under a hundred other notifications and never gets answered.

Nobody meant to ignore them. But they were ignored anyway.

This is the quiet crisis inside churches that have a heart for ministry but no system behind it. And it's more common than most church leaders want to admit.

---

## What Is a Church CRM, Really?

When most pastors hear "CRM," they think of sales software. Cold calls. Lead pipelines. Corporate dashboards.

That's not what we're talking about.

A church CRM — at its core — is simply a system that makes sure no one who reaches out to your ministry gets forgotten. It organizes conversations, tracks where people are in their journey, and gives your team a shared view of who needs care and what's already been done.

Think of it less like a business tool and more like a pastoral care memory. One that doesn't forget, doesn't get overwhelmed, and doesn't go on vacation.

---

## The Real Problem: Ministry by Memory

Most churches run their outreach and counseling on a combination of good intentions and personal memory. The pastor knows who needs a follow-up call. A volunteer remembers that someone asked for prayer two weeks ago. Someone's WhatsApp inbox is the unofficial counseling intake form.

This works when the church is small enough. When one person can hold everything in their head.

But ministries grow. Channels multiply. People reach out through WhatsApp AND Instagram AND the church website AND email. And suddenly no single person can hold it all — and nobody knows what the others know.

**The messages start falling through the cracks. Not because nobody cares. Because there's no system.**

---

## 5 Signs Your Church Needs a CRM Right Now

You might not realize you need one until you see the pattern:

**1. Prayer requests come in through multiple channels and there's no central place to see them all.**
Some come through WhatsApp. Some through Instagram DM. Some through the website. Your team is spread across apps, and nobody has the full picture.

**2. Follow-ups happen when someone remembers, not on a schedule.**
There's no reminder. No assignment. No way to know who last spoke to a person or what was said.

**3. When a team member is away, their conversations are inaccessible.**
The counseling history lives on their personal phone. If they're sick, traveling, or leave the team — that history disappears.

**4. You can't answer simple questions like: how many people contacted us this month? How many were followed up?**
If you had to guess, you're running blind. And running blind means you can't improve.

**5. Messages go unanswered for days — not because no one cares, but because no one knew.**
Not out of neglect. Out of a system that lets things slip.

---

## Why WhatsApp Groups and Spreadsheets Aren't Enough

Both are better than nothing. Neither is a system.

WhatsApp groups mix pastoral conversations with announcements and random chats. There's no way to assign a message to a specific counselor, track whether it was resolved, or see the full history of one person's journey across multiple conversations.

Spreadsheets require someone to update them — and they're always at least one step behind reality. They don't notify anyone. They don't escalate urgent messages. They don't respond at 2 AM when someone is in crisis.

A proper CRM does all of those things. And it does them without adding more work to your team's plate.

---

## What Changes When You Have a System

Here's what a church with a CRM actually looks like in practice.

Someone messages your church WhatsApp at 11:30 PM asking for prayer about their marriage. Within a minute, they get a warm, empathetic response acknowledging their message and letting them know a counselor will follow up. Not because a counselor was awake — but because the system was.

The next morning, the message appears in the team's shared inbox as an open ticket. It's assigned to one counselor. They can see the full context of what was shared the night before. They respond, add a note to the person's counseling journal, and mark the next follow-up date.

Three weeks later, when a different counselor checks in — because the first one is traveling — they can see everything. Every conversation. Every prayer point. Every note. Nothing is lost.

That's ministry with a system behind it.

---

## How ReachTheSoul Makes This Work

[ReachTheSoul](https://reachthesoul.org) was built specifically for this. Not for sales. Not for HR. For churches and ministries that care deeply about people and need a reliable way to show it.

A few things that matter most:

**One inbox for everything.** WhatsApp, Instagram DM, Facebook Messenger, and your church website chat all flow into a single shared dashboard. Your team sees everything in one place — no app-switching, no missed messages.

**Every conversation becomes a ticket.** Each incoming message creates a trackable item with a status, priority level, and assigned counselor. Nothing falls through without someone noticing.

**A counseling journal that never forgets.** Notes from every conversation with every person are automatically merged into their profile. Anyone on the team with the right access can see the full pastoral care history — not just their own interactions.

**AI that responds in under a minute — any hour of the day.** When someone reaches out at midnight, they don't get silence. They get an immediate, empathetic first response. When the situation needs a human — for prayer, deeper counseling, or urgent support — it escalates to your team automatically.

**Reports that tell you the truth.** How many people reached out this week? How many were followed up within 24 hours? How many are still waiting? You can see it all, clearly.

---

## A Note on the AI

Some pastors ask whether using AI in ministry feels impersonal.

It's a fair question. And the honest answer is: it depends on what the AI is doing.

ReachTheSoul's AI is not a replacement for human ministry. It doesn't pray. It doesn't provide spiritual counsel. What it does is make sure no one waits hours — or days — for an acknowledgment that their message was received and their need is being taken seriously.

AI handles the first response. Your team handles the rest. Nobody gets forgotten.

---

## Frequently Asked Questions

**Does a church our size really need a CRM?**
If people are reaching out to your church through any digital channel — WhatsApp, social media, your website — and you can't immediately tell how many messages are currently unresolved, you need a system. Size matters less than the gap between people reaching out and people being responded to.

**What if we already have a church management system like Planning Center or Breeze?**
Those tools are great for member management, attendance, and giving. ReachTheSoul handles a different piece: what happens when someone cries out for help. The two work alongside each other, not in competition.

**Is it hard to set up?**
If you can use WhatsApp, you can use ReachTheSoul. Setup takes about 30 minutes. On paid plans, the team handles WhatsApp configuration within 12 hours.

**What does it cost?**
There's a free plan to start. Paid plans begin at $29/month for small to medium churches. [See full pricing](https://reachthesoul.org/#pricing).

**Can our whole pastoral team use it?**
Yes. The Starter plan includes 3 users. Growth includes 15. You can assign different roles — Admin, Supervisor, Agent — so each person sees what they need to see.

---

## The Church That Decided to Have a System

There's no dramatic moment when most churches realize they need this. It usually comes quietly — a message found weeks later, a person who never came back, a counselor who left and took all their notes with them.

The good news is that it's fixable. And it doesn't require a technical team or a large budget.

It requires deciding that the people who reach out to your church deserve a system as reliable as your care for them.

[Start free at ReachTheSoul.org](https://reachthesoul.org/register) — no credit card required.
ARTICLE1
echo "   ✅ 1/5 — why-every-church-needs-a-crm.mdx"

# ── ARTIKEL 2 ──────────────────────────────────────────
cat > content/blog/what-happens-when-church-has-no-follow-up-system.mdx << 'ARTICLE2'
---
title: "What Happens When Your Church Has No Follow-Up System (The Silent Crisis Most Ministries Don't See)"
description: "The dangerous part isn't the messages you ignore. It's the ones you never knew were there. Here's the real cost of running ministry without a follow-up system."
slug: "what-happens-when-church-has-no-follow-up-system"
date: "2026-06-01"
canonical: "https://reachthesoul.org/what-happens-when-church-has-no-follow-up-system"
ogImage: "/images/blog/no-followup-system.jpg"
keywords:
  - church follow up system
  - why churches lose members
  - unanswered prayer requests
  - ministry follow up
  - church visitor follow up
---

# What Happens When Your Church Has No Follow-Up System (The Silent Crisis Most Ministries Don't See)

Picture this Sunday.

Eighteen people visited your church for the first time. Three of them sent a WhatsApp message during the week asking about counseling or prayer. One sent an email. Two more messaged through Instagram.

By the following Sunday — how many of those twenty-four touchpoints were responded to within 48 hours?

If you don't know the answer, that's the problem. Not the intention. Not the care. The fact that there's no way to know.

Researchers on church growth have consistently found that first-time visitors who aren't personally contacted within 48 hours rarely return. Not because the church wasn't welcoming. Because silence reads as indifference — even when it isn't.

---

## The Danger Is What You Don't See

Most church leaders are aware of the messages they see and choose to handle later. The inbox they'll get to tomorrow. The DM they'll reply to after Sunday's service.

The real danger is different. It's the messages you didn't notice were there.

The prayer request that came through Instagram at 9 PM on a Friday. The counseling inquiry submitted through the church website that went to an email account three volunteers share. The WhatsApp message sent to the church number that nobody checked over the holiday weekend.

These messages don't make a sound when they go unanswered. The person on the other end just waits. And when they don't hear back, they quietly draw a conclusion about how much your church actually cares.

**Nobody intended to leave them without an answer. But they were left without one anyway.**

---

## What This Costs Your Ministry

Let's be honest about what's at stake. This isn't just a management problem. The consequences are real and they show up in three ways.

**People don't come back.**
When someone reaches out for prayer or help and gets no response, that's their last impression of your church. They won't tell you they're not returning. They just won't show up again.

**Crises go undetected.**
Someone reaching out about severe anxiety, a broken marriage, or something darker — they may only send that message once. If it gets buried, the window to respond closes fast. In some situations, that window is the only one you'll get.

**Your team burns out trying to hold it together manually.**
The pastoral care coordinator is managing WhatsApp on their personal phone, checking a shared email, scrolling through Instagram DMs, and trying to keep a mental list of who needs follow-up. That's not sustainable, and eventually something important gets missed — not because they don't care, but because one person can only track so many things in their head.

---

## The Invisible Gap in Most Ministry Operations

Here's what's interesting: most churches that struggle with follow-up don't lack caring people. They have plenty of those. What they lack is visibility.

**Visibility into how many requests came in this week.**
**Visibility into which ones were responded to — and how fast.**
**Visibility into who's still waiting.**
**Visibility into what was discussed in previous conversations.**

Without that visibility, you're managing pastoral care the same way you'd try to run a hospital without any patient records. The doctors care. But caring without information leads to things being missed that shouldn't be missed.

---

## Four Things That Typically Go Wrong

**1. Requests pile up across apps with no one owning them.**
WhatsApp here. Instagram DM there. Email somewhere else. Each channel feels manageable on its own. Together, they create a scattered mess that no single person can monitor effectively.

**2. Follow-up only happens when someone remembers.**
No reminders. No assignments. No accountability. The person who means to call someone back on Tuesday gets busy — and by Thursday, it feels too late to bring it up.

**3. Nothing is documented.**
The conversation happened. The prayer was offered. But three months later, when that same person reaches out again, there's no record of what was discussed, what was prayed for, or what was promised. They have to start from scratch — and so does your team.

**4. There's no way to measure whether your outreach is working.**
You ran a counseling campaign last month. How many inquiries came in? How many were followed up within 24 hours? How many are still in active care? If you have to guess, you can't improve.

---

## What a System Actually Changes

When a church puts a proper follow-up system in place, the shift is immediate and obvious.

Every message — from every channel — lands in one place. The team sees it. Someone is assigned to it. There's a record of when it came in and whether it's been handled.

Automated first responses mean no one waits in silence, even when it's the middle of the night. When someone sends a message at 2 AM about their marriage falling apart, they don't get a generic auto-reply. They get a warm, human-sounding acknowledgment that their message was received and someone will be with them soon. That one small thing — knowing someone heard you — can mean everything to someone in pain.

And if a message contains something urgent — signs of crisis, mentions of self-harm, language that signals severe distress — the right people on your team are alerted immediately. Not the next morning when someone checks their inbox. Within seconds.

---

## How ReachTheSoul Closes the Gap

This is exactly what [ReachTheSoul](https://reachthesoul.org) was designed for.

**One unified inbox** pulls messages from WhatsApp, Instagram, Facebook Messenger, and your website chat into a single dashboard. Your team works from one screen — not four different apps.

**A ticket system** turns every incoming message into a trackable item. Status, priority, assigned counselor, outcome — all visible. Nothing sits unnoticed.

**Real-time analytics** show you what you need to know: open tickets, response times, how many conversations the AI handled today, how many were escalated to a human, and how many are still pending. No more guessing.

**AI crisis detection** (available on Growth and Enterprise plans) monitors every message for keywords that signal distress — mentions of suicide, self-harm, "I can't go on," or any custom phrases your team defines. When triggered, your on-call pastoral team member gets an instant WhatsApp alert with full context. Within seconds. Not hours.

**Custom progress tracking** lets you see where every person is in their pastoral care journey — from first contact through prayer, counseling, and beyond. Fully customizable to match how your ministry actually works.

---

## A Word About the Crisis Feature

Some churches hesitate to think about this. It feels clinical, or like they're preparing for the worst.

But think about it from this angle: what if someone sent your church a message last month that was quietly screaming for help — and nobody caught it because it came in on a busy Friday afternoon?

The growth plan's crisis detection doesn't require anyone to be watching. It watches for you. And when it sees something alarming, it makes sure the right person knows within seconds — with everything they need to respond well.

That feature alone has changed the calculation for many churches on whether to upgrade from Starter to Growth. Not because it's a software feature. Because it's a safety net for the people who trust you with their darkest moments.

---

## Frequently Asked Questions

**What if we're a small church — do we really need this?**
Small churches often have fewer people available to monitor messages, which makes the gap even more dangerous. The system scales to your size — there's a free plan and a Starter plan at $29/month designed for smaller ministries.

**What happens to the messages that fall through now?**
Most go unanswered or are responded to too late to matter. The person moves on — sometimes to another church, sometimes to nothing. You'll never know how many because there's no record.

**Can we connect our existing WhatsApp number?**
Yes. Through Fonnte integration, you can connect your existing WhatsApp number without changing it. On paid plans, the setup is handled by the ReachTheSoul team within 12 hours.

**Does the AI respond in our language?**
Yes. The AI automatically responds in whatever language the person uses — Indonesian, English, or any other language. No setup needed.

**What if we already have volunteers handling follow-up?**
The system doesn't replace your volunteers — it supports them. Instead of working from memory and personal inboxes, they work from a shared dashboard where everything is visible, organized, and assigned.

---

## The Cost of Doing Nothing

There's a version of this where you read this, nod, and go back to the way things are. That's understandable. Change takes effort.

But the cost of doing nothing isn't neutral. Every week without a system is another week where requests go unanswered, where crises might be missed, where your team carries more than they should, and where people who reached out to your church quietly conclude that nobody was there.

You care about these people. The question is whether your system reflects that care as clearly as your heart does.

[Try ReachTheSoul free — no credit card required.](https://reachthesoul.org/register)
ARTICLE2
echo "   ✅ 2/5 — what-happens-when-church-has-no-follow-up-system.mdx"

# ── ARTIKEL 3 ──────────────────────────────────────────
cat > content/blog/best-crm-for-churches-and-ministries.mdx << 'ARTICLE3'
---
title: "The Best CRM for Churches and Ministries in 2026 (What Most Software Gets Wrong — And What Actually Works)"
description: "HubSpot felt like a sales tool. Spreadsheets fell apart. WhatsApp groups became chaos. Here's an honest look at what church leaders actually need — and why most CRMs miss the point."
slug: "best-crm-for-churches-and-ministries"
date: "2026-06-01"
canonical: "https://reachthesoul.org/best-crm-for-churches-and-ministries"
ogImage: "/images/blog/best-crm-churches.jpg"
keywords:
  - best CRM for churches
  - church ministry software 2026
  - prayer CRM
  - pastoral care software
  - church counseling CRM
---

# The Best CRM for Churches and Ministries in 2026 (What Most Software Gets Wrong — And What Actually Works)

I've talked to a lot of church administrators and pastoral care coordinators who've been through the same journey.

They started with a spreadsheet. Then they tried a shared Google Sheet with color-coded columns. Then someone suggested HubSpot. Then they tried a general church management system that handled attendance and giving but had no idea what to do with a prayer request.

At each step, the tool kind of worked — until it really didn't.

The problem isn't that these tools are bad. It's that they weren't built for what churches actually need when someone reaches out for prayer, counseling, or help in a moment of crisis.

---

## What Most CRMs Get Wrong for Ministry

Generic CRMs are built around a specific assumption: that the goal is to move someone through a sales pipeline. There are leads, deals, stages, and closed-won outcomes.

That language doesn't translate to ministry. At all.

A person reaching out to your church isn't a lead. They're a human being with a prayer need, a family crisis, or a question about faith that they've worked up the courage to ask. Putting them in a "deal stage" called "Qualified" or "Negotiation" is almost offensive in context.

Beyond the language problem, general CRMs miss three things that matter deeply to churches:

**They don't understand channels.** Most people reaching out to churches in 2026 do it through WhatsApp, Instagram, or Facebook. Generic CRMs weren't designed for this. Getting messages from those channels into a CRM usually requires custom integrations that small churches don't have the technical capacity to build.

**They don't handle sensitive conversations.** A counseling conversation requires confidentiality, appropriate access controls, and a way to document pastoral notes — not sales notes. The data model is completely different.

**They don't respond.** A CRM is a record-keeping tool. It doesn't send empathetic messages to someone in distress at 2 AM. It doesn't detect crisis signals. It doesn't alert your on-call pastor when something urgent comes in.

---

## A Comparison of What's Actually Available

Let's walk through the main options churches typically consider — honestly.

### Spreadsheets and Shared Docs
**What they do well:** Free. Flexible. Everyone knows how to use them.
**Where they break:** No real-time notifications. No assignment. No history management. Completely manual. Falls apart as soon as more than two people are updating it.

### General Church Management Systems (Planning Center, Breeze, Tithe.ly)
**What they do well:** Member directories, attendance tracking, giving management, event coordination. These are genuinely good tools for what they were designed for.
**Where they break:** They're not built for incoming conversations. They don't handle WhatsApp or Instagram DMs. They don't have an AI responder. They're not the right tool for pastoral care conversations — and most of them would tell you that themselves.

### Generic CRMs (HubSpot, Salesforce, Zoho)
**What they do well:** Powerful contact management, pipeline tracking, automation.
**Where they break:** Built for sales and marketing. Expensive to customize properly. No WhatsApp integration out of the box. No concept of prayer requests, counseling journals, or crisis detection. The language and mental model don't fit ministry at all.

### Prayer Request Tools (iPrayerCenter and similar)
**What they do well:** Collect prayer requests. Sometimes display them on a prayer wall.
**Where they break:** Usually a one-way collection form — there's no conversation management, no team inbox, no AI response, no follow-up tracking. Good for gathering requests. Not for responding to them.

### Pastoral Care Note Tools (Notebird, CareNote)
**What they do well:** Structured pastoral care notes and visit logs. Genuinely useful for tracking care history.
**Where they break:** No incoming message handling. No WhatsApp integration. No AI. No omnichannel inbox. You still have to get the conversation from somewhere and manually log it here.

---

## What a Church Actually Needs

When you strip away the jargon and talk to pastoral teams about what they actually struggle with, the same needs come up consistently.

**One place to see every incoming message.** Not five apps. One.

**A way to know who's been responded to and who hasn't.** Without this, follow-up depends entirely on individual memory.

**A record of every conversation per person.** So that when someone reaches out again six months later, the person helping them knows the full history.

**An immediate first response — at any hour.** Not an auto-reply that says "we'll get back to you." A genuinely warm response that acknowledges what the person shared and assures them they're heard.

**A safety net for crisis messages.** Someone needs to be alerted immediately when a message signals something urgent. Not the next morning.

**Something the team can actually learn in an afternoon.** Because pastoral care coordinators are not software engineers.

---

## How ReachTheSoul Was Built for This Specifically

[ReachTheSoul](https://reachthesoul.org) was built around these exact needs — not adapted from a sales tool, not bolted onto a church management system. Built from the ground up for prayer, counseling, and pastoral care.

**Language that fits.** Respondents, not leads. Prayer points, not deal stages. Counseling journal, not sales notes. Custom progress steps that match how your ministry actually works: Data → Prayer → Counseling → Recommitment → Salvation, or whatever stages your pastoral journey looks like.

**Channels that matter.** WhatsApp, Instagram DM, Facebook Messenger, and your church website all connect to one unified inbox. Your team works from one screen.

**AI that understands context.** The AI isn't a generic chatbot. You write its instructions — in your own words, using your church's theology, your denomination's language, your preferred scripture references. A Reformed church and a Charismatic church would configure it completely differently, and both would be right.

**Crisis detection that works.** On Growth and Enterprise plans, the AI monitors every message for distress signals. When something triggers — a mention of suicide, self-harm, or severe despair — your on-call pastoral team member receives an instant WhatsApp alert with the full conversation. Within seconds. Not hours.

**A counseling journal that doesn't forget.** Every note any counselor adds to any conversation with a person gets merged into that person's permanent profile. When a different counselor picks up the conversation three months later, they have everything they need.

---

## Pricing That Recognizes Ministry Realities

Most church software is either free with major limitations or enterprise-priced for denominations. ReachTheSoul sits in the middle in a way that works for most churches.

There's a free plan — genuinely free, no credit card — for churches that want to explore. A Starter plan at $29/month covers most small to medium ministries. The Growth plan at $97/month adds crisis detection, omnichannel social media, and advanced analytics — which is why it's the most popular tier.

Churches that sign up now also lock in Founding Church pricing permanently. When pricing increases for new subscribers, early adopters keep their current rate.

---

## What Makes the AI Different

This is worth addressing directly, because it's a concern some ministry leaders raise.

ReachTheSoul's AI doesn't pray. It doesn't claim to offer spiritual counsel. It doesn't replace the human work of pastoral care.

What it does is make sure no one waits in silence. When someone messages your church WhatsApp at midnight, the AI responds warmly — acknowledging what they shared, expressing genuine empathy, and letting them know a real person from the team will follow up. Then it creates a ticket so that actually happens.

The AI follows your church's guidelines, tone, and theology — because you write its instructions. It speaks the way your church speaks. It references scripture you'd want referenced. It defers in the ways your denomination would want it to defer.

AI handles the first response. Your team handles the rest. Nobody gets forgotten.

---

## Frequently Asked Questions

**Is ReachTheSoul a church management system?**
No. It's pastoral care infrastructure. It handles prayer requests, counseling conversations, and crisis response — the things that happen when someone reaches out for help. Church management systems handle attendance, giving, and member directories. The two complement each other.

**Can we use our existing WhatsApp number?**
Yes. Through Fonnte integration, your existing WhatsApp number connects directly. For more advanced setups, the Meta Cloud API option is also available. On paid plans, the team handles this configuration within 12 hours.

**What if our church is theologically conservative or traditional?**
The AI is fully customizable to your theology. You write the system prompt — ReachTheSoul's team won't override your doctrinal convictions. It works for Reformed, Evangelical, Charismatic, Catholic, Pentecostal, and other traditions.

**How long does setup take?**
About 30 minutes for a full setup. The dashboard pre-loads with demo conversations so you can explore before anything goes live.

**What's the difference between the Starter and Growth plans?**
The most important difference is crisis detection. On Starter, the AI responds and manages conversations. On Growth, it also actively monitors for crisis signals and sends instant alerts to your pastoral team. For most churches with an active counseling ministry, Growth is worth it.

**Do we need technical staff to run this?**
No. If your team can use WhatsApp, they can use ReachTheSoul. No coding required.

---

## The Honest Recommendation

If your church has people reaching out through digital channels and you can't immediately tell how many messages are currently unresolved — you need a system built for this.

Not a general CRM adapted for ministry. Not another spreadsheet. Something designed specifically for what you're doing: caring for people who trusted your church with their hardest moments.

That's what ReachTheSoul is.

[See the full feature list and pricing at ReachTheSoul.org](https://reachthesoul.org) — or [start free today](https://reachthesoul.org/register).
ARTICLE3
echo "   ✅ 3/5 — best-crm-for-churches-and-ministries.mdx"

# ── ARTIKEL 4 ──────────────────────────────────────────
cat > content/blog/how-to-manage-counseling-follow-up-for-ministry.mdx << 'ARTICLE4'
---
title: "How to Manage Counseling Follow-Up for Ministry (Without It All Living in One Pastor's Head)"
description: "The hardest part of pastoral counseling isn't the session. It's knowing what happens after — and making sure the next conversation doesn't start from zero."
slug: "how-to-manage-counseling-follow-up-for-ministry"
date: "2026-06-01"
canonical: "https://reachthesoul.org/how-to-manage-counseling-follow-up-for-ministry"
ogImage: "/images/blog/counseling-follow-up-ministry.jpg"
keywords:
  - church counseling follow up
  - pastoral care system
  - ministry counseling software
  - church counseling management
  - how to track pastoral care
---

# How to Manage Counseling Follow-Up for Ministry (Without It All Living in One Pastor's Head)

The hardest part of pastoral counseling isn't the session itself.

Most church leaders are gifted at sitting with someone in their pain. They know how to listen, how to pray, how to offer hope. That part comes naturally.

The hard part is everything that happens after the session ends.

Does anyone follow up next week? Who has the notes from last time? What did we talk about three months ago when this person came back with something related? When a different team member speaks to them next year — will they know any of this?

In most churches, the answer to these questions is: it depends on whether the right person remembers.

That's a fragile foundation for something as important as pastoral care.

---

## Where the System Usually Breaks Down

There's a version of counseling follow-up that works — when the church is small enough, the team is consistent, and the counselor's memory is excellent. One person holds the thread for each person they care for. It works until it doesn't.

It stops working when:

- The volume of people needing care grows beyond what one person can track
- A counselor gets sick, takes leave, or moves on — and their notes exist only on their personal phone or in their head
- The same person reaches out through a different channel and gets a completely different counselor who has no context
- Follow-up timing slips because there's no reminder, and the counselor only realizes two weeks later that they never checked in

None of this happens because people don't care. It happens because pastoral care is running on human memory and good intentions — which are beautiful things, but not reliable infrastructure.

---

## The Four Most Common Follow-Up Models — And Why Each Falls Short

**1. The Pastor's Personal WhatsApp**
The person has the pastor's number. They message when they need something. The pastor responds when they can. Nothing is documented. When the pastor is unavailable, there's no handoff.

The problem: the pastoral relationship is real, but it's trapped inside a private channel. Nobody else can see it, support it, or continue it.

**2. The Shared Email Inbox**
Prayer and counseling requests go to a church email. A few team members have access. One person checks it regularly. When that person goes on holiday, it doesn't get checked.

The problem: email wasn't designed for conversation management. There's no assignment, no status, no priority. It's a holding pen, not a system.

**3. The Volunteer Notebook**
Someone takes notes during or after each session. The notebook lives with them. When the next person needs context, they have to find that volunteer and ask.

The problem: decentralized, inaccessible, and completely dependent on one person's availability and memory.

**4. The Spreadsheet**
Someone built a careful spreadsheet with columns for name, issue, last contact date, follow-up needed. For a while, it works well. Then three people update it differently. Then someone stops updating it. Then nobody trusts it.

The problem: spreadsheets require active maintenance by multiple people, and they don't notify anyone when something needs attention.

---

## What Good Counseling Follow-Up Actually Looks Like

The goal of a proper follow-up system for ministry isn't efficiency for its own sake. It's continuity of care — the ability to pick up where the last person left off, regardless of who's in the room.

A good system does these things:

**It captures everything in one place.** Not in someone's WhatsApp. Not in a notebook. In a shared, organized record that the right team members can access.

**It knows who's waiting for follow-up.** There should be no question about whether someone was contacted. Either they were, and it's documented, or they weren't, and it's visible that they need to be.

**It gives context to whoever is helping next.** The second counselor shouldn't need to ask the first what was discussed. They should be able to see it.

**It respects confidentiality.** Not everyone on the team needs access to everything. The system should enforce appropriate boundaries.

**It doesn't require someone to remember.** Reminders, assignments, and status indicators should do the work that human memory currently struggles to do.

---

## How ReachTheSoul Handles This

[ReachTheSoul](https://reachthesoul.org) was built with the pastoral care handoff problem specifically in mind.

**Counseling Journal — the permanent record.**
Every note added to any conversation with a person is automatically merged into their Counseling Journal. It doesn't matter which counselor added it, which ticket it was attached to, or how long ago it happened. When any authorized team member opens that person's profile, they see everything — chronologically, completely.

This means when someone contacts your church again after eight months, whoever responds has full context before the conversation even begins. They know what was prayed for. They know what was promised. They know what was still unresolved.

**Respondent Profiles — one view per person.**
Each person who contacts your church gets a profile that aggregates everything: their name, contact details, the channel they came through, the issues they've raised (Marriage, Anxiety, Grief, Financial — whatever your team has tagged), their current stage in the pastoral journey, and their complete conversation history.

This is the difference between knowing a name and knowing a person.

**Custom Progress Steps — your pastoral journey, your terms.**
Every ministry structures care differently. ReachTheSoul lets you define and customize the stages that match your approach — whether that's Data → Prayer → Counseling → Recommitment → Salvation, or something completely different. You can rename, reorder, color-code, and add steps. The system adapts to how you work.

**Role-Based Access — confidentiality by design.**
Not every team member needs access to every conversation. Admins have full access. Supervisors can see reports and manage tickets. Agents (counselors) handle the conversations assigned to them. Sensitive pastoral care data stays visible only to those who should see it.

**AI Follow-Up Awareness — for the moments between sessions.**
When someone reaches out between scheduled follow-ups — with an update, a new need, or a cry for help — the system ensures it lands in the inbox and gets handled. If it contains language that signals distress, it escalates immediately to your on-call pastoral team via WhatsApp alert. The person in care doesn't wait in silence, even when the next scheduled session is a week away.

---

## Addressing the Privacy Concern

Some pastoral teams hesitate to put counseling records in any digital system. The concern is understandable — these are among the most sensitive conversations that happen in a church community.

Here's the honest reality: a pastor's personal phone is a less secure record than an encrypted, access-controlled cloud system. Notes on paper can be found by anyone who picks up the notebook. Emails in a shared inbox are visible to anyone with the password.

ReachTheSoul stores all data in Google Cloud (Firebase) with encryption in transit and at rest. Each organization's data is completely isolated — no other church can access yours. Role-based permissions mean only authorized team members see sensitive conversations. This is, structurally, more secure than the alternatives most churches are currently using.

The question isn't whether to store pastoral care information — you already are. The question is whether it's being stored in a way that protects it and makes it useful for care continuity.

---

## Frequently Asked Questions

**What if our counselors don't want to use a new system?**
The learning curve is minimal. If they can use WhatsApp, they can use ReachTheSoul. The dashboard is designed for non-technical users. Most teams are comfortable within an afternoon.

**Can we keep using our existing WhatsApp for counseling conversations?**
Your existing WhatsApp number connects directly to ReachTheSoul via Fonnte integration. Conversations still happen on WhatsApp — they just also appear in the shared dashboard, where they can be tracked, assigned, and documented.

**How do we handle really sensitive conversations?**
The platform's role-based access means you control who sees what. Sensitive conversations can be assigned only to senior counselors. Notes are visible only to those with the appropriate role.

**Can we customize what information we track per person?**
Yes. Issue categories, progress steps, and the information fields on each respondent profile are all customizable by the admin. You build the system around your ministry's structure, not the other way around.

**What happens to our data if we stop using the platform?**
You can export your data to CSV at any time from the dashboard. Your records are never held hostage.

**What's the difference between Starter and Growth for counseling follow-up?**
Starter covers most follow-up needs: the counseling journal, respondent profiles, ticket assignment, and AI first response. Growth adds crisis detection with instant WhatsApp alerts to your pastoral team — which is especially relevant for churches with active counseling ministries where crisis situations can arise.

---

## The Counselor Who Left and Took Everything With Them

Every church has experienced this at some point.

A dedicated counselor or pastoral care volunteer moves on. Maybe they relocate. Maybe life circumstances change. And with them goes years of context — the prayer points, the family situations, the promises made, the progress tracked.

The people they were caring for are still in the community. But the thread connecting their history to the new person helping them has been cut.

With a proper system, that thread doesn't break when a team member leaves. The journal stays. The history stays. The new counselor picks up where the previous one left off.

That's what continuity of care means. And it's what the people who trust your church with their hardest moments deserve.

[Start building your pastoral care system at ReachTheSoul.org](https://reachthesoul.org/register)
ARTICLE4
echo "   ✅ 4/5 — how-to-manage-counseling-follow-up-for-ministry.mdx"

# ── ARTIKEL 5 ──────────────────────────────────────────
cat > content/blog/whatsapp-crm-for-church-outreach.mdx << 'ARTICLE5'
---
title: "WhatsApp for Church Outreach: Why a Group Chat Is Not Enough (And What to Use Instead)"
description: "Your church's WhatsApp number is the first place people reach out when they're hurting. The question is — is anyone watching it, at every hour, every day?"
slug: "whatsapp-crm-for-church-outreach"
date: "2026-06-01"
canonical: "https://reachthesoul.org/whatsapp-crm-for-church-outreach"
ogImage: "/images/blog/whatsapp-church-outreach.jpg"
keywords:
  - WhatsApp CRM for church
  - WhatsApp church outreach
  - church WhatsApp management
  - WhatsApp ministry tool
  - church messaging system
---

# WhatsApp for Church Outreach: Why a Group Chat Is Not Enough (And What to Use Instead)

Your church probably has a WhatsApp number.

Maybe it's the pastor's personal number that became the unofficial "church contact." Maybe it's a dedicated number someone set up for the ministry. Maybe you have a few different numbers for different departments — youth, women's ministry, counseling.

And every week, messages come in through those numbers. Prayer requests. Questions about services. People who found you through a friend, or through social media, or through a moment of desperation at 11 PM when they didn't know who else to turn to.

Here's the question worth asking honestly: of all those messages, how many get a response within 24 hours? How many get followed up a week later? And how many just disappear into the stream of notifications, never to be heard from again?

---

## WhatsApp Is Where Your Community Already Is

This is especially true in Southeast Asia, and increasingly true everywhere.

WhatsApp isn't just a messaging app — for billions of people, it's the primary way they communicate. It's more personal than email. More immediate than a form on a website. It feels like reaching out to a real person, not submitting a ticket.

Which is exactly why it matters so much that your church's WhatsApp handling is good. Because when someone messages your church WhatsApp, they're extending a level of trust that deserves to be honored with a real, timely response.

And when that message gets buried — when it's responded to three days later, or not at all — the message received isn't "we've been busy." The message received is "you don't matter here."

---

## What Usually Goes Wrong With Church WhatsApp

Most churches are doing the best they can with tools that weren't designed for this. Here's what that usually looks like in practice.

**The personal number problem.**
The church WhatsApp is someone's personal number. Ministry messages come in alongside personal family conversations, voice notes from friends, news groups, and everything else. The lines blur. Pastoral conversations get treated like personal messages — responded to when the person gets to them, not when the person needs them.

**The shared number problem.**
A dedicated church number sounds like the solution. Until two or three people are supposed to be monitoring it, and none of them are sure who's responsible for what. Messages get read by one person, assumed to be handled by another, and responded to by nobody.

**The group chat problem.**
WhatsApp groups work for announcements and community. They're not designed for individual pastoral conversations. Private needs get lost in public channels. There's no way to track who's spoken to someone individually. Nothing is organized.

**The no-history problem.**
Six months ago, someone messaged your church about a difficult family situation. They message again today with an update. The person responding has no idea what happened six months ago, because WhatsApp doesn't have a pastoral care journal. Every conversation starts from zero.

**The no-hours problem.**
Your team goes home. WhatsApp messages don't stop coming. Someone in distress at 1 AM gets silence until morning — if they get a response at all.

---

## What a WhatsApp CRM for Churches Actually Does

A WhatsApp CRM isn't a replacement for WhatsApp. It works with WhatsApp — connecting your existing number to a system that gives your team the tools to manage conversations properly.

The key differences from a regular WhatsApp setup:

**Messages come into a shared team inbox, not someone's personal phone.**
Multiple team members can see incoming messages, see who's responded, and pick up conversations without confusion or overlap.

**Every conversation creates a trackable record.**
Who messaged, when, what about, what was said, what's the current status. Nothing disappears into a chat history.

**Conversations can be assigned to specific counselors.**
When a pastoral care message comes in, it gets routed to the right person — not just whoever happens to check their phone first.

**The AI responds immediately when no one is available.**
Not a generic auto-reply. A warm, contextually appropriate response that acknowledges what the person shared and lets them know they've been heard. Then it creates a ticket so the human follow-up actually happens.

**Crisis signals get flagged immediately.**
If someone's message contains language that signals self-harm, suicidal ideation, or severe distress, the right person on your team is alerted via WhatsApp within seconds — not hours.

---

## Beyond WhatsApp: The Channels You're Probably Missing

WhatsApp is important. But in 2026, it's not the only place people reach out.

Some people will message your church on Instagram because that's where they found you. Some will use Facebook Messenger. Some will fill out a form on your website. Some might reach out through YouTube comments after watching a sermon.

Each of those channels matters. And right now, each of them is probably being monitored separately — or not at all.

A unified ministry inbox pulls all of these channels into one place. WhatsApp, Instagram DM, Facebook Messenger, website chat — all in the same dashboard, visible to the same team, managed the same way.

What this means practically: your team doesn't have to manage five different apps. They open one screen in the morning, and they can see every message that came in — from every channel — and exactly what needs attention.

---

## How ReachTheSoul Connects WhatsApp to Your Ministry

[ReachTheSoul](https://reachthesoul.org/church-whatsapp-management) integrates your church's WhatsApp directly into a pastoral care platform built for this purpose.

**Two connection options:**
- **Fonnte** — the fastest path. You scan a QR code with your existing WhatsApp number. Takes about five minutes. No technical setup required.
- **Meta Cloud API** — the professional option. More robust for large volumes, requires Meta Business verification (1–7 days). This is the setup most larger churches and denominations use.

On paid plans, the ReachTheSoul team handles the WhatsApp configuration for you within 12 hours.

**Once connected:**
Every WhatsApp message comes into the shared dashboard as a ticket. The AI responds immediately with a warm first message. The conversation is assigned to the appropriate counselor. Notes are added to the person's profile. Follow-up is tracked.

**For crisis situations** (Growth and Enterprise plans):
The AI monitors every message for keywords that indicate distress. When triggered, your designated on-call pastor or counselor receives an instant WhatsApp alert containing the person's name, their message, and the full conversation context. Within seconds. Not hours.

**Social Inbox** (Growth and Enterprise plans):
Comments on your church's Facebook posts, Instagram content, and YouTube videos can also be monitored and converted into tickets. Someone who comments on a sermon video asking for prayer can be moved into your follow-up workflow without you having to manually track their comment.

---

## What the AI Actually Says

This is a question worth answering directly: when someone messages your church WhatsApp at midnight and the AI responds — what does it say?

That depends entirely on what you tell it to say.

When you set up ReachTheSoul, you write the AI's instructions in your own words. You tell it how your church speaks, what theological approach to take, what scripture to reference, how to handle specific situations. The AI follows those guidelines precisely.

What it won't do: claim to pray. Offer spiritual counsel beyond its role. Pretend to be a human pastor. Provide advice that goes beyond its configured boundaries.

What it will do: acknowledge what the person shared with genuine warmth, express care, let them know they've been heard, and ensure the conversation gets flagged for your team.

AI handles the first response. Your team handles the rest. Nobody gets forgotten.

---

## A Practical Picture of What Changes

Before: Someone messages your church WhatsApp at 10 PM on a Tuesday. It goes to a phone that a volunteer checks when they remember to. By Thursday, the message has been buried under 40 other notifications. The person has already concluded that nobody cared.

After: The message arrives at 10 PM. Within 45 seconds, they receive a warm response: "Thank you for reaching out. We hear you, and we're grateful you trusted us with this. A member of our pastoral team will follow up with you personally — you won't have to wait alone." The next morning, the counselor assigned to that ticket opens it, sees the full context of what was shared, and responds with care.

The technology changed. The care — that was always there. The system just made sure it could actually reach the person who needed it.

---

## Frequently Asked Questions

**Can we use our existing church WhatsApp number?**
Yes. Through Fonnte, you connect your existing number by scanning a QR code. No need to switch numbers or notify your community of a change.

**Will people know they're talking to an AI?**
That's your choice. You configure the AI's instructions, including how it introduces itself. Most churches choose to have it respond warmly without making the session feel like a bot interaction, while being clear that a human counselor will follow up.

**What if we already have a WhatsApp Business account?**
Fonnte works with regular WhatsApp. For WhatsApp Business API, Meta Cloud API integration is the appropriate path. The ReachTheSoul team can advise on which setup fits your situation.

**Does ReachTheSoul support Indonesian and other languages?**
Yes. The AI automatically responds in whatever language the person uses — Indonesian, English, or other languages. No additional configuration needed.

**What about WhatsApp calling?**
Call integration is available on Growth and Enterprise plans as an add-on. It includes inbound and outbound calls, call recording, and call logs — all within the dashboard. You bring your own telephony provider account.

**Is there a message limit?**
Starter plan includes 500 WhatsApp initiative conversations per month with unlimited incoming messages. Growth includes 1,000 initiative conversations per month. Enterprise includes 3,000. If limits are reached, human team members can continue handling conversations directly.

---

## The Church Number That Never Sleeps

The reality is that people reach out when they're ready — not when your office is open.

A marriage crisis happens at midnight. Anxiety peaks on a Sunday evening. Someone who watched your church's YouTube sermon at 3 AM feels something move inside them and wants to know more.

Your WhatsApp number is available at those moments. The question is whether your response is.

With the right system behind it, your church's WhatsApp becomes something more than a messaging number. It becomes a first point of care — one that responds with warmth at any hour, routes conversations to the right people, tracks every interaction, and makes sure no one who reaches out is ever left in silence.

That's what people deserve when they're brave enough to ask for help.

[Connect your church WhatsApp to ReachTheSoul — start free today.](https://reachthesoul.org/register)
ARTICLE5
echo "   ✅ 5/5 — whatsapp-crm-for-church-outreach.mdx"
echo ""

# ── Step 4: Buat blog pages ────────────────────────────
echo "🛤️  Step 4/5 — Creating blog route pages..."

# Blog index page
if [ ! -f "app/blog/page.tsx" ]; then
cat > app/blog/page.tsx << 'BLOGINDEX'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Church Ministry Resources — ReachTheSoul Blog',
  description: 'Practical guides for churches and ministries on pastoral care, counseling follow-up, WhatsApp outreach, prayer CRM, and ministry management systems.',
  alternates: { canonical: 'https://reachthesoul.org/blog' },
  openGraph: {
    title: 'Church Ministry Resources — ReachTheSoul Blog',
    description: 'Practical guides for churches and ministries on pastoral care, counseling follow-up, WhatsApp outreach, and ministry CRM systems.',
    url: 'https://reachthesoul.org/blog',
    siteName: 'ReachTheSoul',
  },
}

const contentDir = path.join(process.cwd(), 'content/blog')

interface PostData {
  title: string
  description: string
  slug: string
  date: string
}

export default function BlogIndex() {
  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.mdx'))
  const posts: PostData[] = files
    .map((file) => {
      const { data } = matter(fs.readFileSync(path.join(contentDir, file), 'utf8'))
      return {
        title: data.title,
        description: data.description,
        slug: file.replace('.mdx', ''),
        date: data.date,
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <main className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900">ReachTheSoul</Link>
          <Link href="https://reachthesoul.org/register" className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700">Get Started Free</Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Ministry Resources</h1>
          <p className="text-lg text-gray-600">Practical guides for churches and ministries building better systems for prayer, counseling, and pastoral care.</p>
        </div>
        <div className="space-y-10">
          {posts.map((post) => (
            <article key={post.slug} className="group border-b border-gray-100 pb-10 last:border-0">
              <Link href={`/blog/${post.slug}`}>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition leading-snug">{post.title}</h2>
              </Link>
              <p className="text-gray-600 mt-2 leading-relaxed">{post.description}</p>
              <Link href={`/blog/${post.slug}`} className="inline-block mt-3 text-sm text-blue-600 hover:underline">Read more →</Link>
            </article>
          ))}
        </div>
        <div className="mt-16 p-8 bg-blue-50 rounded-xl text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Every conversation. Every soul. All in one place.</h3>
          <p className="text-gray-600 mb-6">ReachTheSoul helps churches respond to prayer and counseling requests 24/7 — without losing the human touch.</p>
          <Link href="https://reachthesoul.org/register" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition">Start Free — No Credit Card Required</Link>
        </div>
      </div>
      <footer className="border-t border-gray-100 px-4 py-8 mt-12">
        <div className="max-w-3xl mx-auto text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} ReachTheSoul — Where Every Soul Finds Care</p>
          <p className="mt-1"><Link href="mailto:hello@reachthesoul.org" className="hover:text-gray-700">hello@reachthesoul.org</Link></p>
        </div>
      </footer>
    </main>
  )
}
BLOGINDEX
echo "   ✅ Created app/blog/page.tsx"
else
echo "   ⚠️  app/blog/page.tsx already exists — skipped"
fi

# Blog [slug] page
if [ ! -f "app/blog/[slug]/page.tsx" ]; then
cat > "app/blog/[slug]/page.tsx" << 'BLOGSLUG'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'

const contentDir = path.join(process.cwd(), 'content/blog')

export async function generateStaticParams() {
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.mdx'))
  return files.map((file) => ({ slug: file.replace('.mdx', '') }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const filePath = path.join(contentDir, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return {}
  const { data } = matter(fs.readFileSync(filePath, 'utf8'))
  return {
    title: `${data.title} | ReachTheSoul`,
    description: data.description,
    keywords: data.keywords,
    alternates: { canonical: data.canonical },
    openGraph: { title: data.title, description: data.description, url: data.canonical, siteName: 'ReachTheSoul', type: 'article' },
    twitter: { card: 'summary_large_image', title: data.title, description: data.description },
  }
}

function extractFAQs(content: string) {
  const faqs: { '@type': string; name: string; acceptedAnswer: { '@type': string; text: string } }[] = []
  const lines = content.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    const questionMatch = line.match(/^\*\*(.+?\?)\*\*$/)
    if (questionMatch) {
      const question = questionMatch[1]
      let answer = ''
      i++
      while (i < lines.length) {
        const nextLine = lines[i].trim()
        if (nextLine.startsWith('**') && nextLine.endsWith('**')) break
        if (nextLine.startsWith('## ') || nextLine.startsWith('# ')) break
        if (nextLine === '---') break
        if (nextLine) answer += (answer ? ' ' : '') + nextLine
        i++
      }
      if (answer) {
        faqs.push({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '') },
        })
      }
    } else { i++ }
  }
  return faqs
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const filePath = path.join(contentDir, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) notFound()
  const { content, data } = matter(fs.readFileSync(filePath, 'utf8'))

  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: extractFAQs(content) }
  const articleSchema = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: data.title, description: data.description, url: data.canonical, datePublished: data.date,
    publisher: { '@type': 'Organization', name: 'ReachTheSoul', url: 'https://reachthesoul.org' },
    author: { '@type': 'Organization', name: 'ReachTheSoul' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema.mainEntity.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <main className="min-h-screen bg-white">
        <nav className="border-b border-gray-100 px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold text-gray-900">ReachTheSoul</Link>
            <div className="flex gap-4 text-sm">
              <Link href="/blog" className="text-gray-600 hover:text-gray-900">Blog</Link>
              <Link href="https://reachthesoul.org/register" className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700">Get Started Free</Link>
            </div>
          </div>
        </nav>
        <article className="max-w-3xl mx-auto px-4 py-12">
          <div className="text-sm text-gray-500 mb-8">
            <Link href="/" className="hover:text-gray-700">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/blog" className="hover:text-gray-700">Blog</Link>
            <span className="mx-2">›</span>
            <span className="text-gray-700">{data.title}</span>
          </div>
          <div className="prose prose-lg prose-gray max-w-none prose-headings:text-gray-900 prose-h1:text-3xl prose-h1:font-bold prose-h1:leading-tight prose-h1:mb-6 prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-md prose-hr:my-10">
            <MDXRemote source={content} />
          </div>
          <div className="mt-16 p-8 bg-blue-50 rounded-xl text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to make sure no one falls through the cracks?</h3>
            <p className="text-gray-600 mb-6">AI handles the first response. Your team handles the rest. Nobody gets forgotten.</p>
            <Link href="https://reachthesoul.org/register" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition">Start Free — No Credit Card Required</Link>
          </div>
        </article>
        <footer className="border-t border-gray-100 px-4 py-8 mt-12">
          <div className="max-w-3xl mx-auto text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} ReachTheSoul — Where Every Soul Finds Care</p>
            <p className="mt-1"><Link href="mailto:hello@reachthesoul.org" className="hover:text-gray-700">hello@reachthesoul.org</Link></p>
          </div>
        </footer>
      </main>
    </>
  )
}
BLOGSLUG
echo "   ✅ Created app/blog/[slug]/page.tsx"
else
echo "   ⚠️  app/blog/[slug]/page.tsx already exists — skipped"
fi
echo ""

# ── Step 5: Done! ──────────────────────────────────────
echo "═══════════════════════════════════════════════════"
echo "  ✅ SETUP COMPLETE!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Files created:"
echo "    content/blog/why-every-church-needs-a-crm.mdx"
echo "    content/blog/what-happens-when-church-has-no-follow-up-system.mdx"
echo "    content/blog/best-crm-for-churches-and-ministries.mdx"
echo "    content/blog/how-to-manage-counseling-follow-up-for-ministry.mdx"
echo "    content/blog/whatsapp-crm-for-church-outreach.mdx"
echo "    app/blog/page.tsx"
echo "    app/blog/[slug]/page.tsx"
echo ""
echo "  Next steps:"
echo ""
echo "  1. npm run dev"
echo "     Then visit: http://localhost:3000/blog"
echo ""
echo "  2. If styling looks off, add typography plugin:"
echo "     In tailwind.config.js → plugins: [require('@tailwindcss/typography')]"
echo ""
echo "  3. Deploy:"
echo "     git add ."
echo "     git commit -m 'feat: add 5 AEO blog articles'"
echo "     git push"
echo ""
echo "  4. Clean up this script (optional):"
echo "     rm setup-blog.sh"
echo ""
echo "═══════════════════════════════════════════════════"
echo "  ReachTheSoul — Where Every Soul Finds Care"
echo "═══════════════════════════════════════════════════"

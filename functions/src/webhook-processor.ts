// webhook-processor.ts — MULTI-TENANT + MULTI-ACCOUNT VERSION
// All operations scoped by orgId for tenant isolation.
// socialAccountId + programName threaded through for multi-account support.

import * as admin from "firebase-admin";
import { FieldValue, Firestore } from "firebase-admin/firestore";

function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp();
}

function getDb(): Firestore {
  return getApp().firestore();
}

export type Channel = "whatsapp_meta" | "whatsapp_fonnte" | "instagram" | "facebook" | "call";
export type AttachmentType = "image" | "video" | "audio" | "document" | "sticker" | "other";

export type Attachment = {
  type: AttachmentType;
  url: string;
  originalUrl?: string;
  mimeType?: string;
  filename?: string;
  size?: number;
  caption?: string;
};

export type IncomingMessage = {
  orgId: string;            // tenant identifier
  channel: Channel;
  senderId: string;
  senderName: string;
  senderPhone?: string;
  message: string;
  attachments?: Attachment[];
  rawPayload: object;
  // ── Multi-account fields (from social_accounts lookup) ──
  socialAccountId?: string;   // ID of the social_accounts document
  programName?: string;       // denormalized for fast UI rendering
};

const CHANNEL_LEAD_SOURCE: Record<Channel, string> = {
  whatsapp_meta:   "WhatsApp",
  whatsapp_fonnte: "WhatsApp",
  instagram:       "Instagram",
  facebook:        "Facebook",
  call:            "Telepon",
};

async function getLeadSourceId(name: string, orgId: string): Promise<string> {
  const db = getDb();
  const snap = await db.collection("lead_sources")
    .where("orgId", "==", orgId)
    .where("name", "==", name)
    .limit(1).get();

  if (!snap.empty) return snap.docs[0].id;

  const ref = await db.collection("lead_sources").add({
    name,
    orgId,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function nextTicketNumber(orgId: string): Promise<string> {
  const db = getDb();
  const counterRef = db.collection("counters").doc(`${orgId}_tickets`);

  const result = await db.runTransaction(async (tx) => {
    const counterDoc = await tx.get(counterRef);
    const current = counterDoc.exists ? counterDoc.data()?.count ?? 0 : 0;
    const next = current + 1;
    tx.set(counterRef, { count: next, orgId }, { merge: true });
    return next;
  });

  return `RTS-${String(result).padStart(5, "0")}`;
}

// ── Find active ticket within 24h session window ────────────────────────────
// If socialAccountId is provided, only tickets from the same account are
// considered. This prevents cross-account ticket bleeding (e.g. a respondent
// who DMs both Page A and Page B gets separate tickets).
async function findActiveTicket(
  respondentId: string,
  orgId: string,
  socialAccountId?: string,
  channel?: string,
): Promise<string | null> {
  const db = getDb();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const snap = await db.collection("tickets")
    .where("orgId", "==", orgId)
    .where("respondentId", "==", respondentId)
    .get();

  if (snap.empty) return null;

  const now = Date.now();
  let bestTicket: { id: string; updatedAt: number } | null = null;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.status !== "open" && data.status !== "in_progress") continue;

    // ── Multi-account scoping ──
    if (socialAccountId) {
      if (data.socialAccountId) {
        if (data.socialAccountId !== socialAccountId) continue;
      } else if (channel && data.channel !== channel) {
        // legacy ticket without socialAccountId — at least require same channel
        continue;
      }
    } else if (channel && data.channel && data.channel !== channel) {
      continue;
    }

    const updatedAt = data.updatedAt?.toMillis?.() ?? ((data.updatedAt?._seconds ?? 0) * 1000);
    const createdAt = data.createdAt?.toMillis?.() ?? ((data.createdAt?._seconds ?? 0) * 1000);
    const lastActivity = Math.max(updatedAt, createdAt);

    if (now - lastActivity > TWENTY_FOUR_HOURS) continue;

    if (!bestTicket || lastActivity > bestTicket.updatedAt) {
      bestTicket = { id: doc.id, updatedAt: lastActivity };
    }
  }

  return bestTicket?.id ?? null;
}

// ─── Main: upsert respondent → find or create ticket → add message ───────────
export async function processIncomingMessage(data: IncomingMessage) {
  const db = getDb();
  const { orgId } = data;

  // 1. Upsert respondent — scoped to org
  const respondentsRef = db.collection("respondents");
  const existing = await respondentsRef
    .where("orgId", "==", orgId)
    .where("channelSenderId", "==", data.senderId)
    .where("channel", "==", data.channel)
    .limit(1).get();

  let respondentId: string;
  let respondentName: string = data.senderName;

  if (!existing.empty) {
    respondentId = existing.docs[0].id;
    respondentName = existing.docs[0].data().fullName ?? data.senderName;
    const updatePayload: Record<string, any> = {
      fullName: data.senderName,
      ...(data.senderPhone ? { phone: data.senderPhone } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    };
    // Track which accounts this respondent has interacted with (360° view)
    if (data.socialAccountId) {
      updatePayload.linkedAccounts = FieldValue.arrayUnion(data.socialAccountId);
      updatePayload.lastSocialAccountId = data.socialAccountId;
    }
    await respondentsRef.doc(respondentId).update(updatePayload);
  } else {
    const leadSourceId = await getLeadSourceId(CHANNEL_LEAD_SOURCE[data.channel], orgId);
    const newRef = respondentsRef.doc();
    respondentId = newRef.id;
    await newRef.set({
      respondentId: newRef.id,
      orgId,
      fullName: data.senderName,
      phone: data.senderPhone ?? null,
      channel: data.channel,
      channelSenderId: data.senderId,
      leadSourceId,
      isArchived: false,
      notes: null,
      // Multi-account fields
      linkedAccounts: data.socialAccountId ? [data.socialAccountId] : [],
      lastSocialAccountId: data.socialAccountId ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // 2. Find active ticket or create new one (with multi-account scoping)
  let ticketId = await findActiveTicket(respondentId, orgId, data.socialAccountId, data.channel);
  let ticketNumber: string;

  const previewText = (() => {
    if (data.message && data.message.trim().length > 0) {
      return data.message.length > 100 ? data.message.substring(0, 100) + "..." : data.message;
    }
    if (data.attachments && data.attachments.length > 0) {
      const first = data.attachments[0];
      const icons: Record<string, string> = {
        image: "📷 Photo", video: "🎥 Video", audio: "🎵 Voice message",
        document: "📄 Document", sticker: "🎨 Sticker", other: "📎 Attachment",
      };
      return icons[first.type] ?? "📎 Attachment";
    }
    return "(empty)";
  })();

  if (ticketId) {
    const ticketDoc = await db.doc(`tickets/${ticketId}`).get();
    ticketNumber = ticketDoc.data()?.ticketNumber ?? "—";
    await db.doc(`tickets/${ticketId}`).update({
      lastMessage: previewText,
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageSender: data.senderName,
      hasUnread: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    ticketNumber = await nextTicketNumber(orgId);
    const subject = previewText.length > 80 ? previewText.substring(0, 80) + "..." : previewText;

    const ticketRef = db.collection("tickets").doc();
    ticketId = ticketRef.id;
    await ticketRef.set({
      ticketId: ticketRef.id,
      ticketNumber,
      orgId,
      respondentId,
      respondentName,
      subject,
      channel: data.channel,
      // Multi-account fields (denormalized for fast list rendering)
      socialAccountId: data.socialAccountId ?? null,
      programName: data.programName ?? null,
      status: "open",
      priority: "medium",
      assignedAgentId: null,
      assignedAgentName: null,
      categoryId: null,
      categoryName: null,
      interactionOutcomeId: null,
      lastMessage: previewText,
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageSender: data.senderName,
      hasUnread: true,
      rawPayload: data.rawPayload,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // 3. Add message
  const messageData: Record<string, any> = {
    senderId: data.senderId,
    senderName: data.senderName,
    senderRole: "respondent",
    channel: data.channel,
    content: data.message,
    isInternal: false,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (data.attachments && data.attachments.length > 0) {
    messageData.attachments = data.attachments;
    messageData.hasAttachments = true;
  }
  await db.collection(`tickets/${ticketId}/messages`).add(messageData);

  return { respondentId, ticketId, ticketNumber };
}

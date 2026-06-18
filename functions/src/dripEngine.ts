/**
 * RTS Drip Campaign Engine
 * Fixed to match RTS codebase pattern
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import {
  sendEmail,
  renderTemplate,
  wrapInEmailTemplate,
} from "./emailService";

// Lazy Firestore — same pattern as index.ts
function getDb() {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}


// ============================================================
// DEFAULT DRIP TEMPLATE
// ============================================================

const DEFAULT_TRIAL_DRIP = {
  name: "Trial Signup Sequence",
  trigger: "user_signup",
  active: true,
  steps: [
    {
      stepNumber: 1,
      delayHours: 0,
      channel: "email",
      subject: "Welcome to ReachTheSoul! 🙏",
      body: `Shalom {{name}},

Terima kasih sudah mendaftar di ReachTheSoul — Prayer & Counseling Software untuk Gereja dan Ministry.

Kami sangat senang gereja {{church}} bergabung bersama kami.

Langkah pertama Anda sangat mudah:

1. Login ke dashboard di reachthesoul.org
2. Ikuti sistem onboarding — kami akan pandu Anda step by step
3. Connect channel pertama Anda (WhatsApp, Instagram, atau Facebook)

Jika ada pertanyaan, cukup reply email ini — kami akan langsung merespons.

Selamat melayani!

Tim ReachTheSoul`,
    },
    {
      stepNumber: 2,
      delayHours: 24,
      channel: "email",
      subject: "Sudah connect channel pertama? 📱",
      body: `Halo {{name}},

Sudah berhasil setup ReachTheSoul? Jika belum connect channel pertama, ini panduannya:

Login ke dashboard → Settings → Channels → Pilih WhatsApp/Instagram/Facebook → Ikuti instruksi

Setelah channel terhubung, setiap pesan prayer request yang masuk akan langsung muncul di inbox Anda — dan AI kami akan merespons dalam hitungan menit.

Butuh bantuan? Reply email ini.

Tim ReachTheSoul`,
    },
    {
      stepNumber: 3,
      delayHours: 72,
      channel: "email",
      subject: "3 hari di ReachTheSoul — bagaimana pengalaman Anda?",
      body: `Halo {{name}},

Sudah 3 hari gereja {{church}} bergabung di ReachTheSoul!

Sudah sempat explore fitur-fitur ini?

- AI First Responder — merespons setiap pesan 24/7
- Counseling Journal — riwayat lengkap setiap jiwa
- Crisis Detection — deteksi pesan darurat otomatis

Kalau ada fitur yang belum jelas, reply email ini dan kami akan bantu jelaskan.

Tim ReachTheSoul`,
    },
    {
      stepNumber: 4,
      delayHours: 120,
      channel: "email",
      subject: "Setiap jiwa layak mendapat respons",
      body: `Shalom {{name}},

Ketika gereja pertama kami menggunakan ReachTheSoul, dalam minggu pertama saja mereka menemukan 3 jemaat yang mengirim pesan krisis di luar jam kerja — pesan yang sebelumnya baru terbalas keesokan harinya.

Dengan AI First Responder, ketiga jiwa itu mendapat respons penuh empati dalam 1 menit.

Bayangkan jika gereja {{church}} bisa melakukan hal yang sama — 24 jam, 7 hari, tanpa jeda.

Sudah connect channel Anda? Login sekarang di reachthesoul.org

Tim ReachTheSoul`,
    },
    {
      stepNumber: 5,
      delayHours: 264,
      channel: "email",
      subject: "Trial hampir berakhir — jangan lewatkan founding partner price 🙏",
      body: `Shalom {{name}},

Trial ReachTheSoul Anda akan berakhir dalam beberapa hari.

Sebagai gereja yang bergabung di masa awal, Anda berhak mendapatkan Founding Partner Price — harga ini akan Anda dapatkan selamanya, bahkan ketika harga naik di kemudian hari.

Mulai dari $29/bulan untuk akses penuh:
- AI First Responder 24/7
- Omnichannel Inbox
- 500 WhatsApp Conversations
- Counseling Journal
- Crisis Detection
- Unlimited team members

Upgrade sekarang di: reachthesoul.org/settings/billing

Tim ReachTheSoul`,
    },
  ],
};


// ============================================================
// 1. TRIGGER: User signs up → create drip queue
// ============================================================

export const onUserSignup = onDocumentCreated(
  "organizations/{orgId}",
  async (event) => {
    const orgData = event.data?.data();
    if (!orgData) return;

    const orgId = event.params.orgId;
    const db = getDb();

    logger.info("New org signup — creating drip sequence", { orgId });

    // Get active drip template
    const templates = await db
      .collection("drip_templates")
      .where("trigger", "==", "user_signup")
      .where("active", "==", true)
      .limit(1)
      .get();

    const template = templates.empty ? DEFAULT_TRIAL_DRIP : templates.docs[0].data();

    const now = new Date();
    const batch = db.batch();

    for (const step of template.steps as any[]) {
      const scheduledAt = new Date(now.getTime() + step.delayHours * 60 * 60 * 1000);

      const variables = {
        name: orgData.contactName || orgData.orgName || "Pastor",
        church: orgData.orgName || "Gereja Anda",
        city: orgData.city || "",
        email: orgData.email || "",
      };

      const renderedBody = renderTemplate(step.body, variables);
      const renderedSubject = step.subject ? renderTemplate(step.subject, variables) : "";

      const queueRef = db.collection("drip_queue").doc();
      batch.set(queueRef, {
        templateId: templates.empty ? "default_trial" : templates.docs[0].id,
        stepNumber: step.stepNumber,
        orgId,
        recipientName: variables.name,
        recipientEmail: orgData.email || "",
        recipientPhone: orgData.phone || orgData.whatsapp || "",
        channel: step.channel,
        subject: renderedSubject,
        body: renderedBody,
        scheduledAt: admin.firestore.Timestamp.fromDate(scheduledAt),
        status: "pending",
        sentAt: null,
        error: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    logger.info("Drip sequence created", { orgId, steps: template.steps.length });
  }
);


// ============================================================
// 2. PROCESS DRIP QUEUE (runs every hour)
// ============================================================

const DRIP_BATCH_SIZE = 20;
const DRIP_DELAY_MS = 2000;

export const processDripQueue = onSchedule(
  {
    schedule: "every 1 hours",
    timeoutSeconds: 300,
  },
  async () => {
    const db = getDb();
    const now = admin.firestore.Timestamp.now();

    const pendingMessages = await db
      .collection("drip_queue")
      .where("status", "==", "pending")
      .where("scheduledAt", "<=", now)
      .orderBy("scheduledAt")
      .limit(DRIP_BATCH_SIZE)
      .get();

    if (pendingMessages.empty) {
      logger.info("No drip messages to process");
      return;
    }

    let sent = 0;
    let failed = 0;

    for (const doc of pendingMessages.docs) {
      const msg = doc.data();

      if (msg.channel === "email" && msg.recipientEmail) {
        const htmlBody = wrapInEmailTemplate(msg.body, msg.subject);

        const result = await sendEmail({
          to: msg.recipientEmail,
          subject: msg.subject,
          html: htmlBody,
          tags: [
            { name: "type", value: "drip" },
            { name: "step", value: String(msg.stepNumber) },
            { name: "org_id", value: msg.orgId },
          ],
        });

        if (result.success) {
          await doc.ref.update({
            status: "sent",
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          sent++;
        } else {
          await doc.ref.update({
            status: "failed",
            error: result.error,
          });
          failed++;
        }
      } else if (msg.channel === "whatsapp" && msg.recipientPhone) {
        await doc.ref.update({ status: "pending_wa" });
        logger.info("Drip WA queued", { phone: msg.recipientPhone, step: msg.stepNumber });
      }

      await new Promise(resolve => setTimeout(resolve, DRIP_DELAY_MS));
    }

    logger.info("Drip batch processed", { sent, failed });
  }
);


// ============================================================
// 3. CANCEL DRIP: when org upgrades to paid
// ============================================================

export const cancelDripOnUpgrade = onDocumentUpdated(
  "organizations/{orgId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    const wasFree = !before.plan || before.plan === "free" || before.plan === "trial";
    const isPaid = after.plan && after.plan !== "free" && after.plan !== "trial";

    if (wasFree && isPaid) {
      const orgId = event.params.orgId;
      const db = getDb();

      logger.info("Org upgraded — cancelling pending drip messages", { orgId });

      const pendingDrips = await db
        .collection("drip_queue")
        .where("orgId", "==", orgId)
        .where("status", "==", "pending")
        .get();

      const batch = db.batch();
      pendingDrips.docs.forEach(doc => {
        batch.update(doc.ref, { status: "cancelled" });
      });

      await batch.commit();
      logger.info("Cancelled drip messages", { orgId, cancelled: pendingDrips.size });
    }
  }
);
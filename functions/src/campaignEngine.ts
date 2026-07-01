import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { sendEmail, renderTemplate, wrapInEmailTemplate } from "./emailService";

function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp();
}
function getDb() {
  return getApp().firestore();
}

export const createCampaign = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");

  const data = request.data;
  const campaignRef = getDb().collection("campaigns").doc();

  await campaignRef.set({
    name: data.name || "Untitled",
    type: "blast",
    channel: data.channel || "email",
    subject: data.subject || "",
    templateBody: data.templateBody || "",
    status: "sending",
    stats: { total: data.recipients?.length || 0, sent: 0, failed: 0, opened: 0, clicked: 0, replied: 0, signedUp: 0 },
    createdBy: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const batch = getDb().batch();
  for (const r of (data.recipients || [])) {
    batch.set(getDb().collection("campaign_recipients").doc(), {
      campaignId: campaignRef.id,
      name: r.name || "", church: r.church || "", city: r.city || "",
      email: r.email || "", whatsapp: r.whatsapp || "",
      channel: data.channel === "both" ? (r.email ? "email" : "whatsapp") : (data.channel || "email"),
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  logger.info("Campaign created", { id: campaignRef.id });
  return { campaignId: campaignRef.id, recipientCount: data.recipients?.length || 0 };
});

// ─── Shared processing logic ─────────────────────────────────────────────────
// Processes one batch of pending recipients across all active campaigns.
// Returns { sent, failed, remaining } so callers know whether to continue.
async function processBatch(batchSize = 15): Promise<{ sent: number; failed: number; remaining: number }> {
  const activeCampaigns = await getDb().collection("campaigns").where("status", "==", "sending").get();
  if (activeCampaigns.empty) return { sent: 0, failed: 0, remaining: 0 };

  let totalSent = 0, totalFailed = 0, totalRemaining = 0;

  for (const campaignDoc of activeCampaigns.docs) {
    const campaign = campaignDoc.data();
    const pending = await getDb().collection("campaign_recipients")
      .where("campaignId", "==", campaignDoc.id)
      .where("status", "==", "pending")
      .limit(batchSize).get();

    if (pending.empty) {
      // No more pending — mark campaign complete
      await campaignDoc.ref.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info("Campaign completed", { id: campaignDoc.id });
      continue;
    }

    let sent = 0, failed = 0;
    for (const doc of pending.docs) {
      const r = doc.data();

      if (r.channel === "email" && r.email) {
        try {
          const body = renderTemplate(campaign.templateBody, { name: r.name, church: r.church, city: r.city });
          const subject = renderTemplate(campaign.subject || "", { name: r.name, church: r.church, city: r.city });
          const html = wrapInEmailTemplate(body, subject);
          const result = await sendEmail({ to: r.email, subject, html });
          if (result.success) {
            await doc.ref.update({ status: "sent", sentAt: admin.firestore.FieldValue.serverTimestamp() });
            sent++;
          } else {
            await doc.ref.update({ status: "failed", error: result.error ?? "unknown", failedAt: admin.firestore.FieldValue.serverTimestamp() });
            failed++;
            logger.warn("Email send failed", { email: r.email, error: result.error });
          }
        } catch (err: any) {
          // CRITICAL: catch per-recipient errors so one bad email doesn't halt the whole queue
          await doc.ref.update({ status: "failed", error: err?.message ?? "exception", failedAt: admin.firestore.FieldValue.serverTimestamp() });
          failed++;
          logger.error("Email send exception", { email: r.email, error: err?.message });
        }
      } else if (r.channel === "email" && !r.email) {
        // No email address — mark as failed rather than leaving it pending forever
        await doc.ref.update({ status: "failed", error: "no email address", failedAt: admin.firestore.FieldValue.serverTimestamp() });
        failed++;
      } else {
        // Non-email channel not handled here — mark skipped so it doesn't block completion
        await doc.ref.update({ status: "skipped", skippedAt: admin.firestore.FieldValue.serverTimestamp() });
      }

      // Throttle to avoid provider rate limits (reduced to 1s)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await campaignDoc.ref.update({
      "stats.sent": admin.firestore.FieldValue.increment(sent),
      "stats.failed": admin.firestore.FieldValue.increment(failed),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Count remaining pending after this batch
    const stillPending = await getDb().collection("campaign_recipients")
      .where("campaignId", "==", campaignDoc.id)
      .where("status", "==", "pending")
      .count().get();
    const remaining = stillPending.data().count;
    totalRemaining += remaining;

    // If none remain, mark complete now
    if (remaining === 0) {
      await campaignDoc.ref.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info("Campaign completed", { id: campaignDoc.id });
    }

    totalSent += sent;
    totalFailed += failed;
  }

  return { sent: totalSent, failed: totalFailed, remaining: totalRemaining };
}

// ─── SCHEDULED: auto-process every minute ───────────────────────────────────
// This is the fix — no more stuck campaigns. Runs automatically until all
// recipients are sent, then marks each campaign "completed".
export const processCampaignQueueScheduled = onSchedule(
  { schedule: "every 1 minutes", timeoutSeconds: 300, region: "asia-southeast1" },
  async () => {
    const result = await processBatch(15);
    if (result.sent > 0 || result.failed > 0) {
      logger.info("Campaign batch processed", result);
    }
  }
);

// ─── HTTP trigger (manual / testing) ────────────────────────────────────────
// Kept for backward compatibility. Now loops until the batch is drained
// (within the timeout) instead of stopping after 10.
export const processCampaignQueue = onRequest(
  { region: "asia-southeast1", timeoutSeconds: 300 },
  async (req, res) => {
    let totalSent = 0, totalFailed = 0;
    const startTime = Date.now();
    const MAX_RUNTIME = 270_000; // 270s, leave buffer before 300s timeout

    // Keep processing batches until no pending remain or we approach timeout
    while (Date.now() - startTime < MAX_RUNTIME) {
      const result = await processBatch(15);
      totalSent += result.sent;
      totalFailed += result.failed;
      if (result.remaining === 0) break;
    }

    res.json({ sent: totalSent, failed: totalFailed });
  }
);
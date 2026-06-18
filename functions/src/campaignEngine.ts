/**
 * RTS Campaign Engine — Lead Blaster
 * Fixed to match RTS codebase pattern
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { onCall, HttpsError } from "firebase-functions/v2/https";
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
// 1. CREATE CAMPAIGN (called from superadmin UI)
// ============================================================

interface CreateCampaignInput {
  name: string;
  channel: "email" | "whatsapp" | "both";
  subject: string;
  templateBody: string;
  recipients: {
    name: string;
    church: string;
    city: string;
    email?: string;
    whatsapp?: string;
  }[];
  scheduledAt?: string;
}

export const createCampaign = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const data = request.data as CreateCampaignInput;

  if (!data.name || !data.templateBody || !data.recipients?.length) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  if (data.recipients.length > 200) {
    throw new HttpsError("invalid-argument", "Max 200 recipients per campaign");
  }

  const db = getDb();
  const campaignRef = db.collection("campaigns").doc();
  const campaignId = campaignRef.id;

  const campaign = {
    name: data.name,
    type: "blast",
    channel: data.channel,
    subject: data.subject || "",
    templateBody: data.templateBody,
    status: data.scheduledAt ? "scheduled" : "sending",
    scheduledAt: data.scheduledAt
      ? admin.firestore.Timestamp.fromDate(new Date(data.scheduledAt))
      : null,
    stats: {
      total: data.recipients.length,
      sent: 0,
      failed: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      signedUp: 0,
    },
    createdBy: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(campaignRef, campaign);

  for (const recipient of data.recipients) {
    const recipientRef = db.collection("campaign_recipients").doc();
    batch.set(recipientRef, {
      campaignId,
      name: recipient.name || "",
      church: recipient.church || "",
      city: recipient.city || "",
      email: recipient.email || "",
      whatsapp: recipient.whatsapp || "",
      channel: data.channel === "both"
        ? (recipient.email ? "email" : "whatsapp")
        : data.channel,
      status: "pending",
      messageId: null,
      sentAt: null,
      openedAt: null,
      clickedAt: null,
      error: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  logger.info("Campaign created", { campaignId, recipients: data.recipients.length });

  return { campaignId, recipientCount: data.recipients.length };
});


// ============================================================
// 2. PROCESS CAMPAIGN QUEUE (runs every 30 minutes)
// ============================================================

const BATCH_SIZE = 10;
const DELAY_MS = 3000;

export const processCampaignQueue = onSchedule(
  {
    schedule: "every 30 minutes",
    timeoutSeconds: 300,
  },
  async () => {
    const db = getDb();

    const activeCampaigns = await db
      .collection("campaigns")
      .where("status", "in", ["sending", "scheduled"])
      .get();

    if (activeCampaigns.empty) {
      logger.info("No active campaigns");
      return;
    }

    for (const campaignDoc of activeCampaigns.docs) {
      const campaign = campaignDoc.data();

      if (campaign.status === "scheduled" && campaign.scheduledAt) {
        const scheduledTime = campaign.scheduledAt.toDate();
        if (scheduledTime > new Date()) {
          continue;
        }
        await campaignDoc.ref.update({ status: "sending" });
      }

      const pendingRecipients = await db
        .collection("campaign_recipients")
        .where("campaignId", "==", campaignDoc.id)
        .where("status", "==", "pending")
        .limit(BATCH_SIZE)
        .get();

      if (pendingRecipients.empty) {
        await campaignDoc.ref.update({
          status: "completed",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info("Campaign completed", { campaignId: campaignDoc.id });
        continue;
      }

      let sentCount = 0;
      let failCount = 0;

      for (const recipientDoc of pendingRecipients.docs) {
        const recipient = recipientDoc.data();

        const variables = {
          name: recipient.name,
          church: recipient.church,
          city: recipient.city,
          email: recipient.email,
        };

        const renderedBody = renderTemplate(campaign.templateBody, variables);
        const renderedSubject = renderTemplate(campaign.subject || "", variables);

        // --- SEND EMAIL ---
        if (recipient.channel === "email" && recipient.email) {
          const trackingUrl = `https://reachthesoul.org/api/track?rid=${recipientDoc.id}&cid=${campaignDoc.id}&t=open`;
          const htmlBody = wrapInEmailTemplate(renderedBody, renderedSubject)
            .replace("{{tracking_url}}", trackingUrl)
            .replace("{{unsubscribe_url}}", `https://reachthesoul.org/api/unsubscribe?rid=${recipientDoc.id}`);

          const trackedHtml = htmlBody.replace(
            /href="(https:\/\/reachthesoul\.org\/register[^"]*)"/g,
            `href="https://reachthesoul.org/api/track?rid=${recipientDoc.id}&cid=${campaignDoc.id}&t=click&url=$1"`
          );

          const result = await sendEmail({
            to: recipient.email,
            subject: renderedSubject,
            html: trackedHtml,
            tags: [
              { name: "campaign_id", value: campaignDoc.id },
              { name: "recipient_id", value: recipientDoc.id },
            ],
          });

          if (result.success) {
            await recipientDoc.ref.update({
              status: "sent",
              messageId: result.messageId,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            sentCount++;
          } else {
            await recipientDoc.ref.update({
              status: "failed",
              error: result.error,
            });
            failCount++;
          }
        }

        // --- SEND WHATSAPP ---
        else if (recipient.channel === "whatsapp" && recipient.whatsapp) {
          await recipientDoc.ref.update({ status: "pending_wa" });
          logger.info("WA message queued", { phone: recipient.whatsapp, name: recipient.name });
        }

        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }

      await campaignDoc.ref.update({
        "stats.sent": admin.firestore.FieldValue.increment(sentCount),
        "stats.failed": admin.firestore.FieldValue.increment(failCount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("Campaign batch processed", {
        campaignId: campaignDoc.id,
        sent: sentCount,
        failed: failCount,
      });
    }
  }
);


// ============================================================
// 3. TRACKING ENDPOINT (open & click tracking)
// ============================================================

export const trackEmailEvent = onRequest(async (req, res) => {
  const { rid, cid, t, url } = req.query as Record<string, string>;

  if (!rid || !cid || !t) {
    res.status(400).send("Missing params");
    return;
  }

  const db = getDb();

  try {
    const recipientRef = db.collection("campaign_recipients").doc(rid);
    const campaignRef = db.collection("campaigns").doc(cid);

    if (t === "open") {
      await recipientRef.update({
        status: "opened",
        openedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await campaignRef.update({
        "stats.opened": admin.firestore.FieldValue.increment(1),
      });

      const pixel = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      res.set("Content-Type", "image/gif");
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.send(pixel);
      return;
    }

    if (t === "click") {
      await recipientRef.update({
        status: "clicked",
        clickedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await campaignRef.update({
        "stats.clicked": admin.firestore.FieldValue.increment(1),
      });
      res.redirect(302, url || "https://reachthesoul.org/register");
      return;
    }

    res.status(400).send("Invalid event type");
  } catch (error: any) {
    logger.error("Tracking error", { error: error.message });
    if (t === "click" && url) {
      res.redirect(302, url);
    } else {
      res.status(204).send();
    }
  }
});


// ============================================================
// 4. CAMPAIGN STATS (called from superadmin)
// ============================================================

export const getCampaignStats = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { campaignId } = request.data;
  const db = getDb();

  const campaignDoc = await db.collection("campaigns").doc(campaignId).get();
  if (!campaignDoc.exists) {
    throw new HttpsError("not-found", "Campaign not found");
  }

  const recipients = await db
    .collection("campaign_recipients")
    .where("campaignId", "==", campaignId)
    .get();

  const statusCounts: Record<string, number> = {};
  recipients.docs.forEach(doc => {
    const status = doc.data().status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  return {
    campaign: campaignDoc.data(),
    statusBreakdown: statusCounts,
    recipients: recipients.docs.map(d => ({ id: d.id, ...d.data() })),
  };
});
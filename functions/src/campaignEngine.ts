import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { sendEmail, renderTemplate, wrapInEmailTemplate } from "./emailService";

try { admin.initializeApp(); } catch (e) { /* already initialized */ }
const db = admin.firestore();

export const createCampaign = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");

  const data = request.data;
  const campaignRef = db.collection("campaigns").doc();

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

  const batch = db.batch();
  for (const r of (data.recipients || [])) {
    batch.set(db.collection("campaign_recipients").doc(), {
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

export const processCampaignQueue = onRequest(
  { region: "asia-southeast1", timeoutSeconds: 300 },
  async (req, res) => {
    const activeCampaigns = await db.collection("campaigns").where("status", "==", "sending").get();
    if (activeCampaigns.empty) { res.json({ message: "No active campaigns" }); return; }

    let totalSent = 0, totalFailed = 0;

    for (const campaignDoc of activeCampaigns.docs) {
      const campaign = campaignDoc.data();
      const pending = await db.collection("campaign_recipients")
        .where("campaignId", "==", campaignDoc.id)
        .where("status", "==", "pending")
        .limit(10).get();

      if (pending.empty) {
        await campaignDoc.ref.update({ status: "completed", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        continue;
      }

      let sent = 0, failed = 0;
      for (const doc of pending.docs) {
        const r = doc.data();
        if (r.channel === "email" && r.email) {
          const body = renderTemplate(campaign.templateBody, { name: r.name, church: r.church, city: r.city });
          const subject = renderTemplate(campaign.subject || "", { name: r.name, church: r.church, city: r.city });
          const html = wrapInEmailTemplate(body, subject);
          const result = await sendEmail({ to: r.email, subject, html });
          if (result.success) {
            await doc.ref.update({ status: "sent", sentAt: admin.firestore.FieldValue.serverTimestamp() });
            sent++;
          } else {
            await doc.ref.update({ status: "failed", error: result.error });
            failed++;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      await campaignDoc.ref.update({
        "stats.sent": admin.firestore.FieldValue.increment(sent),
        "stats.failed": admin.firestore.FieldValue.increment(failed),
      });
      totalSent += sent;
      totalFailed += failed;
    }
    res.json({ sent: totalSent, failed: totalFailed });
  }
);
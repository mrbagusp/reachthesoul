import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";

// ─── Scheduled Data Cleanup ────────────────────────────────────────
// Runs daily. Checks for organizations whose data retention period
// has expired (3 months after pause/cancel) and permanently deletes
// all their data from Firestore.
//
// Collections cleaned per org:
// - respondents, tickets (+ messages subcollection), categories,
//   lead_sources, program_sources, interaction_outcomes,
//   progress_steps, calls, notifications, counters
//
// The organization document itself is kept (marked as purged) so
// the user can still log in and see "your data has been removed".

function getDb() {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

const ORG_SCOPED_COLLECTIONS = [
  "respondents",
  "tickets",
  "categories",
  "lead_sources",
  "program_sources",
  "interaction_outcomes",
  "progress_steps",
  "calls",
  "notifications",
];

async function deleteCollectionByOrg(db: admin.firestore.Firestore, collectionName: string, orgId: string) {
  const batchSize = 200;
  let totalDeleted = 0;

  while (true) {
    const snapshot = await db
      .collection(collectionName)
      .where("orgId", "==", orgId)
      .limit(batchSize)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();

    for (const doc of snapshot.docs) {
      // For tickets, also delete messages subcollection
      if (collectionName === "tickets") {
        const messages = await doc.ref.collection("messages").get();
        for (const msg of messages.docs) {
          batch.delete(msg.ref);
        }
      }
      batch.delete(doc.ref);
    }

    await batch.commit();
    totalDeleted += snapshot.size;

    if (snapshot.size < batchSize) break;
  }

  return totalDeleted;
}

async function notifyAdmin(db: admin.firestore.Firestore, message: string) {
  try {
    const configDoc = await db.doc("system_config/admin_notifications").get();
    const config = configDoc.data();
    const fonToken = config?.adminFonnteToken || process.env.ADMIN_FONNTE_TOKEN;
    const waNumber = config?.adminWaNumber || process.env.ADMIN_WA_NUMBER || "6285974773341";

    if (!fonToken) {
      logger.warn("[DataCleanup] No fonnte token — skipping WA notification");
      return;
    }

    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: fonToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: waNumber, message }),
    });
  } catch (err) {
    logger.error("[DataCleanup] Failed to notify admin:", err);
  }
}

// ─── Main scheduled function ────────────────────────────────────────
// Runs every day at 3 AM (Asia/Jakarta timezone)

export const cleanupExpiredOrgData = onSchedule(
  {
    schedule: "0 3 * * *", // 3:00 AM daily
    timeZone: "Asia/Jakarta",
    region: "asia-southeast1",
  },
  async () => {
    const db = getDb();
    const now = new Date();

    logger.info("[DataCleanup] Starting daily cleanup check...");

    // Find organizations where dataDeleteAt has passed
    const orgsSnapshot = await db
      .collection("organizations")
      .where("subscription.dataDeleteAt", "<=", now.toISOString())
      .get();

    if (orgsSnapshot.empty) {
      logger.info("[DataCleanup] No expired organizations found.");
      return;
    }

    logger.info(`[DataCleanup] Found ${orgsSnapshot.size} org(s) with expired data retention.`);

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      const orgData = orgDoc.data();
      const orgName = orgData.name ?? orgId;
      const subStatus = orgData.subscription?.status;

      // Safety check: only delete if subscription is paused or canceled
      if (subStatus !== "paused" && subStatus !== "canceled") {
        logger.warn(`[DataCleanup] Org ${orgId} has dataDeleteAt but status is "${subStatus}" — skipping.`);
        continue;
      }

      logger.info(`[DataCleanup] Purging data for org: ${orgName} (${orgId})`);

      let totalDeleted = 0;

      for (const collection of ORG_SCOPED_COLLECTIONS) {
        try {
          const deleted = await deleteCollectionByOrg(db, collection, orgId);
          totalDeleted += deleted;
          if (deleted > 0) {
            logger.info(`[DataCleanup]   - ${collection}: ${deleted} docs deleted`);
          }
        } catch (err) {
          logger.error(`[DataCleanup]   - ${collection}: ERROR`, err);
        }
      }

      // Also clean counters for this org
      try {
        const counterDocs = await db
          .collection("counters")
          .where("orgId", "==", orgId)
          .get();
        const counterBatch = db.batch();
        counterDocs.forEach((d) => counterBatch.delete(d.ref));
        if (!counterDocs.empty) await counterBatch.commit();
        totalDeleted += counterDocs.size;
      } catch (err) {
        logger.error(`[DataCleanup]   - counters: ERROR`, err);
      }

      // Mark org as purged (keep the org document itself)
      await orgDoc.ref.update({
        plan: "free",
        isActive: false,
        "subscription.status": "purged",
        "subscription.purgedAt": now.toISOString(),
        "subscription.dataDeleteAt": null,
        "limits.maxUsers": 0,
        "limits.maxRespondents": 0,
        "limits.maxAIConversations": 0,
        "limits.maxWhatsAppConversations": 0,
        "limits.channels": [],
        "usage.currentUsers": 0,
        "usage.currentRespondents": 0,
        "usage.aiConversationsThisMonth": 0,
        "usage.waConversationsThisMonth": 0,
        updatedAt: now,
      });

      // Audit log
      await db.collection("subscription_actions").add({
        orgId,
        action: "data_purged",
        totalDocumentsDeleted: totalDeleted,
        purgedAt: now.toISOString(),
        userId: "system",
        userName: "Scheduled Cleanup",
        createdAt: now,
      });

      logger.info(`[DataCleanup] ✅ Org ${orgName}: ${totalDeleted} total docs purged.`);

      await notifyAdmin(
        db,
        `🗑️ *DATA PURGED (Auto-Cleanup)*\n\nOrg: *${orgName}* (${orgId})\nDocs deleted: *${totalDeleted}*\nPrevious plan: *${orgData.plan?.toUpperCase() ?? "unknown"}*\n\nSubscription was ${subStatus}. Data retention period expired.`
      );
    }

    logger.info("[DataCleanup] Daily cleanup complete.");
  }
);

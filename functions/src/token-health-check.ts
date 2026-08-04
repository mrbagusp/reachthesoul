// ─────────────────────────────────────────────────────────────────────
// Token Health Check
//
// Runs every 24 hours. Tests each active social_account's page access
// token against the Meta Graph API. If a token is invalid, marks the
// account as inactive and records a health status for admin visibility.
//
// This does NOT attempt token refresh — Page tokens from our OAuth flow
// are meant to be permanent. If one is invalidated, the user (admin) must
// reconnect the account manually via the Social Accounts UI.
// ─────────────────────────────────────────────────────────────────────

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const GRAPH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp();
}

/**
 * Test a Page Access Token by calling /me.
 * Returns { valid: true } on success, or { valid: false, reason } on failure.
 */
async function testToken(pageAccessToken: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const url = `${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (res.ok && data.id) {
      return { valid: true };
    }

    const errorMsg = data?.error?.message ?? `HTTP ${res.status}`;
    return { valid: false, reason: errorMsg };
  } catch (err: any) {
    return { valid: false, reason: `network_error: ${err.message}` };
  }
}

export const checkSocialAccountTokenHealth = onSchedule(
  {
    schedule: "every 24 hours",
    region: "asia-southeast1",
    timeZone: "Asia/Jakarta",
    retryCount: 3,
  },
  async () => {
    const db = getApp().firestore();
    const now = FieldValue.serverTimestamp();

    // Fetch all active accounts (both platforms).
    const snap = await db
      .collection("social_accounts")
      .where("isActive", "==", true)
      .get();

    if (snap.empty) {
      logger.info("[tokenHealthCheck] no active accounts to check");
      return;
    }

    logger.info(`[tokenHealthCheck] checking ${snap.size} active accounts`);

    let healthy = 0;
    let expired = 0;
    let skipped = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const pageAccessToken = data?.credentials?.pageAccessToken as string | undefined;
      const platform = data?.platform as string;
      const displayName = data?.displayName as string;
      const orgId = data?.orgId as string;

      // Skip accounts without a token (may be manually configured with other creds)
      if (!pageAccessToken) {
        skipped++;
        continue;
      }

      const result = await testToken(pageAccessToken);

      if (result.valid) {
        healthy++;
        await doc.ref.update({
          healthStatus: "ok",
          lastHealthCheckAt: now,
        });
      } else {
        expired++;
        logger.warn(
          `[tokenHealthCheck] EXPIRED org=${orgId} platform=${platform} name=${displayName} reason=${result.reason}`
        );

        await doc.ref.update({
          isActive: false,
          healthStatus: "expired",
          healthError: result.reason ?? "unknown",
          lastHealthCheckAt: now,
        });

        // TODO(future): notify org admin via email or in-app alert
      }
    }

    logger.info(
      `[tokenHealthCheck] done. healthy=${healthy}, expired=${expired}, skipped=${skipped}`
    );
  }
);
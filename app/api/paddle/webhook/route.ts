import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ─── Paddle Billing — Webhook Handler ──────────────────────────────
// Processes Paddle webhook events to update org plans in Firestore.
// Paddle Billing uses HMAC-SHA256 signature verification.
// See: https://developer.paddle.com/webhooks/signature-verification

const WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET ?? "";

const ADMIN_WA_NUMBER = process.env.ADMIN_WA_NUMBER ?? "6285974773341";
const ADMIN_FONNTE_TOKEN = process.env.ADMIN_FONNTE_TOKEN ?? "";

// Map Paddle price IDs → plan tiers
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.PADDLE_PRICE_STARTER ?? ""]: "starter",
  [process.env.PADDLE_PRICE_GROWTH ?? ""]: "growth",
  [process.env.PADDLE_PRICE_ENTERPRISE ?? ""]: "enterprise",
};

// ─── Helpers ─────────────────────────────────────────────────────────

async function notifyAdmin(message: string) {
  try {
    if (!ADMIN_FONNTE_TOKEN) {
      console.log("[Paddle Webhook] No ADMIN_FONNTE_TOKEN — skipping WA notification");
      return;
    }
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: ADMIN_FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: ADMIN_WA_NUMBER, message }),
    });
    console.log("[Paddle Webhook] Admin notified via WA");
  } catch (err) {
    console.error("[Paddle Webhook] Failed to notify admin:", err);
  }
}

/**
 * Verify Paddle webhook signature (Paddle Billing format).
 * Paddle sends: ts=TIMESTAMP;h1=HMAC_SHA256
 * in the `Paddle-Signature` header.
 */
function verifyPaddleSignature(rawBody: string, signatureHeader: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn("[Paddle Webhook] No webhook secret — skipping verification");
    return true; // Allow in development
  }

  try {
    // Parse: ts=1234567890;h1=abc123...
    const parts: Record<string, string> = {};
    for (const part of signatureHeader.split(";")) {
      const [key, val] = part.split("=");
      if (key && val) parts[key] = val;
    }

    const ts = parts["ts"];
    const h1 = parts["h1"];
    if (!ts || !h1) return false;

    // Compute expected signature: HMAC-SHA256(secret, ts:rawBody)
    const signedPayload = `${ts}:${rawBody}`;
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(signedPayload)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(h1));
  } catch (err) {
    console.error("[Paddle Webhook] Signature verification error:", err);
    return false;
  }
}

async function getFirestoreDb() {
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:
          process.env.FIREBASE_PROJECT_ID ??
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
          "reachthesoul-prod",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

async function updateOrgPlan(orgId: string, plan: string, subscriptionData: any) {
  const db = await getFirestoreDb();
  await db.doc(`organizations/${orgId}`).update({
    plan,
    subscription: {
      provider: "paddle",
      subscriptionId: subscriptionData.id ?? "",
      customerId: subscriptionData.customer_id ?? "",
      status: subscriptionData.status ?? "active",
      currentPeriodEnd:
        subscriptionData.current_billing_period?.ends_at ??
        subscriptionData.next_billed_at ??
        null,
      cancelAtPeriodEnd:
        subscriptionData.scheduled_change?.action === "cancel" || false,
      paddleCustomerId: subscriptionData.customer_id ?? "",
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date(),
  });
  console.log(`[Paddle Webhook] Updated org ${orgId} to plan: ${plan}`);
}

// ─── Extract org_id from custom_data ─────────────────────────────────

function extractOrgId(payload: any): string | null {
  // Paddle Billing sends custom_data at various levels
  if (payload.data?.custom_data?.org_id) return payload.data.custom_data.org_id;
  // Transaction-level
  if (payload.data?.transaction?.custom_data?.org_id)
    return payload.data.transaction.custom_data.org_id;
  return null;
}

function extractPlan(payload: any): string {
  // Get the first price ID from items
  const items = payload.data?.items ?? [];
  for (const item of items) {
    const priceId = item.price?.id ?? item.price_id ?? "";
    if (PRICE_TO_PLAN[priceId]) return PRICE_TO_PLAN[priceId];
  }
  // Fallback: check custom_data
  return payload.data?.custom_data?.plan_tier ?? "free";
}

function extractEmail(payload: any): string {
  return (
    payload.data?.customer?.email ??
    payload.data?.customer_email ??
    ""
  );
}

// ─── Timezone helpers for smart notifications ──────────────────────

const COUNTRY_TIMEZONE: Record<string, string> = {
  US: "America/New_York", GB: "Europe/London", AU: "Australia/Sydney",
  SG: "Asia/Singapore", ID: "Asia/Jakarta", MY: "Asia/Kuala_Lumpur",
  PH: "Asia/Manila", IN: "Asia/Kolkata", KR: "Asia/Seoul",
  JP: "Asia/Tokyo", DE: "Europe/Berlin", FR: "Europe/Paris",
  BR: "America/Sao_Paulo", CA: "America/Toronto", NZ: "Pacific/Auckland",
  ZA: "Africa/Johannesburg", NG: "Africa/Lagos", KE: "Africa/Nairobi",
  AE: "Asia/Dubai", HK: "Asia/Hong_Kong", TW: "Asia/Taipei",
  TH: "Asia/Bangkok", VN: "Asia/Ho_Chi_Minh",
};

function getTimezoneFromCountry(countryCode: string): string {
  return COUNTRY_TIMEZONE[countryCode] ?? "UTC";
}

function isLikelySleeping(tz: string): boolean {
  try {
    const hour = parseInt(
      new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false })
    );
    return hour >= 22 || hour < 7; // 10PM - 7AM
  } catch {
    return false;
  }
}

// ─── Main handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("paddle-signature") ?? "";

    // Verify webhook signature
    if (WEBHOOK_SECRET && !verifyPaddleSignature(rawBody, signature)) {
      console.error("[Paddle Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type;

    console.log(`[Paddle Webhook] Event: ${eventType}`);

    const orgId = extractOrgId(payload);
    if (!orgId) {
      console.warn("[Paddle Webhook] No org_id in custom_data — event:", eventType);
      return NextResponse.json({ status: "ok", skipped: "no org_id" });
    }

    const plan = extractPlan(payload);
    const sub = payload.data ?? {};
    const customerEmail = extractEmail(payload);

    const customerCountry = payload.data?.address?.country_code ?? payload.data?.customer?.address?.country_code ?? "??";
    const customerTimezone = getTimezoneFromCountry(customerCountry);
    const nowLocal = new Date().toLocaleString("en-US", { timeZone: customerTimezone, hour: "2-digit", minute: "2-digit", hour12: true });
    const isAsleep = isLikelySleeping(customerTimezone);

    switch (eventType) {
      // ─── Transaction completed (one-time or first subscription payment) ──
      case "transaction.completed": {
        await updateOrgPlan(orgId, plan, sub);
        await notifyAdmin(
          `🎉 *NEW PAYMENT (Paddle)*\n\nOrg: *${orgId}*\nPlan: *${plan.toUpperCase()}*\nEmail: ${customerEmail}\nCountry: ${customerCountry}\nTheir local time: ${nowLocal}\n\n${isAsleep ? "😴 Customer likely asleep — setup by their morning." : "⚡ Customer is ONLINE — setup ASAP for best impression!"}\n\n📋 Action: WhatsApp setup needed.\n🔗 https://reachthesoul.org/dashboard/platform`
        );
        break;
      }

      case "transaction.paid": {
        // Payment confirmed — same as completed for our purposes
        await updateOrgPlan(orgId, plan, sub);
        break;
      }

      // ─── Subscription lifecycle ───────────────────────────────────────
      case "subscription.created":
      case "subscription.activated": {
        await updateOrgPlan(orgId, plan, sub);
        await notifyAdmin(
          `🎉 *NEW SUBSCRIPTION (Paddle)*\n\nOrg: *${orgId}*\nPlan: *${plan.toUpperCase()}*\nEmail: ${customerEmail}\nCountry: ${customerCountry}\nTheir local time: ${nowLocal}\n\n${isAsleep ? "😴 Customer likely asleep — setup by their morning." : "⚡ Customer is ONLINE — setup ASAP for best impression!"}\n\n📋 Action: WhatsApp setup needed.\n🔗 https://reachthesoul.org/dashboard/platform`
        );
        break;
      }

      case "subscription.updated": {
        const status = sub.status;
        if (status === "active" || status === "trialing") {
          await updateOrgPlan(orgId, plan, sub);
        } else if (status === "canceled" || status === "past_due") {
          // Keep plan during past_due grace period, but update status
          await updateOrgPlan(orgId, status === "canceled" ? "free" : plan, sub);
        }
        break;
      }

      case "subscription.canceled": {
        await updateOrgPlan(orgId, "free", {
          ...sub,
          status: "canceled",
        });
        await notifyAdmin(
          `⚠️ *SUBSCRIPTION CANCELLED (Paddle)*\n\nOrg: *${orgId}*\nPlan was: *${plan.toUpperCase()}*\n\nConsider reaching out.`
        );
        break;
      }

      case "subscription.past_due": {
        // Keep plan active during grace period
        await updateOrgPlan(orgId, plan, {
          ...sub,
          status: "past_due",
        });
        await notifyAdmin(
          `⚠️ *PAYMENT PAST DUE (Paddle)*\n\nOrg: *${orgId}*\nPlan: *${plan.toUpperCase()}*\n\nPayment failed. Grace period active.`
        );
        break;
      }

      default:
        console.log(`[Paddle Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[Paddle Webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

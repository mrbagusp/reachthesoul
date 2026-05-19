import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET ?? "";

const PRODUCT_TO_PLAN: Record<string, string> = {
  [process.env.POLAR_PRODUCT_STARTER ?? ""]: "starter",
  [process.env.POLAR_PRODUCT_GROWTH ?? ""]: "growth",
  [process.env.POLAR_PRODUCT_ENTERPRISE ?? ""]: "enterprise",
};

const ADMIN_WA_NUMBER = process.env.ADMIN_WA_NUMBER ?? "6285974773341";
const ADMIN_FONNTE_TOKEN = process.env.ADMIN_FONNTE_TOKEN ?? "";

async function notifyAdmin(message: string) {
  try {
    if (!ADMIN_FONNTE_TOKEN) {
      console.log("[Polar Webhook] No ADMIN_FONNTE_TOKEN — skipping WA notification");
      return;
    }
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": ADMIN_FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: ADMIN_WA_NUMBER, message }),
    });
    console.log("[Polar Webhook] Admin notified via WA");
  } catch (err) {
    console.error("[Polar Webhook] Failed to notify admin:", err);
  }
}

function verifyWebhook(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn("[Polar Webhook] No webhook secret configured — skipping verification");
    return true; // Allow in development
  }
  const computed = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function getFirestoreDb() {
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "reachthesoul-prod",
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
      provider: "polar",
      subscriptionId: subscriptionData.id ?? "",
      customerId: subscriptionData.customer_id ?? "",
      productId: subscriptionData.product_id ?? "",
      status: subscriptionData.status ?? "active",
      currentPeriodEnd: subscriptionData.current_period_end ?? null,
      cancelAtPeriodEnd: subscriptionData.cancel_at_period_end ?? false,
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date(),
  });
  console.log(`[Polar Webhook] Updated org ${orgId} to plan: ${plan}`);
}

function extractOrgId(payload: any): string | null {
  // Check metadata first (from checkout custom data)
  if (payload.data?.metadata?.org_id) return payload.data.metadata.org_id;
  // Check subscription metadata
  if (payload.data?.subscription?.metadata?.org_id) return payload.data.subscription.metadata.org_id;
  // Check order metadata
  if (payload.data?.order?.metadata?.org_id) return payload.data.order.metadata.org_id;
  return null;
}

function extractPlan(payload: any): string {
  const productId = payload.data?.product_id
    ?? payload.data?.product?.id
    ?? payload.data?.subscription?.product_id
    ?? "";
  return PRODUCT_TO_PLAN[productId]
    ?? payload.data?.metadata?.plan_tier
    ?? "free";
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("webhook-id")
      ? req.headers.get("webhook-signature") ?? ""
      : req.headers.get("x-polar-signature") ?? "";

    // Verify webhook
    if (WEBHOOK_SECRET && !verifyWebhook(rawBody, signature)) {
      console.error("[Polar Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type ?? payload.event;

    console.log(`[Polar Webhook] Event: ${eventType}`);

    const orgId = extractOrgId(payload);
    if (!orgId) {
      console.warn("[Polar Webhook] No org_id in metadata");
      return NextResponse.json({ status: "ok", skipped: "no org_id" });
    }

    const plan = extractPlan(payload);
    const sub = payload.data?.subscription ?? payload.data ?? {};
    const customerEmail = payload.data?.customer?.email ?? payload.data?.email ?? "";

    switch (eventType) {
      // ─── Checkout completed ───────────────────────────────
      case "checkout.updated":
      case "checkout.created": {
        const checkoutStatus = payload.data?.status;
        if (checkoutStatus === "succeeded" || checkoutStatus === "confirmed") {
          await updateOrgPlan(orgId, plan, sub);
          await notifyAdmin(
            `🎉 *NEW SUBSCRIPTION*\n\nOrg: *${orgId}*\nPlan: *${plan.toUpperCase()}*\nEmail: ${customerEmail}\nProvider: Polar\n\n⚡ Customer may need WhatsApp setup.\n🔗 https://reachthesoul.org/dashboard/platform`
          );
        }
        break;
      }

      // ─── Order created (payment confirmed) ────────────────
      case "order.created": {
        await updateOrgPlan(orgId, plan, sub);
        await notifyAdmin(
          `🎉 *NEW ORDER*\n\nOrg: *${orgId}*\nPlan: *${plan.toUpperCase()}*\nEmail: ${customerEmail}\nProvider: Polar\n\n⚡ Customer may need WhatsApp setup.\n🔗 https://reachthesoul.org/dashboard/platform`
        );
        break;
      }

      // ─── Subscription lifecycle ───────────────────────────
      case "subscription.created":
      case "subscription.updated": {
        const status = sub.status;
        if (status === "active" || status === "trialing") {
          await updateOrgPlan(orgId, plan, sub);
        } else if (status === "canceled" || status === "expired" || status === "unpaid") {
          await updateOrgPlan(orgId, "free", sub);
        } else {
          // past_due, incomplete, etc — keep plan but update status
          await updateOrgPlan(orgId, plan, sub);
        }
        break;
      }

      case "subscription.active": {
        await updateOrgPlan(orgId, plan, sub);
        break;
      }

      case "subscription.canceled":
      case "subscription.revoked": {
        await updateOrgPlan(orgId, "free", sub);
        await notifyAdmin(
          `⚠️ *SUBSCRIPTION CANCELLED*\n\nOrg: *${orgId}*\nPlan: *${plan.toUpperCase()}*\nProvider: Polar\n\nConsider reaching out.`
        );
        break;
      }

      // ─── Customer state changes ───────────────────────────
      case "customer.state_changed": {
        // Could update customer info in Firestore if needed
        console.log(`[Polar Webhook] Customer state changed for org ${orgId}`);
        break;
      }

      default:
        console.log(`[Polar Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[Polar Webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

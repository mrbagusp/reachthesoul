import { NextRequest, NextResponse } from "next/server";

// ─── Paddle Billing — Cancel Subscription ──────────────────────────
// Cancels a subscription via Paddle API at end of billing period.
// Data is kept for 3 months grace period, then permanently deleted.
// See: https://developer.paddle.com/api-reference/subscriptions/cancel-subscription

const PADDLE_API_KEY = process.env.PADDLE_API_KEY ?? "";
const PADDLE_ENV = process.env.NEXT_PUBLIC_PADDLE_ENV ?? "sandbox";
const PADDLE_API_URL =
  PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

const DATA_RETENTION_MONTHS = 3;

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

export async function POST(req: NextRequest) {
  try {
    const { orgId, subscriptionId, userId, userName, reason } = await req.json();

    if (!orgId || !subscriptionId) {
      return NextResponse.json(
        { error: "orgId and subscriptionId required" },
        { status: 400 }
      );
    }

    if (!PADDLE_API_KEY) {
      return NextResponse.json(
        { error: "Paddle not configured" },
        { status: 500 }
      );
    }

    // Cancel at end of current billing period (not immediately)
    const response = await fetch(
      `${PADDLE_API_URL}/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          effective_from: "next_billing_period",
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[Paddle Cancel] Error:", response.status, errData);
      return NextResponse.json(
        { error: "Failed to cancel subscription", details: errData },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Calculate data deletion date: 3 months from now
    const dataDeleteAt = new Date();
    dataDeleteAt.setMonth(dataDeleteAt.getMonth() + DATA_RETENTION_MONTHS);
    const dataDeleteAtISO = dataDeleteAt.toISOString();

    // Update Firestore
    const db = await getFirestoreDb();
    await db.doc(`organizations/${orgId}`).update({
      "subscription.status": "canceled",
      "subscription.canceledAt": new Date().toISOString(),
      "subscription.cancelAtPeriodEnd": true,
      "subscription.dataDeleteAt": dataDeleteAtISO,
      "subscription.cancelReason": reason ?? "user_requested",
      updatedAt: new Date(),
    });

    // Write audit log
    await db.collection("subscription_actions").add({
      orgId,
      action: "cancel",
      subscriptionId,
      canceledAt: new Date().toISOString(),
      dataDeleteAt: dataDeleteAtISO,
      reason: reason ?? "user_requested",
      userId: userId ?? "unknown",
      userName: userName ?? "User",
      createdAt: new Date(),
    });

    console.log(`[Paddle Cancel] Subscription ${subscriptionId} canceled for org ${orgId}, data delete at ${dataDeleteAtISO}`);

    return NextResponse.json({
      status: "canceled",
      dataDeleteAt: dataDeleteAtISO,
      paddleResponse: data.data,
    });
  } catch (err) {
    console.error("[Paddle Cancel] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

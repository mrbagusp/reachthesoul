import { NextRequest, NextResponse } from "next/server";

// ─── Paddle Billing — Pause Subscription ───────────────────────────
// Pauses a subscription via Paddle API with a resume_at date (max 3 months).
// The subscription remains paused until resume_at, then auto-resumes.
// Data is kept during pause. A Cloud Function handles cleanup after expiry.
// See: https://developer.paddle.com/api-reference/subscriptions/pause-subscription

const PADDLE_API_KEY = process.env.PADDLE_API_KEY ?? "";
const PADDLE_ENV = process.env.NEXT_PUBLIC_PADDLE_ENV ?? "sandbox";
const PADDLE_API_URL =
  PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

const MAX_PAUSE_MONTHS = 3;

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
    const { orgId, subscriptionId, userId, userName } = await req.json();

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

    // Calculate resume_at: 3 months from now
    const resumeAt = new Date();
    resumeAt.setMonth(resumeAt.getMonth() + MAX_PAUSE_MONTHS);
    const resumeAtISO = resumeAt.toISOString();

    // Call Paddle API to pause subscription
    // effective_from: "next_billing_period" (default) or "immediately"
    const response = await fetch(
      `${PADDLE_API_URL}/subscriptions/${subscriptionId}/pause`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          effective_from: "next_billing_period",
          resume_at: resumeAtISO,
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[Paddle Pause] Error:", response.status, errData);
      return NextResponse.json(
        { error: "Failed to pause subscription", details: errData },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Update Firestore with pause info
    const db = await getFirestoreDb();
    await db.doc(`organizations/${orgId}`).update({
      "subscription.status": "paused",
      "subscription.pausedAt": new Date().toISOString(),
      "subscription.resumeAt": resumeAtISO,
      "subscription.dataDeleteAt": resumeAtISO, // Data deletion scheduled at pause expiry
      updatedAt: new Date(),
    });

    // Write audit log
    await db.collection("subscription_actions").add({
      orgId,
      action: "pause",
      subscriptionId,
      pausedAt: new Date().toISOString(),
      resumeAt: resumeAtISO,
      dataDeleteAt: resumeAtISO,
      userId: userId ?? "unknown",
      userName: userName ?? "User",
      createdAt: new Date(),
    });

    console.log(`[Paddle Pause] Subscription ${subscriptionId} paused for org ${orgId}, resume at ${resumeAtISO}`);

    return NextResponse.json({
      status: "paused",
      resumeAt: resumeAtISO,
      paddleResponse: data.data,
    });
  } catch (err) {
    console.error("[Paddle Pause] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

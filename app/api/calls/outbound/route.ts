import { NextRequest, NextResponse } from "next/server";

// ─── Outbound Call API ───────────────────────────────────────────────
// Initiates an outbound call via Twilio REST API.
// Called from the dashboard softphone when a counselor clicks "Call".
// LOCKED: requires valid callIntegrationKey on the org.

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";

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
    const { orgId, toNumber, agentId, agentName, respondentId, respondentName } =
      await req.json();

    if (!orgId || !toNumber) {
      return NextResponse.json({ error: "orgId and toNumber required" }, { status: 400 });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ error: "Twilio not configured" }, { status: 500 });
    }

    const db = await getFirestoreDb();

    // Fetch org and verify activation key
    const orgDoc = await db.doc(`organizations/${orgId}`).get();
    if (!orgDoc.exists) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const orgData = orgDoc.data()!;
    const callConfig = orgData.callConfig ?? {};

    if (!callConfig.callIntegrationKey || callConfig.isActive === false) {
      return NextResponse.json(
        { error: "Call integration not activated. Contact hello@reachthesoul.org for setup." },
        { status: 403 },
      );
    }

    const fromNumber = callConfig.twilioNumber;
    if (!fromNumber) {
      return NextResponse.json({ error: "No Twilio number configured for this org" }, { status: 400 });
    }

    const webhookBase = process.env.NEXT_PUBLIC_APP_URL ?? "https://reachthesoul.org";
    const recordCalls = callConfig.recordCalls !== false;

    // Create outbound call via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const authHeader = "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");

    // TwiML for the outbound call — connect to WebRTC client first
    const twimlUrl =
      `${webhookBase}/api/calls/outbound-twiml?orgId=${orgId}&agent=${encodeURIComponent(agentName ?? "")}`;

    const callParams = new URLSearchParams({
      To: toNumber,
      From: fromNumber,
      Url: twimlUrl,
      StatusCallback: `${webhookBase}/api/calls/webhook`,
      StatusCallbackEvent: "initiated ringing answered completed",
      StatusCallbackMethod: "POST",
      ...(recordCalls ? { Record: "true", RecordingStatusCallback: `${webhookBase}/api/calls/webhook` } : {}),
    });

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: callParams.toString(),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[Outbound Call] Twilio error:", response.status, errData);
      return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
    }

    const callData = await response.json();
    const callSid = callData.sid;

    // Pre-create call record in Firestore
    const { FieldValue } = await import("firebase-admin/firestore");
    await db.collection("calls").doc(callSid).set({
      callId: callSid,
      orgId,
      direction: "outbound",
      status: "ringing",
      provider: "twilio",
      fromNumber,
      toNumber,
      agentId: agentId ?? null,
      agentName: agentName ?? null,
      respondentId: respondentId ?? null,
      respondentName: respondentName ?? null,
      startedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      callSid,
      status: "initiated",
    });
  } catch (err) {
    console.error("[Outbound Call] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

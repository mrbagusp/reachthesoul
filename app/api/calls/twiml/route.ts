import { NextRequest, NextResponse } from "next/server";

// ─── TwiML Response Endpoint ─────────────────────────────────────────
// Returns TwiML XML that tells Twilio how to handle incoming calls.
// - Plays a greeting message
// - Optionally connects to a WebRTC client (counselor's browser)
// - Records the call if enabled
// - Falls back to voicemail if no one answers

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
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const to = params.To ?? "";
    const from = params.From ?? "";
    const callSid = params.CallSid ?? "";

    console.log(`[TwiML] Incoming call from ${from} to ${to}, CallSid=${callSid}`);

    const db = await getFirestoreDb();

    // Resolve org from phone number
    let orgSnap = await db
      .collection("organizations")
      .where("callConfig.twilioNumber", "==", to)
      .limit(1)
      .get();

    if (orgSnap.empty) {
      const cleaned = to.replace(/^\+/, "");
      orgSnap = await db
        .collection("organizations")
        .where("callConfig.twilioNumber", "==", cleaned)
        .limit(1)
        .get();
    }

    if (orgSnap.empty) {
      // No org found — generic response
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're sorry, this number is not currently configured. Please try again later.</Say>
  <Hangup/>
</Response>`;
      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const orgData = orgSnap.docs[0].data();
    const callConfig = orgData.callConfig ?? {};
    const orgName = orgData.name ?? "our ministry";

    // Check activation key
    if (!callConfig.callIntegrationKey || callConfig.isActive === false) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're sorry, the call system is not yet activated. Please contact us through WhatsApp or our website.</Say>
  <Hangup/>
</Response>`;
      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Build TwiML response
    const greeting =
      callConfig.greeting ??
      `Thank you for calling ${orgName}. Please hold while we connect you with a counselor.`;
    const voicemailMessage =
      callConfig.voicemailMessage ??
      `We're sorry, no one is available right now. Please leave a message after the tone, and we will call you back as soon as possible.`;
    const recordCalls = callConfig.recordCalls !== false; // default true
    const ringTimeout = callConfig.ringTimeout ?? 25; // seconds
    const webhookBase = process.env.NEXT_PUBLIC_APP_URL ?? "https://reachthesoul.org";

    // TwiML: Greet → Try connecting to WebRTC client → Fallback to voicemail
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(greeting)}</Say>
  <Dial${recordCalls ? ' record="record-from-answer-dual"' : ""} timeout="${ringTimeout}" callerId="${to}" action="${webhookBase}/api/calls/dial-status">
    <Client>counselor-${orgSnap.docs[0].id}</Client>
  </Dial>
  <Say voice="Polly.Joanna">${escapeXml(voicemailMessage)}</Say>
  ${recordCalls ? `<Record maxLength="120" action="${webhookBase}/api/calls/webhook" transcribe="false" playBeep="true"/>` : ""}
  <Say voice="Polly.Joanna">Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("[TwiML] Error:", err);

    // Fallback TwiML
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're experiencing technical difficulties. Please try again later or contact us through our website.</Say>
  <Hangup/>
</Response>`;
    return new NextResponse(fallback, {
      headers: { "Content-Type": "text/xml" },
    });
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

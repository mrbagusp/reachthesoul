import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ─── Twilio Call Webhook Handler ─────────────────────────────────────
// Receives call status events from Twilio Voice API.
// LOCKED: Only processes events for orgs with a valid callIntegrationKey.
// Without the key, all call events are rejected — preventing self-setup.

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const ADMIN_WA_NUMBER = process.env.ADMIN_WA_NUMBER ?? "6285974773341";
const ADMIN_FONNTE_TOKEN = process.env.ADMIN_FONNTE_TOKEN ?? "";

// ─── Helpers ─────────────────────────────────────────────────────────

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

/**
 * Verify Twilio webhook signature.
 * See: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  if (!TWILIO_AUTH_TOKEN) {
    console.warn("[Twilio Webhook] No TWILIO_AUTH_TOKEN — skipping verification in dev");
    return true;
  }

  // Sort params alphabetically and concatenate key+value
  const data =
    url +
    Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], "");

  const expected = crypto
    .createHmac("sha1", TWILIO_AUTH_TOKEN)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  return expected === signature;
}

async function notifyAdmin(message: string) {
  try {
    if (!ADMIN_FONNTE_TOKEN) return;
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: ADMIN_FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: ADMIN_WA_NUMBER, message }),
    });
  } catch (err) {
    console.error("[Twilio Webhook] Failed to notify admin:", err);
  }
}

/**
 * Resolve orgId from the Twilio phone number.
 * Each org's callConfig stores their Twilio number.
 */
async function resolveOrgFromNumber(
  db: FirebaseFirestore.Firestore,
  toNumber: string,
): Promise<{ orgId: string; orgName: string; callConfig: any } | null> {
  // Query orgs that have this Twilio number configured
  const orgsSnap = await db
    .collection("organizations")
    .where("callConfig.twilioNumber", "==", toNumber)
    .limit(1)
    .get();

  if (orgsSnap.empty) {
    // Try without + prefix
    const cleaned = toNumber.replace(/^\+/, "");
    const retrySnap = await db
      .collection("organizations")
      .where("callConfig.twilioNumber", "==", cleaned)
      .limit(1)
      .get();

    if (retrySnap.empty) return null;
    const doc = retrySnap.docs[0];
    return { orgId: doc.id, orgName: doc.data().name, callConfig: doc.data().callConfig };
  }

  const doc = orgsSnap.docs[0];
  return { orgId: doc.id, orgName: doc.data().name, callConfig: doc.data().callConfig };
}

/**
 * Verify the org has a valid callIntegrationKey.
 * This is the LOCK — without this key, the org cannot receive calls.
 */
function verifyActivationKey(callConfig: any): boolean {
  if (!callConfig) return false;
  if (!callConfig.callIntegrationKey) return false;
  if (callConfig.callIntegrationKey.length < 16) return false;
  if (callConfig.isActive === false) return false;
  return true;
}

/**
 * Try to match the caller's phone number to an existing respondent.
 */
async function resolveRespondent(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  phone: string,
): Promise<{ id: string; name: string } | null> {
  // Try exact match
  const snap = await db
    .collection("respondents")
    .where("orgId", "==", orgId)
    .where("phone", "==", phone)
    .limit(1)
    .get();

  if (!snap.empty) {
    const doc = snap.docs[0];
    return { id: doc.id, name: doc.data().fullName ?? "Unknown" };
  }

  // Try without + prefix
  const cleaned = phone.replace(/^\+/, "");
  const retrySnap = await db
    .collection("respondents")
    .where("orgId", "==", orgId)
    .where("phone", "==", cleaned)
    .limit(1)
    .get();

  if (!retrySnap.empty) {
    const doc = retrySnap.docs[0];
    return { id: doc.id, name: doc.data().fullName ?? "Unknown" };
  }

  return null;
}

// ─── Main Handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Verify Twilio signature
    const signature = req.headers.get("x-twilio-signature") ?? "";
    const requestUrl = req.url;

    if (TWILIO_AUTH_TOKEN && !verifyTwilioSignature(requestUrl, params, signature)) {
      console.error("[Twilio Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const callSid = params.CallSid ?? "";
    const callStatus = params.CallStatus ?? "";
    const from = params.From ?? "";
    const to = params.To ?? "";
    const direction = params.Direction ?? "";
    const duration = params.CallDuration ?? params.Duration ?? "0";
    const recordingUrl = params.RecordingUrl ?? "";
    const recordingSid = params.RecordingSid ?? "";

    console.log(`[Twilio Webhook] CallSid=${callSid} Status=${callStatus} From=${from} To=${to}`);

    const db = await getFirestoreDb();

    // ─── Resolve org from the Twilio number ──────────────────────
    const inboundNumber = direction === "inbound" ? to : from;
    const org = await resolveOrgFromNumber(db, inboundNumber);

    if (!org) {
      console.warn(`[Twilio Webhook] No org found for number: ${inboundNumber}`);
      return NextResponse.json({ error: "Unknown number" }, { status: 404 });
    }

    // ─── ACTIVATION KEY CHECK (THE LOCK) ─────────────────────────
    if (!verifyActivationKey(org.callConfig)) {
      console.warn(`[Twilio Webhook] Org ${org.orgId} has no valid callIntegrationKey — REJECTED`);
      return NextResponse.json(
        { error: "Call integration not activated. Contact hello@reachthesoul.org for setup." },
        { status: 403 },
      );
    }

    // ─── Resolve respondent from caller number ───────────────────
    const callerNumber = direction === "inbound" ? from : to;
    const respondent = await resolveRespondent(db, org.orgId, callerNumber);

    // ─── Process call status events ──────────────────────────────
    const callRef = db.collection("calls").doc(callSid);
    const { FieldValue } = await import("firebase-admin/firestore");

    switch (callStatus) {
      case "ringing":
      case "initiated": {
        await callRef.set(
          {
            callId: callSid,
            orgId: org.orgId,
            direction: direction === "inbound" ? "inbound" : "outbound",
            status: "ringing",
            provider: "twilio",
            fromNumber: from,
            toNumber: to,
            respondentId: respondent?.id ?? null,
            respondentName: respondent?.name ?? null,
            agentId: null,
            agentName: null,
            startedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        break;
      }

      case "in-progress": {
        await callRef.update({
          status: "active",
          answeredAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;
      }

      case "completed": {
        const durationSec = parseInt(duration, 10) || 0;
        await callRef.update({
          status: "completed",
          durationSeconds: durationSec,
          endedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Auto-create ticket for inbound calls > 30 seconds
        if (direction === "inbound" && durationSec > 30 && respondent) {
          try {
            const { processIncomingMessage } = await import(
              "@/functions/src/webhook-processor"
            );
            // This won't work from Next.js — we'll handle ticket creation separately
          } catch {}

          // Simple ticket creation for completed calls
          const counterRef = db.collection("counters").doc(`${org.orgId}_tickets`);
          const count = await db.runTransaction(async (tx) => {
            const doc = await tx.get(counterRef);
            const next = (doc.exists ? doc.data()?.count ?? 0 : 0) + 1;
            tx.set(counterRef, { count: next, orgId: org.orgId }, { merge: true });
            return next;
          });

          const ticketNumber = `RTS-${String(count).padStart(5, "0")}`;
          const ticketRef = db.collection("tickets").doc();
          await ticketRef.set({
            ticketId: ticketRef.id,
            ticketNumber,
            orgId: org.orgId,
            respondentId: respondent.id,
            respondentName: respondent.name,
            subject: `Phone call (${Math.floor(durationSec / 60)}m ${durationSec % 60}s)`,
            channel: "call",
            status: "open",
            priority: "medium",
            handledBy: "human",
            direction: "inbound",
            assignedAgentId: null,
            assignedAgentName: null,
            categoryId: null,
            categoryName: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          // Link ticket to call record
          await callRef.update({ ticketId: ticketRef.id });

          // Add call summary as first message
          await db.collection(`tickets/${ticketRef.id}/messages`).add({
            senderId: "system",
            senderName: "System",
            senderRole: "system",
            channel: "call",
            content: `📞 Inbound call from ${respondent.name} (${from})\nDuration: ${Math.floor(durationSec / 60)}m ${durationSec % 60}s\nCall ID: ${callSid}`,
            isInternal: true,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case "no-answer":
      case "busy":
      case "canceled":
      case "failed": {
        await callRef.set(
          {
            callId: callSid,
            orgId: org.orgId,
            direction: direction === "inbound" ? "inbound" : "outbound",
            status: callStatus === "no-answer" ? "missed" : "failed",
            provider: "twilio",
            fromNumber: from,
            toNumber: to,
            respondentId: respondent?.id ?? null,
            respondentName: respondent?.name ?? null,
            endedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        // Notify admin on missed inbound calls
        if (direction === "inbound" && (callStatus === "no-answer" || callStatus === "busy")) {
          await notifyAdmin(
            `📞 *MISSED CALL*\n\nOrg: ${org.orgName}\nFrom: ${from}\nRespondent: ${respondent?.name ?? "Unknown"}\n\n⚠️ Consider calling back.`,
          );
        }
        break;
      }

      default:
        console.log(`[Twilio Webhook] Unhandled status: ${callStatus}`);
    }

    // ─── Handle recording callback ───────────────────────────────
    if (recordingUrl && recordingSid) {
      // Twilio sends recording URL without .mp3 extension
      const fullRecordingUrl = `${recordingUrl}.mp3`;

      await callRef.update({
        recordingUrl: fullRecordingUrl,
        recordingSid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(`[Twilio Webhook] Recording saved for call ${callSid}: ${fullRecordingUrl}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[Twilio Webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

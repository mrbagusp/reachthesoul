import { NextRequest, NextResponse } from "next/server";

// ─── WhatsApp Message Templates API ──────────────────────────────────────────
// POST: create a new message template (submits to Meta for approval)
// GET:  list existing templates for the org's WABA
//
// Requires the org's WhatsApp Meta social_account to have:
//   credentials.accessToken  (system user / long-lived token)
//   credentials.wabaId       (WhatsApp Business Account ID)  ← REQUIRED for templates
//
// NOTE: creating a template does NOT send anything to any respondent.
// It only registers a reusable template with Meta. RTS stays reactive.

const GRAPH_VERSION = "v21.0";

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

// ── Resolve the org's WhatsApp Meta credentials (accessToken + wabaId) ──
async function getWhatsappCredentials(
  db: FirebaseFirestore.Firestore,
  orgId: string,
): Promise<{ accessToken: string; wabaId: string } | { error: string; status: number }> {
  // Look in social_accounts for an active whatsapp_meta account
  const snap = await db
    .collection("social_accounts")
    .where("orgId", "==", orgId)
    .where("platform", "==", "whatsapp_meta")
    .limit(1)
    .get();

  if (snap.empty) {
    return { error: "No WhatsApp (Meta) account configured for this org", status: 404 };
  }

  const cred = snap.docs[0].data()?.credentials ?? {};
  const accessToken = cred.accessToken ?? "";
  // Accept either wabaId or businessId (existing form field) as the WABA ID
  const wabaId = cred.wabaId ?? cred.whatsappBusinessAccountId ?? cred.businessId ?? "";

  if (!accessToken) return { error: "WhatsApp access token not configured", status: 400 };
  if (!wabaId) {
    return {
      error: "WABA ID not configured. Add 'wabaId' to the WhatsApp Meta account credentials.",
      status: 400,
    };
  }
  return { accessToken, wabaId };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — create a message template
// Body: { orgId, name, category, language, bodyText,
//         footerText?, header?, buttons? }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orgId,
      name,
      category,           // "UTILITY" | "MARKETING" | "AUTHENTICATION"
      language = "id",    // default Indonesian
      bodyText,
      footerText,
    } = body;

    if (!orgId || !name || !category || !bodyText) {
      return NextResponse.json(
        { error: "orgId, name, category, and bodyText are required" },
        { status: 400 },
      );
    }

    // Template name must be lowercase + underscores only (Meta rule)
    const normalizedName = String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    if (!normalizedName) {
      return NextResponse.json({ error: "Invalid template name" }, { status: 400 });
    }

    const db = await getFirestoreDb();
    const creds = await getWhatsappCredentials(db, orgId);
    if ("error" in creds) {
      return NextResponse.json({ error: creds.error }, { status: creds.status });
    }

    // Build components array (Meta format)
    const components: any[] = [
      { type: "BODY", text: bodyText },
    ];
    if (footerText && String(footerText).trim()) {
      components.push({ type: "FOOTER", text: String(footerText).trim() });
    }

    // POST to Graph API — creates template under the WABA
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${creds.wabaId}/message_templates`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: normalizedName,
        category,
        language,
        components,
      }),
    });

    const result = await resp.json();

    if (!resp.ok || result.error) {
      console.error("[WA Templates] Meta error:", resp.status, result.error);
      return NextResponse.json(
        { error: result.error?.error_user_msg ?? result.error?.message ?? "Failed to create template" },
        { status: 400 },
      );
    }

    // Persist a local record for the dashboard list (optional but useful)
    const { FieldValue } = await import("firebase-admin/firestore");
    await db.collection("whatsapp_templates").add({
      orgId,
      metaTemplateId: result.id ?? null,
      name: normalizedName,
      category,
      language,
      bodyText,
      footerText: footerText ?? null,
      status: result.status ?? "PENDING",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      templateId: result.id ?? null,
      status: result.status ?? "PENDING",
      name: normalizedName,
    });
  } catch (err) {
    console.error("[WA Templates] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — list templates for the org (?orgId=...)
// Reads live from Meta so statuses (PENDING/APPROVED/REJECTED) are current.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    const db = await getFirestoreDb();
    const creds = await getWhatsappCredentials(db, orgId);
    if ("error" in creds) {
      return NextResponse.json({ error: creds.error }, { status: creds.status });
    }

    const url =
      `https://graph.facebook.com/${GRAPH_VERSION}/${creds.wabaId}/message_templates` +
      `?fields=name,status,category,language&limit=100&access_token=${creds.accessToken}`;
    const resp = await fetch(url);
    const result = await resp.json();

    if (!resp.ok || result.error) {
      console.error("[WA Templates] Meta list error:", resp.status, result.error);
      return NextResponse.json(
        { error: result.error?.message ?? "Failed to fetch templates" },
        { status: 400 },
      );
    }

    return NextResponse.json({ templates: result.data ?? [] });
  } catch (err) {
    console.error("[WA Templates] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
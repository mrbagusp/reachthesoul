import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

function getDb() {
  const app = admin.apps.length ? admin.apps[0]! : admin.initializeApp();
  return app.firestore();
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const planLabels: Record<string, string> = {
  free: "Free Plan",
  starter: "Starter ($29/mo)",
  growth: "Growth ($97/mo)",
  enterprise: "Enterprise ($249+/mo)",
};

// ═══════════════════════════════════════════════════════════════
// EMAIL 1 — Immediately after onboarding quiz
// Trigger: onboarding_responses document created
// ═══════════════════════════════════════════════════════════════

export const onOnboardingComplete = onDocumentCreated(
  {
    document: "onboarding_responses/{userId}",
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD],
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const userId = event.params.userId;
    const db = getDb();

    // Get user info
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) return;
    const user = userDoc.data()!;

    const displayName = user.displayName ?? "there";
    const firstName = displayName.split(" ")[0];
    const email = user.email;
    if (!email) return;

    const lang = (data.browserLanguage ?? "en") === "id" ? "id" : "en";
    const plan = data.recommendedPlan ?? "free";
    const urgency = data.urgency ?? "explore";

    // Build personalized first step
    let firstStep_en = "Log in and explore your dashboard with pre-loaded demo data.";
    let firstStep_id = "Login dan explore dashboard Anda dengan demo data yang sudah disiapkan.";

    if (plan === "starter" || plan === "growth" || plan === "enterprise") {
      firstStep_en = `Upgrade to ${planLabels[plan]} to unlock the features that match your needs.`;
      firstStep_id = `Upgrade ke ${planLabels[plan]} untuk membuka fitur yang sesuai kebutuhan Anda.`;
    }

    const urgencyNote = urgency === "asap"
      ? (lang === "id"
        ? "<p style='margin:16px 0;padding:12px 16px;background:#fef3cd;border-radius:8px;font-size:14px'>&#9889; Anda mengatakan ini mendesak. <strong>Tim kami akan menghubungi Anda dalam 12 jam</strong> untuk membantu setup.</p>"
        : "<p style='margin:16px 0;padding:12px 16px;background:#fef3cd;border-radius:8px;font-size:14px'>&#9889; You mentioned this is urgent. <strong>Our team will reach out within 12 hours</strong> to help you get started.</p>")
      : "";

    const subject = lang === "id"
      ? `Selamat datang di ReachTheSoul, ${firstName}!`
      : `Welcome to ReachTheSoul, ${firstName}!`;

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a2942">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="margin:0;font-size:22px;color:#1a2942">${lang === "id" ? `Selamat datang, ${escapeHtml(firstName)}!` : `Welcome, ${escapeHtml(firstName)}!`}</h1>
          <p style="margin:8px 0 0;color:#5a6b85;font-size:14px">${lang === "id" ? "Terima kasih sudah bergabung dengan ReachTheSoul." : "Thank you for joining ReachTheSoul."}</p>
        </div>

        <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1a2942">${lang === "id" ? "Berdasarkan jawaban Anda:" : "Based on your answers:"}</p>
          <p style="margin:0 0 4px;font-size:14px;color:#5a6b85">${lang === "id" ? "Rekomendasi plan:" : "Recommended plan:"} <strong style="color:#1a2942">${planLabels[plan]}</strong></p>
        </div>

        ${urgencyNote}

        <div style="margin:24px 0">
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1a2942">${lang === "id" ? "Langkah pertama Anda:" : "Your first step:"}</p>
          <p style="margin:0;font-size:14px;color:#5a6b85">${lang === "id" ? firstStep_id : firstStep_en}</p>
        </div>

        <div style="text-align:center;margin:28px 0">
          <a href="https://reachthesoul.org/dashboard" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${lang === "id" ? "Buka Dashboard" : "Open Dashboard"}</a>
        </div>

        <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center">
          ${lang === "id" ? "Ada pertanyaan? Balas email ini atau WhatsApp kami di" : "Questions? Reply to this email or WhatsApp us at"}
          <a href="https://wa.me/6285974773341" style="color:#2563eb">+62 859-7477-3341</a>
        </p>
      </div>
    `;

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() },
      });

      await transporter.sendMail({
        from: `"ReachTheSoul" <${GMAIL_USER.value()}>`,
        to: email,
        subject,
        html,
      });

      // Mark email 1 sent
      await db.doc(`onboarding_responses/${userId}`).update({
        email1SentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`[welcomeEmail1] Sent to ${email}`);
    } catch (err) {
      logger.error("[welcomeEmail1] Failed:", err);
    }
  }
);
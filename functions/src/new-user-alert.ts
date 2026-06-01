import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

const SUPERADMIN_EMAIL = "hello@reachthesoul.org";

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

export const onUserRegistered = onDocumentCreated(
  {
    document: "users/{userId}",
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD],
  },
  async (event) => {
    const user = event.data?.data();
    if (!user) return;

    const uid = event.params.userId;
    const displayName = user.displayName ?? "(no name)";
    const email = user.email ?? "(no email)";
    const username = user.username ?? user.email?.split("@")[0] ?? uid;
    const primaryOrgId = user.primaryOrgId ?? "";

    let orgName = primaryOrgId || "(no organization)";
    let timezone = "(unknown)";

    if (primaryOrgId) {
      try {
        const orgDoc = await getDb().doc(`organizations/${primaryOrgId}`).get();
        if (orgDoc.exists) {
          const org = orgDoc.data()!;
          orgName = org.name ?? primaryOrgId;
          timezone = org.timezone ?? "(unknown)";
        }
      } catch (err) {
        logger.warn("[onUserRegistered] Failed to fetch org:", err);
      }
    }

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_APP_PASSWORD.value();

    if (!gmailUser || !gmailPass) {
      logger.error("[onUserRegistered] GMAIL_USER or GMAIL_APP_PASSWORD secret not set");
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    const subject = `New user registered: ${displayName} (${orgName})`;

    const text =
      `A new user has just registered on ReachTheSoul.\n\n` +
      `Name        : ${displayName}\n` +
      `Email       : ${email}\n` +
      `Username    : ${username}\n` +
      `Organization: ${orgName}\n` +
      `Timezone    : ${timezone}\n\n` +
      `Follow up with this user from the super admin dashboard:\n` +
      `https://reachthesoul.org/dashboard\n`;

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a2942">
        <h2 style="margin:0 0 8px 0;color:#1a2942">New user registered</h2>
        <p style="margin:0 0 20px 0;color:#5a6b85;font-size:14px">
          A new user just signed up on ReachTheSoul. Reach out to follow up.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 12px;background:#f5f7fa;font-weight:600;width:40%">Name</td>
              <td style="padding:8px 12px;background:#f5f7fa">${escapeHtml(displayName)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600">Email</td>
              <td style="padding:8px 12px"><a href="mailto:${escapeHtml(email)}" style="color:#2b6cb0">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding:8px 12px;background:#f5f7fa;font-weight:600">Username</td>
              <td style="padding:8px 12px;background:#f5f7fa">${escapeHtml(username)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600">Organization</td>
              <td style="padding:8px 12px">${escapeHtml(orgName)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f5f7fa;font-weight:600">Timezone</td>
              <td style="padding:8px 12px;background:#f5f7fa">${escapeHtml(timezone)}</td></tr>
        </table>
        <p style="margin:24px 0 0 0;font-size:13px;color:#5a6b85">
          <a href="https://reachthesoul.org/dashboard" style="color:#2b6cb0;font-weight:600">Open Super Admin Dashboard &rarr;</a>
        </p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"ReachTheSoul" <${gmailUser}>`,
        to: SUPERADMIN_EMAIL,
        subject,
        text,
        html,
      });
      logger.info(`[onUserRegistered] Alert sent for ${email} (org: ${orgName})`);
    } catch (err) {
      logger.error("[onUserRegistered] Failed to send email:", err);
    }
  }
);

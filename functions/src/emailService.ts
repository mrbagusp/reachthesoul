/**
 * RTS Email Service — Resend Integration
 * Fixed to match RTS codebase pattern (lazy init, no top-level secrets)
 */

import * as logger from "firebase-functions/logger";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  headers?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a single email via Resend
 * API key is read from process.env at runtime, not defineSecret
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  try {
    const apiKey = process.env.RESEND_API_KEY ?? "";
    if (!apiKey) {
      logger.error("RESEND_API_KEY not set");
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from || "ReachTheSoul <hello@reachthesoul.org>",
        to: [payload.to],
        reply_to: payload.replyTo || "hello@reachthesoul.org",
        subject: payload.subject,
        html: payload.html,
        tags: payload.tags || [],
        ...(payload.headers ? { headers: payload.headers } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error("Resend API error", { status: response.status, error: errorData });
      return { success: false, error: errorData.message || `HTTP ${response.status}` };
    }

    const data = await response.json();
    logger.info("Email sent successfully", { messageId: data.id, to: payload.to });
    return { success: true, messageId: data.id };

  } catch (error: any) {
    logger.error("Email send failed", { error: error.message, to: payload.to });
    return { success: false, error: error.message };
  }
}

/**
 * Replace template variables: {{name}}, {{church}}, {{city}}, {{email}}
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  return rendered;
}

/**
 * Wrap email body in a clean, branded HTML template
 */
/** Physical mailing address required in commercial email (US CAN-SPAM). */
export const SENDER_POSTAL_ADDRESS =
  "Blessing Media Global, D Java Residence Blok C2 No. 16, Kabupaten Bekasi, Jawa Barat 17836, Indonesia";

/** Rough language guess so the button/footer match the email body (Indonesian vs English). */
export function detectEmailLang(text: string): "id" | "en" {
  const idHits = (text.match(/\b(dan|yang|untuk|gereja|Anda|kami|tidak|dengan|Shalom|Tuhan memberkati)\b/gi) ?? []).length;
  return idHits >= 3 ? "id" : "en";
}

export interface WrapOptions {
  /** Outreach/marketing email: adds opt-out line + postal address. */
  marketing?: boolean;
  lang?: "id" | "en";
}

export function wrapInEmailTemplate(body: string, subject: string, opts: WrapOptions = {}): string {
  const lang = opts.lang ?? detectEmailLang(`${subject}\n${body}`);
  const ctaLabel = lang === "id" ? "Coba Gratis Sekarang" : "Try ReachTheSoul Free";
  const optOut = opts.marketing
    ? (lang === "id"
        ? `Tidak ingin menerima email seperti ini lagi? Balas email ini dengan kata "berhenti" atau <a href="mailto:hello@reachthesoul.org?subject=unsubscribe" style="color:#2d6a4f">klik di sini</a>.<br/>${SENDER_POSTAL_ADDRESS}<br/>`
        : `Don't want emails like this? Reply "unsubscribe" or <a href="mailto:hello@reachthesoul.org?subject=unsubscribe" style="color:#2d6a4f">click here</a> and we won't email you again.<br/>${SENDER_POSTAL_ADDRESS}<br/>`)
    : "";
  const htmlBody = body
    .split("\n\n").map(p => `<p style="margin:0 0 16px;line-height:1.7">${p}</p>`).join("")
    .replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
          <tr>
            <td style="background:#2d6a4f;padding:28px 40px">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px">ReachTheSoul</span><br/>
              <span style="color:#a7d7c5;font-size:12px">${lang === "id" ? "Prayer & Counseling Software untuk Gereja" : "Prayer & Pastoral Care Software for Churches"}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;color:#333333;font-size:15px;line-height:1.7">
              ${htmlBody}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 40px" align="center">
              <a href="https://reachthesoul.org/register" style="display:inline-block;background:#2d6a4f;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                ${ctaLabel}
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f8f5;padding:24px 40px;border-top:1px solid #e5e5e0">
              <p style="margin:0;font-size:12px;color:#999;line-height:1.6">
                ${optOut}ReachTheSoul — Where Every Soul Finds Care<br/>
                <a href="https://reachthesoul.org" style="color:#2d6a4f">reachthesoul.org</a> · 
                <a href="mailto:hello@reachthesoul.org" style="color:#2d6a4f">hello@reachthesoul.org</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
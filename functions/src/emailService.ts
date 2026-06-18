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
export function wrapInEmailTemplate(body: string, subject: string): string {
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
              <span style="color:#a7d7c5;font-size:12px">Prayer & Counseling Software for Churches</span>
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
                Coba Gratis Sekarang
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f8f5;padding:24px 40px;border-top:1px solid #e5e5e0">
              <p style="margin:0;font-size:12px;color:#999;line-height:1.6">
                ReachTheSoul — Where Every Soul Finds Care<br/>
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
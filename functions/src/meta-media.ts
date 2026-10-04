// meta-media.ts — turn incoming Meta messages (WhatsApp Cloud API, Instagram DM,
// Facebook Messenger) into { text, attachments } for processIncomingMessage.
//
// Media files are copied into Firebase Storage right away because Meta's media
// URLs are temporary (WhatsApp media needs an auth token and expires; IG/FB CDN
// links expire after a while).

import { logger } from "firebase-functions/v2";
import { downloadAndUploadMedia, categorizeMimeType } from "./media-helper";
import type { Attachment } from "./webhook-processor";

const GRAPH = "https://graph.facebook.com/v21.0";

// Short labels used as the message text when a message has no caption.
// The dashboard + widget hide these when the attachment itself is shown.
export const MEDIA_LABEL: Record<string, string> = {
  image: "[Photo]",
  video: "[Video]",
  audio: "[Voice message]",
  document: "[File]",
  sticker: "[Sticker]",
  other: "[Attachment]",
};

export type ParsedMessage = { text: string; attachments: Attachment[] };

function storageFolder(channel: string, orgId: string): string {
  const d = new Date();
  const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${channel}/${orgId || "unknown"}/${ym}`;
}

function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function labelFor(type: string, filename?: string, failed = false): string {
  const base = MEDIA_LABEL[type] ?? MEDIA_LABEL.other;
  const withName = type === "document" && filename ? `${base} ${filename}` : base;
  return failed ? `${withName} (could not be loaded — open the original chat to view it)` : withName;
}

// ────────────────────────────────────────────────────────────────────────────
// WhatsApp Cloud API
// ────────────────────────────────────────────────────────────────────────────
const WA_MEDIA_TYPES = ["image", "video", "audio", "document", "sticker"];

/**
 * Parse one WhatsApp Cloud API message object (value.messages[i]).
 * Returns null for message types we deliberately ignore (reactions, system).
 */
export async function parseWhatsappMessage(
  msg: any,
  accessToken: string,
  orgId: string,
): Promise<ParsedMessage | null> {
  const type = String(msg?.type ?? "");

  if (type === "text") {
    return { text: String(msg.text?.body ?? "").trim() || "(empty message)", attachments: [] };
  }

  if (WA_MEDIA_TYPES.includes(type)) {
    const media = msg[type] ?? {};
    const caption = String(media.caption ?? "").trim();
    const filename: string | undefined = media.filename;
    const mime = String(media.mime_type ?? "").split(";")[0].trim().toLowerCase();
    const kind = type === "sticker" ? "sticker" : (mime ? categorizeMimeType(mime) : type);
    const labelType = type === "audio" ? "audio" : type === "sticker" ? "sticker" : kind;

    let attachment: Attachment | null = null;
    if (media.id && accessToken) {
      attachment = await fetchWhatsappMedia(String(media.id), mime, accessToken, orgId, {
        type: kind as Attachment["type"],
        filename,
        caption,
      });
    } else if (!accessToken) {
      logger.warn("[meta-media] WhatsApp media received but no access token configured");
    }

    return {
      text: caption || labelFor(labelType, filename, !attachment),
      attachments: attachment ? [attachment] : [],
    };
  }

  if (type === "location") {
    const loc = msg.location ?? {};
    const name = [loc.name, loc.address].filter(Boolean).join(", ");
    const link = loc.latitude != null && loc.longitude != null
      ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
      : "";
    return { text: `📍 Location${name ? `: ${name}` : ""}${link ? `\n${link}` : ""}`, attachments: [] };
  }

  if (type === "contacts") {
    const lines = (msg.contacts ?? []).map((c: any) => {
      const n = c?.name?.formatted_name ?? "Contact";
      const phones = (c?.phones ?? []).map((p: any) => p.phone ?? p.wa_id).filter(Boolean).join(", ");
      return `👤 ${n}${phones ? ` — ${phones}` : ""}`;
    });
    return { text: lines.join("\n") || "👤 Contact card", attachments: [] };
  }

  if (type === "button") {
    return { text: String(msg.button?.text ?? msg.button?.payload ?? "(button)"), attachments: [] };
  }

  if (type === "interactive") {
    const it = msg.interactive ?? {};
    const title = it.button_reply?.title ?? it.list_reply?.title ?? it.nfm_reply?.body ?? "(reply)";
    return { text: String(title), attachments: [] };
  }

  if (type === "reaction" || type === "system" || type === "ephemeral") return null;

  // "unsupported", "order", etc.
  logger.info(`[meta-media] WhatsApp message type "${type}" stored as placeholder`);
  return { text: "(This message type isn't supported — open WhatsApp to view it)", attachments: [] };
}

async function fetchWhatsappMedia(
  mediaId: string,
  mimeHint: string,
  accessToken: string,
  orgId: string,
  meta: { type: Attachment["type"]; filename?: string; caption?: string },
): Promise<Attachment | null> {
  try {
    // 1) Resolve the temporary download URL
    const infoRes = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const info: any = await infoRes.json().catch(() => ({}));
    if (!infoRes.ok || !info?.url) {
      logger.error(`[meta-media] WA media lookup failed (${infoRes.status}) for ${mediaId}:`, JSON.stringify(info).substring(0, 300));
      return null;
    }

    // 2) Download (needs the same Bearer token) and store
    const uploaded = await downloadAndUploadMedia(
      String(info.url),
      storageFolder("whatsapp", orgId),
      uniqueId("wa"),
      { Authorization: `Bearer ${accessToken}` },
      { mimeHint: mimeHint || info.mime_type },
    );
    if (!uploaded) return null;

    return {
      type: meta.type ?? categorizeMimeType(uploaded.mimeType),
      url: uploaded.url,
      mimeType: uploaded.mimeType,
      filename: meta.filename || uploaded.filename,
      size: uploaded.size,
      ...(meta.caption ? { caption: meta.caption } : {}),
    };
  } catch (err) {
    logger.error("[meta-media] WA media error:", err);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Instagram DM + Facebook Messenger  (same "messaging" event shape)
// ────────────────────────────────────────────────────────────────────────────
// Attachment types that carry a downloadable file in payload.url
const MESSENGER_FILE_TYPES: Record<string, Attachment["type"]> = {
  image: "image",
  video: "video",
  audio: "audio",
  file: "document",
  story_mention: "image", // real type decided from the downloaded file's mime
  animated_image_share: "image",
};

/**
 * Parse event.message from an Instagram / Messenger webhook.
 * Returns null when there is nothing worth storing (no text, no attachments).
 */
export async function parseMessengerMessage(
  message: any,
  channel: "instagram" | "facebook",
  orgId: string,
): Promise<ParsedMessage | null> {
  if (!message || message.is_deleted) return null;

  const text = String(message.text ?? "").trim();
  const rawAtts: any[] = Array.isArray(message.attachments) ? message.attachments : [];
  if (!text && rawAtts.length === 0) return null;

  const attachments: Attachment[] = [];
  const extraLines: string[] = [];
  let firstLabel = "";

  for (const a of rawAtts) {
    const aType = String(a?.type ?? "");
    const url: string = a?.payload?.url ?? "";
    const isSticker = !!a?.payload?.sticker_id;

    const fileType = MESSENGER_FILE_TYPES[aType];
    if (fileType && url) {
      const uploaded = await downloadAndUploadMedia(url, storageFolder(channel, orgId), uniqueId(channel === "instagram" ? "ig" : "fb"));
      const kind: Attachment["type"] = isSticker
        ? "sticker"
        : uploaded ? (categorizeMimeType(uploaded.mimeType) as Attachment["type"]) : fileType;
      if (uploaded) {
        attachments.push({
          type: kind,
          url: uploaded.url,
          originalUrl: url,
          mimeType: uploaded.mimeType,
          filename: a?.payload?.name || a?.name || uploaded.filename,
          size: uploaded.size,
        });
      }
      if (!firstLabel) {
        firstLabel = aType === "story_mention" && uploaded
          ? "[Story mention]"
          : labelFor(kind, a?.payload?.name, !uploaded);
      }
      continue;
    }

    // Links / shared posts / reels: keep them as clickable text
    if (url) {
      const title = a?.payload?.title ?? a?.title ?? "";
      const tag =
        aType === "ig_reel" || aType === "reel" ? "🎬 Reel" :
        aType === "share" || aType === "ig_post" ? "🔗 Shared post" :
        "🔗 Link";
      extraLines.push(`${tag}${title ? `: ${title}` : ""}\n${url}`);
    } else if (aType) {
      extraLines.push(`(${aType} — open ${channel === "instagram" ? "Instagram" : "Messenger"} to view it)`);
    }
  }

  const parts = [text || firstLabel, ...extraLines].filter(Boolean);
  const finalText = parts.join("\n").trim();
  if (!finalText && attachments.length === 0) return null;

  return { text: finalText || MEDIA_LABEL.other, attachments };
}

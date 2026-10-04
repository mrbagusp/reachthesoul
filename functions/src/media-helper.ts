import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import { logger } from "firebase-functions/v2";

function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp();
}

function getBucket() {
  return getApp().storage().bucket();
}

// Largest inbound file we copy into Storage (keeps webhook memory/time safe).
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25 MB

export type MediaUploadResult = {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
};

/**
 * Download media from channel URL and upload to Firebase Storage.
 * Returns a permanent public URL.
 *
 * @param sourceUrl - URL from channel (Fonnte, Meta, FB, IG)
 * @param ticketId - For storage path organization
 * @param messageId - For storage path organization
 * @param headers - Optional headers (e.g., Meta needs Authorization)
 */
export async function downloadAndUploadMedia(
  sourceUrl: string,
  ticketId: string,
  messageId: string,
  headers: Record<string, string> = {},
  opts: { mimeHint?: string; maxBytes?: number } = {}
): Promise<MediaUploadResult | null> {
  const maxBytes = opts.maxBytes ?? MAX_MEDIA_BYTES;
  try {
    // Step 1: Download from source URL
    const response = await fetch(sourceUrl, { headers });
    if (!response.ok) {
      logger.error(`[downloadAndUploadMedia] Download failed: ${response.status} ${sourceUrl}`);
      return null;
    }

    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared && declared > maxBytes) {
      logger.warn(`[downloadAndUploadMedia] Skipped: ${declared} bytes exceeds limit ${maxBytes}`);
      return null;
    }

    const headerMime = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    const mimeType = (opts.mimeHint || headerMime || "application/octet-stream").split(";")[0].trim().toLowerCase();
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const size = buffer.length;
    if (size > maxBytes) {
      logger.warn(`[downloadAndUploadMedia] Skipped: ${size} bytes exceeds limit ${maxBytes}`);
      return null;
    }

    // Step 2: Generate filename
    const ext = getExtensionFromMime(mimeType);
    const timestamp = Date.now();
    const filename = `${timestamp}${ext}`;
    const storagePath = `attachments/${ticketId}/${messageId}/${filename}`;

    // Step 3: Upload to Firebase Storage (download-token URL — no makePublic needed)
    const publicUrl = await uploadBufferToStorage(buffer, mimeType, storagePath);

    logger.info(`[downloadAndUploadMedia] Uploaded ${size} bytes to ${storagePath}`);

    return {
      url: publicUrl,
      filename,
      size,
      mimeType,
    };
  } catch (err) {
    logger.error("[downloadAndUploadMedia] Error:", err);
    return null;
  }
}

/**
 * Upload a raw buffer to Firebase Storage and return a permanent download URL.
 * Uses a Firebase download token (works with uniform bucket-level access and
 * does not depend on makePublic / object ACLs).
 */
export async function uploadBufferToStorage(
  buffer: Buffer,
  mimeType: string,
  storagePath: string,
): Promise<string> {
  const bucket = getBucket();
  const token = randomUUID();
  await bucket.file(storagePath).save(buffer, {
    resumable: false,
    metadata: {
      contentType: mimeType,
      cacheControl: "private, max-age=31536000",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/mpeg": ".mpeg",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/zip": ".zip",
    "text/plain": ".txt",
  };
  return map[mime.toLowerCase()] ?? "";
}

/**
 * Categorize MIME type into our attachment type enum
 */
export function categorizeMimeType(mime: string): "image" | "video" | "audio" | "document" | "sticker" | "other" {
  const m = mime.toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (
    m === "application/pdf" ||
    m.includes("word") ||
    m.includes("excel") ||
    m.includes("powerpoint") ||
    m.includes("spreadsheet") ||
    m.includes("document") ||
    m === "text/plain" ||
    m === "application/zip"
  ) return "document";
  return "other";
}
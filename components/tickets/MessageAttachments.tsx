"use client";
import { FileText, Paperclip, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageAttachment } from "@/types";

// Text the backend puts on attachment-only messages (see webhookWidget).
// Hidden in the bubble when the attachment itself is shown.
export const ATTACHMENT_PLACEHOLDER = /^\[(Photo|File|Video|Voice message|Sticker|Attachment|Story mention)\]/;

export function hasVisibleText(content: string | undefined, attachments?: MessageAttachment[]) {
  const text = (content ?? "").trim();
  if (!text) return false;
  if (attachments && attachments.length > 0 && ATTACHMENT_PLACEHOLDER.test(text)) return false;
  return true;
}

export function MessageAttachments({
  attachments,
  alignRight,
}: {
  attachments?: MessageAttachment[];
  alignRight?: boolean;
}) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-1.5", alignRight ? "items-end" : "items-start")}>
      {attachments.map((a, i) => {
        if (!a?.url) return null;
        const name = a.filename || "Attachment";

        if (a.type === "image" || a.type === "sticker") {
          return (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={a.caption || name}
                loading="lazy"
                className="max-w-[260px] max-h-[260px] rounded-xl border border-border object-cover shadow-sm hover:opacity-90 transition-opacity"
              />
            </a>
          );
        }

        if (a.type === "video") {
          return (
            <video key={i} src={a.url} controls preload="metadata" className="max-w-[280px] rounded-xl border border-border shadow-sm" />
          );
        }

        if (a.type === "audio") {
          return (
            <div key={i} className="flex flex-col gap-0.5">
              <audio src={a.url} controls preload="metadata" className="max-w-[260px]" />
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:underline px-1">
                Download audio
              </a>
            </div>
          );
        }

        return (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground shadow-sm hover:bg-muted transition-colors max-w-[260px]"
          >
            {a.type === "document" ? <FileText size={16} className="text-primary flex-shrink-0" /> : <Paperclip size={16} className="text-primary flex-shrink-0" />}
            <span className="truncate font-medium">{name}</span>
            <Download size={13} className="text-muted-foreground flex-shrink-0 ml-auto" />
          </a>
        );
      })}
    </div>
  );
}

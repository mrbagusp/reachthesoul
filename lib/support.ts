/**
 * Open ReachTheSoul's own support chat (public/widget.js, mounted on every page).
 * Falls back to email if the widget has not loaded yet.
 */
export const SUPPORT_EMAIL = "hello@reachthesoul.org";

export function openSupportChat() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { rtsOpenChat?: () => void };
  if (typeof w.rtsOpenChat === "function") {
    w.rtsOpenChat();
    return;
  }
  window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Help getting started with ReachTheSoul")}`;
}

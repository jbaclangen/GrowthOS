"use client";

import { useSearchParams } from "next/navigation";

// Explains the outcome of a Search Console action or the Google consent screen (?gsc=<code>), on Settings or on the
// onboarding step "Connect your tools". Codes come from the start and callback routes and connections-actions.ts.
const NOTICES: Record<string, { tone: "success" | "info" | "warning" | "danger"; text: string }> = {
  connected: { tone: "success", text: "Search Console is connected and the first data is in." },
  "choose-property": { tone: "info", text: "Search Console is connected. Choose which property belongs to your website." },
  "connected-sync-failed": { tone: "warning", text: "Search Console is connected, but the first fetch didn't work. The details are below." },
  refreshed: { tone: "success", text: "Search Console data is up to date." },
  "refresh-wait": { tone: "info", text: "Search Console data was fetched in the last 10 minutes. Try again shortly." },
  "sync-failed": { tone: "warning", text: "Search Console data couldn't be fetched. The details are below." },
  "not-connected": { tone: "info", text: "Search Console isn't connected." },
  paused: { tone: "info", text: "The Search Console connection is part of Pro. This business is on Basic, so it's paused." },
  denied: { tone: "info", text: "You didn't give Braventa access, so nothing was connected. You can try again any time." },
  "scope-missing": {
    tone: "warning",
    text: "Google didn't grant access to Search Console data, so nothing was connected. Try again and leave the Search Console permission ticked.",
  },
  expired: { tone: "warning", text: "The connection request expired or didn't match your session. Start again." },
  error: { tone: "danger", text: "Google couldn't complete the connection. Try again in a few minutes." },
  "redirect-mismatch": { tone: "danger", text: "Google sign-in isn't set up for this address. Use app.braventa.io." },
  "not-configured": { tone: "info", text: "Search Console connection isn't set up yet." },
  "owner-only": { tone: "info", text: "Only the business owner can connect, change or disconnect Search Console." },
  "no-business": { tone: "info", text: "Analyze a website first so we know which business to connect." },
  "property-invalid": { tone: "warning", text: "That property isn't available to the connected Google account. Choose one from the list." },
  disconnected: {
    tone: "success",
    text: "Search Console is disconnected. Braventa's access was revoked at Google and its Search Console data was deleted.",
  },
  "disconnect-failed": { tone: "danger", text: "Search Console wasn't fully disconnected. Try again." },
};

const TONES = {
  success: "bg-success-soft text-foreground",
  info: "bg-info-soft text-foreground",
  warning: "bg-warning-soft text-foreground",
  danger: "bg-danger-soft text-foreground",
};

export function ConnectionNotice() {
  const code = useSearchParams().get("gsc");
  const notice = code ? NOTICES[code] : undefined;
  if (!notice) return null;
  return (
    <p className={`mt-4 rounded-md px-3 py-2 text-sm ${TONES[notice.tone]}`} role={notice.tone === "danger" ? "alert" : "status"}>
      {notice.text}
    </p>
  );
}

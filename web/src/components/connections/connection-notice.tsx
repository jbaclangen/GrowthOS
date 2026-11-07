"use client";

import { useSearchParams } from "next/navigation";

// Explains the outcome of a Google connection action or the Google consent screen (?gsc=<code>), on Settings or on
// the onboarding step "Connect your tools". Codes come from the start and callback routes and connections-actions.ts.
// One Google sign-in connects Search Console and Google Analytics 4: the Search Console card shows the shared codes
// and its own, the Google Analytics card only the ga-* codes, so each notice appears once.
const NOTICES: Record<string, { tone: "success" | "info" | "warning" | "danger"; text: string }> = {
  connected: { tone: "success", text: "Google is connected and the first data is in." },
  "choose-property": { tone: "info", text: "Google is connected. Choose which property belongs to your website." },
  "connected-sync-failed": { tone: "warning", text: "Google is connected, but the first fetch didn't work. The details are below." },
  refreshed: { tone: "success", text: "Search Console data is up to date." },
  "refresh-wait": { tone: "info", text: "Search Console data was fetched in the last 10 minutes. Try again shortly." },
  "sync-failed": { tone: "warning", text: "Search Console data couldn't be fetched. The details are below." },
  "not-connected": { tone: "info", text: "Search Console isn't connected." },
  paused: { tone: "info", text: "The Google connection is part of Pro. This business is on Basic, so it's paused." },
  denied: { tone: "info", text: "You didn't give Braventa access, so nothing was connected. You can try again any time." },
  "scope-missing": {
    tone: "warning",
    text: "Google didn't grant access to Search Console or Google Analytics data, so nothing was connected. Try again and leave at least one of those permissions ticked.",
  },
  expired: { tone: "warning", text: "The connection request expired or didn't match your session. Start again." },
  error: { tone: "danger", text: "Google couldn't complete the connection. Try again in a few minutes." },
  "redirect-mismatch": { tone: "danger", text: "Google sign-in isn't set up for this address. Use app.braventa.io." },
  "not-configured": { tone: "info", text: "The Google connection isn't set up yet." },
  "owner-only": { tone: "info", text: "Only the business owner can connect, change or disconnect Google." },
  "consent-needed": {
    tone: "warning",
    text: "Tick the box to confirm you're authorized to connect this Google account and responsible for it, then connect again.",
  },
  "no-business": { tone: "info", text: "Analyze a website first so we know which business to connect." },
  "property-invalid": { tone: "warning", text: "That property isn't available to the connected Google account. Choose one from the list." },
  disconnected: {
    tone: "success",
    text: "Google is disconnected. Braventa's access was revoked at Google and its Search Console and Google Analytics data was deleted.",
  },
  "disconnect-failed": { tone: "danger", text: "Google wasn't fully disconnected. Try again." },
  // Google Analytics card only.
  "ga-refreshed": { tone: "success", text: "Google Analytics data is up to date." },
  "ga-refresh-wait": { tone: "info", text: "Google Analytics data was fetched in the last 10 minutes. Try again shortly." },
  "ga-sync-failed": { tone: "warning", text: "Google Analytics data couldn't be fetched. The details are below." },
  "ga-choose-property": { tone: "info", text: "Choose which Google Analytics property belongs to your website." },
  "ga-not-connected": { tone: "info", text: "Google Analytics isn't connected. Reconnect Google and leave the Google Analytics permission ticked." },
  "ga-paused": { tone: "info", text: "The Google Analytics connection is part of Pro. This business is on Basic, so it's paused." },
  "ga-property-invalid": { tone: "warning", text: "That property isn't available to the connected Google account. Choose one from the list." },
};

const TONES = {
  success: "bg-success-soft text-foreground",
  info: "bg-info-soft text-foreground",
  warning: "bg-warning-soft text-foreground",
  danger: "bg-danger-soft text-foreground",
};

export function ConnectionNotice({ product = "search_console" }: { product?: "search_console" | "google_analytics" }) {
  const code = useSearchParams().get("gsc");
  const mine = code !== null && (product === "google_analytics") === code.startsWith("ga-");
  const notice = mine ? NOTICES[code] : undefined;
  if (!notice) return null;
  return (
    <p className={`mt-4 rounded-md px-3 py-2 text-sm ${TONES[notice.tone]}`} role={notice.tone === "danger" ? "alert" : "status"}>
      {notice.text}
    </p>
  );
}

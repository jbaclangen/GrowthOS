// Where a Google connection flow (consent screen, refresh, property choice, disconnect) sends the owner back to.
// An exact allowlist, not a general "safe path" check (safe-next.ts allows any same-site path): Settings, or the
// onboarding "Connect your tools" step of one session. Anything else, including a tampered value, means Settings.
// Session ids come from gen_random_uuid(), so only lowercase UUIDs are accepted. Pure logic, unit-tested.

export const SETTINGS_RETURN = "/settings";

const ONBOARDING_CONNECT = /^\/onboarding\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/connect$/;

export function connectionReturnPath(raw: unknown): string {
  return typeof raw === "string" && ONBOARDING_CONNECT.test(raw) ? raw : SETTINGS_RETURN;
}

// The card id the Google Analytics card uses on both pages.
export const ANALYTICS_CARD_ID = "google-analytics";

// The page that explains an outcome code (?gsc=, connection-notice.tsx), scrolled to the card it belongs to: the
// Google Analytics card for ga-* codes, otherwise the Search Console card.
export function connectionOutcomeUrl(returnTo: unknown, code: string): string {
  const path = connectionReturnPath(returnTo);
  const anchor = code.startsWith("ga-") ? ANALYTICS_CARD_ID : path === SETTINGS_RETURN ? "connections" : "search-console";
  return `${path}?gsc=${encodeURIComponent(code)}#${anchor}`;
}

// The connect button is a form with a required checkbox (D-057, components/connections/connect-form.tsx), not a link:
// the start route refuses a request without it.

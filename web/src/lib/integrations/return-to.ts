// Where a Search Console flow (Google consent screen, refresh, property choice, disconnect) sends the owner back to.
// An exact allowlist, not a general "safe path" check (safe-next.ts allows any same-site path): Settings, or the
// onboarding "Connect your tools" step of one session. Anything else, including a tampered value, means Settings.
// Session ids come from gen_random_uuid(), so only lowercase UUIDs are accepted. Pure logic, unit-tested.

export const SETTINGS_RETURN = "/settings";

const ONBOARDING_CONNECT = /^\/onboarding\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/connect$/;

export function connectionReturnPath(raw: unknown): string {
  return typeof raw === "string" && ONBOARDING_CONNECT.test(raw) ? raw : SETTINGS_RETURN;
}

// The page that explains an outcome code (?gsc=, connection-notice.tsx), scrolled to the Search Console card.
export function connectionOutcomeUrl(returnTo: unknown, code: string): string {
  const path = connectionReturnPath(returnTo);
  return `${path}?gsc=${encodeURIComponent(code)}#${path === SETTINGS_RETURN ? "connections" : "search-console"}`;
}

// The connect button is a form with a required checkbox (D-057, components/connections/connect-form.tsx), not a link:
// the start route refuses a request without it.

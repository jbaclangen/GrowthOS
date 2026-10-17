// What an OAuth grant or service key may do on the MCP server. Pure, unit-tested.
//
// Only `onboarding` is live: the seven setup, discovery and status tools. `read` (plan, drafts) and `write` (accept
// plan items, approve drafts) are reserved names for later phases; they're never granted or advertised until built.

export type Scope = "onboarding" | "read" | "write";

type ScopeInfo = { live: boolean; label: string; detail: string };

export const SCOPES: Record<Scope, ScopeInfo> = {
  onboarding: {
    live: true,
    label: "Set up your business and check its status",
    detail:
      "Start the website analysis, answer the discovery and follow-up questions, confirm your priorities, and read your growth score, top plan items and report link.",
  },
  read: { live: false, label: "Read your plan and drafts", detail: "Coming soon." },
  write: { live: false, label: "Change your plan and drafts", detail: "Coming soon." },
};

export const LIVE_SCOPES = (Object.keys(SCOPES) as Scope[]).filter((s) => SCOPES[s].live);
export const DEFAULT_SCOPES: Scope[] = ["onboarding"];

const isLive = (s: string): s is Scope => s in SCOPES && SCOPES[s as Scope].live;

// Parses an OAuth `scope` parameter (space-separated). Unknown and not-yet-live scopes are dropped rather than
// refused, so clients that ask for more than exists still connect with what Braventa offers; nothing requested
// means the default.
export function grantableScopes(scope: string | null | undefined): Scope[] {
  const requested = (scope ?? "").split(/\s+/).filter(Boolean);
  const granted = [...new Set(requested.filter(isLive))];
  return granted.length ? granted : [...DEFAULT_SCOPES];
}

// A refresh may narrow the scopes, never widen them (RFC 6749 §6). As in the authorization request, scopes that
// weren't granted (or aren't live) are dropped rather than refused, so a client that sends its original request
// again still refreshes; the response's `scope` says what it got (RFC 6749 §3.3). Null when nothing granted is left.
export function narrowScopes(scope: string | null | undefined, current: readonly string[]): Scope[] | null {
  const granted = current.filter(isLive);
  if (!scope) return granted.length ? granted : null;
  const requested = [...new Set(scope.split(/\s+/).filter(Boolean))];
  const kept = requested.filter((s): s is Scope => isLive(s) && granted.includes(s));
  return kept.length ? kept : null;
}

export function hasScope(granted: readonly string[], required: Scope) {
  return granted.includes(required);
}

export const scopeString = (scopes: readonly string[]) => scopes.join(" ");

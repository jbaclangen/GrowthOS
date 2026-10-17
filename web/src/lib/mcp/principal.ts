// Who is calling /api/mcp, and the rules for accepting an OAuth access token. Pure, unit-tested.

export type Principal = {
  kind: "personal" | "service" | "access";
  organizationId: string;
  // null for service keys: they belong to the organization, not a person.
  userId: string | null;
  keyId: string | null;
  grantId: string | null;
  scopes: string[];
  org: { plan: string; trial_ends_at: string };
};

export type Rejected = { ok: false; reason: "missing" } | { ok: false; reason: "invalid"; message: string };
export type ResolvedPrincipal =
  | { ok: true; principal: Principal }
  | { ok: false; reason: "missing" }
  | { ok: false; reason: "invalid"; message: string };

type TokenRow = {
  kind: string;
  organization_id: string;
  user_id: string;
  grant_id: string;
  scopes: string[];
  resource: string;
  expires_at: string;
  revoked_at: string | null;
};

const SIGN_IN_AGAIN = "Sign in to Braventa again from your AI assistant.";

// Every message a request to /api/mcp can be refused with. They go into the JSON-RPC body as written and, made
// header-safe (lib/oauth/server-metadata.ts), into WWW-Authenticate; a test builds a Response with each one.
export const AUTH_MESSAGES = {
  missing: "Sign in to Braventa, or add a Braventa key: Authorization: Bearer brv_… (Braventa → Settings → Integrations).",
  malformed: "This Braventa credential isn't valid.",
  keyInvalid: "This Braventa key isn't valid or was revoked. Create a new one in Braventa → Settings → Integrations.",
  serviceKeyExpired: "This Braventa service key has expired. Create a new one in Braventa → Settings → Integrations.",
  keyOwnerLeft: "This access key's account no longer has access to the business.",
  tokenInvalid: `This Braventa sign-in isn't valid. ${SIGN_IN_AGAIN}`,
  disconnected: `This connection was disconnected in Braventa. ${SIGN_IN_AGAIN}`,
  tokenExpired: "The access token expired. Refresh it.",
  wrongResource: "This token was issued for another server.",
  notMember: "This account no longer has access to the business.",
  orgGone: "This business no longer exists in Braventa.",
} as const;

export function resolveAccessToken(
  token: TokenRow | null,
  grant: { revoked_at: string | null } | null,
  isMember: boolean,
  resource: string,
  now = new Date(),
): Rejected | { ok: true; principal: Omit<Principal, "org"> } {
  if (!token || token.kind !== "access") return { ok: false, reason: "invalid", message: AUTH_MESSAGES.tokenInvalid };
  if (token.revoked_at || !grant || grant.revoked_at) {
    return { ok: false, reason: "invalid", message: AUTH_MESSAGES.disconnected };
  }
  if (new Date(token.expires_at).getTime() <= now.getTime()) return { ok: false, reason: "invalid", message: AUTH_MESSAGES.tokenExpired };
  // RFC 8707 audience check: a token issued for another resource isn't accepted here.
  if (token.resource !== resource) return { ok: false, reason: "invalid", message: AUTH_MESSAGES.wrongResource };
  if (!isMember) return { ok: false, reason: "invalid", message: AUTH_MESSAGES.notMember };
  return {
    ok: true,
    principal: {
      kind: "access",
      organizationId: token.organization_id,
      userId: token.user_id,
      keyId: null,
      grantId: token.grant_id,
      scopes: token.scopes,
    },
  };
}

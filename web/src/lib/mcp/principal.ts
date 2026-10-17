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

export function resolveAccessToken(
  token: TokenRow | null,
  grant: { revoked_at: string | null } | null,
  isMember: boolean,
  resource: string,
  now = new Date(),
): Rejected | { ok: true; principal: Omit<Principal, "org"> } {
  if (!token || token.kind !== "access") return { ok: false, reason: "invalid", message: `This Braventa sign-in isn't valid. ${SIGN_IN_AGAIN}` };
  if (token.revoked_at || !grant || grant.revoked_at) {
    return { ok: false, reason: "invalid", message: `This connection was disconnected in Braventa. ${SIGN_IN_AGAIN}` };
  }
  if (new Date(token.expires_at).getTime() <= now.getTime()) return { ok: false, reason: "invalid", message: "The access token expired. Refresh it." };
  // RFC 8707 audience check: a token issued for another resource isn't accepted here.
  if (token.resource !== resource) return { ok: false, reason: "invalid", message: "This token was issued for another server." };
  if (!isMember) return { ok: false, reason: "invalid", message: "This account no longer has access to the business." };
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

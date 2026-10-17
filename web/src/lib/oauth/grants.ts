import { randomUUID } from "node:crypto";
import { verifyPkce } from "./pkce";
import { narrowScopes, scopeString, type Scope } from "./scopes";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  CODE_TTL_SECONDS,
  REFRESH_REUSE_GRACE_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  generateSecret,
  isSecretOfKind,
  sha256Hex,
} from "./tokens";

// The OAuth grant logic: issuing codes, exchanging them, rotating refresh tokens, revoking. Written against a small
// store interface so the rules are unit-tested with an in-memory store; lib/oauth/supabase-store.ts is the real one.
//
// Rules (OAuth 2.1, MCP authorization spec 2025-06-18):
// - codes are one-time, 10 minutes, bound to client + redirect URI + PKCE challenge + user + organization + scopes
//   + resource. A code used twice revokes everything issued from it, even when the replay races the first exchange.
// - refresh tokens rotate: each use revokes the old one and issues a new pair. Presenting a refresh token that was
//   already rotated revokes the whole grant (reuse detection), because one of the two holders is an attacker.
//   Exception, the reuse grace window: within 60 seconds of the rotation, and while the token it was rotated into is
//   still unused, the same client gets a fresh pair instead. Clients send the same refresh token twice when two
//   requests hit an expired access token at once, or when a refresh response is lost; without the window both
//   requests would fail and the owner would have to connect again.
// - a token revoked by Disconnect or the revocation endpoint is invalid, but that isn't reuse.
// - everything the client can correct (client, resource, scope) is checked before a refresh token is used, so a
//   rejected request keeps the token (RFC 6749 §6).
// - every exchange re-checks that the user still belongs to the organization.

export type CodeRow = {
  code_hash: string;
  client_id: string;
  organization_id: string;
  user_id: string;
  grant_id: string;
  redirect_uri: string;
  code_challenge: string;
  scopes: string[];
  resource: string;
  expires_at: string;
  used_at: string | null;
};

export type GrantRow = {
  id: string;
  organization_id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  scopes: string[];
  resource: string;
  revoked_at: string | null;
};

export type TokenRow = {
  id: string;
  organization_id: string;
  user_id: string;
  client_id: string;
  grant_id: string;
  kind: "access" | "refresh";
  token_hash: string;
  scopes: string[];
  resource: string;
  expires_at: string;
  revoked_at: string | null;
  // Refresh tokens only: when it was exchanged for a new pair, and the refresh token issued in that exchange.
  rotated_at: string | null;
  successor_id: string | null;
};

export type NewToken = Omit<TokenRow, "revoked_at" | "rotated_at" | "successor_id">;
export type GrantReason = "user" | "refresh_reuse" | "code_reuse" | "membership";

export interface OAuthStore {
  insertCode(row: Omit<CodeRow, "used_at">): Promise<void>;
  // Atomically marks the code used. firstUse is false when it had already been used.
  consumeCode(codeHash: string, now: Date): Promise<{ code: CodeRow; firstUse: boolean } | null>;
  // Inserts the grant. Returns false when a grant with this id already exists: a replay of the code got there first
  // and left a revoked record (see revokeGrant's tombstone).
  createGrant(row: Omit<GrantRow, "revoked_at">): Promise<boolean>;
  findGrant(id: string): Promise<GrantRow | null>;
  // Revokes the grant and every token in it. With a tombstone, first records the grant as revoked if it doesn't exist
  // yet, so an exchange still in progress can't create it afterwards.
  revokeGrant(id: string, reason: GrantReason, now: Date, tombstone?: Omit<GrantRow, "revoked_at">): Promise<void>;
  insertTokens(rows: NewToken[]): Promise<void>;
  findToken(tokenHash: string): Promise<TokenRow | null>;
  findTokenById(id: string): Promise<TokenRow | null>;
  // Atomically rotates an active refresh token: revokes it and records when and into which refresh token. When it
  // was already revoked, returns its current row instead.
  consumeRefreshToken(tokenHash: string, successorId: string, now: Date): Promise<{ firstUse: true } | { firstUse: false; token: TokenRow } | null>;
  revokeToken(tokenHash: string, now: Date): Promise<void>;
  isMember(organizationId: string, userId: string): Promise<boolean>;
}

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

export class OAuthError extends Error {
  constructor(
    readonly code: "invalid_request" | "invalid_grant" | "invalid_client" | "invalid_scope" | "unsupported_grant_type" | "invalid_target",
    readonly description: string,
  ) {
    super(description);
  }
}

const later = (now: Date, seconds: number) => new Date(now.getTime() + seconds * 1000).toISOString();
const CODE_USED = "The authorization code was already used.";
const DISCONNECTED = "This connection was disconnected in Braventa. Sign in again.";

export async function issueCode(
  store: OAuthStore,
  p: { clientId: string; redirectUri: string; codeChallenge: string; userId: string; organizationId: string; scopes: Scope[]; resource: string },
  now = new Date(),
) {
  const code = generateSecret("code");
  await store.insertCode({
    code_hash: sha256Hex(code),
    client_id: p.clientId,
    organization_id: p.organizationId,
    user_id: p.userId,
    grant_id: randomUUID(),
    redirect_uri: p.redirectUri,
    code_challenge: p.codeChallenge,
    scopes: p.scopes,
    resource: p.resource,
    expires_at: later(now, CODE_TTL_SECONDS),
  });
  return code;
}

async function issueTokens(
  store: OAuthStore,
  base: Omit<NewToken, "id" | "kind" | "token_hash" | "expires_at">,
  now: Date,
  refreshId: string = randomUUID(),
): Promise<TokenResponse> {
  const access = generateSecret("access");
  const refresh = generateSecret("refresh");
  await store.insertTokens([
    { ...base, id: randomUUID(), kind: "access", token_hash: sha256Hex(access), expires_at: later(now, ACCESS_TOKEN_TTL_SECONDS) },
    { ...base, id: refreshId, kind: "refresh", token_hash: sha256Hex(refresh), expires_at: later(now, REFRESH_TOKEN_TTL_SECONDS) },
  ]);
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TOKEN_TTL_SECONDS, refresh_token: refresh, scope: scopeString(base.scopes) };
}

export async function exchangeCode(
  store: OAuthStore,
  p: { code: string | null; codeVerifier: string | null; redirectUri: string | null; clientId: string; clientName: string; resource: string | null },
  now = new Date(),
): Promise<TokenResponse> {
  if (!isSecretOfKind(p.code, "code")) throw new OAuthError("invalid_grant", "The authorization code is invalid.");
  const consumed = await store.consumeCode(sha256Hex(p.code), now);
  if (!consumed) throw new OAuthError("invalid_grant", "The authorization code is invalid.");
  const { code, firstUse } = consumed;
  const grant = {
    id: code.grant_id,
    organization_id: code.organization_id,
    user_id: code.user_id,
    client_id: code.client_id,
    client_name: p.clientName,
    scopes: code.scopes,
    resource: code.resource,
  };
  if (!firstUse) {
    // RFC 6749 §4.1.2 / OAuth 2.1 §4.1.3: a reused code revokes the tokens it issued. The tombstone covers a replay
    // that arrives while the first exchange is still running: its createGrant then fails instead of going live.
    await store.revokeGrant(code.grant_id, "code_reuse", now, grant);
    throw new OAuthError("invalid_grant", CODE_USED);
  }
  if (new Date(code.expires_at).getTime() <= now.getTime()) throw new OAuthError("invalid_grant", "The authorization code expired.");
  if (code.client_id !== p.clientId) throw new OAuthError("invalid_grant", "The authorization code was issued to another client.");
  if (p.redirectUri !== null && p.redirectUri !== code.redirect_uri) throw new OAuthError("invalid_grant", "redirect_uri doesn't match the authorization request.");
  if (!verifyPkce(p.codeVerifier, code.code_challenge)) throw new OAuthError("invalid_grant", "code_verifier doesn't match the code challenge.");
  if (p.resource !== null && p.resource !== code.resource) throw new OAuthError("invalid_target", "resource doesn't match the authorization request.");
  if (!(await store.isMember(code.organization_id, code.user_id))) throw new OAuthError("invalid_grant", "The account no longer has access to this business.");

  if (!(await store.createGrant(grant))) throw new OAuthError("invalid_grant", CODE_USED);
  const tokens = await issueTokens(
    store,
    { organization_id: code.organization_id, user_id: code.user_id, client_id: code.client_id, grant_id: code.grant_id, scopes: code.scopes, resource: code.resource },
    now,
  );
  // A replay that arrived after createGrant revoked the grant; tokens inserted after that belong to a revoked grant,
  // which /api/mcp and refresh both refuse. Answer the same way here.
  const after = await store.findGrant(code.grant_id);
  if (!after || after.revoked_at) throw new OAuthError("invalid_grant", CODE_USED);
  return tokens;
}

// Within the grace window, from the same client, while the token it was rotated into hasn't been used yet.
async function inReuseGrace(store: OAuthStore, token: TokenRow, now: Date) {
  if (!token.rotated_at) return false;
  if (now.getTime() - new Date(token.rotated_at).getTime() > REFRESH_REUSE_GRACE_SECONDS * 1000) return false;
  if (!token.successor_id) return true;
  // Missing: the first request is still issuing it.
  const successor = await store.findTokenById(token.successor_id);
  return !successor || (!successor.rotated_at && !successor.revoked_at);
}

export async function refreshTokens(
  store: OAuthStore,
  p: { refreshToken: string | null; clientId: string; scope: string | null; resource: string | null },
  now = new Date(),
): Promise<TokenResponse> {
  if (!isSecretOfKind(p.refreshToken, "refresh")) throw new OAuthError("invalid_grant", "The refresh token is invalid.");
  const hash = sha256Hex(p.refreshToken);
  const token = await store.findToken(hash);
  if (!token || token.kind !== "refresh") throw new OAuthError("invalid_grant", "The refresh token is invalid.");
  // Checked before the token is used, so a request the client can correct doesn't burn it, and a token presented by
  // the wrong client doesn't burn the real client's token.
  if (token.client_id !== p.clientId) throw new OAuthError("invalid_grant", "The refresh token was issued to another client.");
  if (p.resource !== null && p.resource !== token.resource) throw new OAuthError("invalid_target", "resource doesn't match this grant.");
  const scopes = narrowScopes(p.scope, token.scopes);
  if (!scopes) throw new OAuthError("invalid_scope", "Ask for scopes this connection was granted, or leave scope out.");
  if (new Date(token.expires_at).getTime() <= now.getTime()) throw new OAuthError("invalid_grant", "The refresh token expired. Sign in to Braventa again.");

  const successorId = randomUUID();
  const consumed = await store.consumeRefreshToken(hash, successorId, now);
  if (!consumed) throw new OAuthError("invalid_grant", "The refresh token is invalid.");
  if (!consumed.firstUse) {
    const current = consumed.token;
    // Revoked without being rotated: Disconnect, the revocation endpoint, or the grant ended. Not reuse.
    if (!current.rotated_at) throw new OAuthError("invalid_grant", DISCONNECTED);
    if (!(await inReuseGrace(store, current, now))) {
      await store.revokeGrant(token.grant_id, "refresh_reuse", now);
      throw new OAuthError("invalid_grant", "The refresh token was already used. Sign in to Braventa again.");
    }
  }

  const grant = await store.findGrant(token.grant_id);
  if (!grant || grant.revoked_at) throw new OAuthError("invalid_grant", DISCONNECTED);
  if (!(await store.isMember(token.organization_id, token.user_id))) {
    await store.revokeGrant(token.grant_id, "membership", now);
    throw new OAuthError("invalid_grant", "The account no longer has access to this business.");
  }

  return issueTokens(
    store,
    { organization_id: token.organization_id, user_id: token.user_id, client_id: token.client_id, grant_id: token.grant_id, scopes, resource: token.resource },
    now,
    // A grace reissue isn't linked: the rotated token's successor stays the first pair.
    consumed.firstUse ? successorId : undefined,
  );
}

// RFC 7009: revoking a refresh token ends the grant; revoking an access token ends just that token. Unknown tokens
// and tokens of another client are ignored (the endpoint answers 200 either way).
export async function revokeTokenValue(store: OAuthStore, p: { token: string | null; clientId: string }, now = new Date()) {
  const kind = isSecretOfKind(p.token, "refresh") ? "refresh" : isSecretOfKind(p.token, "access") ? "access" : null;
  if (!kind || !p.token) return;
  const row = await store.findToken(sha256Hex(p.token));
  if (!row || row.client_id !== p.clientId) return;
  if (row.kind === "refresh") await store.revokeGrant(row.grant_id, "user", now);
  else await store.revokeToken(row.token_hash, now);
}

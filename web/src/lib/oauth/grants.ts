import { randomUUID } from "node:crypto";
import { verifyPkce } from "./pkce";
import { narrowScopes, scopeString, type Scope } from "./scopes";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  CODE_TTL_SECONDS,
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
//   + resource. A code used twice revokes everything issued from it.
// - refresh tokens rotate: each use revokes the old one and issues a new pair. Presenting a refresh token that was
//   already used revokes the whole grant (reuse detection), because one of the two holders is an attacker.
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
};

export type NewToken = Omit<TokenRow, "id" | "revoked_at">;

export interface OAuthStore {
  insertCode(row: Omit<CodeRow, "used_at">): Promise<void>;
  // Atomically marks the code used. firstUse is false when it had already been used.
  consumeCode(codeHash: string, now: Date): Promise<{ code: CodeRow; firstUse: boolean } | null>;
  createGrant(row: Omit<GrantRow, "revoked_at">): Promise<void>;
  findGrant(id: string): Promise<GrantRow | null>;
  revokeGrant(id: string, reason: "user" | "refresh_reuse" | "code_reuse" | "membership", now: Date): Promise<void>;
  insertTokens(rows: NewToken[]): Promise<void>;
  findToken(tokenHash: string): Promise<TokenRow | null>;
  // Atomically revokes an active refresh token. firstUse is false when it had already been revoked.
  consumeRefreshToken(tokenHash: string, now: Date): Promise<{ firstUse: boolean } | null>;
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

async function issueTokens(store: OAuthStore, base: Omit<NewToken, "kind" | "token_hash" | "expires_at">, now: Date): Promise<TokenResponse> {
  const access = generateSecret("access");
  const refresh = generateSecret("refresh");
  await store.insertTokens([
    { ...base, kind: "access", token_hash: sha256Hex(access), expires_at: later(now, ACCESS_TOKEN_TTL_SECONDS) },
    { ...base, kind: "refresh", token_hash: sha256Hex(refresh), expires_at: later(now, REFRESH_TOKEN_TTL_SECONDS) },
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
  if (!firstUse) {
    // RFC 6749 §4.1.2 / OAuth 2.1 §4.1.3: a reused code revokes the tokens it issued.
    await store.revokeGrant(code.grant_id, "code_reuse", now);
    throw new OAuthError("invalid_grant", "The authorization code was already used.");
  }
  if (new Date(code.expires_at).getTime() <= now.getTime()) throw new OAuthError("invalid_grant", "The authorization code expired.");
  if (code.client_id !== p.clientId) throw new OAuthError("invalid_grant", "The authorization code was issued to another client.");
  if (p.redirectUri !== null && p.redirectUri !== code.redirect_uri) throw new OAuthError("invalid_grant", "redirect_uri doesn't match the authorization request.");
  if (!verifyPkce(p.codeVerifier, code.code_challenge)) throw new OAuthError("invalid_grant", "code_verifier doesn't match the code challenge.");
  if (p.resource !== null && p.resource !== code.resource) throw new OAuthError("invalid_target", "resource doesn't match the authorization request.");
  if (!(await store.isMember(code.organization_id, code.user_id))) throw new OAuthError("invalid_grant", "The account no longer has access to this business.");

  await store.createGrant({
    id: code.grant_id,
    organization_id: code.organization_id,
    user_id: code.user_id,
    client_id: code.client_id,
    client_name: p.clientName,
    scopes: code.scopes,
    resource: code.resource,
  });
  return issueTokens(
    store,
    { organization_id: code.organization_id, user_id: code.user_id, client_id: code.client_id, grant_id: code.grant_id, scopes: code.scopes, resource: code.resource },
    now,
  );
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
  // Checked before consuming, so a token presented by the wrong client doesn't burn the real client's token.
  if (token.client_id !== p.clientId) throw new OAuthError("invalid_grant", "The refresh token was issued to another client.");

  const consumed = await store.consumeRefreshToken(hash, now);
  if (!consumed) throw new OAuthError("invalid_grant", "The refresh token is invalid.");
  if (!consumed.firstUse) {
    await store.revokeGrant(token.grant_id, "refresh_reuse", now);
    throw new OAuthError("invalid_grant", "The refresh token was already used. Sign in to Braventa again.");
  }
  if (new Date(token.expires_at).getTime() <= now.getTime()) throw new OAuthError("invalid_grant", "The refresh token expired. Sign in to Braventa again.");

  const grant = await store.findGrant(token.grant_id);
  if (!grant || grant.revoked_at) throw new OAuthError("invalid_grant", "This connection was disconnected in Braventa. Sign in again.");
  if (!(await store.isMember(token.organization_id, token.user_id))) {
    await store.revokeGrant(token.grant_id, "membership", now);
    throw new OAuthError("invalid_grant", "The account no longer has access to this business.");
  }
  if (p.resource !== null && p.resource !== token.resource) throw new OAuthError("invalid_target", "resource doesn't match this grant.");
  const scopes = narrowScopes(p.scope, token.scopes);
  if (!scopes) throw new OAuthError("invalid_scope", "A refresh can't add scopes that weren't granted.");

  return issueTokens(
    store,
    { organization_id: token.organization_id, user_id: token.user_id, client_id: token.client_id, grant_id: token.grant_id, scopes, resource: token.resource },
    now,
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

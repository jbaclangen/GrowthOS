import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkAuthorizeRequest } from "./authorize-request";
import { matchRedirectUri, parseRegistration, validRedirectUri } from "./clients";
import { decideConsent } from "./consent";
import { OAuthError, exchangeCode, issueCode, refreshTokens, revokeTokenValue, type CodeRow, type GrantRow, type OAuthStore, type TokenRow } from "./grants";
import { s256, verifyPkce } from "./pkce";
import { grantableScopes, hasScope, narrowScopes } from "./scopes";
import {
  authorizationServerMetadata,
  canonicalResource,
  mcpOriginAllowed,
  protectedResourceMetadata,
  publicOrigin,
  wwwAuthenticate,
} from "./server-metadata";
import { bearerFromHeader, classifyBearer, generateSecret, isSecretOfKind, sha256Hex } from "./tokens";
import { resolveAccessToken } from "../mcp/principal";
import { generateKey } from "../mcp/keys";
import { safeNext } from "../safe-next";

const ORIGIN = "https://app.braventa.io";
const RESOURCE = `${ORIGIN}/api/mcp`;
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = s256(VERIFIER);

// In-memory OAuthStore with the same atomic semantics as the Supabase one.
function memoryStore(members: Array<[string, string]> = [["org-1", "user-1"]]) {
  const codes = new Map<string, CodeRow>();
  const grants = new Map<string, GrantRow & { revoked_reason?: string }>();
  const tokens = new Map<string, TokenRow>();
  const memberSet = new Set(members.map(([o, u]) => `${o}:${u}`));
  const store: OAuthStore = {
    async insertCode(row) {
      codes.set(row.code_hash, { ...row, used_at: null });
    },
    async consumeCode(hash, now) {
      const code = codes.get(hash);
      if (!code) return null;
      if (code.used_at) return { code, firstUse: false };
      code.used_at = now.toISOString();
      return { code, firstUse: true };
    },
    async createGrant(row) {
      grants.set(row.id, { ...row, revoked_at: null });
    },
    async findGrant(id) {
      return grants.get(id) ?? null;
    },
    async revokeGrant(id, reason, now) {
      const g = grants.get(id);
      if (g && !g.revoked_at) Object.assign(g, { revoked_at: now.toISOString(), revoked_reason: reason });
      for (const t of tokens.values()) if (t.grant_id === id && !t.revoked_at) t.revoked_at = now.toISOString();
    },
    async insertTokens(rows) {
      for (const r of rows) tokens.set(r.token_hash, { ...r, id: randomUUID(), revoked_at: null });
    },
    async findToken(hash) {
      return tokens.get(hash) ?? null;
    },
    async consumeRefreshToken(hash, now) {
      const t = tokens.get(hash);
      if (!t || t.kind !== "refresh") return null;
      if (t.revoked_at) return { firstUse: false };
      t.revoked_at = now.toISOString();
      return { firstUse: true };
    },
    async revokeToken(hash, now) {
      const t = tokens.get(hash);
      if (t && !t.revoked_at) t.revoked_at = now.toISOString();
    },
    async isMember(org, user) {
      return memberSet.has(`${org}:${user}`);
    },
  };
  return { store, codes, grants, tokens, memberSet };
}

const codeParams = { clientId: "client-a", redirectUri: "https://claude.ai/api/mcp/auth_callback", codeChallenge: CHALLENGE, userId: "user-1", organizationId: "org-1", scopes: ["onboarding" as const], resource: RESOURCE };
const exchange = (code: string, over: Partial<Parameters<typeof exchangeCode>[1]> = {}) => ({
  code,
  codeVerifier: VERIFIER,
  redirectUri: codeParams.redirectUri,
  clientId: "client-a",
  clientName: "Claude",
  resource: null,
  ...over,
});

async function expectOAuthError(p: Promise<unknown>, code: string) {
  const e = await p.catch((err) => err);
  expect(e).toBeInstanceOf(OAuthError);
  expect((e as OAuthError).code).toBe(code);
}

describe("PKCE", () => {
  it("accepts the RFC 7636 example and rejects anything else", () => {
    expect(CHALLENGE).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    expect(verifyPkce(VERIFIER, CHALLENGE)).toBe(true);
    expect(verifyPkce(`${VERIFIER}x`, CHALLENGE)).toBe(false);
    expect(verifyPkce("short", s256("short"))).toBe(false);
    expect(verifyPkce(null, CHALLENGE)).toBe(false);
  });
});

describe("redirect URIs", () => {
  it("allows https and loopback http only", () => {
    expect(validRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(validRedirectUri("https://chatgpt.com/connector_platform_oauth_redirect")).toBe(true);
    expect(validRedirectUri("http://localhost:33418/callback")).toBe(true);
    expect(validRedirectUri("http://127.0.0.1:5000/cb")).toBe(true);
    expect(validRedirectUri("http://example.com/cb")).toBe(false);
    expect(validRedirectUri("https://claude.ai/cb#frag")).toBe(false);
    expect(validRedirectUri("https://user:pw@claude.ai/cb")).toBe(false);
    expect(validRedirectUri("javascript:alert(1)")).toBe(false);
    expect(validRedirectUri("myapp://callback")).toBe(false);
  });

  it("matches exactly, except loopback ports", () => {
    const registered = ["https://claude.ai/api/mcp/auth_callback", "http://localhost:3334/callback"];
    expect(matchRedirectUri("https://claude.ai/api/mcp/auth_callback", registered)).toBeTruthy();
    expect(matchRedirectUri("https://claude.ai/api/mcp/auth_callback?x=1", registered)).toBeNull();
    expect(matchRedirectUri("https://evil.example/api/mcp/auth_callback", registered)).toBeNull();
    expect(matchRedirectUri("http://localhost:49152/callback", registered)).toBe("http://localhost:49152/callback");
    expect(matchRedirectUri("http://localhost:49152/other", registered)).toBeNull();
    expect(matchRedirectUri("http://127.0.0.1:3334/callback", registered)).toBeNull();
  });
});

describe("client registration", () => {
  it("registers a public client and cleans the name", () => {
    const r = parseRegistration({ client_name: "Claude\u0000‮", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] });
    expect(r.ok && r.value).toEqual({
      client_name: "Claude",
      client_uri: null,
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
      token_endpoint_auth_method: "none",
    });
  });
  it("names an unnamed client after its redirect host", () => {
    const r = parseRegistration({ redirect_uris: ["http://localhost:1234/cb"] });
    expect(r.ok && r.value.client_name).toBe("localhost:1234");
  });
  it("refuses bad metadata", () => {
    expect(parseRegistration({ redirect_uris: [] }).ok).toBe(false);
    expect(parseRegistration({ redirect_uris: ["http://evil.example/cb"] })).toMatchObject({ ok: false, error: "invalid_redirect_uri" });
    expect(parseRegistration({ redirect_uris: ["https://a.example/cb"], grant_types: ["client_credentials"] }).ok).toBe(false);
    expect(parseRegistration({ redirect_uris: ["https://a.example/cb"], token_endpoint_auth_method: "private_key_jwt" }).ok).toBe(false);
    expect(parseRegistration([]).ok).toBe(false);
  });
});

describe("scopes", () => {
  it("grants only live scopes, defaulting to onboarding", () => {
    expect(grantableScopes(null)).toEqual(["onboarding"]);
    expect(grantableScopes("onboarding read write openid")).toEqual(["onboarding"]);
    expect(grantableScopes("openid")).toEqual(["onboarding"]);
  });
  it("lets a refresh narrow but never widen", () => {
    expect(narrowScopes(null, ["onboarding"])).toEqual(["onboarding"]);
    expect(narrowScopes("onboarding", ["onboarding"])).toEqual(["onboarding"]);
    expect(narrowScopes("onboarding write", ["onboarding"])).toBeNull();
  });
  it("checks tool scopes", () => {
    expect(hasScope(["onboarding"], "onboarding")).toBe(true);
    expect(hasScope(["onboarding"], "write")).toBe(false);
    expect(hasScope([], "onboarding")).toBe(false);
  });
});

describe("authorization codes", () => {
  it("exchange once for an access and refresh token, stored only as hashes", async () => {
    const { store, tokens, grants } = memoryStore();
    const code = await issueCode(store, codeParams);
    expect(isSecretOfKind(code, "code")).toBe(true);
    const res = await exchangeCode(store, exchange(code));
    expect(isSecretOfKind(res.access_token, "access")).toBe(true);
    expect(isSecretOfKind(res.refresh_token, "refresh")).toBe(true);
    expect(res).toMatchObject({ token_type: "Bearer", expires_in: 3600, scope: "onboarding" });
    expect(tokens.has(sha256Hex(res.access_token))).toBe(true);
    expect([...tokens.keys()].some((k) => k.includes(res.access_token))).toBe(false);
    expect(tokens.get(sha256Hex(res.access_token))).toMatchObject({ organization_id: "org-1", user_id: "user-1", resource: RESOURCE });
    expect(grants.size).toBe(1);
  });

  it("are single-use: a second exchange fails and revokes what the first issued", async () => {
    const { store, tokens } = memoryStore();
    const code = await issueCode(store, codeParams);
    const first = await exchangeCode(store, exchange(code));
    await expectOAuthError(exchangeCode(store, exchange(code)), "invalid_grant");
    expect(tokens.get(sha256Hex(first.access_token))?.revoked_at).not.toBeNull();
    expect(tokens.get(sha256Hex(first.refresh_token))?.revoked_at).not.toBeNull();
  });

  it("expire after 10 minutes", async () => {
    const { store } = memoryStore();
    const t0 = new Date("2026-10-17T10:00:00Z");
    const code = await issueCode(store, codeParams, t0);
    await expectOAuthError(exchangeCode(store, exchange(code), new Date("2026-10-17T10:10:01Z")), "invalid_grant");
  });

  it("are bound to the client, redirect URI, verifier and resource", async () => {
    for (const over of [
      { clientId: "client-b" },
      { redirectUri: "https://claude.ai/other" },
      { codeVerifier: "x".repeat(43) },
      { codeVerifier: null },
      { resource: "https://other.example/api/mcp" },
    ]) {
      const { store } = memoryStore();
      const code = await issueCode(store, codeParams);
      const e = await exchangeCode(store, exchange(code, over)).catch((err) => err);
      expect(e).toBeInstanceOf(OAuthError);
    }
  });

  it("refuse a user who left the business", async () => {
    const { store, memberSet } = memoryStore();
    const code = await issueCode(store, codeParams);
    memberSet.clear();
    await expectOAuthError(exchangeCode(store, exchange(code)), "invalid_grant");
  });

  it("refuse malformed codes before touching the store", async () => {
    const { store } = memoryStore();
    await expectOAuthError(exchangeCode(store, exchange("brv_ac_short")), "invalid_grant");
  });
});

describe("refresh tokens", () => {
  async function connected() {
    const m = memoryStore();
    const code = await issueCode(m.store, codeParams);
    const first = await exchangeCode(m.store, exchange(code));
    return { ...m, first };
  }
  const refresh = (refreshToken: string, over = {}) => ({ refreshToken, clientId: "client-a", scope: null, resource: null, ...over });

  it("rotate: the old refresh token stops working, the new pair works", async () => {
    const { store, tokens, first } = await connected();
    const second = await refreshTokens(store, refresh(first.refresh_token));
    expect(second.refresh_token).not.toBe(first.refresh_token);
    expect(tokens.get(sha256Hex(first.refresh_token))?.revoked_at).not.toBeNull();
    const third = await refreshTokens(store, refresh(second.refresh_token));
    expect(isSecretOfKind(third.access_token, "access")).toBe(true);
  });

  it("reuse revokes the whole grant", async () => {
    const { store, tokens, grants, first } = await connected();
    const second = await refreshTokens(store, refresh(first.refresh_token));
    await expectOAuthError(refreshTokens(store, refresh(first.refresh_token)), "invalid_grant");
    expect([...grants.values()][0]).toMatchObject({ revoked_reason: "refresh_reuse" });
    expect(tokens.get(sha256Hex(second.access_token))?.revoked_at).not.toBeNull();
    await expectOAuthError(refreshTokens(store, refresh(second.refresh_token)), "invalid_grant");
  });

  it("presented by another client fail without burning the token", async () => {
    const { store, first } = await connected();
    await expectOAuthError(refreshTokens(store, refresh(first.refresh_token, { clientId: "client-b" })), "invalid_grant");
    await expect(refreshTokens(store, refresh(first.refresh_token))).resolves.toBeTruthy();
  });

  it("expire after 30 days", async () => {
    const { store, first } = await connected();
    await expectOAuthError(refreshTokens(store, refresh(first.refresh_token), new Date(Date.now() + 31 * 86_400_000)), "invalid_grant");
  });

  it("can't widen scopes", async () => {
    const { store, first } = await connected();
    await expectOAuthError(refreshTokens(store, refresh(first.refresh_token, { scope: "onboarding write" })), "invalid_scope");
  });

  it("stop when the user leaves the business, and revoke the grant", async () => {
    const { store, memberSet, grants, first } = await connected();
    memberSet.clear();
    await expectOAuthError(refreshTokens(store, refresh(first.refresh_token)), "invalid_grant");
    expect([...grants.values()][0]).toMatchObject({ revoked_reason: "membership" });
  });

  it("revoking a refresh token ends the grant; another client's revoke is ignored", async () => {
    const { store, tokens, first } = await connected();
    await revokeTokenValue(store, { token: first.refresh_token, clientId: "client-b" });
    expect(tokens.get(sha256Hex(first.access_token))?.revoked_at).toBeNull();
    await revokeTokenValue(store, { token: first.refresh_token, clientId: "client-a" });
    expect(tokens.get(sha256Hex(first.access_token))?.revoked_at).not.toBeNull();
  });
});

describe("authorization request and consent", () => {
  const client = { client_id: "client-a", client_name: "Claude", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] };
  const params = {
    response_type: "code",
    client_id: "client-a",
    redirect_uri: "https://claude.ai/api/mcp/auth_callback",
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
    state: "xyz",
    scope: "onboarding",
    resource: RESOURCE,
  };

  it("accepts a valid request", () => {
    const r = checkAuthorizeRequest(params, client, ORIGIN);
    expect(r.kind).toBe("ok");
  });
  it("never redirects to an unregistered URI or for an unknown client", () => {
    expect(checkAuthorizeRequest({ ...params, redirect_uri: "https://evil.example/cb" }, client, ORIGIN).kind).toBe("show-error");
    expect(checkAuthorizeRequest(params, null, ORIGIN).kind).toBe("show-error");
  });
  it("sends protocol errors back to the client with state and iss", () => {
    const r = checkAuthorizeRequest({ ...params, code_challenge_method: "plain" }, client, ORIGIN);
    expect(r.kind).toBe("redirect-error");
    const url = new URL((r as { url: string }).url);
    expect(url.searchParams.get("error")).toBe("invalid_request");
    expect(url.searchParams.get("state")).toBe("xyz");
    expect(url.searchParams.get("iss")).toBe(ORIGIN);
    expect(checkAuthorizeRequest({ ...params, resource: "https://other.example/mcp" }, client, ORIGIN)).toMatchObject({ kind: "redirect-error" });
    expect(checkAuthorizeRequest({ ...params, response_type: "token" }, client, ORIGIN)).toMatchObject({ kind: "redirect-error" });
  });

  it("approve issues a code for a business the user belongs to", async () => {
    const { store, codes } = memoryStore();
    const r = await decideConsent(store, { params, client, origin: ORIGIN, userId: "user-1", decision: "approve", organizationId: "org-1", memberOf: ["org-1"] });
    expect(r.kind).toBe("redirect");
    const url = new URL((r as { url: string }).url);
    expect(url.origin + url.pathname).toBe("https://claude.ai/api/mcp/auth_callback");
    expect(url.searchParams.get("state")).toBe("xyz");
    expect(url.searchParams.get("iss")).toBe(ORIGIN);
    const code = url.searchParams.get("code")!;
    expect(codes.get(sha256Hex(code))).toMatchObject({ organization_id: "org-1", user_id: "user-1", code_challenge: CHALLENGE, resource: RESOURCE });
  });
  it("refuses a business the user doesn't belong to", async () => {
    const { store, codes } = memoryStore();
    const r = await decideConsent(store, { params, client, origin: ORIGIN, userId: "user-1", decision: "approve", organizationId: "org-2", memberOf: ["org-1"] });
    expect(r.kind).toBe("show-error");
    expect(codes.size).toBe(0);
  });
  it("cancel returns access_denied without a code", async () => {
    const { store, codes } = memoryStore();
    const r = await decideConsent(store, { params, client, origin: ORIGIN, userId: "user-1", decision: "deny", organizationId: "org-1", memberOf: ["org-1"] });
    expect(new URL((r as { url: string }).url).searchParams.get("error")).toBe("access_denied");
    expect(codes.size).toBe(0);
  });
});

describe("credentials on /api/mcp", () => {
  it("tells keys and tokens apart by format", () => {
    expect(classifyBearer(generateKey())).toBe("personal");
    expect(classifyBearer(generateSecret("service"))).toBe("service");
    expect(classifyBearer(generateSecret("access"))).toBe("access");
    expect(classifyBearer(generateSecret("refresh"))).toBeNull();
    expect(classifyBearer(generateSecret("code"))).toBeNull();
    expect(classifyBearer("brv_sk_short")).toBeNull();
    expect(bearerFromHeader("Bearer abc")).toBe("abc");
    expect(bearerFromHeader("Basic abc")).toBeNull();
    expect(bearerFromHeader(null)).toBeNull();
  });

  const token = { kind: "access", organization_id: "org-1", user_id: "user-1", grant_id: "g1", scopes: ["onboarding"], resource: RESOURCE, expires_at: "2026-10-17T11:00:00Z", revoked_at: null };
  const now = new Date("2026-10-17T10:30:00Z");
  it("accepts a live access token for this resource", () => {
    expect(resolveAccessToken(token, { revoked_at: null }, true, RESOURCE, now)).toMatchObject({ ok: true, principal: { organizationId: "org-1", grantId: "g1" } });
  });
  it("refuses expired, revoked, disconnected, wrong-audience and ex-member tokens", () => {
    expect(resolveAccessToken(token, { revoked_at: null }, true, RESOURCE, new Date("2026-10-17T11:00:01Z")).ok).toBe(false);
    expect(resolveAccessToken({ ...token, revoked_at: "x" }, { revoked_at: null }, true, RESOURCE, now).ok).toBe(false);
    expect(resolveAccessToken(token, { revoked_at: "x" }, true, RESOURCE, now).ok).toBe(false);
    expect(resolveAccessToken(token, null, true, RESOURCE, now).ok).toBe(false);
    expect(resolveAccessToken(token, { revoked_at: null }, true, "https://other.example/api/mcp", now).ok).toBe(false);
    expect(resolveAccessToken(token, { revoked_at: null }, false, RESOURCE, now).ok).toBe(false);
    expect(resolveAccessToken({ ...token, kind: "refresh" }, { revoked_at: null }, true, RESOURCE, now).ok).toBe(false);
  });

  it("points unauthenticated clients at the resource metadata", () => {
    expect(wwwAuthenticate(ORIGIN)).toBe(`Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource"`);
    expect(wwwAuthenticate(ORIGIN, { code: "invalid_token", description: 'Bad "token"' })).toBe(
      `Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource", error="invalid_token", error_description="Bad token"`,
    );
  });

  it("allows only known browser origins", () => {
    expect(mcpOriginAllowed(null, ORIGIN)).toBe(true);
    expect(mcpOriginAllowed(ORIGIN, ORIGIN)).toBe(true);
    expect(mcpOriginAllowed("https://claude.ai", ORIGIN)).toBe(true);
    expect(mcpOriginAllowed("https://chatgpt.com", ORIGIN)).toBe(true);
    expect(mcpOriginAllowed("https://evil.example", ORIGIN)).toBe(false);
  });
});

describe("metadata", () => {
  it("describes the resource and the authorization server", () => {
    expect(protectedResourceMetadata(ORIGIN)).toMatchObject({ resource: RESOURCE, authorization_servers: [ORIGIN], scopes_supported: ["onboarding"] });
    expect(authorizationServerMetadata(ORIGIN)).toMatchObject({
      issuer: ORIGIN,
      authorization_endpoint: `${ORIGIN}/oauth/authorize`,
      token_endpoint: `${ORIGIN}/oauth/token`,
      registration_endpoint: `${ORIGIN}/oauth/register`,
      revocation_endpoint: `${ORIGIN}/oauth/revoke`,
      code_challenge_methods_supported: ["S256"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      response_types_supported: ["code"],
    });
  });
  it("uses the configured origin in production and the request origin in development", () => {
    expect(publicOrigin("http://evil.example/x", { NODE_ENV: "production", NEXT_PUBLIC_APP_URL: ORIGIN })).toBe(ORIGIN);
    expect(publicOrigin("http://localhost:3007/x", { NODE_ENV: "development", NEXT_PUBLIC_APP_URL: ORIGIN })).toBe("http://localhost:3007");
  });
  it("accepts the MCP URL or the bare origin as the resource", () => {
    expect(canonicalResource(null, ORIGIN)).toBe(RESOURCE);
    expect(canonicalResource(RESOURCE, ORIGIN)).toBe(RESOURCE);
    expect(canonicalResource(`${ORIGIN}/`, ORIGIN)).toBe(RESOURCE);
    expect(canonicalResource("https://evil.example/api/mcp", ORIGIN)).toBeNull();
  });
});

describe("sign-in return path", () => {
  it("keeps same-site paths only", () => {
    expect(safeNext("/oauth/authorize?client_id=x")).toBe("/oauth/authorize?client_id=x");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});

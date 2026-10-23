import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env, envConfigured } from "@/lib/env";
import { decryptSecret, encryptSecret } from "./secret-box";

// Server-side Google OAuth 2.0 for the Search Console connection (authorization code flow with PKCE S256).
// Endpoints from Google's "OAuth 2.0 for Web Server Applications" guide. No SDK: plain fetch.
// Tokens never leave the server: the refresh token is stored encrypted, access tokens are minted per use.

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
// openid + email only to show which Google account is connected.
export const OAUTH_SCOPES = ["openid", "email", SEARCH_CONSOLE_SCOPE];

export const CALLBACK_PATH = "/api/integrations/google/callback";
export const STATE_COOKIE = "brv_google_oauth";
export const STATE_TTL_SECONDS = 600;

// Redirect URIs must be registered on the OAuth client. Production and local development are the documented ones;
// NEXT_PUBLIC_APP_URL adds the current deployment's origin.
const ALLOWED_ORIGINS = ["https://app.braventa.io", "http://localhost:3000"];

export function searchConsoleConfigured() {
  return envConfigured("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "INTEGRATIONS_ENCRYPTION_KEY");
}

export function redirectUriFor(origin: string, extraAllowed: string[] = []): string | null {
  let normalized: string;
  try {
    normalized = new URL(origin).origin;
  } catch {
    return null;
  }
  const allowed = new Set([...ALLOWED_ORIGINS, ...extraAllowed.map(originOf).filter((o): o is string => Boolean(o))]);
  return allowed.has(normalized) ? `${normalized}${CALLBACK_PATH}` : null;
}

function originOf(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function appRedirectUri(requestOrigin: string) {
  return redirectUriFor(requestOrigin, [process.env.NEXT_PUBLIC_APP_URL ?? ""]);
}

// --- PKCE and state --------------------------------------------------------------------------------------------

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function buildAuthUrl(p: { clientId: string; redirectUri: string; state: string; codeChallenge: string }) {
  const params = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPES.join(" "),
    state: p.state,
    code_challenge: p.codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

// returnTo: where the owner lands afterwards (Settings or the onboarding "Connect your tools" step). It is checked
// again against the allowlist when read (lib/integrations/return-to.ts), so the cookie alone never picks a target.
export type OAuthState = {
  state: string;
  verifier: string;
  userId: string;
  orgId: string;
  redirectUri: string;
  expiresAt: number;
  returnTo?: string;
};

// The state cookie is encrypted (AES-GCM), so it can't be read or forged, and binds the flow to user + org.
export const sealState = (s: OAuthState) => encryptSecret(JSON.stringify(s));

export function openState(sealed: string | undefined, now = Date.now()): OAuthState | null {
  if (!sealed) return null;
  try {
    const s = JSON.parse(decryptSecret(sealed)) as OAuthState;
    return typeof s.state === "string" && typeof s.verifier === "string" && s.expiresAt > now ? s : null;
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Verifies the callback against the sealed state: same random value, same signed-in user and organization.
export function stateMatches(saved: OAuthState | null, returned: string | null, userId: string, orgId: string) {
  return Boolean(saved && returned && safeEqual(saved.state, returned) && saved.userId === userId && saved.orgId === orgId);
}

// --- Token endpoint ----------------------------------------------------------------------------------------------

export class GoogleOAuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string; scope?: string; id_token?: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Partial<TokenResponse> & { error?: string };
  // Only the error code is surfaced; the response body may contain tokens and is never logged.
  if (!res.ok || !data.access_token) throw new GoogleOAuthError(`Google token endpoint ${res.status}`, data.error ?? "unknown");
  return data as TokenResponse;
}

export function exchangeCode(code: string, verifier: string, redirectUri: string) {
  const e = env();
  return tokenRequest({
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
    client_id: e.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: e.GOOGLE_OAUTH_CLIENT_SECRET,
    grant_type: "authorization_code",
  });
}

// A fresh access token for one sync. Throws GoogleOAuthError("invalid_grant") when the refresh token is expired
// or the owner removed Braventa's access in their Google account.
export async function mintAccessToken(refreshToken: string) {
  const e = env();
  const t = await tokenRequest({
    refresh_token: refreshToken,
    client_id: e.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: e.GOOGLE_OAUTH_CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  return t.access_token;
}

// Best effort: a token that is already invalid can't be revoked, and that's fine.
export async function revokeToken(token: string) {
  try {
    const res = await fetch(GOOGLE_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function grantedScopes(scope: string | undefined) {
  return (scope ?? "").split(/\s+/).filter(Boolean);
}

// The id_token comes straight from Google's token endpoint over TLS, so its claims can be read without verifying the
// signature (OpenID Connect Core §3.1.3.7). Only the email is used, for display.
export function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email.slice(0, 320) : null;
  } catch {
    return null;
  }
}

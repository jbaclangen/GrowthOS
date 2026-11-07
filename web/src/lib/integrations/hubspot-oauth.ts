import "server-only";
import { env, envConfigured } from "@/lib/env";
import { randomToken, safeEqual } from "./google-oauth";
import { decryptSecret, encryptSecret } from "./secret-box";

// Server-side HubSpot OAuth for the read-only HubSpot connection (D-048): the authorization code flow of Braventa's
// unlisted marketplace app (hubspot/ in the repo root, platform 2026.09), OAuth API version 2026-09. No SDK: plain
// fetch. HubSpot documents no PKCE for app OAuth, so the flow relies on the client secret (server-only) and the sealed
// state cookie. Tokens never leave the server: the refresh token is stored encrypted (secret-box.ts) and access tokens
// (30 minutes) are minted per sync. Endpoints, scopes and sources: docs/architecture/HUBSPOT_SETUP.md.

export const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize";
const OAUTH_API = "https://api.hubapi.com/oauth/2026-09";
export const HUBSPOT_TOKEN_URL = `${OAUTH_API}/token`;
const INTROSPECT_URL = `${OAUTH_API}/token/introspect`;
const REVOKE_URL = `${OAUTH_API}/token/revoke`;
const UNINSTALL_URL = "https://api.hubapi.com/appinstalls/2026-09/external-install";

// Read-only scopes, the same list as requiredScopes in hubspot/src/app/app-hsmeta.json (a test keeps them equal).
// HubSpot adds `oauth` to every app by default (needed for the uninstall call). Pipelines and property options are
// readable with the object scopes. Not `forms` or `content`: neither is read-only (D-048).
export const HUBSPOT_SCOPES = ["crm.objects.contacts.read", "crm.objects.companies.read", "crm.objects.deals.read"] as const;

export const HUBSPOT_CALLBACK_PATH = "/api/integrations/hubspot/callback";
export const HUBSPOT_STATE_COOKIE = "brv_hubspot_oauth";
export const STATE_TTL_SECONDS = 600;

// Redirect URLs must be registered on the HubSpot app (app-hsmeta.json redirectUrls). Production and local development
// only; NEXT_PUBLIC_APP_URL adds the current deployment's origin, which then also has to be registered.
const ALLOWED_ORIGINS = ["https://app.braventa.io", "http://localhost:3000"];

export function hubspotConfigured() {
  return envConfigured("HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET", "INTEGRATIONS_ENCRYPTION_KEY");
}

export function hubspotRedirectUriFor(origin: string, extraAllowed: string[] = []): string | null {
  const originOf = (url: string) => {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  };
  const normalized = originOf(origin);
  if (!normalized) return null;
  const allowed = new Set([...ALLOWED_ORIGINS, ...extraAllowed.map(originOf).filter((o): o is string => Boolean(o))]);
  return allowed.has(normalized) ? `${normalized}${HUBSPOT_CALLBACK_PATH}` : null;
}

export function hubspotAppRedirectUri(requestOrigin: string) {
  return hubspotRedirectUriFor(requestOrigin, [process.env.NEXT_PUBLIC_APP_URL ?? ""]);
}

export { randomToken };

export function buildHubSpotAuthUrl(p: { clientId: string; redirectUri: string; state: string }) {
  const params = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    scope: HUBSPOT_SCOPES.join(" "),
    state: p.state,
  });
  return `${HUBSPOT_AUTH_URL}?${params}`;
}

// returnTo: Settings or the onboarding "Connect your tools" step, checked again against the allowlist when read
// (lib/integrations/return-to.ts), so the cookie alone never picks a target.
export type HubSpotOAuthState = {
  state: string;
  userId: string;
  orgId: string;
  redirectUri: string;
  expiresAt: number;
  returnTo?: string;
};

// Encrypted (AES-GCM), so it can't be read or forged, and bound to the user and organization.
export const sealHubSpotState = (s: HubSpotOAuthState) => encryptSecret(JSON.stringify({ ...s, provider: "hubspot" }));

export function openHubSpotState(sealed: string | undefined, now = Date.now()): HubSpotOAuthState | null {
  if (!sealed) return null;
  try {
    const s = JSON.parse(decryptSecret(sealed)) as HubSpotOAuthState & { provider?: string };
    // The provider tag keeps a Search Console state cookie from being replayed here.
    return s.provider === "hubspot" && typeof s.state === "string" && typeof s.redirectUri === "string" && s.expiresAt > now ? s : null;
  } catch {
    return null;
  }
}

export function hubspotStateMatches(saved: HubSpotOAuthState | null, returned: string | null, userId: string, orgId: string) {
  return Boolean(saved && returned && safeEqual(saved.state, returned) && saved.userId === userId && saved.orgId === orgId);
}

// --- Token endpoints ---------------------------------------------------------------------------------------------

export class HubSpotOAuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; hub_id?: number | string; scopes?: string[] };

async function form<T>(url: string, body: Record<string, string>, what: string): Promise<T & { error?: string; category?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; category?: string };
  // Only the error code is surfaced; the body may contain tokens and is never logged.
  if (!res.ok) throw new HubSpotOAuthError(`HubSpot ${what} ${res.status}`, data.error ?? data.category ?? "unknown");
  return data;
}

const client = () => {
  const e = env();
  return { client_id: e.HUBSPOT_CLIENT_ID, client_secret: e.HUBSPOT_CLIENT_SECRET };
};

export async function exchangeHubSpotCode(code: string, redirectUri: string) {
  const t = await form<TokenResponse>(HUBSPOT_TOKEN_URL, { grant_type: "authorization_code", ...client(), redirect_uri: redirectUri, code }, "token");
  if (!t.access_token) throw new HubSpotOAuthError("HubSpot token response without an access token", "no_token");
  return t;
}

// A fresh access token for one sync. HubSpot may return a new refresh token with it; the caller stores the latest one.
// Throws HubSpotOAuthError (invalid_grant) once the app was uninstalled from the portal or the token was revoked.
export async function mintHubSpotAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const t = await form<TokenResponse>(HUBSPOT_TOKEN_URL, { grant_type: "refresh_token", ...client(), refresh_token: refreshToken }, "token");
  if (!t.access_token) throw new HubSpotOAuthError("HubSpot token response without an access token", "no_token");
  return { accessToken: t.access_token, refreshToken: t.refresh_token || refreshToken };
}

export type TokenInfo = { hubId: string; hubDomain: string | null; scopes: string[] };

// Which portal the token belongs to and which scopes it carries. The response also names the installing user; that
// isn't read or stored.
export async function hubspotTokenInfo(accessToken: string): Promise<TokenInfo> {
  const data = await form<{ active?: boolean; hub_id?: unknown; hub_domain?: unknown; scopes?: unknown }>(
    INTROSPECT_URL,
    { ...client(), token_type_hint: "access_token", token: accessToken },
    "introspect",
  );
  if (data.active === false || (typeof data.hub_id !== "number" && typeof data.hub_id !== "string")) {
    throw new HubSpotOAuthError("HubSpot token isn't active", "inactive");
  }
  return {
    hubId: String(data.hub_id).slice(0, 64),
    hubDomain: typeof data.hub_domain === "string" ? data.hub_domain.slice(0, 255) : null,
    scopes: Array.isArray(data.scopes) ? data.scopes.filter((s): s is string => typeof s === "string") : [],
  };
}

// Best effort: revoking a refresh token that's already invalid fails, and that's fine.
export async function revokeHubSpotRefreshToken(refreshToken: string) {
  try {
    await form<object>(REVOKE_URL, { ...client(), token_type_hint: "refresh_token", token: refreshToken }, "revoke");
    return true;
  } catch {
    return false;
  }
}

// Disconnect: uninstalls Braventa's app from the portal (HubSpot emails the portal's admins), then revokes the refresh
// token. Best effort: when the token no longer works, the app was already uninstalled or the token revoked.
export async function uninstallHubSpot(refreshToken: string) {
  try {
    const { accessToken, refreshToken: latest } = await mintHubSpotAccessToken(refreshToken);
    const res = await fetch(UNINSTALL_URL, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    await revokeHubSpotRefreshToken(latest);
    return res.ok;
  } catch {
    await revokeHubSpotRefreshToken(refreshToken);
    return false;
  }
}

export function missingHubSpotScopes(granted: string[]) {
  return HUBSPOT_SCOPES.filter((s) => !granted.includes(s));
}

// OAuth client rules: dynamic client registration (RFC 7591) and redirect URI checks. Pure, unit-tested.

export const MAX_REDIRECT_URIS = 10;
const MAX_URI_LENGTH = 500;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type AuthMethod = "none" | "client_secret_post" | "client_secret_basic";
export const AUTH_METHODS: AuthMethod[] = ["none", "client_secret_post", "client_secret_basic"];

const isLoopback = (url: URL) => LOOPBACK_HOSTS.has(url.hostname);

// Redirect URIs a client may register: https anywhere (claude.ai, chatgpt.com), or http on the loopback interface for
// desktop and command-line clients (RFC 8252 §7.3). No fragments, no credentials, no custom schemes.
export function validRedirectUri(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_URI_LENGTH) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash || url.username || url.password) return false;
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && isLoopback(url);
}

// Does the redirect_uri in an authorization request match one the client registered? Exact string match, except that
// a loopback redirect may use any port (RFC 8252 §7.3, OAuth 2.1 §8.4.2): native apps pick a free port at run time.
export function matchRedirectUri(requested: string | null | undefined, registered: readonly string[]): string | null {
  if (!requested || !validRedirectUri(requested)) return null;
  if (registered.includes(requested)) return requested;
  const req = new URL(requested);
  if (req.protocol !== "http:" || !isLoopback(req)) return null;
  const match = registered.some((r) => {
    const reg = new URL(r);
    return reg.protocol === "http:" && reg.hostname === req.hostname && reg.pathname === req.pathname && reg.search === req.search;
  });
  return match ? requested : null;
}

export type ClientRegistration = {
  client_name: string;
  client_uri: string | null;
  redirect_uris: string[];
  token_endpoint_auth_method: AuthMethod;
};

export type RegistrationResult = { ok: true; value: ClientRegistration } | { ok: false; error: "invalid_redirect_uri" | "invalid_client_metadata"; description: string };

// Strips control characters, so a name can't break the consent screen's layout.
const cleanText = (s: string, max: number) => s.replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);

export function parseRegistration(body: unknown): RegistrationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "invalid_client_metadata", description: "Send the client metadata as a JSON object." };
  }
  const b = body as Record<string, unknown>;
  const uris = b.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > MAX_REDIRECT_URIS) {
    return { ok: false, error: "invalid_redirect_uri", description: `redirect_uris must list 1 to ${MAX_REDIRECT_URIS} URIs.` };
  }
  if (!uris.every(validRedirectUri)) {
    return {
      ok: false,
      error: "invalid_redirect_uri",
      description: "Each redirect URI must use https, or http on localhost or 127.0.0.1, with no fragment.",
    };
  }

  const method = b.token_endpoint_auth_method ?? "none";
  if (!AUTH_METHODS.includes(method as AuthMethod)) {
    return { ok: false, error: "invalid_client_metadata", description: "token_endpoint_auth_method must be none, client_secret_post or client_secret_basic." };
  }
  const grantTypes = b.grant_types ?? ["authorization_code"];
  if (!Array.isArray(grantTypes) || !grantTypes.every((g) => g === "authorization_code" || g === "refresh_token")) {
    return { ok: false, error: "invalid_client_metadata", description: "Only the authorization_code and refresh_token grant types are supported." };
  }
  const responseTypes = b.response_types ?? ["code"];
  if (!Array.isArray(responseTypes) || !responseTypes.every((r) => r === "code")) {
    return { ok: false, error: "invalid_client_metadata", description: "Only the code response type is supported." };
  }

  const firstHost = new URL(uris[0] as string).host;
  const name = typeof b.client_name === "string" ? cleanText(b.client_name, 100) : "";
  const clientUri = typeof b.client_uri === "string" && /^https:\/\//.test(b.client_uri) && b.client_uri.length <= 300 ? b.client_uri : null;

  return {
    ok: true,
    value: {
      client_name: name || firstHost,
      client_uri: clientUri,
      redirect_uris: [...new Set(uris as string[])],
      token_endpoint_auth_method: method as AuthMethod,
    },
  };
}

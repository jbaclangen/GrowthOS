import { matchRedirectUri } from "./clients";
import { isValidChallenge } from "./pkce";
import { grantableScopes, type Scope } from "./scopes";
import { canonicalResource } from "./server-metadata";

// Validates an authorization request (OAuth 2.1 §4.1.1). Pure, unit-tested.
//
// Two kinds of failure: when the client, redirect URI or state can't be used, the error is shown on Braventa's page
// and never sent anywhere. Once the redirect URI is known to be the client's, other errors go back to it as
// ?error=… with state and iss (RFC 9207), but only after the person has seen where they're going and clicked: anyone
// can register a client with any https redirect URI (DCR), so sending the browser there automatically from a link
// would be an open redirect (RFC 9700 §4.11.2). See authorizePageView.

export type AuthorizeParams = Record<string, string | undefined>;
export type ClientInfo = { client_id: string; client_name: string; redirect_uris: string[] };

// state comes back to the client exactly as sent (RFC 6749 §4.1.2), so a longer one is refused rather than dropped.
// It also keeps the whole request within the sign-in return path's limit (lib/safe-next.ts).
export const MAX_STATE_LENGTH = 1000;

export type AuthorizeRequest = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  scopes: Scope[];
  resource: string;
};

export type AuthorizeCheck =
  | { kind: "ok"; request: AuthorizeRequest }
  | { kind: "show-error"; message: string }
  | { kind: "redirect-error"; url: string; host: string; description: string };

export function errorRedirect(redirectUri: string, issuer: string, error: string, description: string, state: string | null) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  url.searchParams.set("iss", issuer);
  return url.toString();
}

export function successRedirect(redirectUri: string, issuer: string, code: string, state: string | null) {
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  url.searchParams.set("iss", issuer);
  return url.toString();
}

export function checkAuthorizeRequest(params: AuthorizeParams, client: ClientInfo | null, origin: string): AuthorizeCheck {
  if (!params.client_id || !client) {
    return {
      kind: "show-error",
      message: "This app isn't registered with Braventa, or its registration expired. Remove Braventa from the app, add it again and connect.",
    };
  }
  const redirectUri = matchRedirectUri(params.redirect_uri, client.redirect_uris);
  if (!redirectUri) {
    return { kind: "show-error", message: "This app sent a return address Braventa doesn't recognize, so it can't connect. Go back to the app and connect again." };
  }
  if (params.state && params.state.length > MAX_STATE_LENGTH) {
    return { kind: "show-error", message: "This app sent a sign-in request that's too long for Braventa, so it can't connect. Contact the app's developer." };
  }
  const state = params.state || null;
  const fail = (error: string, description: string): AuthorizeCheck => ({
    kind: "redirect-error",
    url: errorRedirect(redirectUri, origin, error, description, state),
    host: new URL(redirectUri).host,
    description,
  });

  if (params.response_type !== "code") return fail("unsupported_response_type", "Only response_type=code is supported.");
  if (params.code_challenge_method !== "S256" || !isValidChallenge(params.code_challenge)) {
    return fail("invalid_request", "PKCE is required: send code_challenge with code_challenge_method=S256.");
  }
  const resource = canonicalResource(params.resource, origin);
  if (!resource) return fail("invalid_target", "resource must be this server's MCP URL.");

  return {
    kind: "ok",
    request: {
      clientId: client.client_id,
      clientName: client.client_name,
      redirectUri,
      codeChallenge: params.code_challenge,
      state,
      scopes: grantableScopes(params.scope),
      resource,
    },
  };
}

// What GET /oauth/authorize shows. It never redirects by itself: a protocol error is shown on Braventa's page with
// the app's return host and a link the person must click. Only the consent form's POST (lib/oauth/consent.ts)
// redirects, after the person has seen the host and chosen Approve or Cancel.
export type AuthorizePageView =
  | { kind: "consent"; request: AuthorizeRequest }
  | { kind: "problem"; message: string }
  | { kind: "return-to-app"; detail: string; host: string; href: string };

export function authorizePageView(check: AuthorizeCheck): AuthorizePageView {
  if (check.kind === "ok") return { kind: "consent", request: check.request };
  if (check.kind === "show-error") return { kind: "problem", message: check.message };
  return { kind: "return-to-app", detail: check.description, host: check.host, href: check.url };
}

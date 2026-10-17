import { matchRedirectUri } from "./clients";
import { isValidChallenge } from "./pkce";
import { grantableScopes, type Scope } from "./scopes";
import { canonicalResource } from "./server-metadata";

// Validates an authorization request (OAuth 2.1 §4.1.1). Pure, unit-tested.
//
// Two kinds of failure: when the client or redirect URI can't be trusted, the error is shown on Braventa's page and
// never sent anywhere (an open redirect otherwise). Once the redirect URI is known to be the client's, other errors
// go back to it as ?error=… with state and iss (RFC 9207).

export type AuthorizeParams = Record<string, string | undefined>;
export type ClientInfo = { client_id: string; client_name: string; redirect_uris: string[] };

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
  | { kind: "redirect-error"; url: string };

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
    return { kind: "show-error", message: "This app isn't registered with Braventa. Go back to the app and connect again." };
  }
  const redirectUri = matchRedirectUri(params.redirect_uri, client.redirect_uris);
  if (!redirectUri) {
    return { kind: "show-error", message: "This app sent a return address Braventa doesn't recognize, so it can't connect. Go back to the app and connect again." };
  }
  const state = params.state && params.state.length <= 1000 ? params.state : null;
  const fail = (error: string, description: string): AuthorizeCheck => ({
    kind: "redirect-error",
    url: errorRedirect(redirectUri, origin, error, description, state),
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

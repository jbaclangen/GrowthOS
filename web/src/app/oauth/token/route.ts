import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { OAuthError, exchangeCode, refreshTokens } from "@/lib/oauth/grants";
import { oauthError, oauthJson, preflight, readForm } from "@/lib/oauth/http";
import { canonicalResource, publicOrigin } from "@/lib/oauth/server-metadata";
import { authenticateClient, cleanUpOAuth, supabaseOAuthStore } from "@/lib/oauth/supabase-store";

// Token endpoint (OAuth 2.1 §3.2): authorization_code (with PKCE) and refresh_token (rotating). Access tokens last
// 1 hour, refresh tokens 30 days; both are opaque and stored hashed (lib/oauth/grants.ts has the rules).

export async function POST(request: Request) {
  const form = await readForm(request);
  if (!form) return oauthError("invalid_request", "The request body couldn't be read.");

  const db = createSupabaseAdminClient();
  const origin = publicOrigin(request.url);
  const store = supabaseOAuthStore(db);
  try {
    const client = await authenticateClient(db, form, request.headers.get("authorization"));
    if (!client) return oauthError("invalid_client", "Unknown client or wrong client credentials.", 401, { "WWW-Authenticate": 'Basic realm="braventa"' });

    const requestedResource = form.get("resource");
    const resource = requestedResource ? canonicalResource(requestedResource, origin) : null;
    if (requestedResource && !resource) return oauthError("invalid_target", "resource must be this server's MCP URL.");

    const grantType = form.get("grant_type");
    if (grantType === "authorization_code") {
      const tokens = await exchangeCode(store, {
        code: form.get("code"),
        codeVerifier: form.get("code_verifier"),
        redirectUri: form.get("redirect_uri"),
        clientId: client.client_id,
        clientName: client.client_name,
        resource,
      });
      // A new connection: a good moment to delete expired codes and tokens (oauth_cleanup).
      after(() => cleanUpOAuth(db));
      return oauthJson(tokens);
    }
    if (grantType === "refresh_token") {
      const tokens = await refreshTokens(store, {
        refreshToken: form.get("refresh_token"),
        clientId: client.client_id,
        scope: form.get("scope"),
        resource,
      });
      return oauthJson(tokens);
    }
    return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token.");
  } catch (e) {
    if (e instanceof OAuthError) return oauthError(e.code, e.description);
    console.error("OAuth token request failed", e);
    return oauthError("server_error", "Something went wrong in Braventa. Try again.", 500);
  }
}

export const OPTIONS = preflight;

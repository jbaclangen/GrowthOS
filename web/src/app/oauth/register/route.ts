import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { firstPartyRedirects, parseRegistration } from "@/lib/oauth/clients";
import { oauthError, oauthJson, registrationCors } from "@/lib/oauth/http";
import { publicOrigin, registrationOriginAllowed } from "@/lib/oauth/server-metadata";
import { cleanUpOAuth, registrationIpHash } from "@/lib/oauth/supabase-store";
import { generateSecret, newClientId, sha256Hex } from "@/lib/oauth/tokens";

// Dynamic Client Registration (RFC 7591). ChatGPT and claude.ai register themselves here once per connector. Open by
// design (the MCP authorization spec expects it), so it's rate-limited in the database, atomically (trigger
// oauth_clients_rate_limit): 10 registrations per IP per hour (IPv6 per /64), and 500 per hour overall for clients
// whose redirect URIs aren't the AI clients' own hosts or loopback. Registering grants nothing: a person still signs
// in and approves on /oauth/authorize. Clients that never connect are deleted after 7 days (oauth_cleanup).

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const own = [new URL(request.url).origin, publicOrigin(request.url)];
  return { origin, allowed: registrationOriginAllowed(origin, own) };
}

export async function POST(request: Request) {
  const { origin, allowed } = allowedOrigin(request);
  // A browser always sends Origin on a cross-site POST, even a "simple" one that skips the preflight.
  if (!allowed) return oauthError("invalid_request", "Apps can't register with Braventa from this website.", 403, {}, {});
  const cors = registrationCors(origin);
  const fail = (error: string, description: string, status = 400, extra: Record<string, string> = {}) =>
    oauthError(error, description, status, extra, cors);

  const text = await request.text();
  if (text.length > 16 * 1024) return fail("invalid_client_metadata", "Request too large.", 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail("invalid_client_metadata", "Send the client metadata as JSON.");
  }
  const parsed = parseRegistration(body);
  if (!parsed.ok) return fail(parsed.error, parsed.description);

  const { value } = parsed;
  const db = createSupabaseAdminClient();
  const clientId = newClientId();
  const secret = value.token_endpoint_auth_method === "none" ? null : generateSecret("clientSecret");
  const { data, error } = await db
    .from("oauth_clients")
    .insert({
      client_id: clientId,
      client_name: value.client_name,
      client_uri: value.client_uri,
      redirect_uris: value.redirect_uris,
      token_endpoint_auth_method: value.token_endpoint_auth_method,
      client_secret_hash: secret ? sha256Hex(secret) : null,
      registration_ip_hash: registrationIpHash(request.headers),
      first_party: firstPartyRedirects(value.redirect_uris),
    })
    .select("created_at")
    .single();
  if (error?.code === "P0001" && error.message.includes("rate_limited")) {
    return fail("temporarily_unavailable", "Too many registrations. Try again in an hour.", 429, { "Retry-After": "3600" });
  }
  if (error || !data) {
    console.error("OAuth client registration failed", error?.message);
    return fail("server_error", "Registration failed. Try again.", 500);
  }
  after(() => cleanUpOAuth(db));

  return oauthJson(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(new Date(data.created_at as string).getTime() / 1000),
      ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
      client_name: value.client_name,
      ...(value.client_uri ? { client_uri: value.client_uri } : {}),
      redirect_uris: value.redirect_uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: value.token_endpoint_auth_method,
    },
    201,
    {},
    cors,
  );
}

export function OPTIONS(request: Request) {
  const { origin, allowed } = allowedOrigin(request);
  if (!allowed) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: registrationCors(origin) });
}

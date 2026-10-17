import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { parseRegistration } from "@/lib/oauth/clients";
import { oauthError, oauthJson, preflight } from "@/lib/oauth/http";
import { registrationIpHash } from "@/lib/oauth/supabase-store";
import { generateSecret, newClientId, sha256Hex } from "@/lib/oauth/tokens";

// Dynamic Client Registration (RFC 7591). ChatGPT and claude.ai register themselves here once per connector. Open by
// design (the MCP authorization spec expects it), so it's rate-limited: 10 registrations per IP per hour and 500 in
// total per hour. Registering grants nothing: a person still signs in and approves on /oauth/authorize.

const PER_IP_PER_HOUR = 10;
const TOTAL_PER_HOUR = 500;

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 16 * 1024) return oauthError("invalid_client_metadata", "Request too large.", 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return oauthError("invalid_client_metadata", "Send the client metadata as JSON.");
  }
  const parsed = parseRegistration(body);
  if (!parsed.ok) return oauthError(parsed.error, parsed.description);

  const db = createSupabaseAdminClient();
  const ipHash = registrationIpHash(request.headers);
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const [{ count: total }, { count: fromIp }] = await Promise.all([
    db.from("oauth_clients").select("id", { count: "exact", head: true }).gte("created_at", since),
    ipHash
      ? db.from("oauth_clients").select("id", { count: "exact", head: true }).eq("registration_ip_hash", ipHash).gte("created_at", since)
      : Promise.resolve({ count: 0 }),
  ]);
  if ((total ?? 0) >= TOTAL_PER_HOUR || (fromIp ?? 0) >= PER_IP_PER_HOUR) {
    return oauthError("temporarily_unavailable", "Too many registrations. Try again in an hour.", 429, { "Retry-After": "3600" });
  }

  const { value } = parsed;
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
      registration_ip_hash: ipHash,
    })
    .select("created_at")
    .single();
  if (error || !data) {
    console.error("OAuth client registration failed", error?.message);
    return oauthError("server_error", "Registration failed. Try again.", 500);
  }

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
  );
}

export const OPTIONS = preflight;

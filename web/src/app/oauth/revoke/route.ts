import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { revokeTokenValue } from "@/lib/oauth/grants";
import { oauthError, preflight, PUBLIC_CORS, readForm } from "@/lib/oauth/http";
import { authenticateClient, supabaseOAuthStore } from "@/lib/oauth/supabase-store";

// Token revocation (RFC 7009). Revoking a refresh token disconnects the whole grant. Answers 200 for unknown tokens,
// so the endpoint can't be used to test whether a token exists.
export async function POST(request: Request) {
  const form = await readForm(request);
  if (!form) return oauthError("invalid_request", "The request body couldn't be read.");
  const db = createSupabaseAdminClient();
  const client = await authenticateClient(db, form, request.headers.get("authorization"));
  if (!client) return oauthError("invalid_client", "Unknown client or wrong client credentials.", 401);
  await revokeTokenValue(supabaseOAuthStore(db), { token: form.get("token"), clientId: client.client_id });
  return new Response(null, { status: 200, headers: { "Cache-Control": "no-store", ...PUBLIC_CORS } });
}

export const OPTIONS = preflight;

import { NextResponse, connection, type NextRequest } from "next/server";
import { getCurrentOrg, getUser } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import {
  GoogleOAuthError,
  SEARCH_CONSOLE_SCOPE,
  STATE_COOKIE,
  emailFromIdToken,
  exchangeCode,
  grantedScopes,
  openState,
  revokeToken,
  searchConsoleConfigured,
  stateMatches,
} from "@/lib/integrations/google-oauth";
import { searchConsoleAccess } from "@/lib/integrations/search-console-access";
import { saveConnection, syncSearchConsole } from "@/lib/integrations/search-console";
import { SETTINGS_RETURN, connectionOutcomeUrl } from "@/lib/integrations/return-to";
import { can } from "@/lib/team/roles";

// Google redirects here after the consent screen. Needs the same signed-in session that started the flow
// (proxy.ts redirects signed-out requests to /login). Verifies the encrypted state cookie (random value + user +
// organization), exchanges the code with the PKCE verifier, stores the refresh token encrypted, and fetches the
// first snapshot. Every outcome ends on a page that explains a short reason code: Settings until the state cookie is
// verified, then the page the flow started from (Settings or the onboarding "Connect your tools" step), checked again
// against the allowlist in lib/integrations/return-to.ts.

// The first fetch runs before the redirect so the owner lands on data.
export const maxDuration = 60;

function toOutcome(request: NextRequest, back: unknown, gsc: string) {
  const response = NextResponse.redirect(new URL(connectionOutcomeUrl(back, gsc), request.url), 303);
  response.cookies.set(STATE_COOKIE, "", { path: "/api/integrations/google", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  await connection();
  if (!searchConsoleConfigured()) return toOutcome(request, SETTINGS_RETURN, "not-configured");

  const params = request.nextUrl.searchParams;
  const saved = openState(request.cookies.get(STATE_COOKIE)?.value);
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/settings", request.url), 303);
  const org = await getCurrentOrg(user.id);
  if (!org || !can(org.role, "integrations.connect")) return toOutcome(request, SETTINGS_RETURN, "owner-only");
  if (!stateMatches(saved, params.get("state"), user.id, org.id) || !saved) return toOutcome(request, SETTINGS_RETURN, "expired");
  // The state is verified from here on, so every outcome returns to the page the flow started from.
  const back = saved.returnTo;

  const error = params.get("error");
  if (error) return toOutcome(request, back, error === "access_denied" ? "denied" : "error");
  const code = params.get("code");
  if (!code) return toOutcome(request, back, "error");

  // Plan check through the user's own client, as in the start route (RLS: members read their organization).
  const supabase = await createSupabaseServerClient();
  const { data: orgRow, error: orgError } = await supabase
    .from("organizations")
    .select("plan, trial_ends_at")
    .eq("id", org.id)
    .maybeSingle();
  if (orgError) {
    console.error("Search Console callback: organization lookup failed:", orgError.message);
    return toOutcome(request, back, "error");
  }
  if (!orgRow || !searchConsoleAccess(orgRow).allowed) return toOutcome(request, back, "paused");
  // The organization is authorised above; the service client is scoped to it for the server-only writes.
  const db = createSupabaseAdminClient();

  let tokens;
  try {
    tokens = await exchangeCode(code, saved.verifier, saved.redirectUri);
  } catch (e) {
    console.error("Search Console token exchange failed:", e instanceof GoogleOAuthError ? e.code : "network");
    return toOutcome(request, back, "error");
  }

  const scopes = grantedScopes(tokens.scope);
  // Google lets people untick individual scopes on the consent screen.
  if (!scopes.includes(SEARCH_CONSOLE_SCOPE)) {
    await revokeToken(tokens.refresh_token ?? tokens.access_token);
    return toOutcome(request, back, "scope-missing");
  }
  if (!tokens.refresh_token) {
    await revokeToken(tokens.access_token);
    return toOutcome(request, back, "error");
  }

  try {
    await saveConnection(db, {
      organizationId: org.id,
      userId: user.id,
      email: emailFromIdToken(tokens.id_token),
      scopes,
      refreshToken: tokens.refresh_token,
    });
  } catch (e) {
    console.error("Search Console callback: saving the connection failed:", e instanceof Error ? e.message : "unknown");
    await revokeToken(tokens.refresh_token);
    return toOutcome(request, back, "error");
  }

  const sync = await syncSearchConsole(db, org.id, { skipGuard: true });
  return toOutcome(request, back, sync.ok ? "connected" : sync.reason === "needs-property" ? "choose-property" : "connected-sync-failed");
}

import { NextResponse, connection, type NextRequest } from "next/server";
import { getCurrentOrg, getUser } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import {
  HUBSPOT_STATE_COOKIE,
  HubSpotOAuthError,
  exchangeHubSpotCode,
  hubspotConfigured,
  hubspotStateMatches,
  hubspotTokenInfo,
  missingHubSpotScopes,
  openHubSpotState,
  revokeHubSpotRefreshToken,
} from "@/lib/integrations/hubspot-oauth";
import { hubspotAccess } from "@/lib/integrations/hubspot-access";
import { saveHubSpotConnection, syncHubSpot } from "@/lib/integrations/hubspot";
import { SETTINGS_RETURN, hubspotOutcomeUrl } from "@/lib/integrations/return-to";
import { can } from "@/lib/team/roles";

// HubSpot redirects here after the owner installs the app in their portal. Needs the same signed-in session that
// started the flow. Verifies the encrypted state cookie (random value + user + organization), exchanges the code with
// the client secret (HubSpot documents no PKCE for apps), checks the portal and the granted scopes, stores the refresh token encrypted and fetches the first
// counts. Every outcome ends on a page that explains a short reason code (?hubspot=): Settings until the state cookie
// is verified, then the page the flow started from, checked again against the allowlist in return-to.ts.

// The first fetch (about 30 rate-limited searches and the deal list) runs before the redirect so the owner lands on data.
export const maxDuration = 60;

function toOutcome(request: NextRequest, back: unknown, code: string) {
  const response = NextResponse.redirect(new URL(hubspotOutcomeUrl(back, code), request.url), 303);
  response.cookies.set(HUBSPOT_STATE_COOKIE, "", { path: "/api/integrations/hubspot", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  await connection();
  if (!hubspotConfigured()) return toOutcome(request, SETTINGS_RETURN, "not-configured");

  const params = request.nextUrl.searchParams;
  const saved = openHubSpotState(request.cookies.get(HUBSPOT_STATE_COOKIE)?.value);
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/settings", request.url), 303);
  const org = await getCurrentOrg(user.id);
  if (!org || !can(org.role, "integrations.connect")) return toOutcome(request, SETTINGS_RETURN, "owner-only");
  if (!hubspotStateMatches(saved, params.get("state"), user.id, org.id) || !saved) return toOutcome(request, SETTINGS_RETURN, "expired");
  // The state is verified from here on, so every outcome returns to the page the flow started from.
  const back = saved.returnTo;

  const error = params.get("error");
  if (error) return toOutcome(request, back, error === "access_denied" ? "denied" : "error");
  const code = params.get("code");
  if (!code) return toOutcome(request, back, "error");

  // Plan check through the user's own client, as in the start route (RLS: members read their organization).
  const supabase = await createSupabaseServerClient();
  const { data: orgRow, error: orgError } = await supabase.from("organizations").select("plan, trial_ends_at").eq("id", org.id).maybeSingle();
  if (orgError) {
    console.error("HubSpot callback: organization lookup failed:", orgError.message);
    return toOutcome(request, back, "error");
  }
  if (!orgRow || !hubspotAccess(orgRow).allowed) return toOutcome(request, back, "paused");
  // The organization is authorised above; the service client is scoped to it for the server-only writes.
  const db = createSupabaseAdminClient();

  let tokens;
  let info;
  try {
    tokens = await exchangeHubSpotCode(code, saved.redirectUri);
    info = await hubspotTokenInfo(tokens.access_token);
  } catch (e) {
    console.error("HubSpot token exchange failed:", e instanceof HubSpotOAuthError ? e.code : "network");
    if (tokens?.refresh_token) await revokeHubSpotRefreshToken(tokens.refresh_token);
    return toOutcome(request, back, "error");
  }
  if (!tokens.refresh_token) return toOutcome(request, back, "error");
  if (missingHubSpotScopes(info.scopes).length) {
    await revokeHubSpotRefreshToken(tokens.refresh_token);
    return toOutcome(request, back, "scope-missing");
  }

  try {
    await saveHubSpotConnection(db, {
      organizationId: org.id,
      userId: user.id,
      hubId: info.hubId,
      hubDomain: info.hubDomain,
      scopes: info.scopes,
      refreshToken: tokens.refresh_token,
    });
  } catch (e) {
    console.error("HubSpot callback: saving the connection failed:", e instanceof Error ? e.message : "unknown");
    await revokeHubSpotRefreshToken(tokens.refresh_token);
    return toOutcome(request, back, "error");
  }

  const sync = await syncHubSpot(db, org.id, { skipGuard: true });
  return toOutcome(request, back, sync.ok ? "connected" : "connected-sync-failed");
}

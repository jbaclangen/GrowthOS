import { NextResponse, connection, type NextRequest } from "next/server";
import { getCurrentOrg, getUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  HUBSPOT_STATE_COOKIE,
  STATE_TTL_SECONDS,
  buildHubSpotAuthUrl,
  hubspotAppRedirectUri,
  hubspotConfigured,
  randomToken,
  sealHubSpotState,
} from "@/lib/integrations/hubspot-oauth";
import { hubspotAccess } from "@/lib/integrations/hubspot-access";
import { connectionReturnPath, hubspotOutcomeUrl } from "@/lib/integrations/return-to";
import { can } from "@/lib/team/roles";
import { consentGiven } from "@/lib/legal/documents";

// Starts "Connect HubSpot" (Pro, read-only, D-048), built like the Search Console start route. Signed-in users with
// integrations.connect only (owners, D-046). Sets a short-lived, encrypted state cookie bound to the user and
// organization, with the page to return to, then sends the browser to HubSpot's install screen.
// ?returnTo= is checked against an exact allowlist; anything else returns to Settings.

const toOutcome = (request: NextRequest, back: string, code: string) =>
  NextResponse.redirect(new URL(hubspotOutcomeUrl(back, code), request.url), 303);

export async function GET(request: NextRequest) {
  await connection();
  const back = connectionReturnPath(request.nextUrl.searchParams.get("returnTo"));
  if (!hubspotConfigured()) return toOutcome(request, back, "not-configured");

  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/settings", request.url), 303);
  const org = await getCurrentOrg(user.id);
  if (!org) return toOutcome(request, back, "no-business");
  if (!can(org.role, "integrations.connect")) return toOutcome(request, back, "owner-only");
  // D-057, MSA §8: the connect form's checkbox (agree=yes). It's recorded only after HubSpot approves (callback).
  if (!consentGiven(request.nextUrl.searchParams)) return toOutcome(request, back, "consent-needed");

  const supabase = await createSupabaseServerClient();
  const { data: orgRow } = await supabase.from("organizations").select("plan, trial_ends_at").eq("id", org.id).maybeSingle();
  if (!orgRow || !hubspotAccess(orgRow).allowed) return toOutcome(request, back, "paused");

  const redirectUri = hubspotAppRedirectUri(request.nextUrl.origin);
  if (!redirectUri) return toOutcome(request, back, "redirect-mismatch");

  const state = randomToken();
  const response = NextResponse.redirect(buildHubSpotAuthUrl({ clientId: env().HUBSPOT_CLIENT_ID, redirectUri, state }), 303);
  response.cookies.set(
    HUBSPOT_STATE_COOKIE,
    sealHubSpotState({ state, userId: user.id, orgId: org.id, redirectUri, expiresAt: Date.now() + STATE_TTL_SECONDS * 1000, returnTo: back, consented: true }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/api/integrations/hubspot",
      maxAge: STATE_TTL_SECONDS,
    },
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}

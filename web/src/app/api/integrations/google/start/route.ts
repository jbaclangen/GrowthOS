import { NextResponse, connection, type NextRequest } from "next/server";
import { getCurrentOrg, getUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  STATE_COOKIE,
  STATE_TTL_SECONDS,
  appRedirectUri,
  buildAuthUrl,
  pkceChallenge,
  randomToken,
  sealState,
  searchConsoleConfigured,
} from "@/lib/integrations/google-oauth";
import { searchConsoleAccess } from "@/lib/integrations/search-console-access";

// Starts "Connect Google Search Console" (Pro). Signed-in owners only (proxy.ts already sends signed-out visitors to
// /login). Sets a short-lived, encrypted state cookie bound to the user and organization, with the PKCE verifier,
// then sends the browser to Google's consent screen.

const toSettings = (request: NextRequest, gsc: string) => NextResponse.redirect(new URL(`/settings?gsc=${gsc}#connections`, request.url), 303);

export async function GET(request: NextRequest) {
  await connection();
  if (!searchConsoleConfigured()) return toSettings(request, "not-configured");

  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/settings", request.url), 303);
  const org = await getCurrentOrg();
  if (!org) return toSettings(request, "no-business");
  if (org.role !== "owner") return toSettings(request, "owner-only");

  const supabase = await createSupabaseServerClient();
  const { data: orgRow } = await supabase.from("organizations").select("plan, trial_ends_at").eq("id", org.id).maybeSingle();
  if (!orgRow || !searchConsoleAccess(orgRow).allowed) return toSettings(request, "paused");

  const redirectUri = appRedirectUri(request.nextUrl.origin);
  if (!redirectUri) return toSettings(request, "redirect-mismatch");

  const state = randomToken();
  const verifier = randomToken(48);
  const response = NextResponse.redirect(
    buildAuthUrl({ clientId: env().GOOGLE_OAUTH_CLIENT_ID, redirectUri, state, codeChallenge: pkceChallenge(verifier) }),
    303,
  );
  response.cookies.set(STATE_COOKIE, sealState({ state, verifier, userId: user.id, orgId: org.id, redirectUri, expiresAt: Date.now() + STATE_TTL_SECONDS * 1000 }), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/api/integrations/google",
    maxAge: STATE_TTL_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

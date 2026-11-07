"use server";

import { redirect } from "next/navigation";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { searchConsoleConfigured } from "@/lib/integrations/google-oauth";
import { connectionOutcomeUrl, connectionReturnPath } from "@/lib/integrations/return-to";
import { selectProperty, syncSearchConsole } from "@/lib/integrations/search-console";
import { selectProperty as selectAnalyticsProperty, syncAnalytics } from "@/lib/integrations/google-analytics";
import { disconnectGoogle } from "@/lib/integrations/google-connection";
import { can, type Permission } from "@/lib/team/roles";

// The Google connection (Pro): Search Console and Google Analytics 4, one consent screen. The organization comes from the signed-in user's membership (read through
// RLS); only then is the service client used, always scoped to that organization id. Choosing a property and
// disconnecting need integrations.connect (owner only, D-046; lib/team/roles.ts); refreshing doesn't. Outcomes are
// shown through a short ?gsc= code (components/connections/connection-notice.tsx) on the page the form came from:
// Settings, or the onboarding "Connect your tools" step. The form's returnTo is checked against an exact allowlist
// (return-to.ts).

const backFrom = (formData: FormData) => connectionReturnPath(formData.get("returnTo"));

async function authorisedOrg(permission: Permission | null, back: string) {
  const user = await requireUser();
  const org = await getCurrentOrg(user.id);
  if (!org) redirect(connectionOutcomeUrl(back, "no-business"));
  if (permission && !can(org.role, permission)) redirect(connectionOutcomeUrl(back, "owner-only"));
  if (!searchConsoleConfigured()) redirect(connectionOutcomeUrl(back, "not-configured"));
  return org;
}

const SYNC_CODES = { "not-connected": "not-connected", paused: "paused", "too-soon": "refresh-wait", "needs-property": "choose-property", error: "sync-failed" } as const;

export async function refreshSearchConsole(formData: FormData) {
  const back = backFrom(formData);
  const org = await authorisedOrg(null, back);
  const result = await syncSearchConsole(createSupabaseAdminClient(), org.id);
  redirect(connectionOutcomeUrl(back, result.ok ? "refreshed" : SYNC_CODES[result.reason]));
}

export async function chooseSearchConsoleProperty(formData: FormData) {
  const back = backFrom(formData);
  const org = await authorisedOrg("integrations.connect", back);
  const property = String(formData.get("property") ?? "");
  const db = createSupabaseAdminClient();
  const selected = property ? await selectProperty(db, org.id, property) : "invalid";
  if (selected === "invalid") redirect(connectionOutcomeUrl(back, "property-invalid"));
  // The first choice right after connecting fetches at once; later changes respect the 10-minute guard.
  const result = await syncSearchConsole(db, org.id, { skipGuard: selected === "first" });
  redirect(connectionOutcomeUrl(back, result.ok ? "refreshed" : SYNC_CODES[result.reason]));
}

const GA_SYNC_CODES = {
  "not-connected": "ga-not-connected",
  paused: "ga-paused",
  "too-soon": "ga-refresh-wait",
  "needs-property": "ga-choose-property",
  error: "ga-sync-failed",
} as const;

export async function refreshAnalytics(formData: FormData) {
  const back = backFrom(formData);
  const org = await authorisedOrg(null, back);
  const result = await syncAnalytics(createSupabaseAdminClient(), org.id);
  redirect(connectionOutcomeUrl(back, result.ok ? "ga-refreshed" : GA_SYNC_CODES[result.reason]));
}

export async function chooseAnalyticsProperty(formData: FormData) {
  const back = backFrom(formData);
  const org = await authorisedOrg("integrations.connect", back);
  const property = String(formData.get("property") ?? "");
  const db = createSupabaseAdminClient();
  const selected = property ? await selectAnalyticsProperty(db, org.id, property) : "invalid";
  if (selected === "invalid") redirect(connectionOutcomeUrl(back, "ga-property-invalid"));
  // A new property fetches at once (the old property's data was just deleted); the same one respects the guard.
  const result = await syncAnalytics(db, org.id, { skipGuard: selected !== "same" });
  redirect(connectionOutcomeUrl(back, result.ok ? "ga-refreshed" : GA_SYNC_CODES[result.reason]));
}

// One Google sign-in covers both products, so disconnecting ends both (lib/integrations/google-connection.ts).
export async function disconnectGoogleAction(formData: FormData) {
  const back = backFrom(formData);
  const org = await authorisedOrg("integrations.connect", back);
  try {
    await disconnectGoogle(createSupabaseAdminClient(), org.id);
  } catch {
    redirect(connectionOutcomeUrl(back, "disconnect-failed"));
  }
  redirect(connectionOutcomeUrl(back, "disconnected"));
}

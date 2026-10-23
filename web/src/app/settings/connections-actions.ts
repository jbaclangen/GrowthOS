"use server";

import { redirect } from "next/navigation";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { searchConsoleConfigured } from "@/lib/integrations/google-oauth";
import { connectionOutcomeUrl, connectionReturnPath } from "@/lib/integrations/return-to";
import { disconnectSearchConsole, selectProperty, syncSearchConsole } from "@/lib/integrations/search-console";

// Google Search Console connection (Pro). The organization comes from the signed-in user's membership (read through
// RLS); only then is the service client used, always scoped to that organization id. Outcomes are shown through a
// short ?gsc= code (components/connections/connection-notice.tsx) on the page the form came from: Settings, or the
// onboarding "Connect your tools" step. The form's returnTo is checked against an exact allowlist (return-to.ts).

const backFrom = (formData: FormData) => connectionReturnPath(formData.get("returnTo"));

async function authorisedOrg(ownerOnly: boolean, back: string) {
  const user = await requireUser();
  const org = await getCurrentOrg(user.id);
  if (!org) redirect(connectionOutcomeUrl(back, "no-business"));
  if (ownerOnly && org.role !== "owner") redirect(connectionOutcomeUrl(back, "owner-only"));
  if (!searchConsoleConfigured()) redirect(connectionOutcomeUrl(back, "not-configured"));
  return org;
}

const SYNC_CODES = { "not-connected": "not-connected", paused: "paused", "too-soon": "refresh-wait", "needs-property": "choose-property", error: "sync-failed" } as const;

export async function refreshSearchConsole(formData: FormData) {
  const back = backFrom(formData);
  const org = await authorisedOrg(false, back);
  const result = await syncSearchConsole(createSupabaseAdminClient(), org.id);
  redirect(connectionOutcomeUrl(back, result.ok ? "refreshed" : SYNC_CODES[result.reason]));
}

export async function chooseSearchConsoleProperty(formData: FormData) {
  const back = backFrom(formData);
  const org = await authorisedOrg(true, back);
  const property = String(formData.get("property") ?? "");
  const db = createSupabaseAdminClient();
  const selected = property ? await selectProperty(db, org.id, property) : "invalid";
  if (selected === "invalid") redirect(connectionOutcomeUrl(back, "property-invalid"));
  // The first choice right after connecting fetches at once; later changes respect the 10-minute guard.
  const result = await syncSearchConsole(db, org.id, { skipGuard: selected === "first" });
  redirect(connectionOutcomeUrl(back, result.ok ? "refreshed" : SYNC_CODES[result.reason]));
}

export async function disconnectSearchConsoleAction(formData: FormData) {
  const back = backFrom(formData);
  const org = await authorisedOrg(true, back);
  try {
    await disconnectSearchConsole(createSupabaseAdminClient(), org.id);
  } catch {
    redirect(connectionOutcomeUrl(back, "disconnect-failed"));
  }
  redirect(connectionOutcomeUrl(back, "disconnected"));
}

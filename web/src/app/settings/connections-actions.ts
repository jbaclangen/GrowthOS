"use server";

import { redirect } from "next/navigation";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { searchConsoleConfigured } from "@/lib/integrations/google-oauth";
import { disconnectSearchConsole, selectProperty, syncSearchConsole } from "@/lib/integrations/search-console";

// Google Search Console connection (Pro). The organization comes from the signed-in user's membership (read through
// RLS); only then is the service client used, always scoped to that organization id. Outcomes are shown on
// /settings through a short ?gsc= code (connection-notice.tsx).

async function authorisedOrg(ownerOnly: boolean) {
  await requireUser();
  const org = await getCurrentOrg();
  if (!org) redirect("/settings?gsc=no-business#connections");
  if (ownerOnly && org.role !== "owner") redirect("/settings?gsc=owner-only#connections");
  if (!searchConsoleConfigured()) redirect("/settings?gsc=not-configured#connections");
  return org;
}

const SYNC_CODES = { "not-connected": "not-connected", paused: "paused", "too-soon": "refresh-wait", "needs-property": "choose-property", error: "sync-failed" } as const;

export async function refreshSearchConsole() {
  const org = await authorisedOrg(false);
  const result = await syncSearchConsole(createSupabaseAdminClient(), org.id);
  redirect(`/settings?gsc=${result.ok ? "refreshed" : SYNC_CODES[result.reason]}#connections`);
}

export async function chooseSearchConsoleProperty(formData: FormData) {
  const org = await authorisedOrg(true);
  const property = String(formData.get("property") ?? "");
  const db = createSupabaseAdminClient();
  const selected = property ? await selectProperty(db, org.id, property) : "invalid";
  if (selected === "invalid") redirect("/settings?gsc=property-invalid#connections");
  // The first choice right after connecting fetches at once; later changes respect the 10-minute guard.
  const result = await syncSearchConsole(db, org.id, { skipGuard: selected === "first" });
  redirect(`/settings?gsc=${result.ok ? "refreshed" : SYNC_CODES[result.reason]}#connections`);
}

export async function disconnectSearchConsoleAction() {
  const org = await authorisedOrg(true);
  try {
    await disconnectSearchConsole(createSupabaseAdminClient(), org.id);
  } catch {
    redirect("/settings?gsc=disconnect-failed#connections");
  }
  redirect("/settings?gsc=disconnected#connections");
}

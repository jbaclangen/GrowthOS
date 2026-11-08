"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { memberRole } from "@/lib/team/server";
import { failStaleJobs } from "@/lib/pipeline/jobs";
import { revokeGoogleForRemoval } from "@/lib/integrations/google-connection";
import { revokeHubSpotForRemoval } from "@/lib/integrations/hubspot";
import {
  ACTIVE_JOB_MESSAGE,
  REMOVE_FAILED_MESSAGE,
  deletionLogRow,
  removalAllowed,
  revokeOutcome,
} from "@/lib/organizations/removal";

// Settings → Remove business (D-061; ROLES_AND_PERMISSIONS.md §9). Deletes the organization row; every tenant table
// goes with it through its on delete cascade foreign key (web/src/lib/organizations/cascade.test.ts). The checks run
// here, not only in the dialog: organization.delete (owner only) read through the user's own client, and the exact
// phrase. Then, with the secret key and scoped to that one organization: no analysis may be running, the Google and
// HubSpot tokens are revoked at the provider, the row is deleted, and organization_deletions records it without
// personal data.

export type RemoveBusinessState = { error?: string } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function removeBusiness(_: RemoveBusinessState, formData: FormData): Promise<RemoveBusinessState> {
  const user = await requireUser();
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !UUID.test(organizationId)) {
    return { error: "This business wasn't found. Reload the page and try again." };
  }

  // The user's role in the business they saw in Settings, through RLS: null when they aren't a member.
  const role = await memberRole(await createSupabaseServerClient(), organizationId, user.id);
  const allowed = removalAllowed({ role, phrase: formData.get("confirmation") });
  if (!allowed.ok) return { error: allowed.error };

  const admin = createSupabaseAdminClient();

  // A running analysis would keep calling paid models and writing to rows that are being deleted, so removal waits for
  // it. Jobs cut off by the hosting time limit are failed first, so a stuck job doesn't block removal for good.
  await failStaleJobs(organizationId, admin);
  const { data: active, error: jobError } = await admin
    .from("ai_jobs")
    .select("id")
    .eq("organization_id", organizationId)
    .in("status", ["queued", "running"])
    .limit(1);
  if (jobError) return { error: REMOVE_FAILED_MESSAGE };
  if (active?.length) return { error: ACTIVE_JOB_MESSAGE };

  const [{ data: org, error: orgError }, { count: members, error: memberError }] = await Promise.all([
    admin.from("organizations").select("plan, created_at").eq("id", organizationId).maybeSingle(),
    admin.from("memberships").select("user_id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);
  if (orgError || memberError || !org) return { error: REMOVE_FAILED_MESSAGE };

  // HubSpot's terms ask for the tokens to go when a customer stops; Google's grant should end too. A revoke that fails
  // doesn't stop the removal: the token is deleted with the business, so Braventa can't use it again.
  let google: boolean[];
  let hubspot: boolean[];
  try {
    google = await revokeGoogleForRemoval(admin, organizationId);
    hubspot = await revokeHubSpotForRemoval(admin, organizationId);
  } catch {
    return { error: REMOVE_FAILED_MESSAGE };
  }

  const { data: deleted, error: deleteError } = await admin.from("organizations").delete().eq("id", organizationId).select("id");
  if (deleteError || deleted?.length !== 1) {
    console.error("removeBusiness: the organization wasn't deleted", deleteError?.code ?? "no row");
    return { error: REMOVE_FAILED_MESSAGE };
  }

  const row = deletionLogRow({
    organizationId,
    plan: org.plan,
    createdAt: org.created_at,
    members: members ?? 0,
    google: revokeOutcome(google),
    hubspot: revokeOutcome(hubspot),
  });
  // The business is already gone, so a failed log write is reported, not returned. The row holds no personal data.
  const { error: logError } = await admin.from("organization_deletions").insert(row);
  if (logError) console.error("removeBusiness: organization_deletions insert failed", logError.code, JSON.stringify(row));

  // The dashboard opens the user's next business, if they belong to another, or the no-business state with the way
  // into onboarding.
  const unconfirmed = row.google_revoke === "failed" || row.hubspot_revoke === "failed";
  redirect(`/dashboard?removed=${unconfirmed ? "check-tools" : "done"}`);
}

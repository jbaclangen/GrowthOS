"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { normalizeUrl } from "@/lib/integrations/crawler";
import { failStaleJobs } from "@/lib/pipeline/jobs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { analysesInLastDay, createOnboarding, MAX_ANALYSES_PER_DAY, queueJob, RATE_LIMIT_MESSAGE } from "@/lib/onboarding/start";
import { parseOwnerInputs, toProfileColumns } from "@/lib/owner-inputs";

export type StartState = { error?: string } | undefined;

const startSchema = z.object({
  website: z.string().trim().min(3, "Enter a website address"),
  businessName: z.string().trim().max(120).optional(),
});

export async function startAnalysis(_: StartState, formData: FormData): Promise<StartState> {
  const user = await requireUser();
  const parsed = startSchema.safeParse({
    website: formData.get("website"),
    businessName: formData.get("businessName") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const owner = parseOwnerInputs(formData);
  if ("error" in owner) return { error: owner.error };

  let websiteUrl: string;
  try {
    websiteUrl = normalizeUrl(parsed.data.website);
  } catch {
    return { error: "That doesn't look like a website address" };
  }

  const supabase = await createSupabaseServerClient();
  let org = await getCurrentOrg(user.id);
  if (!org) {
    const name = parsed.data.businessName || new URL(websiteUrl).hostname.replace(/^www\./, "");
    const { data: orgId, error } = await supabase.rpc("create_organization", { org_name: name });
    if (error) return { error: error.message };
    org = { id: orgId as string, name, role: "owner" };
    // The header (root layout) shows the plan chip and the assistant only once an organization exists; refresh it so
    // the redirect below re-renders the layout instead of keeping "Analyze a website first" from before.
    refresh();
  }

  // Discovery runs alongside the website analysis (D-028): open a session, start the evidence job now,
  // and send the owner to the discovery questions while it runs.
  const started = await createOnboarding(supabase, {
    organizationId: org.id,
    userId: user.id,
    websiteUrl,
    businessName: parsed.data.businessName,
    owner: owner.data,
  });
  if ("error" in started) return { error: started.error };
  redirect(`/onboarding/${started.sessionId}`);
}

export type RerunState = { error?: string };

export async function rerunAnalysis(businessProfileId: string): Promise<RerunState> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("id, organization_id, website_url")
    .eq("id", businessProfileId)
    .maybeSingle();
  if (!profile?.website_url) return { error: "This business wasn't found." };

  // One analysis at a time per business: a queued or running job (any phase) blocks a re-run. Jobs cut off by the
  // hosting time limit are cleared first so they don't block forever.
  await failStaleJobs(profile.organization_id);
  const { data: active } = await supabase
    .from("ai_jobs")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("input->>businessProfileId", profile.id)
    .in("status", ["queued", "running"])
    .limit(1);
  if (active?.length) return { error: "An analysis is already running for this business. Wait for it to finish, then try again." };
  if ((await analysesInLastDay(supabase, profile.organization_id)) >= MAX_ANALYSES_PER_DAY) return { error: RATE_LIMIT_MESSAGE };

  await queueJob(
    supabase,
    profile.organization_id,
    "website_intel",
    { businessProfileId: profile.id, websiteUrl: profile.website_url },
    user.id,
  );
  refresh();
  return {};
}

export async function setContentStatus(itemId: string, status: "approved" | "rejected" | "needs_approval") {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("content_items")
    .update({
      status,
      approved_by: status === "approved" ? user.id : null,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  refresh();
}

export type OwnerInputsState = { error?: string; saved?: boolean } | undefined;

// Saves the guided onboarding answers (Customer-provided). RLS limits the update to the user's own org.
export async function saveOwnerInputs(
  businessProfileId: string,
  _: OwnerInputsState,
  formData: FormData,
): Promise<OwnerInputsState> {
  await requireUser();
  const owner = parseOwnerInputs(formData);
  if ("error" in owner) return { error: owner.error };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("business_profiles")
    .update(toProfileColumns(owner.data))
    .eq("id", businessProfileId)
    .select("id");
  if (error) return { error: "Your answers weren't saved. Try again." };
  if (!data?.length) return { error: "This business wasn't found." };
  refresh();
  return { saved: true };
}

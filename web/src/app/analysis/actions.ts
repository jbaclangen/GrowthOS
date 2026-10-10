"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { normalizeUrl } from "@/lib/integrations/crawler";
import { runAnalysisJob } from "@/lib/pipeline/website-intel";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { CATALOG_VERSION } from "@/lib/onboarding/catalog";
import { parseOwnerInputs, toProfileColumns } from "@/lib/owner-inputs";

export type StartState = { error?: string } | undefined;

type AnalysisWorker = "website_intel" | "website_evidence";

// Queues an analysis job as the signed-in user (RLS checks membership),
// then runs it after the response so the browser can show progress.
async function queueJob(
  organizationId: string,
  worker: AnalysisWorker,
  input: { businessProfileId: string; websiteUrl: string; sessionId?: string },
  userId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data: job, error } = await supabase
    .from("ai_jobs")
    .insert({ organization_id: organizationId, worker, task_class: "complex", input, created_by: userId })
    .select("id")
    .single();
  if (error || !job) throw new Error(error?.message ?? "Could not queue analysis");
  after(() => runAnalysisJob(job.id));
  return job.id as string;
}

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
  let org = await getCurrentOrg();
  if (!org) {
    const name = parsed.data.businessName || new URL(websiteUrl).hostname.replace(/^www\./, "");
    const { data: orgId, error } = await supabase.rpc("create_organization", { org_name: name });
    if (error) return { error: error.message };
    org = { id: orgId as string, name, role: "owner" };
  }

  const { data: profile, error } = await supabase
    .from("business_profiles")
    .insert({
      organization_id: org.id,
      company_name: parsed.data.businessName || new URL(websiteUrl).hostname.replace(/^www\./, ""),
      website_url: websiteUrl,
      ...toProfileColumns(owner.data),
    })
    .select("id")
    .single();
  if (error || !profile) return { error: error?.message ?? "Could not save the business" };

  // Discovery runs alongside the website analysis (D-028): open a session, start the evidence job now,
  // and send the owner to the discovery questions while it runs.
  const { data: session, error: sessionError } = await supabase
    .from("onboarding_sessions")
    .insert({
      organization_id: org.id,
      business_profile_id: profile.id,
      created_by: user.id,
      status: "discovering",
      catalog_version: CATALOG_VERSION,
    })
    .select("id")
    .single();
  if (sessionError || !session) return { error: "Your answers couldn't be saved. Try again." };

  const evidenceJobId = await queueJob(
    org.id,
    "website_evidence",
    { businessProfileId: profile.id, websiteUrl, sessionId: session.id },
    user.id,
  );
  // Job links are server-only columns (see migration 20261010155931); org already authorised above.
  await createSupabaseAdminClient()
    .from("onboarding_sessions")
    .update({ evidence_job_id: evidenceJobId })
    .eq("id", session.id)
    .eq("organization_id", org.id);

  redirect(`/onboarding/${session.id}`);
}

export async function rerunAnalysis(businessProfileId: string) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("id, organization_id, website_url")
    .eq("id", businessProfileId)
    .single();
  if (!profile?.website_url) throw new Error("Business not found");
  await queueJob(
    profile.organization_id,
    "website_intel",
    { businessProfileId: profile.id, websiteUrl: profile.website_url },
    user.id,
  );
  refresh();
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

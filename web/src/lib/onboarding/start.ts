import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { runAnalysisJob } from "@/lib/pipeline/website-intel";
import { CATALOG_VERSION } from "./catalog";
import { toProfileColumns, type OwnerInputs } from "@/lib/owner-inputs";

// Starting onboarding (BI-12, D-028), shared by the web form (app/analysis/actions.ts) and the AI assistant
// connection (lib/mcp, D-036). The caller has already authorized organizationId: the web form passes the signed-in
// user's client (RLS checks membership); the MCP route passes the service client and the access key's organization.

export type AnalysisWorker = "website_intel" | "website_evidence";

// Queues an analysis job, then runs it after the response so the caller can show progress.
export async function queueJob(
  db: SupabaseClient,
  organizationId: string,
  worker: AnalysisWorker,
  input: { businessProfileId: string; websiteUrl: string; sessionId?: string },
  userId: string,
) {
  const { data: job, error } = await db
    .from("ai_jobs")
    .insert({ organization_id: organizationId, worker, task_class: "complex", input, created_by: userId })
    .select("id")
    .single();
  if (error || !job) throw new Error(error?.message ?? "Could not queue analysis");
  after(() => runAnalysisJob(job.id));
  return job.id as string;
}

export type NewOnboarding = {
  organizationId: string;
  userId: string;
  websiteUrl: string;
  businessName?: string;
  owner: OwnerInputs;
};

// Saves the business, opens a discovery session and starts the website evidence job (discovery runs alongside it).
export async function createOnboarding(db: SupabaseClient, input: NewOnboarding): Promise<{ error: string } | { sessionId: string; businessProfileId: string }> {
  const { organizationId, userId, websiteUrl } = input;
  const { data: profile, error } = await db
    .from("business_profiles")
    .insert({
      organization_id: organizationId,
      company_name: input.businessName || new URL(websiteUrl).hostname.replace(/^www\./, ""),
      website_url: websiteUrl,
      ...toProfileColumns(input.owner),
    })
    .select("id")
    .single();
  if (error || !profile) return { error: error?.message ?? "Could not save the business" };

  const { data: session, error: sessionError } = await db
    .from("onboarding_sessions")
    .insert({
      organization_id: organizationId,
      business_profile_id: profile.id,
      created_by: userId,
      status: "discovering",
      catalog_version: CATALOG_VERSION,
    })
    .select("id")
    .single();
  if (sessionError || !session) return { error: "Your answers couldn't be saved. Try again." };

  const evidenceJobId = await queueJob(
    db,
    organizationId,
    "website_evidence",
    { businessProfileId: profile.id, websiteUrl, sessionId: session.id },
    userId,
  );
  // Job links are server-only columns (see migration 20261010155931); org already authorised by the caller.
  await createSupabaseAdminClient()
    .from("onboarding_sessions")
    .update({ evidence_job_id: evidenceJobId })
    .eq("id", session.id)
    .eq("organization_id", organizationId);

  return { sessionId: session.id as string, businessProfileId: profile.id as string };
}

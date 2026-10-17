import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { startJob } from "@/lib/pipeline/handoff";
import { initialState } from "@/lib/pipeline/steps";
import { CATALOG_VERSION } from "./catalog";
import { toProfileColumns, type OwnerInputs } from "@/lib/owner-inputs";

// Starting onboarding (BI-12, D-028), shared by the web form (app/analysis/actions.ts) and the AI assistant
// connection (lib/mcp, D-036). The caller has already authorized organizationId: the web form passes the signed-in
// user's client (RLS checks membership); the MCP route passes the service client and the access key's organization.

export type AnalysisWorker = "website_intel" | "website_evidence";

// Abuse guard (blueprint §9): each analysis crawls a site and calls PageSpeed twice, so cap analyses and re-runs
// per organization. Counts the jobs that start a crawl (website_evidence for new analyses, website_intel for
// re-runs) in the last 24 hours. Applies to the web form and the AI assistant connection alike.
export const MAX_ANALYSES_PER_DAY = 10;
export const RATE_LIMIT_MESSAGE = `You've started ${MAX_ANALYSES_PER_DAY} analyses in the last 24 hours, the most for now. Try again tomorrow, or contact support if you need more.`;

export async function analysesInLastDay(db: SupabaseClient, organizationId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from("ai_jobs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("worker", ["website_evidence", "website_intel"])
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// Queues an analysis job at its first step, then hands that step to its own invocation after the response, so the
// caller can show progress.
export async function queueJob(
  db: SupabaseClient,
  organizationId: string,
  worker: AnalysisWorker,
  input: { businessProfileId: string; websiteUrl: string; sessionId?: string },
  userId: string,
) {
  const { data: job, error } = await db
    .from("ai_jobs")
    .insert({ organization_id: organizationId, worker, task_class: "complex", input, output: initialState(worker), created_by: userId })
    .select("id")
    .single();
  if (error || !job) throw new Error(error?.message ?? "Could not queue analysis");
  startJob({ id: job.id as string, organizationId, worker });
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
  if ((await analysesInLastDay(db, organizationId)) >= MAX_ANALYSES_PER_DAY) return { error: RATE_LIMIT_MESSAGE };
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

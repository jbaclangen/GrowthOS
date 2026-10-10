import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// Discovery runs alongside the website analysis (ON-4, D-028). The plan job may start only when both the
// evidence job has succeeded and the owner has completed or skipped discovery. Whichever finishes second
// calls this; the conditional update on plan_job_id guarantees a single plan job per session.
export async function startPlanIfReady(sessionId: string): Promise<string | null> {
  const db = createSupabaseAdminClient();
  const { data: session } = await db
    .from("onboarding_sessions")
    .select("id, organization_id, business_profile_id, status, evidence_job_id, plan_job_id, created_by")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.plan_job_id || !session.evidence_job_id) return null;
  if (session.status !== "completed" && session.status !== "skipped") return null;

  const { data: evidence } = await db
    .from("ai_jobs")
    .select("status, input")
    .eq("id", session.evidence_job_id)
    .eq("organization_id", session.organization_id)
    .maybeSingle();
  if (evidence?.status !== "succeeded") return null;

  const { data: job, error } = await db
    .from("ai_jobs")
    .insert({
      organization_id: session.organization_id,
      worker: "website_plan",
      task_class: "complex",
      input: {
        businessProfileId: session.business_profile_id,
        websiteUrl: (evidence.input as { websiteUrl: string }).websiteUrl,
        sessionId: session.id,
        evidenceJobId: session.evidence_job_id,
      },
      created_by: session.created_by,
    })
    .select("id")
    .single();
  if (error || !job) throw new Error(`Could not queue the plan: ${error?.message}`);

  // Claim the session; if another caller got there first, drop this duplicate job.
  const { data: claimed } = await db
    .from("onboarding_sessions")
    .update({ plan_job_id: job.id })
    .eq("id", session.id)
    .is("plan_job_id", null)
    .select("id");
  if (!claimed?.length) {
    await db.from("ai_jobs").delete().eq("id", job.id).eq("organization_id", session.organization_id);
    return null;
  }
  return job.id;
}

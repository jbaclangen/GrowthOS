import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// The hosting platform stops a function at maxDuration (300 s on Vercel Hobby) without running any cleanup, so a job
// cut off mid-run stays "running" forever: the report polls indefinitely and re-runs are blocked. Anything still
// queued or running after this long is treated as failed. Callers pass an organization they have already authorised.
export const STALE_JOB_MS = 10 * 60 * 1000;
export const STALE_JOB_ERROR = "This analysis took too long and was stopped before it finished. Run it again.";

export async function failStaleJobs(organizationId: string) {
  const cutoff = new Date(Date.now() - STALE_JOB_MS).toISOString();
  const { error } = await createSupabaseAdminClient()
    .from("ai_jobs")
    .update({ status: "failed", finished_at: new Date().toISOString(), error: STALE_JOB_ERROR })
    .eq("organization_id", organizationId)
    .in("status", ["queued", "running"])
    .lt("created_at", cutoff);
  if (error) console.error("failStaleJobs:", error.message);
}

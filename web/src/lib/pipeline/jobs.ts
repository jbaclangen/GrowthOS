import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { STALE_JOB_MS, staleFilter } from "./steps";

export { STALE_JOB_MS } from "./steps";

// The hosting platform stops a function at maxDuration (300 s on Vercel Hobby) without running any cleanup, so a step
// cut off mid-run (or a lost hand-off between steps) would leave the job "running" forever: the report polls
// indefinitely and re-runs are blocked. A job runs as a chain of steps, each well under the limit, so a job is
// treated as failed when its last progress (the current step's start, else the job's creation) is older than
// STALE_JOB_MS. Callers pass an organization they have already authorised.
export const STALE_JOB_ERROR = "This analysis took too long and was stopped before it finished. Run it again.";

export async function failStaleJobs(organizationId: string) {
  const cutoff = new Date(Date.now() - STALE_JOB_MS).toISOString();
  const { error } = await createSupabaseAdminClient()
    .from("ai_jobs")
    .update({ status: "failed", finished_at: new Date().toISOString(), error: STALE_JOB_ERROR })
    .eq("organization_id", organizationId)
    .in("status", ["queued", "running"])
    .or(staleFilter(cutoff));
  if (error) console.error("failStaleJobs:", error.message);
}

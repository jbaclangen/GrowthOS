import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { markResent, type JobRef } from "./claims";
import { handOff } from "./handoff";
import { STALE_JOB_MS, readState, staleFilter } from "./steps";

export { STALE_JOB_MS } from "./steps";

// The hosting platform stops a function at maxDuration (300 s on Vercel Hobby) without running any cleanup, so a step
// cut off mid-run (or a hand-off that was lost and never re-sent) would leave the job "running" forever: the report
// polls indefinitely and re-runs are blocked. A job runs as a chain of steps, each well under the limit, so a job is
// treated as failed when its last progress (the current step's start, else the job's creation) is older than
// STALE_JOB_MS. Its step artifacts are dropped with it. Callers pass an organization they have already authorised.
export const STALE_JOB_ERROR = "This analysis took too long and was stopped before it finished. Run it again.";

export async function failStaleJobs(organizationId: string, db: SupabaseClient = createSupabaseAdminClient()) {
  const cutoff = new Date(Date.now() - STALE_JOB_MS).toISOString();
  const { error } = await db
    .from("ai_jobs")
    .update({ status: "failed", finished_at: new Date().toISOString(), error: STALE_JOB_ERROR, output: null })
    .eq("organization_id", organizationId)
    .in("status", ["queued", "running"])
    .or(staleFilter(cutoff));
  if (error) console.error("failStaleJobs:", error.message);
}

// A step is claimed within seconds of its hand-off. One still pending after this long lost its hand-off: the continue
// route accepted it but its invocation never claimed the step, or the invocation that queued it stopped before
// handing it on. Longer than a hand-off's own retries (about 50 s), so a slow first attempt isn't sent twice.
export const RESEND_AFTER_MS = 60_000;

// Marks the steps of this organization's jobs that are due to be re-sent (at most once a minute per step, until the
// reaper fails the job) and returns them. The claim makes a repeated hand-off harmless.
export async function resendDue(
  organizationId: string,
  db: SupabaseClient = createSupabaseAdminClient(),
  now: number = Date.now(),
): Promise<(JobRef & { step: string })[]> {
  const cutoff = new Date(now - RESEND_AFTER_MS).toISOString();
  const { data, error } = await db
    .from("ai_jobs")
    .select("id, worker, output")
    .eq("organization_id", organizationId)
    .in("status", ["queued", "running"])
    .eq("output->>step_state", "pending")
    .lt("output->>step_started_at", cutoff)
    .limit(5);
  if (error) {
    console.error("resendDue:", error.message);
    return [];
  }
  const due: (JobRef & { step: string })[] = [];
  for (const row of data ?? []) {
    const state = readState(row.worker, row.output);
    if (!state || state.step_state !== "pending") continue;
    if (typeof state.resent_at === "string" && state.resent_at >= cutoff) continue;
    const job = { id: row.id as string, organizationId };
    if (await markResent(db, job, state, new Date(now).toISOString())) due.push({ ...job, step: state.step });
  }
  return due;
}

// For the page that polls a running analysis: fails jobs that stopped making progress, then re-sends steps whose
// hand-off was lost (after the response, so the page isn't held up). In database mode the re-send is a re-post of
// the stored dispatch by Postgres, which also re-posts on its own every minute (lib/pipeline/dispatch.ts).
export async function superviseJobs(organizationId: string) {
  await failStaleJobs(organizationId);
  const due = await resendDue(organizationId);
  if (due.length) {
    after(async () => {
      await Promise.all(due.map((job) => handOff(job, job.step, undefined, { resend: true })));
    });
  }
}

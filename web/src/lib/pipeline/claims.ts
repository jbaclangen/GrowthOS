import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobState } from "./steps";

// The conditional writes on ai_jobs that make the step chain safe to repeat. Each is one UPDATE whose filter
// re-checks the row's current state, so when two invocations race for the same step only one write matches (Postgres
// re-evaluates the filter after the first one commits). Callers pass the admin client and a job whose organization
// came from the job row; every write is scoped to it. Unit-tested against an in-memory table (claims.test.ts).

export type JobRef = { id: string; organizationId: string };

const ACTIVE = ["queued", "running"];

// Moves a pending step to running for the invocation holding `running.claim`. Matches only while the job is active
// and the step is still the pending one, so a repeated or late continuation claims nothing. A job queued by an
// older version of the app has no output yet; it is claimed at its first step.
export async function claimStep(
  db: SupabaseClient,
  job: JobRef & { output: unknown; startedAt: string | null },
  running: JobState,
): Promise<boolean> {
  let query = db
    .from("ai_jobs")
    .update({ status: "running", output: running, ...(job.startedAt ? {} : { started_at: running.step_started_at }) })
    .eq("id", job.id)
    .eq("organization_id", job.organizationId)
    .in("status", ACTIVE);
  query =
    job.output === null || job.output === undefined
      ? query.is("output", null)
      : query.eq("output->>step", running.step).eq("output->>step_state", "pending");
  const { data, error } = await query.select("id");
  if (error) console.error(`claiming step ${running.step} of job ${job.id} failed`, error);
  return !!data?.length;
}

// A write only the invocation holding `claim` may make: the job is still running and still holds that claim (the
// reaper or a failed hand-off may have failed it meanwhile, and advancing the step clears the claim).
export function ownedUpdate(db: SupabaseClient, job: JobRef, claim: string, values: Record<string, unknown>) {
  return db
    .from("ai_jobs")
    .update(values)
    .eq("id", job.id)
    .eq("organization_id", job.organizationId)
    .eq("status", "running")
    .eq("output->>claim", claim)
    .select("id");
}

// Fails a job whose step `step` is still pending: its hand-off wasn't accepted. Does nothing once an invocation has
// claimed the step or the job has finished. The step's artifacts (page text, evidence, discovery answers) are
// dropped with the state.
export async function failPendingStep(db: SupabaseClient, job: JobRef, step: string, message: string): Promise<boolean> {
  const { data, error } = await db
    .from("ai_jobs")
    .update({ status: "failed", error: message, finished_at: new Date().toISOString(), output: { step } })
    .eq("id", job.id)
    .eq("organization_id", job.organizationId)
    .in("status", ACTIVE)
    .eq("output->>step", step)
    .eq("output->>step_state", "pending")
    .select("id");
  if (error) console.error(`failing job ${job.id} after its hand-off of ${step} failed`, error);
  return !!data?.length;
}

// Records that a pending step is being re-sent. Matches only while the step is still pending and its resent_at is
// the one the caller read, so of two pages polling at once only one re-sends it.
export async function markResent(db: SupabaseClient, job: JobRef, state: JobState, at: string): Promise<boolean> {
  const previous = typeof state.resent_at === "string" ? state.resent_at : null;
  let query = db
    .from("ai_jobs")
    .update({ output: { ...state, resent_at: at } })
    .eq("id", job.id)
    .eq("organization_id", job.organizationId)
    .in("status", ACTIVE)
    .eq("output->>step", state.step)
    .eq("output->>step_state", "pending");
  query = previous ? query.eq("output->>resent_at", previous) : query.is("output->>resent_at", null);
  const { data, error } = await query.select("id");
  if (error) console.error(`re-sending step ${state.step} of job ${job.id} failed`, error);
  return !!data?.length;
}

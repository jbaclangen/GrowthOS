import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { failPendingStep, type JobRef } from "./claims";
import { dispatchStep } from "./dispatch";
import { firstStep } from "./steps";

export const HANDOFF_ERROR = "The analysis couldn't continue. Run it again.";

// Hands `step` of a job to its own function invocation (/api/jobs/continue). When the hand-off isn't accepted, the
// job is failed now with this message, instead of polling until the stale-job reaper says it took too long (and
// blocking re-runs meanwhile). Never throws.
export async function handOff(job: JobRef, step: string, db?: SupabaseClient): Promise<boolean> {
  try {
    if (await dispatchStep(job.id, step)) return true;
    await failPendingStep(db ?? createSupabaseAdminClient(), job, step, HANDOFF_ERROR);
  } catch (e) {
    console.error(`handing step ${step} of job ${job.id} on failed`, e);
  }
  return false;
}

// Starts a job queued in this request. Its first step runs in its own invocation, after the response, so it gets the
// full time limit whatever this request already spent (e.g. on a follow-up question call). The job row must have
// been written with initialState(worker) as its output.
export function startJob(job: JobRef & { worker: string }) {
  after(() => handOff(job, firstStep(job.worker)));
}

// Step sequencing for analysis jobs (pure; no database or network access, so it is unit-tested).
//
// The hosting platform stops every function invocation at 300 s (Vercel Hobby) with no cleanup, and a full
// analysis takes longer than that. So each job runs as a chain of steps, one step per invocation: a step claims
// itself on the ai_jobs row, does its work, stores what later steps need in ai_jobs.output, marks the next step
// pending and hands it to a new invocation (/api/jobs/continue). output.step keeps the progress key the report
// shows, as before.

export type RunStep = "crawling" | "profiling" | "scoring" | "planning" | "writing";

export type PipelineWorker = "website_evidence" | "website_plan" | "website_intel" | "diagnosis_update";

// - website_evidence: crawl + PageSpeed + checks, then the business profile (ends at "evidence_done").
// - website_plan: diagnosis + growth plan, then the 30-day plan, then the first drafts.
// - website_intel (re-run): both of the above in one job.
// - diagnosis_update: only the diagnosis, with the owner's corrections.
const SEQUENCES: Record<PipelineWorker, readonly RunStep[]> = {
  website_evidence: ["crawling", "profiling"],
  website_plan: ["scoring", "planning", "writing"],
  website_intel: ["crawling", "profiling", "scoring", "planning", "writing"],
  diagnosis_update: ["scoring"],
};

// Any other worker name runs as a full analysis, as the single-invocation pipeline did.
export function stepsFor(worker: string): readonly RunStep[] {
  return SEQUENCES[worker as PipelineWorker] ?? SEQUENCES.website_intel;
}

export function firstStep(worker: string): RunStep {
  return stepsFor(worker)[0];
}

// The step after `step`, or null when `step` is the last one (or not part of this worker's sequence).
export function nextStep(worker: string, step: RunStep): RunStep | null {
  const steps = stepsFor(worker);
  const i = steps.indexOf(step);
  return i === -1 || i === steps.length - 1 ? null : steps[i + 1];
}

export function isRunStep(worker: string, value: unknown): value is RunStep {
  return typeof value === "string" && (stepsFor(worker) as readonly string[]).includes(value);
}

// What ai_jobs.output holds while a job is in progress. Step artifacts sit alongside these fields.
export type JobState = {
  step: RunStep;
  // pending: waiting for an invocation to claim it; running: claimed by the invocation holding `claim`.
  step_state: "pending" | "running";
  // Last progress: when the current step was queued or claimed. The stale-job reaper measures from here.
  step_started_at: string;
  claim: string | null;
  [artifact: string]: unknown;
};

export function initialState(worker: string, now: Date = new Date()): JobState {
  return { step: firstStep(worker), step_state: "pending", step_started_at: now.toISOString(), claim: null };
}

// The job's step state, or null when the output isn't a step state (a finished job, or a job started by an older
// version of the pipeline). A job queued without an output starts at its first step.
export function readState(worker: string, output: unknown, createdAt?: string): JobState | null {
  if (output === null || output === undefined) {
    return { ...initialState(worker), step_started_at: createdAt ?? new Date().toISOString() };
  }
  if (typeof output !== "object") return null;
  const o = output as Partial<JobState>;
  if (!isRunStep(worker, o.step) || (o.step_state !== "pending" && o.step_state !== "running")) return null;
  return o as JobState;
}

// A step may start only when it is pending and is the step the caller asked for (a repeated or late continuation
// for a step that already ran is ignored).
export function canClaim(state: JobState | null, expected?: string): state is JobState {
  return !!state && state.step_state === "pending" && (expected === undefined || state.step === expected);
}

// The output after a step finishes: its artifacts merged in, and the next step queued.
export function advanceState(state: JobState, artifacts: Record<string, unknown>, next: RunStep, now: Date = new Date()): JobState {
  return { ...state, ...artifacts, step: next, step_state: "pending", step_started_at: now.toISOString(), claim: null };
}

// Stale-job reaper (lib/pipeline/jobs.ts). Each step is bounded by one function invocation (300 s) and a lost
// hand-off is re-sent after a minute, so a job whose last progress is older than this was cut off by the hosting
// limit, or its step could not be handed on at all.
export const STALE_JOB_MS = 10 * 60 * 1000;

// The reaper's rule as a PostgREST `or` filter: the last progress (output.step_started_at, else created_at) is
// before the cutoff. ISO timestamps from toISOString() compare correctly as text. Tested in jobs.test.ts.
export function staleFilter(cutoffIso: string): string {
  return `output->>step_started_at.lt."${cutoffIso}",and(output->>step_started_at.is.null,created_at.lt."${cutoffIso}")`;
}

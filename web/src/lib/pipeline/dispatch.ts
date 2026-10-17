import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { env, envConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { JobRef } from "./claims";
import { continueKey, signContinue } from "./continue-token";

// Hands a job's step to a new function invocation, so each invocation gets its own time limit. The continue route
// (/api/jobs/continue) accepts the request (202) and does the work in its own after(). Two ways to get it there:
//
// - "database" (production): the app records the hand-off in public.job_dispatches and Postgres POSTs it (pg_net, the
//   job_dispatches migration in supabase/migrations). Vercel answers a deployment that calls itself in a chain with
//   HTTP 508 INFINITE_LOOP_DETECTED after a few calls (seen on the 5th step of a re-run, 2026-10-17), so in production
//   the app must never POST to itself. The app doesn't see the route's answer to Postgres: a pg_cron sweeper re-posts
//   a step still pending a minute after its last post (4 posts at most) and fails the job, within about a minute,
//   when a post is refused or the 4th post fails too. A post that never gets an answer is left to the 10-minute
//   reaper (lib/pipeline/jobs.ts) and shows in job_dispatch_health.
// - "direct" (local development): the app POSTs to its own route and waits for the 202, never for the step itself.
//   Supabase can't reach localhost, and `next dev` has no loop detection.
//
// Never throws: it returns false when the hand-off couldn't be recorded (database mode), wasn't accepted (direct
// mode) or, on a re-send, has failed for good, and the caller fails the job (lib/pipeline/handoff.ts). A hand-off
// that was accepted but never ran is re-sent by the report page (resendDue in lib/pipeline/jobs.ts). The token is
// never logged.
export type DispatchMode = "database" | "direct";

// JOB_DISPATCH ("database" or "direct") wins; set JOB_DISPATCH=database in production. Without it, a deployment uses
// the database and everything else POSTs directly. A deployment is VERCEL=1 (only set when the Vercel project exposes
// system environment variables) or, so that production never falls back to calling itself when that is missing, a
// production build (NODE_ENV=production) whose NEXT_PUBLIC_APP_URL is https. `next dev`, and `next start` on an
// http://localhost URL, post directly. An invalid JOB_DISPATCH falls back to that default.
export function dispatchMode(): DispatchMode {
  if (!envConfigured("JOB_DISPATCH")) {
    console.error('JOB_DISPATCH must be "database" or "direct"; using the default for this host');
  } else {
    const explicit = env().JOB_DISPATCH;
    if (explicit) return explicit;
  }
  return process.env.VERCEL === "1" || (process.env.NODE_ENV === "production" && httpsAppUrl()) ? "database" : "direct";
}

function httpsAppUrl(): boolean {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "").protocol === "https:";
  } catch {
    return false;
  }
}

const ATTEMPTS = 3;
const ACCEPT_TIMEOUT_MS = 15_000;
const CONTINUE_PATH = "/api/jobs/continue";

// Where the continue route is served, for a direct hand-off. In development it is the dev server running this code:
// `next dev` sets PORT to the port it actually listens on, which differs from NEXT_PUBLIC_APP_URL when another
// checkout already holds port 3000. Elsewhere it is NEXT_PUBLIC_APP_URL, the deployment's own public URL. The Host
// header is never used, so a request can't point the hand-off (and its token) at another server.
export function continueUrl(origin?: string): string {
  return new URL(CONTINUE_PATH, origin ?? serverOrigin()).toString();
}

function serverOrigin(): string {
  const port = process.env.PORT?.trim();
  if (process.env.NODE_ENV === "development" && port && /^\d{1,5}$/.test(port)) return `http://localhost:${port}`;
  return env().NEXT_PUBLIC_APP_URL;
}

// Where Postgres sends a recorded hand-off: always the deployment's public URL, which must be https (Supabase can't
// reach localhost, and the table only accepts https URLs ending in /api/jobs/continue). Throws otherwise.
export function databaseContinueUrl(): string {
  const url = new URL(CONTINUE_PATH, env().NEXT_PUBLIC_APP_URL);
  if (url.protocol !== "https:") throw new Error("NEXT_PUBLIC_APP_URL must be the deployment's public https URL in database dispatch mode");
  return url.toString();
}

// A timeout, a rate limit or a server error may pass; any other refusal (a redirect to /login, a bad token) won't.
export function retryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export type DispatchOptions = {
  // Forces a direct hand-off to this origin (the local pipeline script, which runs outside the dev server).
  origin?: string;
  // Database mode: the service client to record the hand-off with (created when absent). Never a user's client.
  db?: SupabaseClient;
  // Re-sending a step already handed off (the report page's poll): database mode re-posts the stored dispatch.
  resend?: boolean;
};

export async function dispatchStep(job: JobRef, step: string, opts: DispatchOptions = {}): Promise<boolean> {
  if (opts.origin !== undefined || dispatchMode() === "direct") return postStep(job.id, step, opts.origin);
  let db: SupabaseClient;
  try {
    db = opts.db ?? createSupabaseAdminClient();
  } catch (e) {
    console.error(`handing step ${step} of job ${job.id} on isn't possible: the service client can't be created`, e);
    return false;
  }
  return opts.resend ? resendRecorded(db, job, step) : recordDispatch(db, job, step);
}

// Direct mode: POST to the continue route, retrying what may pass on another attempt.
async function postStep(jobId: string, step: string, origin?: string): Promise<boolean> {
  let url: string;
  let body: string;
  try {
    url = continueUrl(origin);
    body = JSON.stringify({ jobId, step, token: signContinue(continueKey(), jobId, step) });
  } catch (e) {
    // An invalid NEXT_PUBLIC_APP_URL or JOB_CONTINUE_SECRET (or no SUPABASE_SECRET_KEY): no attempt can succeed.
    console.error(`handing step ${step} of job ${jobId} on isn't possible: check NEXT_PUBLIC_APP_URL and JOB_CONTINUE_SECRET`, e);
    return false;
  }
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(ACCEPT_TIMEOUT_MS),
      });
      if (res.status === 202) return true;
      if (!retryable(res.status)) {
        console.error(`handing step ${step} of job ${jobId} to ${url} was refused: HTTP ${res.status}`);
        return false;
      }
      console.error(`handing step ${step} of job ${jobId} failed: HTTP ${res.status} (attempt ${attempt})`);
    } catch (e) {
      console.error(`handing step ${step} of job ${jobId} failed (attempt ${attempt})`, e);
    }
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 2000));
  }
  return false;
}

// PostgREST errors worth another attempt: no code (the request never got an answer), connection failures, and
// transient server states. Constraint violations, a missing table and permission errors won't change.
export function retryableDbError(error: Pick<PostgrestError, "code">): boolean {
  return !error.code || /^(08|40|53|57|PGRST00)/.test(error.code);
}

// Only the code and message: a constraint violation's details repeat the failing row, token included.
function describe(error: Pick<PostgrestError, "code" | "message">): string {
  return `${error.code || "no code"}: ${error.message}`;
}

// Database mode: records the hand-off; the insert trigger has Postgres POST it once the insert commits. The row is
// scoped to the job's organization (a composite foreign key ties it to that organization's job), and nothing is read
// back, so the token never comes back out of the database.
async function recordDispatch(db: SupabaseClient, job: JobRef, step: string): Promise<boolean> {
  let row: Record<string, string>;
  try {
    const url = databaseContinueUrl();
    row = { organization_id: job.organizationId, job_id: job.id, step, url, token: signContinue(continueKey(), job.id, step) };
  } catch (e) {
    console.error(`handing step ${step} of job ${job.id} on isn't possible: check NEXT_PUBLIC_APP_URL and JOB_CONTINUE_SECRET`, e);
    return false;
  }
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const { error } = await db.from("job_dispatches").insert(row);
      if (!error) return true;
      // Already recorded (e.g. an earlier attempt landed but its answer was lost): Postgres has it and re-posts it.
      if (error.code === "23505") return true;
      if (!retryableDbError(error)) {
        console.error(`recording the hand-off of step ${step} of job ${job.id} failed (is the job_dispatches migration applied?): ${describe(error)}`);
        return false;
      }
      console.error(`recording the hand-off of step ${step} of job ${job.id} failed (attempt ${attempt}): ${describe(error)}`);
    } catch (e) {
      console.error(`recording the hand-off of step ${step} of job ${job.id} failed (attempt ${attempt})`, e);
    }
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 1000));
  }
  return false;
}

// What resend_job_dispatch answers (see the migration).
export type ResendResult = "posted" | "not_pending" | "failed" | "missing";

// Database mode re-send: Postgres re-posts the stored dispatch (resend_job_dispatch), so the token stays in the
// database. A job no longer waiting for the step needs nothing. A hand-off that has failed for good (its last post
// was refused, e.g. a 401 because the deployment signs with another key, or 4 posts all failed) returns false, so the
// caller fails the job now instead of re-posting until the reaper. With no stored dispatch (a job handed off before
// database mode was turned on), or when the call itself fails, the hand-off is recorded afresh; if it already exists,
// the sweeper keeps re-posting it.
async function resendRecorded(db: SupabaseClient, job: JobRef, step: string): Promise<boolean> {
  try {
    const { data, error } = await db.rpc("resend_job_dispatch", {
      p_organization_id: job.organizationId,
      p_job_id: job.id,
      p_step: step,
    });
    if (error) {
      console.error(`re-sending step ${step} of job ${job.id} failed: ${describe(error)}`);
    } else {
      switch (data as ResendResult | null) {
        case "posted":
        case "not_pending":
          return true;
        case "failed":
          console.error(`handing step ${step} of job ${job.id} on failed: Postgres's post was refused or failed 4 times (see job_dispatch_health)`);
          return false;
        case "missing":
          break;
        default:
          console.error(`re-sending step ${step} of job ${job.id}: unexpected answer from resend_job_dispatch`, data);
      }
    }
  } catch (e) {
    console.error(`re-sending step ${step} of job ${job.id} failed`, e);
  }
  return recordDispatch(db, job, step);
}

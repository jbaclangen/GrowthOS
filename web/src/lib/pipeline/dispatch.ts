import "server-only";
import { env } from "@/lib/env";
import { continueKey, signContinue } from "./continue-token";

// Hands a job's step to a new function invocation, so each invocation gets its own time limit. The continue
// route accepts the request (202) and does the work in its own after(); this only waits for that acceptance, never
// for the step itself. Never throws: it returns false when the hand-off wasn't accepted, and the caller fails the
// job (lib/pipeline/handoff.ts). A hand-off that was accepted but never ran is re-sent by the report page
// (resendStalledSteps in lib/pipeline/jobs.ts).
const ATTEMPTS = 3;
const ACCEPT_TIMEOUT_MS = 15_000;

// Where the continue route is served. In development it is the dev server running this code: `next dev` sets PORT
// to the port it actually listens on, which differs from NEXT_PUBLIC_APP_URL when another checkout already holds
// port 3000. Elsewhere it is NEXT_PUBLIC_APP_URL, the deployment's own public URL. The Host header is never used, so
// a request can't point the hand-off (and its token) at another server.
export function continueUrl(origin?: string): string {
  return new URL("/api/jobs/continue", origin ?? serverOrigin()).toString();
}

function serverOrigin(): string {
  const port = process.env.PORT?.trim();
  if (process.env.NODE_ENV === "development" && port && /^\d{1,5}$/.test(port)) return `http://localhost:${port}`;
  return env().NEXT_PUBLIC_APP_URL;
}

// A timeout, a rate limit or a server error may pass; any other refusal (a redirect to /login, a bad token) won't.
export function retryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

// `origin` overrides where the route is served (the local pipeline script, which runs outside the dev server).
export async function dispatchStep(jobId: string, step: string, opts: { origin?: string } = {}): Promise<boolean> {
  let url: string;
  let body: string;
  try {
    url = continueUrl(opts.origin);
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

import "server-only";
import { env } from "@/lib/env";
import { continueKey, signContinue } from "./continue-token";

// Hands a job's next step to a new function invocation, so each invocation gets its own time limit. The continue
// route accepts the request (202) and does the work in its own after(); this only waits for that acceptance, never
// for the step itself. A hand-off that never arrives leaves the step pending, and the stale-job reaper fails the
// job after STALE_JOB_MS (lib/pipeline/jobs.ts).
const ATTEMPTS = 3;
const ACCEPT_TIMEOUT_MS = 15_000;

export function continueUrl(): string {
  return new URL("/api/jobs/continue", env().NEXT_PUBLIC_APP_URL).toString();
}

export async function dispatchStep(jobId: string, step: string): Promise<boolean> {
  const url = continueUrl();
  const body = JSON.stringify({ jobId, step, token: signContinue(continueKey(), jobId, step) });
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
      // A redirect or 4xx won't get better on a retry (bad token, the route blocked by the proxy): stop.
      if (res.status >= 300 && res.status < 500) {
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

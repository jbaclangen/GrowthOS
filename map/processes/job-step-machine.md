---
type: process
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
consumes: ["[[ai-job]]", "[[job-step]]", "[[business-profile]]"]
produces: ["[[ai-job]]", "[[job-step]]", "[[job-dispatch]]"]
---

# Job step machine (`runAnalysisJob` / `handOff` / `POST /api/jobs/continue`)

Runs every analysis job as a chain of claimed steps, one function invocation each, handed on through an HMAC-signed POST.

## Input → Movement → Output

A queued `ai_jobs` row holds `output.{step, step_state, step_started_at, claim}`. The continue route verifies the token and, after answering 202, `runClaimedStep` claims the pending step with a conditional UPDATE, runs it, merges its artifacts, marks the next step pending and hands it off (directly in development, through `job_dispatches` + `pg_net` in production). The last step writes `status: succeeded` with the final output, or the job is failed with the error.

## Why this shape

Vercel Hobby stops an invocation at 300 s with no cleanup; a full analysis took longer (D-042, `docs/decisions/DECISION_LOG.md:509-511`; `CLAUDE.md:124-125`). A deployment that POSTs to itself in a chain gets HTTP 508 after a few hops, so production never calls itself: Postgres sends the POST. The conditional claim makes a repeated or late POST harmless, which is what lets the sweeper and the report page re-send freely.

## Steps

1. Sequences per worker; unknown worker runs as `website_intel` — `web/src/lib/pipeline/steps.ts:17-27`. State shape and `initialState` — `:45-57`; `readState`, `canClaim`, `advanceState` — `:61-80`.
2. Hand-off: `handOff` → `dispatchStep`, failure → `failPendingStep` with `HANDOFF_ERROR` — `web/src/lib/pipeline/handoff.ts:18-26`; `startJob` wraps it in `after()` — `:32-34`.
3. `dispatchMode`: `JOB_DISPATCH` wins, else `database` on Vercel / production https, else `direct` — `web/src/lib/pipeline/dispatch.ts:32-40`; env schema `web/src/lib/env.ts:36`. Why the two modes — `web/src/lib/pipeline/dispatch.ts:11-19`.
4. Direct: `postStep` POSTs `{jobId, step, token}`, 3 attempts, 15 s, expects 202 — `web/src/lib/pipeline/dispatch.ts:103-136`.
5. Database: `recordDispatch` inserts `job_dispatches` (23505 = already recorded) — `web/src/lib/pipeline/dispatch.ts:152-178`; table and checks `supabase/migrations/20261017110000_job_dispatches.sql:63-77`; insert trigger `job_dispatches_send` → `post_job_dispatch` → `net.http_post` — `:89-130`.
6. Token: key from `JOB_CONTINUE_SECRET` else HKDF of `SUPABASE_SECRET_KEY` — `web/src/lib/pipeline/continue-token.ts:11-19`; sign `:21-23`; verify with `timingSafeEqual` `:25-30`.
7. Route: `maxDuration = 300` — `web/src/app/api/jobs/continue/route.ts:13`; zod body `:15-19`; 400 / 500 / 401 — `:21-37`; `after(runAnalysisJob)` + 202 — `:38-39`.
8. `runAnalysisJob` never throws — `web/src/lib/pipeline/website-intel.ts:912-918`. `runClaimedStep`: load, skip unless active, `canClaim` — `:920-932`; `claimStep` — `:935-938`, conditional UPDATE at `web/src/lib/pipeline/claims.ts:17-35`.
9. Owner inputs read fresh each run — `web/src/lib/pipeline/website-intel.ts:940-954`; `runStep` dispatch by step — `:892-905`.
10. Error path: `failed`, `output: {step}` — `web/src/lib/pipeline/website-intel.ts:961-971`.
11. Final: `ownedUpdate` to `succeeded` — `web/src/lib/pipeline/website-intel.ts:974-980` (`ownedUpdate` at `web/src/lib/pipeline/claims.ts:39-48`); evidence job then `startPlanIfReady` — `web/src/lib/pipeline/website-intel.ts:982-988`.
12. Otherwise `advanceState`, one retry, fail on second error, then `handOff(next)` — `web/src/lib/pipeline/website-intel.ts:993-1010`.

## Human gate

None inside the machine. Gates sit at the ends of the chain ([discovery-and-review](discovery-and-review.md), [confirm-diagnosis-and-plan](confirm-diagnosis-and-plan.md), [approve-content](approve-content.md)).

## If you change this

- **Hits:** every worker (`website_evidence`, `website_plan`, `website_intel`, `diagnosis_update`), [job-recovery](job-recovery.md) (reads the same `step_state`/`step_started_at`), the sweeper SQL (mirrors `failPendingStep`), `job_dispatch_health`, the local runner script.
- **Does not hit:** the AI router (steps call it; it knows nothing of steps); `startPlanIfReady` guards (they read `ai_jobs.status`, not step state).

## Surfaces

| Surface | Role |
|---|---|
| `POST /api/jobs/continue` | Accepts a signed step, runs it in `after()` |
| `lib/pipeline/dispatch.ts` | direct POST vs `job_dispatches` insert |
| `job_dispatches_send` trigger + `pg_net` | Production sender |
| `ai_jobs.output` | Step state and artifacts |

## See

- Objects: [ai-job](../objects/pipeline/ai-job.md), [job-step](../objects/pipeline/job-step.md), [job-dispatch](../objects/pipeline/job-dispatch.md), [business-profile](../objects/onboarding/business-profile.md)
- Processes: [job-recovery](job-recovery.md), [crawl-and-profile](crawl-and-profile.md), [score-and-diagnose](score-and-diagnose.md), [plan-and-write](plan-and-write.md)
- Source: `web/src/lib/pipeline/website-intel.ts`, `web/src/lib/pipeline/steps.ts`, `web/src/lib/pipeline/claims.ts`, `web/src/lib/pipeline/dispatch.ts`, `web/src/app/api/jobs/continue/route.ts`, `supabase/migrations/20261017110000_job_dispatches.sql`

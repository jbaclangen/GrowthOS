---
type: process
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
consumes: ["[[ai-job]]", "[[job-step]]", "[[job-dispatch]]"]
produces: ["[[ai-job]]", "[[job-dispatch]]"]
---

# Job recovery (re-send, reaper, sweeper)

Re-sends a step whose hand-off was lost and fails a job that stopped making progress, from the app side and from Postgres.

## Input → Movement → Output

A job sits with a step `pending` (its POST never ran) or `running` past its limit. The report page's loader re-sends a step pending for 60 s and fails jobs with no progress for 10 min; in production a `pg_cron` sweeper re-posts stored dispatches each minute and fails a job whose post was refused or failed four times; an hourly job deletes day-old dispatches. The job ends `failed` with a message that tells the owner to run it again, or continues from the re-sent step.

## Why this shape

The platform kills an invocation at 300 s with no cleanup, so a job could stay `running` forever: the report would poll indefinitely and re-runs would be blocked (`web/src/lib/pipeline/jobs.ts:11-15`). The app only learns about a lost hand-off when someone loads the report, so the sweeper exists for production where the route answers Postgres, not the app. Re-sending is safe only because the step claim is conditional ([job-step-machine](job-step-machine.md)).

## Steps

1. Report loader calls `superviseJobs` for the business's organization — `web/src/app/analysis/[id]/report-data.ts:87`; the page mounts `AutoRefresh` while running — `web/src/app/analysis/[id]/page.tsx:103`, 4 s interval `web/src/app/analysis/[id]/auto-refresh.tsx:7-12`.
2. `superviseJobs`: `failStaleJobs`, then `resendDue`, then `handOff(..., {resend: true})` in `after()` — `web/src/lib/pipeline/jobs.ts:68-76`.
3. `failStaleJobs`: active jobs matching `staleFilter(cutoff)` become `failed` with `STALE_JOB_ERROR`, `output: null` — `web/src/lib/pipeline/jobs.ts:16-27`; `STALE_JOB_MS` and the filter — `web/src/lib/pipeline/steps.ts:85`, `:89-91`. Other callers: `web/src/app/analysis/actions.ts:85`, `web/src/app/analysis/plan-actions.ts:124`, `web/src/app/dashboard/page.tsx:28`.
4. `resendDue`: `RESEND_AFTER_MS` — `web/src/lib/pipeline/jobs.ts:32`; selects pending steps older than the cutoff (max 5), skips ones re-sent within the window, `markResent` — `:36-63`; `markResent` conditional UPDATE on `resent_at` — `web/src/lib/pipeline/claims.ts:69-83`.
5. Database-mode re-send: `resend_job_dispatch` RPC answers `posted` / `not_pending` / `failed` / `missing` — `web/src/lib/pipeline/dispatch.ts:189-216`; SQL `supabase/migrations/20261017110000_job_dispatches.sql:212-244`.
6. `job_dispatch_failed`: 202 = ok; null / 408 / 429 / 5xx = failed only at 4 attempts; anything else = failed — `supabase/migrations/20261017110000_job_dispatches.sql:136-153`.
7. `sweep_job_dispatches`: active jobs still pending on that step; fail the job with "couldn't continue" when `job_dispatch_failed` says so (mirrors `failPendingStep`), else re-post when attempts < 4 and the last post is > 60 s old — `supabase/migrations/20261017110000_job_dispatches.sql:158-204`.
8. `cleanup_job_dispatches` deletes dispatches older than a day — `supabase/migrations/20261017110000_job_dispatches.sql:247-259`.
9. Schedules: sweeper `* * * * *`, cleanup `7 * * * *` — `supabase/migrations/20261017110000_job_dispatches.sql:339-340`.
10. `job_dispatch_health()` (service role only) — `supabase/migrations/20261017110000_job_dispatches.sql:271`, `:335-336`; read by `web/src/app/api/health/integrations/route.ts:97`, assessed by `assessDispatchHealth` — `web/src/lib/pipeline/dispatch-health.ts:29`, `SWEEPER_STALE_MS` `:23`.
11. Local runner hands the first step off through `dispatchStep`: direct with `--origin`, else by `JOB_DISPATCH` — `web/scripts/run-pipeline-local.mts:62-63`.

## Human gate

None. The report shows the failure message and the Re-run button; the re-run's permission check lives in [rerun-analysis](rerun-analysis.md).

## If you change this

- **Hits:** `STALE_JOB_MS`/`RESEND_AFTER_MS` relations to the sweeper's 60 s and 4-attempt rules (two homes: TS and SQL), `job_dispatch_health` and the health route, every page that calls `failStaleJobs`.
- **Does not hit:** `claimStep` itself (recovery only re-sends; claiming is [job-step-machine](job-step-machine.md)); the AI budget (a failed job logs nothing new in `ai_usage`).

## Surfaces

| Surface | Role |
|---|---|
| `/analysis/[id]` poll (4 s) | Triggers `superviseJobs` |
| `pg_cron` sweeper (1 min) | Re-posts / fails stored dispatches |
| `pg_cron` cleanup (hourly) | Deletes old dispatches |
| `GET /api/health/integrations` | Reads `job_dispatch_health` |

## See

- Objects: [ai-job](../objects/pipeline/ai-job.md), [job-step](../objects/pipeline/job-step.md), [job-dispatch](../objects/pipeline/job-dispatch.md)
- Processes: [job-step-machine](job-step-machine.md), [rerun-analysis](rerun-analysis.md)
- Source: `web/src/lib/pipeline/jobs.ts`, `web/src/lib/pipeline/claims.ts`, `web/src/lib/pipeline/dispatch.ts`, `supabase/migrations/20261017110000_job_dispatches.sql`

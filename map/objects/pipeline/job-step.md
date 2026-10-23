---
type: object
cluster: pipeline
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: web/src/lib/pipeline/steps.ts
---

# Analysis step (`RunStep` / `JobState`)

One step of an analysis job: the unit of work one function invocation runs, kept as `ai_jobs.output` while the job is in progress.

## Why this shape

Vercel Hobby stops an invocation at 300 s with no cleanup, so each step claims itself on the job row, stores what the next step needs and hands on: `web/src/lib/pipeline/steps.ts:1-7`, `web/src/lib/pipeline/jobs.ts:11-15`.

## Shape

- `RunStep` (crawling, profiling, scoring, planning, writing) `web/src/lib/pipeline/steps.ts:9`; `PipelineWorker` `:11`; `SEQUENCES` per worker `:17-22`; an unknown worker runs the full sequence `:24-27`.
- `JobState` = `step`, `step_state` (`pending` | `running`), `step_started_at`, `claim`, plus step artifacts: `:44-53`. `initialState` `:55-57`, `readState` `:59-69`, `canClaim` `:71-75`, `advanceState` `:77-80`.
- `STALE_JOB_MS` 10 min `:82-85`; `staleFilter` `:87-91`.
- Conditional writes: `claimStep` `web/src/lib/pipeline/claims.ts:14-35`, `ownedUpdate` `:37-48`, `failPendingStep` `:50-65`, `markResent` `:67-83`.
- Step bodies: `runStep` `web/src/lib/pipeline/website-intel.ts:855-868`; `crawlStep` `:255`, `profileStep` `:293`, `scoreStep` `:605` (`reviseStep` `:598` for `diagnosis_update`), `planStep` `:733`, `writeStep` `:787`. Progress labels the report shows `:70-77`.
- Run loop `runAnalysisJob` / `runClaimedStep` `:875-974`: claim `:895-901`, failure `:924-933`, final `:937-953`, advance and hand on `:956-973`.
- Artifacts handed between steps: `:289`, `:357`, `:713-721`, `:783`.

Citations: `web/src/lib/pipeline/steps.ts:9-91`, `web/src/lib/pipeline/claims.ts:17-83`, `web/src/lib/pipeline/website-intel.ts:855-974`.

## Connected to

- **owns:** nothing; it is a shape inside [ai-job](ai-job.md).
- **owned-by:** [ai-job](ai-job.md).
- **joins:** [job-dispatch](job-dispatch.md), one dispatch per (job, step) (`supabase/migrations/20261017110000_job_dispatches.sql:75`); the sweeper and `resend_job_dispatch` read this state in SQL (`:172-174`, `:229-237`).
- **looks-like-but-is-not:** `STEPS` in `website-intel.ts:70-77` (display labels, includes `done`); `audit_runs.status` and `module_runs.status` (per-artifact results, not progress).

## If you change this

- **Hits:** every filter on `output->>step` / `output->>step_state` in `claims.ts`; the SQL mirror of the state in `job_dispatches.sql:172-174`, `:187-196`, `:229-237`; `resendDue` `jobs.ts:36-63`; `failStaleJobs` `jobs.ts:18-27`; the local runner `web/scripts/run-pipeline-local.mts:63-68`; the report's progress list (`website-intel.ts:70-77`).
- **Does not hit:** the continue route's body schema (`web/src/app/api/jobs/continue/route.ts:15-19` accepts any step string); the prompts in `web/src/lib/pipeline/prompts.ts`.

## Surfaces

| Surface | Role |
|---|---|
| `POST /api/jobs/continue` → [job-step-machine](../../processes/job-step-machine.md) | runs; writes |
| `/analysis/[id]` poll (`web/src/app/analysis/[id]/auto-refresh.tsx:7-12`, `report-data.ts:87`) → [job-recovery](../../processes/job-recovery.md) | reads; re-sends |
| Postgres sweeper | reads |
| `web/scripts/run-pipeline-local.mts` | runs locally |

## See

- Source: `web/src/lib/pipeline/steps.ts`
- As built: `docs/decisions/DECISION_LOG.md` (D-042)

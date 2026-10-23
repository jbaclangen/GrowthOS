---
type: object
cluster: pipeline
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261010061028_foundation.sql
---

# Analysis job (`ai_jobs`)

One row per background analysis run; the app calls it "analysis" (the report page polls it), the code `ai_jobs`.

## Why this shape

A job runs as a chain of steps, one function invocation each (D-042), so the row carries its own progress in `output` instead of a step table: `web/src/lib/pipeline/steps.ts:1-7`, `supabase/migrations/20261017110000_job_dispatches.sql:1-8`.

## Shape

- Columns (`worker`, `task_class`, `status`, `input`, `output`, `error`, `n8n_execution_id`, `created_by`, timestamps): `supabase/migrations/20261010061028_foundation.sql:222-236`; `job_status` enum `:220`; default `queued` `:227`.
- `unique (id, organization_id)` for composite foreign keys: `supabase/migrations/20261017110000_job_dispatches.sql:61`.
- RLS "members all", so signed-in clients insert rows: `supabase/migrations/20261010061028_foundation.sql:300-309`; inserts at `web/src/lib/onboarding/start.ts:42-46`, `web/src/lib/onboarding/orchestrate.ts:29-46` (admin client), `web/src/app/analysis/plan-actions.ts:133-144`.
- The four `worker` values and their step sequences: `web/src/lib/pipeline/steps.ts:11-22`. `task_class` is `complex` at every insert: `start.ts:44`, `orchestrate.ts:34`, `plan-actions.ts:138`.
- `input` keys: `web/src/lib/pipeline/website-intel.ts:239-246`. `output` while running is the step state ([job-step](job-step.md)); final outputs `:356`, `:601`, `:850-852`.
- Status moves: `running` on claim `web/src/lib/pipeline/claims.ts:22-27`; `succeeded` `website-intel.ts:937-943`; `failed` on a step error `:928-933`, a refused hand-off `claims.ts:53-65` and `job_dispatches.sql:187-196`, or no progress for `STALE_JOB_MS` `web/src/lib/pipeline/jobs.ts:18-27`.
- Limit of 10 crawling jobs (`website_evidence`, `website_intel`) per organization per 24 h: `web/src/lib/onboarding/start.ts:18-31`, enforced at `:63` and `web/src/app/analysis/actions.ts:94`. One active job per business blocks a re-run or update: `actions.ts:83-93`, `plan-actions.ts:124-131`.
- Who may queue one (D-046): `analysis.run` for an analysis or re-run (`actions.ts:55`, `:81`; MCP `web/src/lib/mcp/tools.ts:164`); `profile.edit` for the discovery steps whose finish queues the plan job (`web/src/app/onboarding/[sessionId]/actions.ts:21`; MCP `tools.ts:287`, `:340`), which the evidence job's success can queue instead (`website-intel.ts:945-948`); `diagnosis.correct` for an update (`plan-actions.ts:108`). Matrix `web/src/lib/team/roles.ts:90-92`, spec `docs/architecture/ROLES_AND_PERMISSIONS.md:62-64`.
- `n8n_execution_id` is never written (leftover; n8n callbacks are roadmap: `docs/product/ROADMAP.md:97-98`).

Citations: `supabase/migrations/20261010061028_foundation.sql:220-237`, `web/src/lib/pipeline/steps.ts:11-22`, `web/src/lib/pipeline/claims.ts:12-65`, `web/src/lib/pipeline/website-intel.ts:875-974`.

## Connected to

- **owns:** [job-step](job-step.md) (its `output`); [job-dispatch](job-dispatch.md) rows (cascade `job_dispatches.sql:76`); [ai-usage](ai-usage.md) by `job_id` (`foundation.sql:242`); [audit-run](audit-run.md) `job_id` (`supabase/migrations/20261011160802_website_audit.sql:11`); [module-run](../modules/module-run.md) (`supabase/migrations/20261023063253_feature_modules.sql:63`).
- **owned-by:** [organization](../tenancy/organization.md).
- **joins:** [onboarding-session](../onboarding/onboarding-session.md) through `evidence_job_id` / `plan_job_id` (`start.ts:97-101`, `orchestrate.ts:50-58`); [diagnosis](../report/diagnosis.md) `job_id` (`supabase/migrations/20261010164133_diagnosis_and_plan.sql:10`).
- **looks-like-but-is-not:** [ai-worker](ai-worker.md). `ai_jobs.worker` names a pipeline (`steps.ts:11`); `WORKERS` in the router names a model role (`web/src/lib/ai/router.ts:40`). The column comment at `foundation.sql:225` still lists router roles.

## If you change this

- **Hits:** `queueJob` / `startJob` (`start.ts:35-49`, `web/src/lib/pipeline/handoff.ts:32-34`); every conditional UPDATE in `claims.ts`; the sweeper SQL, which reads `output->>step` (`job_dispatches.sql:168-196`); the report loader `web/src/app/analysis/[id]/report-data.ts:89-96`; the dashboard `web/src/app/dashboard/page.tsx:35-47`; the rate limit `start.ts:21-31`.
- **Does not hit:** `ai_usage` (the router logs it with or without a job, `router.ts:109-118`); `module_runs` content (cascade only).

## Surfaces

| Surface | Role |
|---|---|
| `/onboarding` → [start-analysis](../../processes/start-analysis.md) | writes (`website_evidence`) |
| `/onboarding/[sessionId]` → [follow-up-questions](../../processes/follow-up-questions.md) | writes (`website_plan`) |
| `POST /api/mcp` → [mcp-onboarding](../../processes/mcp-onboarding.md) | writes (`website_evidence`, `website_plan`) |
| `/analysis/[id]` → [rerun-analysis](../../processes/rerun-analysis.md), [revise-diagnosis](../../processes/revise-diagnosis.md) | reads; writes (`website_intel`, `diagnosis_update`) |
| `POST /api/jobs/continue` → [job-step-machine](../../processes/job-step-machine.md) | writes (claim, advance, finish) |
| Postgres sweeper → [job-recovery](../../processes/job-recovery.md) | writes (fails) |
| `/dashboard` | reads |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:88`)

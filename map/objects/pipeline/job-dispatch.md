---
type: object
cluster: pipeline
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261017110000_job_dispatches.sql
---

# Step hand-off (`job_dispatches`)

The record of "run step X of job Y" that Postgres posts to `/api/jobs/continue` in production; locally the app posts the hand-off itself and writes no row (`web/src/lib/pipeline/dispatch.ts:91`).

## Why this shape

Vercel answers a deployment that calls itself in a chain with HTTP 508, so production must not POST to itself; the token lives in the database and never comes back out: `supabase/migrations/20261017110000_job_dispatches.sql:1-8`, `:28-48`, `web/src/lib/pipeline/dispatch.ts:8-24`.

## Shape

- Table `:63-78`: `step`, `url` and `token` check constraints `:67-69`; `attempts`, `last_sent_at`, `last_request_id` `:70-73`; `unique (job_id, step)` `:75`; composite FK to `ai_jobs` `:76`.
- RLS on, no policies, all privileges revoked `:80-82`.
- Token: HMAC-SHA256 over job id and step, key `JOB_CONTINUE_SECRET` or HKDF of `SUPABASE_SECRET_KEY`: `web/src/lib/pipeline/continue-token.ts:9-30`; env `web/src/lib/env.ts:26-32`. The route verifies, answers 202 and runs the step in `after()`: `web/src/app/api/jobs/continue/route.ts:13-40`.
- Modes: `dispatchMode` `dispatch.ts:27-40`; direct `postStep` `:102-136`; database `recordDispatch` `:149-178`; re-send `resendRecorded` `:183-216` (`ResendResult` `:181`).
- Postgres: `post_job_dispatch` `job_dispatches.sql:87-114` (10 s timeout `:107`); trigger `job_dispatches_send` AFTER INSERT `:116-130`; `job_dispatch_failed` `:132-153`; `sweep_job_dispatches` `:155-204` (rules `:168-181`, fail `:183-196`); `resend_job_dispatch` `:206-244`; `cleanup_job_dispatches` `:246-259`; `job_dispatch_health` `:261-326`. Grants `:328-336`.
- Cron: `braventa-job-dispatch-sweeper` every minute `:339`; `braventa-job-dispatch-cleanup` at minute 7 hourly `:340`. Extensions `:55-56`.
- App-side re-send: `RESEND_AFTER_MS` `web/src/lib/pipeline/jobs.ts:29-32`, `resendDue` `:36-63`, `superviseJobs` `:68-76`; `handOff` `web/src/lib/pipeline/handoff.ts:18-26`.
- Health: `GET /api/health/integrations` calls `job_dispatch_health` `web/src/app/api/health/integrations/route.ts:97`; `assessDispatchHealth` `web/src/lib/pipeline/dispatch-health.ts:29`, `SWEEPER_STALE_MS` `:23`.

Citations: `supabase/migrations/20261017110000_job_dispatches.sql:55-340`, `web/src/lib/pipeline/dispatch.ts:25-216`, `web/src/lib/pipeline/continue-token.ts:11-30`, `web/src/app/api/jobs/continue/route.ts:13-40`.

## Connected to

- **owns:** nothing.
- **owned-by:** [ai-job](ai-job.md) (cascade `:76`); [organization](../tenancy/organization.md) (`:65`).
- **joins:** [job-step](job-step.md) (the sweeper acts only on the pending step `:172-174`); `net._http_response` and `net.http_request_queue` (`:149`, `:296`, `:320`); [env](../config/env-config.md) (`JOB_DISPATCH`, `JOB_CONTINUE_SECRET`, `NEXT_PUBLIC_APP_URL`).
- **looks-like-but-is-not:** `ai_jobs.n8n_execution_id` (a planned n8n execution, `docs/product/ROADMAP.md:97-98`); the report page's 4 s poll (`auto-refresh.tsx:7-12`), which re-sends but never posts a token itself.

## If you change this

- **Hits:** the row the app inserts (`dispatch.ts:156`) against the constraints `job_dispatches.sql:67-69` and `databaseContinueUrl` `dispatch.ts:70-74`; the SQL copies of `retryable` (`dispatch.ts:77-79` vs `job_dispatches.sql:146`) and of `HANDOFF_ERROR` (`handoff.ts:9` vs `job_dispatches.sql:189`); `dispatch-health.ts` field names; the cron job names in `job_dispatches.sql:257` and `:283`.
- **Does not hit:** step bodies in `website-intel.ts`; the claim writes in `claims.ts` (a repeated post is harmless, `job_dispatches.sql:26`).

## Surfaces

| Surface | Role |
|---|---|
| Service client in `dispatch.ts` → [job-step-machine](../../processes/job-step-machine.md) | writes (insert, rpc) |
| Postgres trigger and cron → [job-recovery](../../processes/job-recovery.md) | posts; fails jobs; deletes |
| `POST /api/jobs/continue` | receives |
| `GET /api/health/integrations` | reads health |
| `/analysis/[id]` poll (`superviseJobs`) | rpc re-send |

## See

- Source: `supabase/migrations/20261017110000_job_dispatches.sql`
- As built: `docs/architecture/DATA_MODEL.md` (rows at `:110`, `:140-145`)

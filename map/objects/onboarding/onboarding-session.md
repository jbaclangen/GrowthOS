---
type: object
cluster: onboarding
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261010155911_onboarding_discovery.sql
---

# Onboarding session (`onboarding_sessions`)

One AI-assisted onboarding run per business profile: its status says which setup page comes next, and its two job links tie discovery to the evidence job and the plan job.

## Why this shape

Discovery runs alongside the website analysis, so the session must know both jobs and the plan may start only when the evidence job has succeeded and the owner has finished or skipped discovery (`web/src/lib/onboarding/orchestrate.ts:7-10`, D-028). The owner can leave and come back, so routing is by status (`web/src/lib/onboarding/steps.ts:1`). The connect step got no status of its own (`docs/decisions/DECISION_LOG.md:714-719`, D-054).

## Shape

- Columns: `business_profile_id`, `created_by`, `status`, `catalog_version`, `evidence_job_id`, `plan_job_id`, `completed_at`; unique (`id`, `organization_id`); composite FK to `business_profiles` — `supabase/migrations/20261010155911_onboarding_discovery.sql:7-27`.
- `status` check `discovering`/`reviewing`/`following_up`/`completed`/`skipped` — `supabase/migrations/20261010163029_onboarding_follow_ups.sql:4-6`.
- RLS "members all" — `supabase/migrations/20261010155911_onboarding_discovery.sql:59-60`; clients may insert only listed columns and update only `status`, `completed_at`; job links are server-only — `supabase/migrations/20261010155931_onboarding_sessions_column_grants.sql:3-6`.
- Lifecycle writers: `discovering` `web/src/lib/onboarding/start.ts:76-86` (then `evidence_job_id` with the admin client `:97-101`); `reviewing` `web/src/lib/onboarding/service.ts:102`; `following_up` `:152`; `completed` `:44-49`; `skipped` `:52-57`; `plan_job_id` claimed conditionally `web/src/lib/onboarding/orchestrate.ts:50-58`.
- Routing: `SessionStatus`, `OPEN_STATUSES`, `onboardingPath` — `web/src/lib/onboarding/steps.ts:3-26`; `followUpStep` picks connect or questions by pending count — `:31-37`.
- Plan gate: `web/src/lib/onboarding/orchestrate.ts:18-19,27`. A re-run with no session uses the latest `completed` one — `web/src/lib/pipeline/website-intel.ts:380-387`.

Citations: `supabase/migrations/20261010155911_onboarding_discovery.sql:7-27,59-60`; `supabase/migrations/20261010155931_onboarding_sessions_column_grants.sql:3-6`; `supabase/migrations/20261010163029_onboarding_follow_ups.sql:4-6`; `web/src/lib/onboarding/service.ts:44-57,102,152`; `web/src/lib/onboarding/orchestrate.ts:18-58`; `web/src/lib/onboarding/steps.ts:3-37`

## Connected to

- **owns:** [onboarding-response](onboarding-response.md), [onboarding-follow-up](onboarding-follow-up.md)
- **owned-by:** [organization](../tenancy/organization.md), [business-profile](business-profile.md)
- **joins:** [ai-job](../pipeline/ai-job.md) (`evidence_job_id`, `plan_job_id`); [discovery-catalog](discovery-catalog.md) (`catalog_version`); [connect-step](connect-step.md) (no status; lives inside `following_up`)
- **looks-like-but-is-not:** [ai-job](../pipeline/ai-job.md) — the analysis job has its own `status`; "analysis" on the dashboard is the job, not the session

## If you change this

- **Hits:** `onboardingPath`/`followUpStep` and every onboarding page's status gate; `startPlanIfReady`; the MCP tools' status strings `web/src/lib/mcp/tools.ts:83,89,289-290`; `loadDiscovery`; the dashboard resume (`web/src/app/dashboard/page.tsx:36-40`); `docs/architecture/DATA_MODEL.md`.
- **Does not hit:** [job-step](../pipeline/job-step.md) — the job's `output.step` state is separate from the session status.

## Surfaces

| Surface | Role |
|---|---|
| `startAnalysis` / MCP `braventa_start_onboarding` via `createOnboarding` | writes |
| `/onboarding/[sessionId]`, `/review`, `/connect`, `/questions` pages and actions | reads, writes `status` |
| `startPlanIfReady` (`web/src/lib/onboarding/orchestrate.ts:11`) | reads, writes `plan_job_id` |
| Scoring step `loadDiscovery` (`web/src/lib/pipeline/website-intel.ts:380-387`) | reads |
| Dashboard, report (`web/src/app/analysis/[id]/report-data.ts:113`), assistant context (`web/src/lib/assistant/context.ts:49`) | reads |
| MCP `braventa_get_status` (`web/src/lib/mcp/tools.ts:385-392`) | reads |

## See

- Source: `supabase/migrations/20261010155911_onboarding_discovery.sql`
- As built: `docs/product/MVP_SCOPE.md`

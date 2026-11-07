---
type: object
cluster: modules
universe: live
status: verified
verified: 2026-11-08
commit: 2dd74b3
entity: supabase/migrations/20261023063253_feature_modules.sql
---

# Module run (`module_runs`)

One row per feature module that ran in an analysis job, with its sub-score when the module is scored; written best-effort by the pipeline and read by nothing in the app yet.

## Why this shape

D-051 wanted a per-module record (what ran, with which rules version, on which evidence) separate from the blended growth score (`supabase/migrations/20261023063253_feature_modules.sql:12-13`, `docs/decisions/DECISION_LOG.md:664-668`); the per-module report sections that could read it are not built (`docs/architecture/FEATURE_MODULES.md:133`). Rows are a record, not an input: a failed insert is logged and the analysis continues (`web/src/lib/modules/server.ts:34-35`).

## Shape

- Columns: `job_id` (composite FK with the organization to `ai_jobs`, cascade), `module_id` domain, `audit_run_id` (composite FK to `audit_runs`, set null), `report_id`, `status` `completed`/`partial`, `sub_score` 0–100 or null, `rules_version` default 1, `details` jsonb; unique (`job_id`, `module_id`) — `supabase/migrations/20261023063253_feature_modules.sql:41-65`.
- RLS "members read"; client writes revoked — `supabase/migrations/20261023063253_feature_modules.sql:74-76`.
- `ModuleRun` type and `recordModuleRuns` — `web/src/lib/modules/server.ts:21-40`; `subScore` — `web/src/lib/modules/score.ts:156-159`.
- Writers, by step: profiling records `business_intel` and `website_seo` (partial without PageSpeed, `rules_version = AUDIT_VERSION`) — `web/src/lib/pipeline/website-intel.ts:334-356`; scoring records `conversion` and, when enabled, `search_visibility` (completed with a Search Console summary, partial without) and `analytics` (completed with a GA4 summary, partial without; `sub_score` null for a new property) — `:696-748` (`analytics` `:729-747`); writing records `content_studio` — `:873-885`. `reviseDiagnosis` (a correction) writes none.
- No reader in `web/src` (grep at this commit). "Based on N modules" on the report comes from `reports.data.score_modules`, not from this table — `web/src/app/analysis/[id]/report-data.ts:31-32`, `web/src/app/analysis/[id]/infographic.tsx:212`. The Search visibility bar on the score tile and in the Scores section, and `searchVisibility` in Ask Braventa's summary, read `reports.data.module_scores`, not `sub_score` here — `report-data.ts:33`, `infographic.tsx:171`, `web/src/app/analysis/[id]/report-sections.tsx:56`, `web/src/lib/assistant/context.ts:180`.

Citations: `supabase/migrations/20261023063253_feature_modules.sql:12-13,41-65,74-76`; `docs/decisions/DECISION_LOG.md:664-668`; `web/src/lib/modules/server.ts:21-40`; `web/src/lib/pipeline/website-intel.ts:334-356,696-748,873-885`; `web/src/app/analysis/[id]/report-data.ts:31-33`; `web/src/app/analysis/[id]/infographic.tsx:171,212`; `web/src/app/analysis/[id]/report-sections.tsx:56`; `web/src/lib/assistant/context.ts:180`

## Connected to

- **owns:** nothing
- **owned-by:** [organization](../tenancy/organization.md), [ai-job](../pipeline/ai-job.md)
- **joins:** [module-registry](module-registry.md) (`module_id`, `scoreWeight`); [audit-run](../pipeline/audit-run.md) (`audit_run_id` for website SEO); [report](../report/report.md) (`report_id` when one existed by then); [job-step](../pipeline/job-step.md) (one writer per step)
- **looks-like-but-is-not:** [organization-module](organization-module.md) — a setting, not a record; `reports.data.score_modules` — the list the report shows; `reports.data.module_scores` — the sub-scores the report and Ask Braventa show

## If you change this

- **Hits:** `recordModuleRuns` and the three step writers; the composite FKs to `ai_jobs` and `audit_runs`; `docs/architecture/DATA_MODEL.md:107`, `docs/architecture/FEATURE_MODULES.md` §5.
- **Does not hit:** the growth score or the report page — neither reads this table; `organization_modules`.

## Surfaces

| Surface | Role |
|---|---|
| Profiling step (`web/src/lib/pipeline/website-intel.ts:336`) | writes |
| Scoring step (`web/src/lib/pipeline/website-intel.ts:748`) | writes |
| Writing step (`web/src/lib/pipeline/website-intel.ts:874`) | writes |
| Report, dashboard, assistant, MCP | none |

## See

- Source: `supabase/migrations/20261023063253_feature_modules.sql`
- As built: `docs/architecture/FEATURE_MODULES.md`

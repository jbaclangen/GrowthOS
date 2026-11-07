---
type: object
cluster: report
universe: live
status: verified
verified: 2026-11-08
commit: 2dd74b3
entity: supabase/migrations/20261010061028_foundation.sql
---

# Growth assessment report (`reports`)

The stored snapshot of one scoring step: growth score, the evidence it used and the model's assessed scores. The app shows it as the infographic report.

## Why this shape

The score and its evidence are frozen per run in `data` (jsonb), so later rule or module changes are not read as the business improving: `web/src/lib/pipeline/website-intel.ts:665-669`, `web/src/lib/modules/score.ts:17-21`.

## Shape

- Table `supabase/migrations/20261010061028_foundation.sql:252-261`: `report_type` (comment lists three; only `growth_plan` is written, `website-intel.ts:659`), `title`, `summary`, `data` jsonb. RLS "members all" `foundation.sql:300-309`.
- Writer: the scoring step `website-intel.ts:655-692`. `data` keys `:662-689`: `business_profile_id`, `growth_score`, `score_version`, `score_modules`, `module_scores`, `scores`, `pagespeed`, `pagespeed_error`, `signals`, `pages`, `audit_run_id` `:675`, `search_console` (property, period, `fetched_at`, `little_data`, or null) `:676-680`, `google_analytics` (property, period, `fetched_at`, `new_property`, or null) `:681-684`, `discovery_priorities` `:685-688`.
- Readers: report loader by `data->>business_profile_id` `web/src/app/analysis/[id]/report-data.ts:97-103` (used at `:131`); from it the score tile `web/src/app/analysis/[id]/infographic.tsx:168-171` and the Scores section `web/src/app/analysis/[id]/report-sections.tsx:54-56` word the blend from the modules used (`scoreBlend`, `score.ts:201-215`) and add a Search visibility bar from `module_scores.search_visibility` only when that module counted (`infographic.tsx:185`, `report-sections.tsx:78`); Ask Braventa context `web/src/lib/assistant/context.ts:99-107` reads `scores`, `pagespeed`, `score_modules` (through `modulesUsed`) and `module_scores.search_visibility` `:152-159`, `:177-180`; the diagnosis update rebuilds evidence from `data` `website-intel.ts:564-586` (`signals` must be present `:579`); `modulesUsed` for reports without `score_modules` `score.ts:180-185`; the MCP status tool through the same loader, for `growth_score` and its note `web/src/lib/mcp/tools.ts:416`, `:446-448`.
- Linked from `diagnoses.report_id` (`supabase/migrations/20261010164133_diagnosis_and_plan.sql:9`) and `module_runs.report_id` (`supabase/migrations/20261023063253_feature_modules.sql:50`).

Citations: `supabase/migrations/20261010061028_foundation.sql:252-261`, `web/src/lib/pipeline/website-intel.ts:655-692`, `web/src/app/analysis/[id]/report-data.ts:97-103`.

## Connected to

- **owns:** nothing (the plan is in [growth-plan-item](growth-plan-item.md), not in `data`).
- **owned-by:** [organization](../tenancy/organization.md).
- **joins:** [business-profile](../onboarding/business-profile.md) by jsonb key only (`website-intel.ts:663`, no foreign key); [diagnosis](diagnosis.md) (`diagnosis_and_plan.sql:9`); [module-run](../modules/module-run.md) (`feature_modules.sql:50`); [audit-run](../pipeline/audit-run.md) (`data.audit_run_id`); [search-console-snapshot](../integrations/search-console-snapshot.md) (`data.search_console`, `website-intel.ts:678-680`); [analytics-snapshot](../integrations/analytics-snapshot.md) (`data.google_analytics`, `:682-684`); [growth-score](growth-score.md) (`data.growth_score`, `score_version`).
- **looks-like-but-is-not:** `reports.data.opportunities`, present only in reports from before 2026-10-11 (`docs/architecture/DATA_MODEL.md:97`); `business_profiles.growth_score`, the same number kept on the profile (`website-intel.ts:649-653`); the `reports.view` and `reports.export` permissions, which mean performance reports, not this table (`docs/architecture/ROLES_AND_PERMISSIONS.md:71-72`, `:75-76`).

## If you change this

- **Hits:** the insert `website-intel.ts:655-692`; the loader select and `ReportData` use in `report-data.ts:97-103`, `:131`; `reviseDiagnosis` `website-intel.ts:564-586`; `context.ts:99-107`, `:152-159`, `:177-180`; `modulesUsed` `score.ts:182-185` (the score tile, the Scores section, Ask Braventa and the MCP status note); the `module_scores.search_visibility` reads `infographic.tsx:171`, `report-sections.tsx:56`, `context.ts:180`; a new scored module needs a row in `scoreBlend`'s `BLEND` list `score.ts:205-210`, or the tile and Scores section leave it out of the blend wording (Analytics has one, `:209`, but no bar and no `module_scores.analytics` read); `docs/architecture/DATA_MODEL.md:97`.
- **Does not hit:** `diagnoses` rows (`report_id` is set null on delete, `diagnosis_and_plan.sql:9`); `content_calendars`, which the loader finds by its own jsonb key (`report-data.ts:104-110`).

## Surfaces

| Surface | Role |
|---|---|
| Scoring step → [score-and-diagnose](../../processes/score-and-diagnose.md) | writes |
| `/analysis/[id]` and `/dashboard` (`web/src/app/dashboard/page.tsx:59`) | reads |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) | reads |
| Diagnosis update → [revise-diagnosis](../../processes/revise-diagnosis.md) | reads |
| MCP `braventa_get_status` → [mcp-onboarding](../../processes/mcp-onboarding.md) | reads |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:95`)

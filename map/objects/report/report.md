---
type: object
cluster: report
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261010061028_foundation.sql
---

# Growth assessment report (`reports`)

The stored snapshot of one scoring step: growth score, the evidence it used and the model's assessed scores. The app shows it as the infographic report.

## Why this shape

The score and its evidence are frozen per run in `data` (jsonb), so later rule or module changes are not read as the business improving: `web/src/lib/pipeline/website-intel.ts:651-655`, `web/src/lib/modules/score.ts:16-19`.

## Shape

- Table `supabase/migrations/20261010061028_foundation.sql:252-261`: `report_type` (comment lists three; only `growth_plan` is written, `website-intel.ts:645`), `title`, `summary`, `data` jsonb. RLS "members all" `foundation.sql:300-309`.
- Writer: the scoring step `website-intel.ts:641-674`. `data` keys `:648-671`: `business_profile_id`, `growth_score`, `score_version`, `score_modules`, `module_scores`, `scores`, `pagespeed`, `pagespeed_error`, `signals`, `pages`, `audit_run_id` `:661`, `search_console` (property, period, `fetched_at`, `little_data`, or null) `:662-666`, `discovery_priorities` `:667-670`.
- Readers: report loader by `data->>business_profile_id` `web/src/app/analysis/[id]/report-data.ts:97-103` (used at `:131`); Ask Braventa context `web/src/lib/assistant/context.ts:97-105`; the diagnosis update rebuilds evidence from `data` `website-intel.ts:552-574` (`signals` must be present `:567`); `modulesUsed` for reports without `score_modules` `score.ts:142-147`.
- Linked from `diagnoses.report_id` (`supabase/migrations/20261010164133_diagnosis_and_plan.sql:9`) and `module_runs.report_id` (`supabase/migrations/20261023063253_feature_modules.sql:50`).

Citations: `supabase/migrations/20261010061028_foundation.sql:252-261`, `web/src/lib/pipeline/website-intel.ts:641-674`, `web/src/app/analysis/[id]/report-data.ts:97-103`.

## Connected to

- **owns:** nothing (the plan is in [growth-plan-item](growth-plan-item.md), not in `data`).
- **owned-by:** [organization](../tenancy/organization.md).
- **joins:** [business-profile](../onboarding/business-profile.md) by jsonb key only (`website-intel.ts:649`, no foreign key); [diagnosis](diagnosis.md) (`diagnosis_and_plan.sql:9`); [module-run](../modules/module-run.md) (`feature_modules.sql:50`); [audit-run](../pipeline/audit-run.md) (`data.audit_run_id`); [search-console-snapshot](../integrations/search-console-snapshot.md) (`data.search_console`, `website-intel.ts:664-666`); [growth-score](growth-score.md) (`data.growth_score`, `score_version`).
- **looks-like-but-is-not:** `reports.data.opportunities`, present only in reports from before 2026-10-11 (`docs/architecture/DATA_MODEL.md:90`); `business_profiles.growth_score`, the same number kept on the profile (`website-intel.ts:635-639`); the `reports.view` and `reports.export` permissions, which mean performance reports, not this table (`docs/architecture/ROLES_AND_PERMISSIONS.md:70-71`, `:74-75`).

## If you change this

- **Hits:** the insert `website-intel.ts:641-674`; the loader select and `ReportData` use in `report-data.ts:97-103`, `:131`; `reviseDiagnosis` `website-intel.ts:552-574`; `context.ts:97-105`; `modulesUsed` `score.ts:144-147`; `docs/architecture/DATA_MODEL.md:90`.
- **Does not hit:** `diagnoses` rows (`report_id` is set null on delete, `diagnosis_and_plan.sql:9`); `content_calendars`, which the loader finds by its own jsonb key (`report-data.ts:104-110`).

## Surfaces

| Surface | Role |
|---|---|
| Scoring step → [score-and-diagnose](../../processes/score-and-diagnose.md) | writes |
| `/analysis/[id]` and `/dashboard` (`web/src/app/dashboard/page.tsx:59`) | reads |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) | reads |
| Diagnosis update → [revise-diagnosis](../../processes/revise-diagnosis.md) | reads |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:90`)

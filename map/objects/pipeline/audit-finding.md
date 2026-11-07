---
type: object
cluster: pipeline
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
entity: supabase/migrations/20261011160802_website_audit.sql
---

# Technical check result (`audit_findings`)

One deterministic rule result of a website audit, with the short ref (`T1`, `T2`, …) the diagnosis cites.

## Why this shape

Findings are produced by code, not a model, so each carries its rule, observed value and source; a diagnosis finding becomes "Verified" only by citing one: `supabase/migrations/20261011160802_website_audit.sql:35-57`, `:70-73`.

## Shape

- Table `supabase/migrations/20261011160802_website_audit.sql:35-59`: `ref` ≤ 16 `:39-40`; `page_url` null means site-wide `:41`; `rule_id` `:42`; `category` (five values) `:43`; `severity`, `confidence` `:44-45`; `priority_label` (`fix_first`, `improve_next`, `monitor`) `:46`; `observed` jsonb `:48`; `source_type` `:50`; `status` (`detected`, `resolved`, `dismissed`) `:52`; `unique (audit_run_id, ref)` `:54`; composite FK `:55-56`.
- RLS "members read" `:65`; client writes revoked `:68`.
- Produced by `runChecks` `web/src/lib/audit/checks.ts:910-911`; inserted at `web/src/lib/pipeline/website-intel.ts:177-179` through `toFindingRow` `:187-204`, which sets no `status`, so every row keeps the default `detected`. `resolved` and `dismissed` are leftover: nothing sets them (`docs/architecture/DATA_MODEL.md:96`).
- Cited by the diagnosis: `diagnosis_findings.audit_refs` `:72-73`, `:77`; the citable set `web/src/lib/pipeline/prompts.ts:134-150` (`T` refs `:147`); uncited findings are downgraded in `toFindings` `web/src/lib/plan/priority.ts:105`.
- Readers: `web/src/app/analysis/[id]/report-data.ts:179-184`; `loadAuditContext` `website-intel.ts:211-215`, sorted by ref `:219`.
- Module mapping by `category`: `web/src/lib/modules/registry.ts:79`.

Citations: `supabase/migrations/20261011160802_website_audit.sql:35-59`, `:65-68`, `:72-77`, `web/src/lib/pipeline/website-intel.ts:177-204`, `web/src/lib/pipeline/prompts.ts:135-150`.

## Connected to

- **owns:** nothing.
- **owned-by:** [audit-run](audit-run.md) (`:55-56`).
- **joins:** [diagnosis-finding](../report/diagnosis-finding.md) by ref text in `audit_refs` (no foreign key); [module](../modules/module-registry.md) through `findingCategories` (`registry.ts:79`).
- **looks-like-but-is-not:** [diagnosis-finding](../report/diagnosis-finding.md), the model's finding that cites this one; `growth_plan_items.finding_positions`, which point at diagnosis findings (`supabase/migrations/20261010164133_diagnosis_and_plan.sql:61-62`).

## If you change this

- **Hits:** the rules and `AUDIT_VERSION` in `checks.ts`; `toFindingRow` `website-intel.ts:187-204`; the select at `report-data.ts:182`; `promptFindings` / `loadAuditContext` (`website-intel.ts:211-226`); the category list in `registry.ts:79`.
- **Does not hit:** stored `diagnosis_findings` rows (refs are text); the growth score (`web/src/lib/modules/score.ts:97-108` scores PageSpeed and assessed scores, not findings).

## Surfaces

| Surface | Role |
|---|---|
| Crawling step → [crawl-and-profile](../../processes/crawl-and-profile.md) | writes |
| `/analysis/[id]` technical checks dialog | reads |
| Scoring and diagnosis update → [score-and-diagnose](../../processes/score-and-diagnose.md), [revise-diagnosis](../../processes/revise-diagnosis.md) | reads (as prompt refs) |

## See

- Source: `supabase/migrations/20261011160802_website_audit.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:96`)

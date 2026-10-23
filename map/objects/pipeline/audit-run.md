---
type: object
cluster: pipeline
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261011160802_website_audit.sql
---

# Website audit (`audit_runs`)

One technical audit of a website per crawling step: crawl coverage, PageSpeed mobile and desktop, and the rule version that produced its findings. The report calls it "technical checks".

## Why this shape

The diagnosis must cite stored observations, so "Verified" can mean "matched to a measurement", and runs under different rule versions must not be compared: `supabase/migrations/20261011160802_website_audit.sql:1-4`, `:14`, `:70-71`.

## Shape

- Table `supabase/migrations/20261011160802_website_audit.sql:6-33`: `status` (`queued`, `running`, `completed`, `partial`, `failed`) `:13`; `audit_version` `:15`; `pages_discovered`, `pages_scanned` `:16-17`; `coverage` `:20`, `pagespeed` `:22`, `error_summary` `:23`; `unique (id, organization_id)` `:27`; composite FK to `business_profiles` `:28-29`.
- RLS "members read" `:64`; client writes revoked `:68`.
- Writer `runAudit` `web/src/lib/pipeline/website-intel.ts:109-185`: insert as `running` `:113-125`; `failed` when the crawl throws `:133-147`; `completed` or `partial` `:163-176` (partial rule `:152-157`). Storage is best effort `:110`, `:126`.
- Inputs: `crawlSite` `web/src/lib/integrations/crawler.ts:413-416` (`MAX_PAGES` 25 `:86`, time budget `:89`); `pageSpeedReport` `web/src/lib/integrations/google.ts:144-150`; `runChecks` `web/src/lib/audit/checks.ts:910-911`; `AUDIT_VERSION` `:12-13`.
- Readers: report loader `web/src/app/analysis/[id]/report-data.ts:171-178` through `reports.data.audit_run_id` `:131` (row type `:51-60`); `loadAuditContext` for the diagnosis update `website-intel.ts:206-228`.
- `module_runs.audit_run_id` and `rules_version` carry the run and `AUDIT_VERSION`: `supabase/migrations/20261023063253_feature_modules.sql:47-48`, `:57-59`, `:64`; written at `website-intel.ts:349-350`.

Citations: `supabase/migrations/20261011160802_website_audit.sql:6-33`, `:64-68`, `web/src/lib/pipeline/website-intel.ts:109-185`, `web/src/lib/integrations/crawler.ts:86`, `web/src/lib/audit/checks.ts:13`.

## Connected to

- **owns:** [audit-finding](audit-finding.md) (cascade `:55-56`).
- **owned-by:** [business-profile](../onboarding/business-profile.md) (`:28-29`); [organization](../tenancy/organization.md).
- **joins:** [ai-job](ai-job.md) `job_id` (`:11`); [report](../report/report.md) through `data.audit_run_id` (`website-intel.ts:661`); [module-run](../modules/module-run.md) (`feature_modules.sql:64`); [knowledge-document](knowledge-document.md) (same crawl, stored as page text `website-intel.ts:260-273`).
- **looks-like-but-is-not:** `reports.report_type = 'website_audit'`, named in a comment (`foundation.sql:255`) but never written (only `growth_plan`, `website-intel.ts:645`).

## If you change this

- **Hits:** `runAudit` writes; `AuditRunRow` and the select in `report-data.ts:51-60`, `:173-177`; `loadAuditContext`; `module_runs` composite FK (`feature_modules.sql:64`); the `AUDIT_VERSION` bump rule (`checks.ts:12`, `website_audit.sql:14`).
- **Does not hit:** the growth score, which reads PageSpeed from the step's in-memory evidence (`website-intel.ts:258`, `:629`), not from this table; `knowledge_documents`.

## Surfaces

| Surface | Role |
|---|---|
| Crawling step → [crawl-and-profile](../../processes/crawl-and-profile.md) | writes |
| `/analysis/[id]` technical checks dialog | reads |
| Diagnosis update → [revise-diagnosis](../../processes/revise-diagnosis.md) | reads |
| Supabase dashboard (human) | reads |

## See

- Source: `supabase/migrations/20261011160802_website_audit.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:91`)

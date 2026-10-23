---
type: object
cluster: report
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261010061028_foundation.sql
---

# Content status (`content_status`)

The Postgres enum on `content_items.status`: eight values, of which the code sets four.

## Why this shape

The enum was cut for a full brief → draft → QA → approval → schedule → publish lifecycle before the MVP narrowed to drafts and approval, so half of it is reserved: `supabase/migrations/20261010061028_foundation.sql:177-178`, `docs/architecture/DATA_MODEL.md:56`.

## Shape

- Enum `supabase/migrations/20261010061028_foundation.sql:177-178`: `brief`, `draft`, `in_qa`, `needs_approval`, `approved`, `scheduled`, `published`, `rejected`. Column default `brief` `:192`.
- Set in code: `brief` `web/src/lib/pipeline/website-intel.ts:776`; `needs_approval` `:830`; `approved`, `rejected`, `needs_approval` `web/src/app/analysis/actions.ts:98`.
- The guard trigger allows `authenticated` inserts as `brief` or `draft` and moves only among `needs_approval`, `approved`, `rejected`; `scheduled` and `published` are named as blocked: `supabase/migrations/20261010121043_content_approval_guard.sql:8-13`, `:25-38`.
- Labels exist for four values only: `web/src/app/analysis/[id]/report-sections.tsx:299-304`; tones `:307-310`.
- Leftover, never set anywhere in `web/src`: `draft`, `in_qa`, `scheduled`, `published` (`docs/architecture/DATA_MODEL.md:56`, `docs/product/MVP_SCOPE.md:82-83`). Their planned uses are ghost: a QA gate (CS-9) `docs/product/ROADMAP.md:75`; the planner, scheduler and publishing (CS-12) `docs/product/ROADMAP.md:84-89`.

Citations: `supabase/migrations/20261010061028_foundation.sql:177-178`, `supabase/migrations/20261010121043_content_approval_guard.sql:25-38`, `web/src/app/analysis/actions.ts:98`, `web/src/lib/pipeline/website-intel.ts:776`, `:830`.

## Connected to

- **owns:** nothing.
- **owned-by:** [content-item](content-item.md) (`foundation.sql:192`).
- **joins:** the guard trigger (`content_approval_guard.sql:15-61`).
- **looks-like-but-is-not:** `growth_plan_items.status`, `diagnoses.status`, `audit_findings.status`, `audit_runs.status`, all text check constraints, not this enum; `job_status` (`foundation.sql:220`).

## If you change this

- **Hits:** the trigger's value lists (`content_approval_guard.sql:26`, `:35-36`); the `setContentStatus` union (`actions.ts:98`) and `ContentActions` (`web/src/app/analysis/[id]/controls.tsx:35-37`); `STATUS_LABEL` / `STATUS_TONE`; `docs/architecture/DATA_MODEL.md:56`.
- **Does not hit:** `content_calendars`; `job_status`.

## Surfaces

| Surface | Role |
|---|---|
| Pipeline → [plan-and-write](../../processes/plan-and-write.md) | writes `brief`, `needs_approval` |
| `/analysis/[id]` → [approve-content](../../processes/approve-content.md) | writes `approved`, `rejected`, `needs_approval` |
| Postgres guard trigger | enforces |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:56`)

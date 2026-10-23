---
type: object
cluster: report
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261010061028_foundation.sql
---

# Draft post (`content_items`)

One dated piece of the 30-day plan; the first five are drafted and wait for the owner's approval. The app calls them drafts or posts.

## Why this shape

Human approval is the default before anything is published for a client (D-013), so the row carries its status and approver, and a trigger stops clients from setting anything but the review statuses: `supabase/migrations/20261010121043_content_approval_guard.sql:1-13`, `web/src/lib/pipeline/website-intel.ts:786`.

## Shape

- Table `supabase/migrations/20261010061028_foundation.sql:180-199`: `calendar_id`, `campaign_id` `:183-184`; `channel`, `content_type` (comments `:185-186`); `scheduled_for` `:187`; `title`, `brief`, `body` `:188-190`; `qa_notes` jsonb `:191`; `status content_status` default `brief` `:192`; `approved_by`, `approved_at` `:193-194`. RLS "members all" `:300-309`; `touch_updated_at` `:337`.
- Guard trigger `guard_content_item_write`, BEFORE INSERT OR UPDATE `supabase/migrations/20261010121043_content_approval_guard.sql:59-61`: `authenticated` only `:21-23`; inserts `brief` or `draft` `:25-31`; moves only among `needs_approval`, `approved`, `rejected` `:34-38`; approver derived from `auth.uid()` `:40-51`.
- Set in code: `brief` by the planning step `website-intel.ts:767-779` (`scheduled_for` from `dayDate` `:724-730`); `needs_approval` with `body` and `qa_notes` by the writing step `:814-834` (only the first five, `:781-783`; `highRisk` for regulated businesses `:808`); `approved`, `rejected` or back to `needs_approval` by `setContentStatus` `web/src/app/analysis/actions.ts:98-111` (it sends `approved_by` / `approved_at` `:105-106`, which the trigger overrides).
- UI: `ContentActions` `web/src/app/analysis/[id]/controls.tsx:33-52`; labels `web/src/app/analysis/[id]/report-sections.tsx:299-304`; loader select `web/src/app/analysis/[id]/report-data.ts:134-140`.
- Module: Content studio `web/src/lib/modules/registry.ts:96-107`; `module_runs` `website-intel.ts:837-848`.

Citations: `supabase/migrations/20261010061028_foundation.sql:180-199`, `supabase/migrations/20261010121043_content_approval_guard.sql:15-61`, `web/src/lib/pipeline/website-intel.ts:767-834`, `web/src/app/analysis/actions.ts:98-111`.

## Connected to

- **owns:** nothing.
- **owned-by:** [content-calendar](content-calendar.md) (`:183`); [organization](../tenancy/organization.md).
- **joins:** [content-status](content-status.md) (the enum); [campaign](campaign.md) (`:184`, ghost); [ai-worker](../pipeline/ai-worker.md) `content_writer` (`website-intel.ts:806`).
- **looks-like-but-is-not:** [growth-plan-item](growth-plan-item.md); publishing or scheduling, which do not exist (`docs/product/ROADMAP.md:84-89`).

## If you change this

- **Hits:** both pipeline writes (`:767-779`, `:820-833`); the guard trigger; `setContentStatus`; `ContentActions`; `STATUS_LABEL` / `STATUS_TONE` (`report-sections.tsx:299-310`); the loader select `report-data.ts:137`; `contentSchema` (`website-intel.ts:811`).
- **Does not hit:** `content_calendars` rows; the planning prompt; the diagnosis.

## Surfaces

| Surface | Role |
|---|---|
| Planning and writing steps → [plan-and-write](../../processes/plan-and-write.md) | writes |
| `/analysis/[id]` drafts → [approve-content](../../processes/approve-content.md) | reads; owner approves, rejects, undoes |
| Postgres guard trigger | enforces |
| MCP | none (no approval tool) |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:80`)

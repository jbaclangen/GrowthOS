---
type: object
cluster: report
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
entity: supabase/migrations/20261010061028_foundation.sql
---

# Draft post (`content_items`)

One dated piece of the 30-day plan; the first five are drafted and wait for approval. The app calls them drafts or posts.

## Why this shape

Human approval is the default before anything is published for a client (D-013), so the row carries its status, approver and author, and a trigger stops clients from setting anything but the review statuses and, since D-046, applies who may approve: `supabase/migrations/20261010121043_content_approval_guard.sql:1-13`, `supabase/migrations/20261023092945_roles_and_permissions.sql:10-12`, `web/src/lib/pipeline/website-intel.ts:823`.

## Shape

- Table `supabase/migrations/20261010061028_foundation.sql:180-199`: `calendar_id`, `campaign_id` `:183-184`; `channel`, `content_type` (comments `:185-186`); `scheduled_for` `:187`; `title`, `brief`, `body` `:188-190`; `qa_notes` jsonb `:191`; `status content_status` default `brief` `:192`; `approved_by`, `approved_at` `:193-194`; `approved_by` becomes null when its user is deleted, indexed (`supabase/migrations/20261107224152_user_deletion_foreign_keys.sql:23-26,33`, Q-056). RLS "members all" `supabase/migrations/20261010061028_foundation.sql:300-309`; `touch_updated_at` `:337`. `created_by` (author, null for pipeline drafts) `supabase/migrations/20261023092945_roles_and_permissions.sql:63-66`.
- Guard trigger `guard_content_item_write`, BEFORE INSERT OR UPDATE `supabase/migrations/20261010121043_content_approval_guard.sql:59-61`. The function in force is `supabase/migrations/20261023224450_content_guard_pins_organization.sql:12-72` (replaced `20261023092945_roles_and_permissions.sql:69-124`, which replaced `20261010121043_content_approval_guard.sql:15-55`): `authenticated` only `supabase/migrations/20261023224450_content_guard_pins_organization.sql:18-20`; inserts `brief` or `draft` and sets `created_by` `:22-30`; author kept on update `:33`; `organization_id` pinned `:35-38`; moves only among `needs_approval`, `approved`, `rejected` `:40-44`; `content.approve` / `content.approve_own` via `has_permission` `:46-55`; approver derived from `auth.uid()` `:57-68`.
- Set in code: `brief` by the planning step `website-intel.ts:804-815` (`scheduled_for` from `dayDate` `:762-767`); `needs_approval` with `body` and `qa_notes` by the writing step `:851-871` (only the first five, `:818-820`; `highRisk` for regulated businesses `:845`); `approved`, `rejected` or back to `needs_approval` by `setContentStatus` `web/src/app/analysis/actions.ts:128-152`, which checks `approvalAllowed` first (`:133-139`, `web/src/lib/team/roles.ts:150-160`) and sends `approved_by` / `approved_at` `:145-146`, which the trigger overrides.
- UI: `ContentActions` `web/src/app/analysis/[id]/controls.tsx:33-65` (shows the action's refusal `:58-62`); labels `web/src/app/analysis/[id]/report-sections.tsx:305-310`; loader select `web/src/app/analysis/[id]/report-data.ts:134-140`.
- Module: Content studio `web/src/lib/modules/registry.ts:97-108`; `module_runs` `website-intel.ts:874-885`.

Citations: `supabase/migrations/20261010061028_foundation.sql:180-199`, `supabase/migrations/20261010121043_content_approval_guard.sql:1-13,59-61`, `supabase/migrations/20261023092945_roles_and_permissions.sql:10-12,63-66,69-124`, `supabase/migrations/20261023224450_content_guard_pins_organization.sql:12-72`, `supabase/migrations/20261107224152_user_deletion_foreign_keys.sql:23-26,33`, `web/src/lib/pipeline/website-intel.ts:804-871`, `web/src/app/analysis/actions.ts:128-152`, `web/src/lib/team/roles.ts:150-160`.

## Connected to

- **owns:** nothing.
- **owned-by:** [content-calendar](content-calendar.md) (`supabase/migrations/20261010061028_foundation.sql:183`); [organization](../tenancy/organization.md).
- **joins:** [content-status](content-status.md) (the enum); [campaign](campaign.md) (`supabase/migrations/20261010061028_foundation.sql:184`, ghost); [ai-worker](../pipeline/ai-worker.md) `content_writer` (`website-intel.ts:843`); [member-role](../tenancy/member-role.md) (`content.approve`, `content.approve_own`).
- **looks-like-but-is-not:** [growth-plan-item](growth-plan-item.md); publishing or scheduling, which do not exist (`docs/product/ROADMAP.md:90-96`).

## If you change this

- **Hits:** both pipeline writes (`website-intel.ts:804-815`, `:857-870`); the guard trigger; `setContentStatus` and `approvalAllowed`; `ContentActions`; `STATUS_LABEL` / `STATUS_TONE` (`report-sections.tsx:305-317`); the loader select `report-data.ts:137`; `contentSchema` (`website-intel.ts:848`).
- **Does not hit:** `content_calendars` rows; the planning prompt; the diagnosis.

## Surfaces

| Surface | Role |
|---|---|
| Planning and writing steps → [plan-and-write](../../processes/plan-and-write.md) | writes |
| `/analysis/[id]` drafts → [approve-content](../../processes/approve-content.md) | reads; a member with `content.approve` approves, rejects, undoes |
| Postgres guard trigger | enforces |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) | reads counts by status and draft titles (`web/src/lib/assistant/context.ts:148-155`, `:201-202`) |
| MCP | none (no approval tool) |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: the row at `docs/architecture/DATA_MODEL.md:94`; approval rule `docs/architecture/ROLES_AND_PERMISSIONS.md:120-137` (§4)

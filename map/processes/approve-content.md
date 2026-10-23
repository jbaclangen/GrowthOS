---
type: process
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
consumes: ["[[content-item]]", "[[content-status]]", "[[membership]]", "[[member-role]]"]
produces: ["[[content-item]]"]
---

# Approve content (`setContentStatus` + `guard_content_item_write`)

Lets a member whose role holds `content.approve` approve or reject each drafted post, with a trigger that applies the same permission rule and keeps clients from setting any status the app does not offer.

## Input → Movement → Output

A draft sits at `needs_approval`. A member clicks Approve, Reject or Undo on the report; `setContentStatus` checks the role with `approvalAllowed`, then updates `status` with the user's client. The `guard_content_item_write` trigger allows `authenticated` only to insert `brief`/`draft`, to move among `needs_approval`, `approved`, `rejected` with the approval permissions, and never to move an item to another business; it derives `created_by`, `approved_by` and `approved_at` itself. The item ends `approved` or `rejected`; nothing schedules or publishes it.

## Why this shape

The "members all" policy would otherwise let any member set `published`, name someone else as approver or move a draft past the permission check through the Data API; the trigger closes that regardless of app code (D-018 in the migration header; the organization pin `supabase/migrations/20261023224450_content_guard_pins_organization.sql:1-8`). Approval is a human decision by default (D-013, `docs/decisions/DECISION_LOG.md:140-143`), and no one approves their own work except the owner (D-046, `docs/decisions/DECISION_LOG.md:570-582`; as built `docs/architecture/ROLES_AND_PERMISSIONS.md:113-130`). The app still sends `approved_by`/`approved_at` (`web/src/app/analysis/actions.ts:129-130`), but the trigger overwrites them; that redundancy is a known docs-vs-code note, not a second source of truth.

## Steps

1. Report buttons: Approve / Reject, or Undo when already decided, plus the refusal message — `web/src/app/analysis/[id]/controls.tsx:33-65` (`:36-40` calls `setContentStatus`, error `:58-62`).
2. `setContentStatus` reads the item's `organization_id` and `created_by` — `web/src/app/analysis/actions.ts:115`; checks the role with `memberRole` and `approvalAllowed` — `:117-123` (`web/src/lib/team/server.ts:8-16`, `web/src/lib/team/roles.ts:125-138`); updates `status`, `approved_by`, `approved_at` by item id — `web/src/app/analysis/actions.ts:125-135`.
3. Trigger fires `BEFORE INSERT OR UPDATE` on `content_items` — `supabase/migrations/20261010121043_content_approval_guard.sql:59-61`; execute revoked from clients — `:57`. The function in force is the latest replacement — `supabase/migrations/20261023224450_content_guard_pins_organization.sql:12-72` (it replaced `supabase/migrations/20261023092945_roles_and_permissions.sql:69-124`).
4. Rule: non-`authenticated` roles pass through — `supabase/migrations/20261023224450_content_guard_pins_organization.sql:18-20`.
5. Rule: inserts must start `brief` or `draft`, author from `auth.uid()`, approver cleared — `supabase/migrations/20261023224450_content_guard_pins_organization.sql:22-30`; the author is kept on updates — `:32-33` (column `supabase/migrations/20261023092945_roles_and_permissions.sql:63-66`).
6. Rule: `organization_id` never changes from a client — `supabase/migrations/20261023224450_content_guard_pins_organization.sql:35-38`.
7. Rule: status moves only among `needs_approval`/`approved`/`rejected` — `supabase/migrations/20261023224450_content_guard_pins_organization.sql:40-44`.
8. Rule: any status change needs `content.approve`; approving one's own draft needs `content.approve_own` — `supabase/migrations/20261023224450_content_guard_pins_organization.sql:46-55` (`has_permission` `supabase/migrations/20261023092945_roles_and_permissions.sql:30-60`).
9. Rule: `approved_by`/`approved_at` from `auth.uid()`/`now()` on becoming approved, kept while approved, cleared otherwise — `supabase/migrations/20261023224450_content_guard_pins_organization.sql:57-68`.
10. The enum has `scheduled` and `published` — `supabase/migrations/20261010061028_foundation.sql:177-178` — but no code path sets them; drafts arrive at `needs_approval` from the pipeline, with no author — `web/src/lib/pipeline/website-intel.ts:830`.
11. Ghost: scheduling and publishing are roadmap item 9 (Outstand behind a `Publisher`, in-app scheduler) — `docs/product/ROADMAP.md:86-91`. Nothing in the repo publishes.

## Human gate

A member whose role holds `content.approve` approves or rejects each draft (step 1; roles in [member-role](../objects/tenancy/member-role.md), matrix `web/src/lib/team/roles.ts:96-98`). This is the gate D-013 names.

## If you change this

- **Hits:** the status labels on the report (`report-sections.tsx`), the writing step (sets `needs_approval`, must stay an allowed source status), any future publisher (must run as `service_role` or extend the trigger's allowed moves); the approval rule lives twice, `approvalAllowed` and the trigger, and the matrix twice, `roles.ts` and `has_permission` (kept equal by `web/src/lib/team/migration.test.ts`).
- **Does not hit:** `content_calendars` (no trigger, no status); `growth_plan_items` status (separate grants and `plan_items.update_any`, [confirm-diagnosis-and-plan](confirm-diagnosis-and-plan.md)). The plausible wrong neighbour is `setPlanItemStatus` (`web/src/app/analysis/plan-actions.ts:152`): same verb, different table and guard.

## Surfaces

| Surface | Role |
|---|---|
| `/analysis/[id]` drafts | Approve / Reject / Undo |
| `setContentStatus` | Role check, then status update via the user's client |
| `guard_content_item_write` trigger | Allowed inserts, moves and approvers for clients |

## See

- Objects: [content-item](../objects/report/content-item.md), [content-status](../objects/report/content-status.md), [content-calendar](../objects/report/content-calendar.md), [membership](../objects/tenancy/membership.md), [member-role](../objects/tenancy/member-role.md)
- Processes: [plan-and-write](plan-and-write.md)
- Source: `web/src/app/analysis/actions.ts`, `web/src/app/analysis/[id]/controls.tsx`, `web/src/lib/team/roles.ts`, `supabase/migrations/20261010121043_content_approval_guard.sql`, `supabase/migrations/20261023092945_roles_and_permissions.sql`, `supabase/migrations/20261023224450_content_guard_pins_organization.sql`
- As built: `docs/architecture/ROLES_AND_PERMISSIONS.md` (§4 `:113-130`)

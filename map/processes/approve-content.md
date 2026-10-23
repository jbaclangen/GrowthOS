---
type: process
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
consumes: ["[[content-item]]", "[[content-status]]", "[[membership]]"]
produces: ["[[content-item]]"]
---

# Approve content (`setContentStatus` + `guard_content_item_write`)

Lets the owner approve or reject each drafted post, with a trigger that keeps clients from setting any status the app does not offer.

## Input → Movement → Output

A draft sits at `needs_approval`. The owner clicks Approve, Reject or Undo on the report; `setContentStatus` updates `status` with the user's client. The `guard_content_item_write` trigger allows `authenticated` only to insert `brief`/`draft` and to move among `needs_approval`, `approved`, `rejected`, and derives `approved_by`/`approved_at` itself. The item ends `approved` or `rejected`; nothing schedules or publishes it.

## Why this shape

The "members all" policy would otherwise let any member set `published` or name someone else as approver through the Data API; the trigger closes that regardless of app code (D-018 in the migration header). Approval is a human decision by default (D-013, `docs/decisions/DECISION_LOG.md:139-142`). The app still sends `approved_by`/`approved_at`, but the trigger overwrites them; that redundancy is a known docs-vs-code note, not a second source of truth.

## Steps

1. Report buttons: Approve / Reject, or Undo when already decided — `web/src/app/analysis/[id]/controls.tsx:33-54` (`:35` binds `setContentStatus`).
2. `setContentStatus` updates `status`, `approved_by`, `approved_at` by item id — `web/src/app/analysis/actions.ts:98-111`.
3. Trigger fires `BEFORE INSERT OR UPDATE` on `content_items` — `supabase/migrations/20261010121043_content_approval_guard.sql:59-61`; execute revoked from clients — `:57`.
4. Rule: non-`authenticated` roles pass through — `supabase/migrations/20261010121043_content_approval_guard.sql:21-23`.
5. Rule: inserts must start `brief` or `draft`, approver cleared — `supabase/migrations/20261010121043_content_approval_guard.sql:25-31`.
6. Rule: status moves only among `needs_approval`/`approved`/`rejected` — `supabase/migrations/20261010121043_content_approval_guard.sql:34-38`.
7. Rule: `approved_by`/`approved_at` from `auth.uid()`/`now()` on becoming approved, kept while approved, cleared otherwise — `supabase/migrations/20261010121043_content_approval_guard.sql:40-51`.
8. The enum has `scheduled` and `published` — `supabase/migrations/20261010061028_foundation.sql:177-178` — but no code path sets them; drafts arrive at `needs_approval` from the pipeline — `web/src/lib/pipeline/website-intel.ts:830`.
9. Ghost: scheduling and publishing are roadmap item 9 (Outstand behind a `Publisher`, in-app scheduler) — `docs/product/ROADMAP.md:84-89`. Nothing in the repo publishes.

## Human gate

The owner approves or rejects each draft (step 1). This is the gate D-013 names.

## If you change this

- **Hits:** the status labels on the report (`report-sections.tsx`), the writing step (sets `needs_approval`, must stay an allowed source status), any future publisher (must run as `service_role` or extend the trigger's allowed moves).
- **Does not hit:** `content_calendars` (no trigger, no status); `growth_plan_items` status (separate grants, [confirm-diagnosis-and-plan](confirm-diagnosis-and-plan.md)). The plausible wrong neighbour is `setPlanItemStatus`: same verb, different table and guard.

## Surfaces

| Surface | Role |
|---|---|
| `/analysis/[id]` drafts | Approve / Reject / Undo |
| `setContentStatus` | Status update via the user's client |
| `guard_content_item_write` trigger | Allowed inserts and moves for clients |

## See

- Objects: [content-item](../objects/report/content-item.md), [content-status](../objects/report/content-status.md), [content-calendar](../objects/report/content-calendar.md), [membership](../objects/tenancy/membership.md)
- Processes: [plan-and-write](plan-and-write.md)
- Source: `web/src/app/analysis/actions.ts`, `web/src/app/analysis/[id]/controls.tsx`, `supabase/migrations/20261010121043_content_approval_guard.sql`

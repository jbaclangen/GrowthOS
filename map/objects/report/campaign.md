---
type: object
cluster: report
universe: ghost
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261010061028_foundation.sql
---

# Campaign (`campaigns`)

A grouping of calendars and content items by objective and date range. The table and its foreign keys exist; nothing in the app writes or reads it.

## Why this shape

The foundation schema's "content engine" planned campaigns above calendars; the MVP shipped the 30-day plan without them: `supabase/migrations/20261010061028_foundation.sql:150-163`, `docs/product/MVP_SCOPE.md:81`.

## Shape

- Table `supabase/migrations/20261010061028_foundation.sql:153-163`: `name`, `objective`, `status` text with a comment listing `planned | active | complete` `:158`, `starts_on`, `ends_on`. RLS "members all" `:300-309`.
- Referenced by `content_calendars.campaign_id` `:168` and `content_items.campaign_id` `:184` (set null on delete); indexes `supabase/migrations/20261010061126_advisor_fixes.sql:21-22`. Neither writer sets the column (`web/src/lib/pipeline/website-intel.ts:754-762`, `:767-777`).
- No reference to `campaigns` or `campaign_id` anywhere in `web/src`.
- Related leftover: the `campaign_planner` worker is defined and never called (`web/src/lib/ai/router.ts:47`).
- Planned use: campaign planning (MS-7, CS-11) is "Later" `docs/product/ROADMAP.md:118`.

Citations: `supabase/migrations/20261010061028_foundation.sql:153-163`, `:168`, `:184`, `docs/product/MVP_SCOPE.md:81`, `docs/product/ROADMAP.md:118`.

## Connected to

- **owns:** [content-calendar](content-calendar.md) and [content-item](content-item.md) through nullable foreign keys that are never set.
- **owned-by:** [organization](../tenancy/organization.md).
- **joins:** nothing live.
- **looks-like-but-is-not:** [content-calendar](content-calendar.md), the live 30-day plan; `ai_jobs.task_class`, unrelated despite the `campaign_planner` worker name.

## If you change this

- **Hits:** the two foreign keys `foundation.sql:168`, `:184` and their indexes.
- **Does not hit:** anything in `web/src`.

## Surfaces

| Surface | Role |
|---|---|
| none | none |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/product/MVP_SCOPE.md` (`:81`)

---
type: object
cluster: report
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261010061028_foundation.sql
---

# 30-day plan (`content_calendars`)

The content strategy and date range the planning step writes for a business; its dated items are content items.

## Why this shape

The calendar is the parent of the dated posts and carries the strategy (goal, audience, pillars, channels) as jsonb, with the business linked through that jsonb rather than a column: `supabase/migrations/20261010061028_foundation.sql:165-175`, `web/src/lib/pipeline/website-intel.ts:759`.

## Shape

- Table `supabase/migrations/20261010061028_foundation.sql:165-175`: `campaign_id` nullable `:168` (never set), `title`, `strategy` jsonb `:170`, `starts_on` `:171`, `days` default 30 `:172`. RLS "members all" `:300-309`; campaign index `supabase/migrations/20261010061126_advisor_fixes.sql:22`.
- Writer: `planStep` `web/src/lib/pipeline/website-intel.ts:732-765` (start is tomorrow UTC `:750-752`; `strategy.business_profile_id` `:759`; `days: 30` `:761`); its items follow `:767-779`; the first five become the writing batch `:781-783`.
- Readers: report loader by `strategy->>business_profile_id` `web/src/app/analysis/[id]/report-data.ts:104-110`; Ask Braventa `web/src/lib/assistant/context.ts:113-120`; the writing step looks items up by `calendar_id` `website-intel.ts:795-799`; `module_runs.details.calendar_id` `:846`.
- Model input: `content_strategist` with `planPrompt` and `planSchema` `website-intel.ts:739-748`.

Citations: `supabase/migrations/20261010061028_foundation.sql:165-175`, `web/src/lib/pipeline/website-intel.ts:750-783`, `web/src/app/analysis/[id]/report-data.ts:104-110`.

## Connected to

- **owns:** [content-item](content-item.md) (`calendar_id`, set null on delete `foundation.sql:183`).
- **owned-by:** [organization](../tenancy/organization.md).
- **joins:** [business-profile](../onboarding/business-profile.md) by jsonb key only (`:759`); [campaign](campaign.md) (`:168`, ghost); [module-run](../modules/module-run.md) `content_studio` (`website-intel.ts:837-848`).
- **looks-like-but-is-not:** [growth-plan-item](growth-plan-item.md), the growth plan's actions; [report](report.md), which does not hold the calendar.

## If you change this

- **Hits:** the insert `website-intel.ts:754-765`; the loader select `report-data.ts:104-110`; `context.ts:113-120`; the writing step's lookup `:795-799`; `planSchema` / `planPrompt` in `web/src/lib/pipeline/prompts.ts` (used at `:745-747`).
- **Does not hit:** the diagnosis and plan items (the planning step receives only their titles, `:737`); the `content_status` enum.

## Surfaces

| Surface | Role |
|---|---|
| Planning step → [plan-and-write](../../processes/plan-and-write.md) | writes |
| `/analysis/[id]` content plan tile | reads |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) | reads |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:79`)

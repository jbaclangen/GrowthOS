---
type: object
cluster: report
universe: live
status: verified
verified: 2026-11-08
commit: 00d230f
entity: supabase/migrations/20261010061028_foundation.sql
---

# 30-day plan (`content_calendars`)

The content strategy and date range the planning step writes for a business; its dated items are content items.

## Why this shape

The calendar is the parent of the dated posts and carries the strategy (goal, audience, pillars, channels) as jsonb, with the business linked through that jsonb rather than a column: `supabase/migrations/20261010061028_foundation.sql:165-175`, `web/src/lib/pipeline/website-intel.ts:760`.

## Shape

- Table `supabase/migrations/20261010061028_foundation.sql:165-175`: `campaign_id` nullable `:168` (never set), `title`, `strategy` jsonb `:170`, `starts_on` `:171`, `days` default 30 `:172`. RLS "members all" `:300-309`; campaign index `supabase/migrations/20261010061126_advisor_fixes.sql:22`.
- Writer: `planStep` `web/src/lib/pipeline/website-intel.ts:733-766` (start is tomorrow UTC `:751-753`; `strategy.business_profile_id` `:760`; `days: 30` `:762`); its items follow `:768-780`; the first five become the writing batch `:782-784`.
- Readers: report loader by `strategy->>business_profile_id` `web/src/app/analysis/[id]/report-data.ts:104-110`; Ask Braventa `web/src/lib/assistant/context.ts:115-122`; the writing step looks items up by `calendar_id` `website-intel.ts:796-800`; `module_runs.details.calendar_id` `:847`.
- Model input: `content_strategist` with `planPrompt` and `planSchema` `website-intel.ts:740-749`.

Citations: `supabase/migrations/20261010061028_foundation.sql:165-175`, `web/src/lib/pipeline/website-intel.ts:751-784`, `web/src/app/analysis/[id]/report-data.ts:104-110`.

## Connected to

- **owns:** [content-item](content-item.md) (`calendar_id`, set null on delete `foundation.sql:183`).
- **owned-by:** [organization](../tenancy/organization.md).
- **joins:** [business-profile](../onboarding/business-profile.md) by jsonb key only (`website-intel.ts:760`); [campaign](campaign.md) (`foundation.sql:168`, ghost); [module-run](../modules/module-run.md) `content_studio` (`website-intel.ts:838-849`).
- **looks-like-but-is-not:** [growth-plan-item](growth-plan-item.md), the growth plan's actions; [report](report.md), which does not hold the calendar.

## If you change this

- **Hits:** the insert `website-intel.ts:755-766`; the loader select `report-data.ts:104-110`; `context.ts:115-122`; the writing step's lookup `website-intel.ts:796-800`; `planSchema` / `planPrompt` in `web/src/lib/pipeline/prompts.ts` (used at `website-intel.ts:746-748`).
- **Does not hit:** the diagnosis and plan items (the planning step receives only their titles, `website-intel.ts:738`); the `content_status` enum.

## Surfaces

| Surface | Role |
|---|---|
| Planning step → [plan-and-write](../../processes/plan-and-write.md) | writes |
| `/analysis/[id]` content plan tile | reads |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) | reads |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:88`)

---
type: object
cluster: onboarding
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
entity: supabase/migrations/20261010061028_foundation.sql
---

# Brand voice (`brand_profiles`)

The brand voice the profiling step extracts for a business — one new row per analysis run, written by the pipeline and read by nothing.

## Why this shape

The foundation schema gave brand voice its own table beside the business profile so later features (visual guidelines, messaging pillars) had a home (`supabase/migrations/20261010061028_foundation.sql:97-107`). Today the writer prompt takes the voice from `business_profiles.intelligence` (`web/src/lib/pipeline/prompts.ts:373`), so this table is write-only (`docs/architecture/DATA_MODEL.md:79`).

## Shape

- Columns: `business_profile_id` (FK, cascade), `voice`, `tone_rules[]`, `messaging_pillars[]`, `visual_guidelines` jsonb, timestamps — `supabase/migrations/20261010061028_foundation.sql:97-107`; index on the profile FK — `supabase/migrations/20261010061126_advisor_fixes.sql:23`.
- RLS "members all" — `supabase/migrations/20261010061028_foundation.sql:301-307`; `touch_updated_at` trigger — `:337`.
- The one writer: the profiling step inserts `voice` and `tone_rules` from the business analyst's output — `web/src/lib/pipeline/website-intel.ts:324-329`. `messaging_pillars` and `visual_guidelines` are never set.
- No reader in `web/src` (grep at this commit); no uniqueness, so re-runs append — `docs/architecture/DATA_MODEL.md:197`.

Citations: `supabase/migrations/20261010061028_foundation.sql:97-107,301-307,337`; `supabase/migrations/20261010061126_advisor_fixes.sql:23`; `web/src/lib/pipeline/website-intel.ts:319,324-329`; `web/src/lib/pipeline/prompts.ts:373`; `docs/architecture/DATA_MODEL.md:79,197`

## Connected to

- **owns:** nothing
- **owned-by:** [business-profile](business-profile.md), [organization](../tenancy/organization.md)
- **joins:** [job-step](../pipeline/job-step.md) `profiling` (the step that writes it)
- **looks-like-but-is-not:** `business_profiles.intelligence.brand_voice` — the copy the prompts read (`web/src/lib/pipeline/website-intel.ts:319,327-328`)

## If you change this

- **Hits:** `profileStep`'s insert only; `docs/architecture/DATA_MODEL.md:79`.
- **Does not hit:** the content writer or any prompt — they read [business-profile](business-profile.md), not this table.

## Surfaces

| Surface | Role |
|---|---|
| Profiling step (`web/src/lib/pipeline/website-intel.ts:324-329`) | writes |
| App pages, routes, assistant | none |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

---
type: object
cluster: onboarding
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261010061028_foundation.sql
---

# Business profile (`business_profiles`)

The analysed business: the AI-built Business Intelligence Profile, the growth score, and the owner's own guided-onboarding answers, which the pipeline never overwrites.

## Why this shape

One organization can analyse several businesses, so the profile, not the organization, is the unit the report and dashboard are keyed on (`web/src/app/dashboard/page.tsx:31-34`). Owner inputs (`goals`, `service_area`, `current_tools`) are Customer-provided and survive re-runs because the pipeline writes only the AI columns (`supabase/migrations/20261010150627_business_profile_owner_inputs.sql:1-2,12-14`, BI-12, D-021).

## Shape

- Columns: `company_name`, `website_url`, `industry`, `services[]`, `target_customers`, `locations[]`, `competitors[]`, `offers`, `goals`, `intelligence` jsonb, `growth_score` 0–100, `analyzed_at` — `supabase/migrations/20261010061028_foundation.sql:77-95`; `service_area`, `current_tools[]` with length and count checks — `supabase/migrations/20261010150627_business_profile_owner_inputs.sql:3-10`; unique (`id`, `organization_id`) for child composite FKs — `supabase/migrations/20261010155911_onboarding_discovery.sql:5`.
- RLS "members all" — `supabase/migrations/20261010061028_foundation.sql:297-309`.
- Writers: insert at onboarding start with owner inputs — `web/src/lib/onboarding/start.ts:64-73` (`toProfileColumns`, `web/src/lib/owner-inputs.ts:26`); profiling step writes the AI columns and `intelligence` — `web/src/lib/pipeline/website-intel.ts:309-322`; scoring step writes `growth_score`, `analyzed_at` — `:635-639`; owner edits via `saveOwnerInputs` — `web/src/app/analysis/actions.ts:126-130`.
- Readers: dashboard `web/src/app/dashboard/page.tsx:31-34`; report `web/src/app/analysis/[id]/report-data.ts:83`; assistant context `web/src/lib/assistant/context.ts:37-38`; follow-up selection `web/src/lib/onboarding/next-questions.ts:61-65`; connect step suggestions `web/src/app/onboarding/[sessionId]/connect/page.tsx:59`.

Citations: `supabase/migrations/20261010061028_foundation.sql:77-95,297-309`; `supabase/migrations/20261010150627_business_profile_owner_inputs.sql:3-14`; `web/src/lib/onboarding/start.ts:64-73`; `web/src/lib/pipeline/website-intel.ts:309-322,635-639`; `web/src/app/analysis/actions.ts:126-130`

## Connected to

- **owns:** [onboarding-session](onboarding-session.md), [brand-profile](brand-profile.md)
- **owned-by:** [organization](../tenancy/organization.md)
- **joins:** [ai-job](../pipeline/ai-job.md) (`input.businessProfileId`); [report](../report/report.md) and [diagnosis](../report/diagnosis.md) (per analysis of this profile); [module-run](../modules/module-run.md) (the `growth_score` here is the blend; sub-scores live there)
- **looks-like-but-is-not:** [organization](../tenancy/organization.md) — the tenant; its `name` is set from the business name once, then diverges

## If you change this

- **Hits:** `createOnboarding`, `profileStep`, `scoreStep`, `saveOwnerInputs` and the "From you" panel, the dashboard and report loaders, the assistant context, the prompts that read owner inputs (`web/src/lib/pipeline/website-intel.ts:304`), `docs/architecture/DATA_MODEL.md:74`.
- **Does not hit:** [onboarding-response](onboarding-response.md) — pain points and priorities are not profile columns.

## Surfaces

| Surface | Role |
|---|---|
| `startAnalysis` / MCP start via `createOnboarding` (`web/src/lib/onboarding/start.ts:64-73`) | writes |
| Profiling and scoring steps (`web/src/lib/pipeline/website-intel.ts:309-322,635-639`) | writes AI columns, score |
| Report "From you" panel → `saveOwnerInputs` (`web/src/app/analysis/actions.ts:126-130`) | writes owner inputs |
| `/dashboard`, `/analysis/[id]`, Ask Braventa | reads |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

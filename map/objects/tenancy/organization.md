---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261010061028_foundation.sql
---

# Organization (`organizations`)

The tenant root: every tenant table carries its `organization_id`, and its `plan` and `trial_ends_at` are the only tier state because there is no billing.

## Why this shape

One organization per user in the MVP, created by the `create_organization` RPC on the first analysis or the first access key, with the caller as owner (`supabase/migrations/20261010061028_foundation.sql:57-72`, `docs/architecture/DATA_MODEL.md:50`). The effective tier is computed in code from `plan` and `trial_ends_at` rather than from a billing record (`supabase/migrations/20261011042846_plan_tiers_and_trial.sql:1-2`). Signed-in users may update only `name` and `slug`; plan, trial and budget change only through trusted server code (`supabase/migrations/20261011042846_plan_tiers_and_trial.sql:15-18`).

## Shape

- Columns `id`, `name`, `slug` (unique), `plan` (default `trial`), `monthly_ai_budget_usd` (default 5), `created_at` — `supabase/migrations/20261010061028_foundation.sql:9-16`.
- `plan` check `trial`/`basic`/`pro`/`premium` — `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:6-7`; `trial_ends_at` not null, default now + 14 days — `:10-13`.
- No `organization_id` of its own. RLS: "members read org" `supabase/migrations/20261010061028_foundation.sql:282-283`, "admins update org" `:284-285`, narrowed by the column grant above. No insert or delete policy: rows come only from `create_organization`.
- The AI budget check reads `monthly_ai_budget_usd` against the `ai_spend_mtd` view and fails closed — `web/src/lib/ai/router.ts:96-105`; view `supabase/migrations/20261010061028_foundation.sql:345-349`.
- `plan, trial_ends_at` are read wherever a gate is decided: the scoring step `web/src/lib/modules/server.ts:13`; Search Console `web/src/lib/integrations/search-console.ts:430,578`, `web/src/app/api/integrations/google/start/route.ts:39`, `web/src/app/api/integrations/google/callback/route.ts:59-63`, `web/src/app/search/page.tsx:45`, `web/src/components/connections/search-console-card.tsx:58`, `web/src/app/onboarding/[sessionId]/connect/page.tsx:53`; the AI assistant connection `web/src/lib/mcp/auth.ts:23,75`, `web/src/app/settings/page.tsx:41`, `web/src/lib/memberships.ts:27` (OAuth consent page); the in-app assistant `web/src/app/api/assistant/route.ts:66`; `/plans` `web/src/lib/plans/access.ts:13-18` (grep `trial_ends_at` at this commit).

Citations: `supabase/migrations/20261010061028_foundation.sql:9-16,57-72,282-285,345-349`; `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:1-2,6-7,10-13,15-18`; `web/src/lib/ai/router.ts:96-105`

## Connected to

- **owns:** [membership](membership.md), [upgrade-request](upgrade-request.md), [subscription](subscription.md) (ghost), [business-profile](../onboarding/business-profile.md), [onboarding-session](../onboarding/onboarding-session.md), [organization-module](../modules/organization-module.md), [module-run](../modules/module-run.md), [ai-job](../pipeline/ai-job.md), [integration-connection](../integrations/integration-connection.md), [mcp-access-key](../access/mcp-access-key.md)
- **owned-by:** none (tenant root)
- **joins:** [member-role](member-role.md) through membership; [plan-tier](plan-tier.md) is computed from `plan` and `trial_ends_at`
- **looks-like-but-is-not:** [business-profile](../onboarding/business-profile.md) — the analysed business; an organization can hold several profiles (`supabase/migrations/20261010061028_foundation.sql:77-79`, `web/src/app/dashboard/page.tsx:31-34`)

## If you change this

- **Hits:** `effectiveAccess` and every gate built on it ([plan-tier](plan-tier.md)); the budget check `web/src/lib/ai/router.ts:96-105`; `create_organization`; the column grant `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:17-18`; `docs/architecture/DATA_MODEL.md:75`.
- **Does not hit:** [business-profile](../onboarding/business-profile.md) (profile fields live there, not here); [subscription](subscription.md) (nothing reads it).

## Surfaces

| Surface | Role |
|---|---|
| `startAnalysis` (`web/src/app/analysis/actions.ts:47`) | writes (rpc `create_organization`) |
| `createAccessKey` (`web/src/app/settings/actions.ts:29`) | writes (rpc `create_organization`) |
| `/plans` via `getOrgAccess` (`web/src/lib/plans/access.ts:13-18`) | reads |
| `/settings` (`web/src/app/settings/page.tsx:41`) | reads |
| `runWorker` (`web/src/lib/ai/router.ts:97`) | reads budget |
| Scoring step via `enabledModules` (`web/src/lib/modules/server.ts:13`) | reads tier |
| Search Console sync (`web/src/lib/integrations/search-console.ts:430`) | reads tier |
| Braventa team in Supabase (`web/src/lib/plans/tiers.ts:2-3`) | writes `plan` by hand |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

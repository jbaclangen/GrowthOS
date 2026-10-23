---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: web/src/lib/plans/tiers.ts
---

# Plan tier (`Tier` / `effectiveAccess`)

The tier an organization has right now — Basic, Pro or Premium — computed in code from `organizations.plan` and `trial_ends_at`, with a 14-day Pro trial and no billing.

## Why this shape

The founder decided tiers and the trial before billing exists, so the trial clock and tier checks live in pure, unit-tested code and the Braventa team changes `plan` by hand (`web/src/lib/plans/tiers.ts:1-6`, `docs/decisions/DECISION_LOG.md:326-329`, D-030). Every feature carries its real status so the UI never presents a planned feature as live (`web/src/lib/plans/tiers.ts:5-6,76-80`).

## Shape

- `Tier` `basic`/`pro`/`premium` and `StoredPlan` (adds `trial`) — `web/src/lib/plans/tiers.ts:8-9`; `TRIAL_DAYS = 14` `:12`; `TIERS` labels and summaries `:14-27`.
- `FEATURES`: each with `minTier` and `status` `live`/`coming_soon` — `web/src/lib/plans/tiers.ts:48-68`; `includes` `:72-74`; `canUse` = tier includes it and it is live `:77-80`; `proHasLiveFeatures` `:105-107`.
- `effectiveAccess(org)`: a `trial` plan is Pro until `trial_ends_at`, then Basic; an unknown plan reads as Basic — `web/src/lib/plans/tiers.ts:88-102`.
- Database side: `plan` check and `trial_ends_at` default — `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:4-13`.
- Gates built on it: Search Console `web/src/lib/integrations/search-console-access.ts:12-15`; the MCP connection `web/src/lib/mcp/access.ts:13-15` and the assistant `web/src/lib/assistant/access.ts:12`, both through `hasSubscription` `web/src/lib/plans/subscription.ts:5-7`; module enablement `web/src/lib/modules/server.ts:18` → `web/src/lib/modules/registry.ts:263-266`; `getOrgAccess` `web/src/lib/plans/access.ts:9-24`.

Citations: `web/src/lib/plans/tiers.ts:1-27,48-107`; `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:4-13`; `web/src/lib/plans/access.ts:9-24`; `web/src/lib/plans/subscription.ts:5-7`

## Connected to

- **owns:** nothing (pure logic)
- **owned-by:** [organization](organization.md) (`plan`, `trial_ends_at`)
- **joins:** [module-registry](../modules/module-registry.md) (`tier` per module, `featureId` → `FEATURES`); [upgrade-request](upgrade-request.md) (the way to change tier today); [integration-connection](../integrations/integration-connection.md) (paused on Basic)
- **looks-like-but-is-not:** [subscription](subscription.md) — the unused billing table; [member-role](member-role.md) — who may act, not what the organization may use

## If you change this

- **Hits:** every gate above; the `/plans` page; the module registry test that ties a live module to a live feature (`web/src/lib/modules/registry.ts:38-39`); `docs/product/PLANS_AND_TIERS.md`.
- **Does not hit:** [member-role](member-role.md) permissions — `can()` reads the role, not the tier, and the OAuth start route checks `integrations.connect` before the tier (`web/src/app/api/integrations/google/start/route.ts:36-40`); [subscription](subscription.md).

Ghost: Stripe billing and plan limits — `docs/product/ROADMAP.md:62-63`; seat prices — `docs/decisions/DECISION_LOG.md:592-595` (D-046); `billing.manage` (change the plan) is in the role matrix but not enforced — `docs/architecture/ROLES_AND_PERMISSIONS.md:57`.

## Surfaces

| Surface | Role |
|---|---|
| `/plans` (`web/src/app/plans/page.tsx:5,50,89`) | reads `TIERS`, `FEATURES` |
| Settings, connect step, Search page, OAuth routes via `effectiveAccess` | reads |
| `/api/mcp` and `/api/assistant` via `hasSubscription` | reads |
| Scoring step via `enabledModules` (`web/src/lib/modules/server.ts:18`) | reads |
| Braventa team in Supabase (`web/src/lib/plans/tiers.ts:2-3`) | writes `plan` by hand |

## See

- Source: `web/src/lib/plans/tiers.ts`
- As built: `docs/product/PLANS_AND_TIERS.md`

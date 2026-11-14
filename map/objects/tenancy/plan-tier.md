---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
entity: web/src/lib/plans/tiers.ts
---

# Plan tier (`Tier` / `effectiveAccess`)

The tier an organization has right now — Basic, Pro or Premium — computed in code from `organizations.plan` and `trial_ends_at`, with a 14-day Pro trial and no billing.

## Why this shape

The founder decided tiers and the trial before billing exists, so the trial clock and tier checks live in pure, unit-tested code and the Braventa team changes `plan` by hand (`web/src/lib/plans/tiers.ts:1-6`, `docs/decisions/DECISION_LOG.md:360-363`, D-030). Every feature carries its real status so the UI never presents a planned feature as live (`web/src/lib/plans/tiers.ts:5-6,85-89`).

## Shape

- `Tier` `basic`/`pro`/`premium` and `StoredPlan` (adds `trial`) — `web/src/lib/plans/tiers.ts:8-9`; `TRIAL_DAYS = 14` `:12`; `TIERS` labels and summaries `:14-27`.
- `FEATURES`: each with `minTier` and `status` `live`/`coming_soon` — `web/src/lib/plans/tiers.ts:49-77`; live Pro features `search_console` `:64`, `google_analytics` `:68` and `hubspot` (read-only counts, not in the diagnosis) `:71` (`analytics_integrations` is now only the Tag Manager connection, coming soon, `:72`); `includes` `:81-83`; `canUse` = tier includes it and it is live `:85-89`; `proHasLiveFeatures` `:114-116`.
- `effectiveAccess(org)`: a `trial` plan is Pro until `trial_ends_at`, then Basic; an unknown plan reads as Basic — `web/src/lib/plans/tiers.ts:97-111`.
- Database side: `plan` check and `trial_ends_at` default — `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:4-13`.
- Gates built on it: Search Console `web/src/lib/integrations/search-console-access.ts:12-15`; Google Analytics 4 `web/src/lib/integrations/google-analytics-access.ts:12-15`; HubSpot `web/src/lib/integrations/hubspot-access.ts:12-15`; the MCP connection `web/src/lib/mcp/access.ts:13-15` and the assistant `web/src/lib/assistant/access.ts:12-15`, both through `hasSubscription` `web/src/lib/plans/subscription.ts:5-7`; module enablement `web/src/lib/modules/server.ts:18` → `web/src/lib/modules/registry.ts:266-269`; `getOrgAccess` `web/src/lib/plans/access.ts:13-21`; the account's business limit, from the highest tier among owned businesses (`accountTier` `web/src/lib/plans/business-limit.ts:21-29`; [account-trial](account-trial.md)).
- The plan in words: `planLabel` for the header chip, the business switcher and Settings → Businesses — `web/src/lib/plans/label.ts:3-7`.

Citations: `web/src/lib/plans/tiers.ts:1-27,49-116`; `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:4-13`; `web/src/lib/plans/access.ts:13-21`; `web/src/lib/plans/subscription.ts:5-7`; `web/src/lib/plans/label.ts:3-7`; `web/src/lib/plans/business-limit.ts:21-29`

## Connected to

- **owns:** nothing (pure logic)
- **owned-by:** [organization](organization.md) (`plan`, `trial_ends_at`)
- **joins:** [module-registry](../modules/module-registry.md) (`tier` per module, `featureId` → `FEATURES`); [upgrade-request](upgrade-request.md) (the way to change tier today); [integration-connection](../integrations/integration-connection.md) (Google and HubSpot paused on Basic); [team-invitation](team-invitation.md) (seat allowances follow the effective tier — `web/src/lib/team/team-server.ts:83`, `web/src/lib/team/seats.ts:15-19`); [account-trial](account-trial.md) (the business limit and the plan a new business starts on)
- **looks-like-but-is-not:** [subscription](subscription.md) — the unused billing table; [member-role](member-role.md) — who may act, not what the organization may use

## If you change this

- **Hits:** every gate above; the `/plans` page; the module registry test that ties a live module to a live feature (`web/src/lib/modules/registry.ts:39-40`); `docs/product/PLANS_AND_TIERS.md`.
- **Does not hit:** [member-role](member-role.md) permissions — `can()` reads the role, not the tier, and the OAuth start route checks `integrations.connect` before the tier (`web/src/app/api/integrations/google/start/route.ts:39-45`); [subscription](subscription.md).

Ghost: Stripe billing and plan limits — `docs/product/ROADMAP.md:63-64`; seat prices — `docs/decisions/DECISION_LOG.md:628-630` (D-046); `billing.manage` (change the plan) is in the role matrix but not enforced — `docs/architecture/ROLES_AND_PERMISSIONS.md:63`.

## Surfaces

| Surface | Role |
|---|---|
| `/plans` (`web/src/app/plans/page.tsx:5,65,82`) | reads `TIERS`, `FEATURES` |
| Header plan chip and switcher (`web/src/app/layout.tsx:66,68`), Settings → Businesses (`web/src/app/settings/businesses-section.tsx:83`) | reads (`planLabel`) |
| Settings, connect step, Search page, OAuth routes via `effectiveAccess` | reads |
| `/api/mcp` and `/api/assistant` via `hasSubscription` | reads |
| Scoring step and diagnosis update via `enabledModules` (`web/src/lib/modules/server.ts:18`) | reads |
| Braventa team in Supabase (`web/src/lib/plans/tiers.ts:2-3`) | writes `plan` by hand |

## See

- Source: `web/src/lib/plans/tiers.ts`
- As built: `docs/product/PLANS_AND_TIERS.md`

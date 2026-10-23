---
type: object
cluster: tenancy
universe: ghost
status: verified
verified: 2026-10-24
commit: 2214b05
entity: supabase/migrations/20261010061028_foundation.sql
---

# Subscription (`subscriptions`)

A billing-state table from the foundation schema that nothing writes or reads: the real tier state is `organizations.plan` and `trial_ends_at`.

## Why this shape

The foundation migration anticipated Stripe (`stripe_customer_id`, `stripe_subscription_id`), but billing is not built; tiers and the trial were implemented in code instead (`supabase/migrations/20261011042846_plan_tiers_and_trial.sql:1-2`, D-030). The roadmap keeps the table for Stripe subscriptions later (`docs/product/ROADMAP.md:62-63`, PL-7).

## Shape

- Columns: `organization_id` (unique, one per organization), `stripe_customer_id`, `stripe_subscription_id`, `plan` default `trial`, `status` default `trialing`, `current_period_end`, timestamps — `supabase/migrations/20261010061028_foundation.sql:263-273`.
- RLS "members read" only; writes would be server-only — `supabase/migrations/20261010061028_foundation.sql:311-320`. `touch_updated_at` trigger — `:337`.
- No reference in `web/src` at this commit (grep for `subscriptions`; `web/src/lib/plans/subscription.ts` is a function name, not this table — `web/src/lib/plans/subscription.ts:5-7` reads `organizations`).
- Documented as unused: `docs/architecture/DATA_MODEL.md:111`, `docs/product/MVP_SCOPE.md:81-83`.

Citations: `supabase/migrations/20261010061028_foundation.sql:263-273,311-320,337`; `docs/architecture/DATA_MODEL.md:111`; `docs/product/ROADMAP.md:62-63`

## Connected to

- **owns:** nothing
- **owned-by:** [organization](organization.md)
- **joins:** nothing today
- **looks-like-but-is-not:** [plan-tier](plan-tier.md) — the live tier logic, which reads `organizations`, not this table; `hasSubscription` in `web/src/lib/plans/subscription.ts:5-7`, which despite its name never touches it

## If you change this

- **Hits:** nothing in the app; `docs/architecture/DATA_MODEL.md:111`.
- **Does not hit:** [plan-tier](plan-tier.md) or any gate — none reads this table. Do not build a gate on it until billing writes it.

## Surfaces

| Surface | Role |
|---|---|
| App pages, routes, jobs | none |
| Planned Stripe billing (`docs/product/ROADMAP.md:62-63`) | would write (ghost) |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

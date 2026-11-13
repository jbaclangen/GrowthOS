---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
entity: supabase/migrations/20261108103906_business_limits.sql
---

# Account trial (`account_trials`) and the business limit

The one 14-day Pro trial each account (person) gets, and the rule that an account owns at most 2 / 4 / 8 businesses on Basic / Pro / Premium (D-062). Migration applied 2026-11-08 (version 20261108103906).

## Why this shape

The trial and the limit belong to a person, not to a business: deleting a business must free its place but must not give the trial back, so the row lives outside every organization and is keyed by `user_id`, with RLS on the user's own row instead of `is_member()` (`supabase/migrations/20261108103906_business_limits.sql:9-12,21-32`). The limit is enforced where businesses are created, `create_organization()`, under a per-account lock so two creates at once can't both pass the count (`:68-91`). The app checks first only to explain the refusal; the database checks again either way (`web/src/lib/plans/business-limit.ts:1-4`; `web/src/lib/organizations/limit-server.ts:7-8`; `web/src/app/onboarding/page.tsx:38-40`).

## Shape

- `account_trials`: `user_id` PK (FK `auth.users`, cascade), `started_at`, `ends_at`; RLS read own row; no client writes — `supabase/migrations/20261108103906_business_limits.sql:22-32`; backfilled for every current owner — `:34-42`.
- `account_business_limit(uid)`: highest effective plan among owned businesses → 8 / 4 / 2; service only — `supabase/migrations/20261108103906_business_limits.sql:48-66`.
- `create_organization()`: lock, count `owner` memberships, refuse with SQLSTATE `BRV01`, then the account's highest paid plan or its one trial, then the owner membership — `supabase/migrations/20261108103906_business_limits.sql:68-118`.
- Mirror in code: `BUSINESS_LIMITS`, `accountTier`, `businessUsage`, `limitMessage`, `newBusinessPlan` — `web/src/lib/plans/business-limit.ts:12-66`; `business-limit.test.ts` reads the SQL numbers. `newBusinessPlan` is only that mirror: no app code reads `account_trials` (grep at this commit).
- `BRV01` turned into a message: `createBusiness` — `web/src/lib/organizations/create.ts:7-19`; `createOwnedBusiness`, `accountUsage` — `web/src/lib/organizations/limit-server.ts:9-23`.

Citations: `supabase/migrations/20261108103906_business_limits.sql:9-118`; `web/src/lib/plans/business-limit.ts:1-66`; `web/src/lib/organizations/create.ts:7-19`; `web/src/lib/organizations/limit-server.ts:7-23`; `web/src/app/onboarding/page.tsx:38-53`; `web/src/app/plans/page.tsx:28-53`; `web/src/app/settings/businesses-section.tsx:45-70`; `web/src/app/onboarding/start-form.tsx:30-49`

## Connected to

- **owns:** nothing
- **owned-by:** the person (`auth.users`), not an [organization](organization.md)
- **joins:** [membership](membership.md) (owned = role `owner`); [plan-tier](plan-tier.md) (the effective tier sets the limit); [organization](organization.md) (`plan`, `trial_ends_at` set at creation)
- **looks-like-but-is-not:** `organizations.trial_ends_at` — each business's own end date, which `create_organization()` copies from this row

## If you change this

- **Hits:** `create_organization()` and its callers `startAnalysis` (`web/src/app/analysis/actions.ts:58-65`) and `createAccessKey` (`web/src/app/settings/actions.ts:44-54`), both through `createOwnedBusiness`; `business-limit.test.ts`; `/plans`, `/onboarding`, Settings → Businesses; braventa.io `/pricing` (`site/src/app/pricing/page.tsx`); the Terms, MSA and Refund Policy trial lines; `docs/product/PLANS_AND_TIERS.md` §2a; D-062, Q-066.
- **Does not hit:** seat limits ([team-invitation](team-invitation.md)), which count members of one business.

## Surfaces

| Surface | Role |
|---|---|
| `create_organization()` | reads and writes |
| `/plans` (`web/src/app/plans/page.tsx:30,48-53`), `/onboarding` (`web/src/app/onboarding/page.tsx:46,53`; the start form disables "A new business" at the limit and links to `/plans`, `web/src/app/onboarding/start-form.tsx:30-49`), Settings → Businesses (`web/src/app/settings/businesses-section.tsx:45-46,59-70`) | read the limit (through memberships, not this table) |

## See

- Source: `supabase/migrations/20261108103906_business_limits.sql`
- As built: `docs/product/PLANS_AND_TIERS.md` §2a

---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
entity: supabase/migrations/20261011042846_plan_tiers_and_trial.sql
---

# Talk to us request (`upgrade_requests`)

A member's request to move the organization to Basic, Pro or Premium, read by the founder in Supabase while there is no billing.

## Why this shape

Upgrading is a "Talk to us" request until billing exists (`docs/decisions/DECISION_LOG.md:361-363`, D-030; `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:20`). Basic was added as a target so a business whose trial ended can ask for a plan and get the AI assistant connection back (`supabase/migrations/20261011140425_mcp_access.sql:53-56`, D-036).

## Shape

- Columns: `organization_id`, `requested_by` (default `auth.uid()`), `tier`, `message` (≤ 1000), `status` `open`/`contacted`/`closed`, `created_at` — `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:21-29`; `tier` check now `basic`/`pro`/`premium` — `supabase/migrations/20261011140425_mcp_access.sql:55-56`.
- RLS: "members read" and "members insert" with `requested_by = auth.uid()`; the insert grant covers only `organization_id`, `tier`, `message` — `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:33-39`. No update or delete for clients, so `status` changes only by hand.
- The one writer: `requestUpgrade` validates tier and message length — `web/src/app/plans/actions.ts:10-14`; resolves the business the page showed (the form's `organizationId`, never the cookie's) with `getCurrentOrg` and refuses a missing, malformed or foreign id — `:16-20`; inserts through the user's client — `:22-27`. Form on `/plans`, carrying that id — `web/src/app/plans/page.tsx:107-110`, `web/src/app/plans/request-form.tsx:6-8,20`; tested in `web/src/app/plans/actions.test.ts`. No permission gate: `billing.view` is not enforced and the request stays open to every member — `docs/architecture/ROLES_AND_PERMISSIONS.md:61`.
- Also the route to more businesses than Premium's limit: a custom plan through "Talk to us" — `web/src/lib/plans/business-limit.ts:14`, `:43-45` ([account-trial](account-trial.md)).
- No reader in the app (grep at this commit); the founder reads rows in Supabase — `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:20`.

Citations: `supabase/migrations/20261011042846_plan_tiers_and_trial.sql:20-39`; `supabase/migrations/20261011140425_mcp_access.sql:53-56`; `web/src/app/plans/actions.ts:10-27`; `web/src/app/plans/page.tsx:107-110`; `web/src/app/plans/request-form.tsx:6-8,20`; `web/src/lib/plans/business-limit.ts:14,43-45`

## Connected to

- **owns:** nothing
- **owned-by:** [organization](organization.md)
- **joins:** [plan-tier](plan-tier.md) (the `tier` asked for); [membership](membership.md) (`requested_by`)
- **looks-like-but-is-not:** [subscription](subscription.md) — the unused billing table; [contact-request](../integrations/contact-request.md) — the public marketing-site form, no organization

## If you change this

- **Hits:** `requestUpgrade`, its test and the `/plans` request form; the insert column grant; `docs/architecture/DATA_MODEL.md:113`.
- **Does not hit:** [plan-tier](plan-tier.md) — a request never changes `organizations.plan`; the team does that by hand.

## Surfaces

| Surface | Role |
|---|---|
| `/plans` → `requestUpgrade` (`web/src/app/plans/actions.ts:23-25`) | writes |
| Braventa team in Supabase (`supabase/migrations/20261011042846_plan_tiers_and_trial.sql:20`) | reads, sets `status` by hand |
| App pages | none read it |

## See

- Source: `supabase/migrations/20261011042846_plan_tiers_and_trial.sql`
- As built: `docs/product/MVP_SCOPE.md`

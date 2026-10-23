---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261010061028_foundation.sql
---

# Member role (`member_role`)

The enum on a membership — `owner`, `admin`, `member` — plus the three SQL helpers and the few TS checks that decide what each may do.

## Why this shape

Policies test membership through `security definer` helpers so they never recurse (`supabase/migrations/20261010061028_foundation.sql:34`). `is_org_owner` came later, without the platform-admin bypass, as the boundary for owner-only actions (`supabase/migrations/20261017030000_mcp_oauth.sql:8-19`). The eight fixed roles the founder decided are planned, not built (`docs/decisions/DECISION_LOG.md:569-571`, D-046).

## Shape

- Enum `owner`, `admin`, `member` — `supabase/migrations/20261010061028_foundation.sql:18`; `memberships.role` `:23`.
- `is_member(org)`: member or platform admin — `supabase/migrations/20261010061028_foundation.sql:35-43`. `is_org_admin(org)`: owner/admin or platform admin — `:45-54`. Both revoked from anon, granted to authenticated — `supabase/migrations/20261010061126_advisor_fixes.sql:4-7`.
- `is_org_owner(org)`: owners only, no platform-admin bypass — `supabase/migrations/20261017030000_mcp_oauth.sql:9-17`.
- SQL owner-only uses: service-key policies `supabase/migrations/20261017030000_mcp_oauth.sql:228-233`; `memberships_owner_guard` `:24-38`. Admin uses: "admins update org" `supabase/migrations/20261010061028_foundation.sql:284-285`; membership writes `supabase/migrations/20261010061126_advisor_fixes.sql:11-17`.
- In TS the role is a plain string — `web/src/lib/memberships.ts:8,20`. Owner-only checks: service keys `web/src/app/settings/integrations-actions.ts:22`; Search Console start `web/src/app/api/integrations/google/start/route.ts:35` and callback `web/src/app/api/integrations/google/callback/route.ts:46`; the connect step's `isOwner` `web/src/app/onboarding/[sessionId]/connect/page.tsx:65` → `owner-only` card state `web/src/lib/integrations/connect-step.ts:35,39`.

Citations: `supabase/migrations/20261010061028_foundation.sql:18,23,35-54,284-285`; `supabase/migrations/20261010061126_advisor_fixes.sql:4-17`; `supabase/migrations/20261017030000_mcp_oauth.sql:9-38,228-233`; `web/src/lib/memberships.ts:8,20`

## Connected to

- **owns:** nothing
- **owned-by:** [membership](membership.md)
- **joins:** [platform-admin](platform-admin.md) (bypass inside `is_member`/`is_org_admin`, not in `is_org_owner`); [mcp-access-key](../access/mcp-access-key.md) (service keys are owner-only); [integration-connection](../integrations/integration-connection.md) (connecting is owner-only)
- **looks-like-but-is-not:** [plan-tier](plan-tier.md) — what the organization may use, not who in it may act

## If you change this

- **Hits:** every RLS policy; the owner checks listed above; `docs/architecture/DATA_MODEL.md:44-45`.
- **Does not hit:** [plan-tier](plan-tier.md) gates (`effectiveAccess` never reads the role).

Ghost: Owner, Admin, Marketing manager, Social media manager, Copywriter, Content creator, Analyst, Client approver — `docs/decisions/DECISION_LOG.md:568-582`, `docs/product/ROADMAP.md:78-83`.

## Surfaces

| Surface | Role |
|---|---|
| RLS policies (`supabase/migrations/20261010061028_foundation.sql:282-320`) | reads via helpers |
| Settings → service keys (`web/src/app/settings/integrations-actions.ts:22`) | reads (owner check) |
| Google OAuth routes (`web/src/app/api/integrations/google/start/route.ts:35`) | reads (owner check) |
| Connect step (`web/src/app/onboarding/[sessionId]/connect/page.tsx:65`) | reads (owner check) |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

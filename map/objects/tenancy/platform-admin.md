---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261010061028_foundation.sql
---

# Platform admin (`platform_admins`)

Braventa staff who pass `is_member()` and `is_org_admin()` for every organization; rows are inserted by hand and no code reads the table directly.

## Why this shape

Staff need to see every tenant without a membership in each (`supabase/migrations/20261010061028_foundation.sql:29`). The bypass sits inside the two RLS helpers, so it costs no policy of its own; `is_org_owner` leaves it out (`supabase/migrations/20261017030000_mcp_oauth.sql:9-15`, `docs/architecture/DATA_MODEL.md:135`).

## Shape

- One column, `user_id` PK referencing `auth.users` — `supabase/migrations/20261010061028_foundation.sql:30-32`. No `organization_id`.
- RLS on; the only policy is "admins read self" — `supabase/migrations/20261010061028_foundation.sql:280,293-294`. No insert, update or delete policy.
- Consulted by `is_member` `supabase/migrations/20261010061028_foundation.sql:40-42` and `is_org_admin` `:51-53`; not by `is_org_owner` `supabase/migrations/20261017030000_mcp_oauth.sql:11-14`.
- Not consulted by `has_permission()`, which reads memberships only — `supabase/migrations/20261023092945_roles_and_permissions.sql:7-9,30-34`; in the app `memberRole()` gives staff without a membership null, so every `can()` gate refuses them — `web/src/lib/team/server.ts:5-8`, `docs/architecture/ROLES_AND_PERMISSIONS.md:45-47`.
- No app code reads the table; its only mention in `web/src` is the test that proves `has_permission()` leaves it out — `web/src/lib/team/migration.test.ts:41-42` (grep at this commit). Rows are inserted manually; there is no admin UI — `docs/architecture/DATA_MODEL.md:52-53`, `docs/product/MVP_SCOPE.md:83`.

Citations: `supabase/migrations/20261010061028_foundation.sql:29-32,40-42,51-53,280,293-294`; `supabase/migrations/20261017030000_mcp_oauth.sql:9-15`; `supabase/migrations/20261023092945_roles_and_permissions.sql:7-9,30-34`; `web/src/lib/team/server.ts:5-8`; `web/src/lib/team/migration.test.ts:41-42`; `web/src/lib/memberships.ts:3-6,11-18`; `web/src/lib/plans/access.ts:13-18`; `web/src/app/api/assistant/route.ts:64-69`; `docs/architecture/DATA_MODEL.md:52-53,135`

## Connected to

- **owns:** nothing
- **owned-by:** none (no organization)
- **joins:** [member-role](member-role.md) through `is_member`/`is_org_admin`; [membership](membership.md) (what it stands in for)
- **looks-like-but-is-not:** an `owner` [membership](membership.md) — a platform admin holds no role, so `is_org_owner`, `has_permission()` and `can()` refuse them

## If you change this

- **Hits:** `is_member` and `is_org_admin`, so every RLS policy built on them; any read of `memberships` that does not filter by the user's id, because RLS shows staff every organization's memberships (`web/src/lib/memberships.ts:3-6`) — `getOrgAccess` (`web/src/lib/plans/access.ts:13-18`) and the assistant's `getOrg` (`web/src/app/api/assistant/route.ts:64-69`) are two; `docs/architecture/DATA_MODEL.md:52-53,77`.
- **Does not hit:** `is_org_owner`, `has_permission()` and every `can()` gate (service keys and Search Console connect included); `memberships_owner_guard`; `getCurrentOrg`, which filters memberships by the user's id (`web/src/lib/auth.ts:26-28`, `web/src/lib/memberships.ts:11-18`).

## Surfaces

| Surface | Role |
|---|---|
| `is_member()` / `is_org_admin()` (`supabase/migrations/20261010061028_foundation.sql:35-54`) | reads |
| Braventa team in Supabase (`docs/architecture/DATA_MODEL.md:53`) | writes by hand |
| App pages and routes | none |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

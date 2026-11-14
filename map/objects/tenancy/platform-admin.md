---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-11-14
commit: ed8c44c
entity: supabase/migrations/20261010061028_foundation.sql
---

# Platform admin (`platform_admins`)

Braventa staff who pass `is_member()` and `is_org_admin()` for every organization; rows are inserted by hand and no code reads the table directly.

## Why this shape

Staff need to see every tenant without a membership in each (`supabase/migrations/20261010061028_foundation.sql:29`). The bypass sits inside the two RLS helpers, so it costs no policy of its own; `is_org_owner` leaves it out (`supabase/migrations/20261017030000_mcp_oauth.sql:9-15`, `docs/architecture/DATA_MODEL.md:149`).

## Shape

- One column, `user_id` PK referencing `auth.users` — `supabase/migrations/20261010061028_foundation.sql:30-32`. No `organization_id`.
- RLS on; the only policy is "admins read self" — `supabase/migrations/20261010061028_foundation.sql:280,293-294`. No insert, update or delete policy.
- Consulted by `is_member` `supabase/migrations/20261010061028_foundation.sql:40-42` and `is_org_admin` `:51-53`; not by `is_org_owner` `supabase/migrations/20261017030000_mcp_oauth.sql:11-14`.
- Not consulted by `has_permission()`, which reads memberships only — `supabase/migrations/20261023092945_roles_and_permissions.sql:7-9`, newest definition `supabase/migrations/20261108091111_remove_business.sql:15-19`; in the app `memberRole()` gives staff without a membership null, so every `can()` gate refuses them — `web/src/lib/team/server.ts:5-8`, `docs/architecture/ROLES_AND_PERMISSIONS.md:51-53`.
- Through `is_org_admin`, staff also pass "admins delete memberships" (`supabase/migrations/20261010061126_advisor_fixes.sql:16-17`), but since 2026-11-14 the guard refuses their deleting an owner's membership, since it checks `is_org_owner` (`supabase/migrations/20261114040239_memberships_owner_guard_delete.sql:6-9,48-50`; [membership](membership.md)).
- No app code reads the table; its only mention in `web/src` is the test that proves `has_permission()` leaves it out — `web/src/lib/team/migration.test.ts:62-63` (grep at this commit). Rows are inserted manually; there is no admin UI — `docs/architecture/DATA_MODEL.md:61-62`, `docs/product/MVP_SCOPE.md:84`.

Citations: `supabase/migrations/20261010061028_foundation.sql:29-32,40-42,51-53,280,293-294`; `supabase/migrations/20261017030000_mcp_oauth.sql:9-15`; `supabase/migrations/20261023092945_roles_and_permissions.sql:7-9`; `supabase/migrations/20261108091111_remove_business.sql:15-19`; `supabase/migrations/20261010061126_advisor_fixes.sql:16-17`; `supabase/migrations/20261114040239_memberships_owner_guard_delete.sql:6-9,48-50`; `web/src/lib/team/server.ts:5-8`; `web/src/lib/team/migration.test.ts:62-63`; `web/src/lib/memberships.ts:3-6,14-41`; `web/src/lib/auth.ts:33-44`; `web/src/lib/plans/access.ts:18`; `web/src/app/api/assistant/route.ts:64-66`; `docs/architecture/DATA_MODEL.md:61-62,89,149`

## Connected to

- **owns:** nothing
- **owned-by:** none (no organization)
- **joins:** [member-role](member-role.md) through `is_member`/`is_org_admin`; [membership](membership.md) (what it stands in for)
- **looks-like-but-is-not:** an `owner` [membership](membership.md) — a platform admin holds no role, so `is_org_owner`, `has_permission()` and `can()` refuse them

## If you change this

- **Hits:** `is_member` and `is_org_admin`, so every RLS policy built on them; any new read of `memberships` that does not filter by the user's id, because RLS shows staff every organization's memberships (`web/src/lib/memberships.ts:3-6`); `docs/architecture/DATA_MODEL.md:61-62,89`.
- **Does not hit:** `is_org_owner`, `has_permission()` and every `can()` gate (service keys and tool connections included); `memberships_owner_guard`; `getCurrentOrg`, `getOrgAccess` and the assistant's `getOrg`, which filter memberships by the user's id (`web/src/lib/auth.ts:33-44`, `web/src/lib/memberships.ts:14-41`, `web/src/lib/plans/access.ts:18`, `web/src/app/api/assistant/route.ts:64-66`).

## Surfaces

| Surface | Role |
|---|---|
| `is_member()` / `is_org_admin()` (`supabase/migrations/20261010061028_foundation.sql:35-54`) | reads |
| Braventa team in Supabase (`docs/architecture/DATA_MODEL.md:62`) | writes by hand |
| App pages and routes | none |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

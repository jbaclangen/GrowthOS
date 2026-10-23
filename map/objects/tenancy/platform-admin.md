---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261010061028_foundation.sql
---

# Platform admin (`platform_admins`)

Braventa staff who pass `is_member()` and `is_org_admin()` for every organization; rows are inserted by hand and no code reads the table directly.

## Why this shape

Staff need to see every tenant without a membership in each (`supabase/migrations/20261010061028_foundation.sql:29`). The bypass sits inside the two RLS helpers, so it costs no policy of its own; `is_org_owner` deliberately leaves it out (`supabase/migrations/20261017030000_mcp_oauth.sql:9-15`).

## Shape

- One column, `user_id` PK referencing `auth.users` — `supabase/migrations/20261010061028_foundation.sql:30-32`. No `organization_id`.
- RLS on; the only policy is "admins read self" — `supabase/migrations/20261010061028_foundation.sql:280,293-294`. No insert, update or delete policy.
- Consulted by `is_member` `supabase/migrations/20261010061028_foundation.sql:40-42` and `is_org_admin` `:51-53`; not by `is_org_owner` `supabase/migrations/20261017030000_mcp_oauth.sql:11-14`.
- No reference anywhere in `web/src` (grep at this commit). Rows are inserted manually; there is no admin UI — `docs/architecture/DATA_MODEL.md:48-49`, `docs/product/MVP_SCOPE.md:82`.

Citations: `supabase/migrations/20261010061028_foundation.sql:29-32,40-42,51-53,280,293-294`; `supabase/migrations/20261017030000_mcp_oauth.sql:9-15`; `docs/architecture/DATA_MODEL.md:48-49`

## Connected to

- **owns:** nothing
- **owned-by:** none (no organization)
- **joins:** [member-role](member-role.md) through `is_member`/`is_org_admin`; [membership](membership.md) (what it stands in for)
- **looks-like-but-is-not:** an `owner` [membership](membership.md) — a platform admin is never an owner, so owner-only SQL and TS checks refuse them

## If you change this

- **Hits:** `is_member` and `is_org_admin`, so every tenant policy; `docs/architecture/DATA_MODEL.md:48-49,73`.
- **Does not hit:** `is_org_owner` and the owner-only paths (service keys, Search Console connect, `memberships_owner_guard`); `getCurrentOrg`, which reads memberships only (`web/src/lib/auth.ts:26-28`).

## Surfaces

| Surface | Role |
|---|---|
| `is_member()` / `is_org_admin()` (`supabase/migrations/20261010061028_foundation.sql:35-54`) | reads |
| Braventa team in Supabase (`docs/architecture/DATA_MODEL.md:49`) | writes by hand |
| App pages and routes | none |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

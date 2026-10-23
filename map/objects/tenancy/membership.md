---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261010061028_foundation.sql
---

# Membership (`memberships`)

The link between a Supabase user and an organization, carrying the user's role; it is what `is_member()` and every RLS policy test.

## Why this shape

RLS must not recurse through its own table, so the helpers are `security definer` (`supabase/migrations/20261010061028_foundation.sql:34-43`). "members read memberships" returns co-members' rows too, so every read in code filters by the user's id (`web/src/lib/memberships.ts:3-6`). Admins may write memberships, which would let an admin make themselves owner; a trigger reserves owner rows for owners (`supabase/migrations/20261017030000_mcp_oauth.sql:19-23`).

## Shape

- PK (`organization_id`, `user_id`), `role` `member_role` default `member`, index on `user_id` — `supabase/migrations/20261010061028_foundation.sql:20-27`.
- Policies: "members read memberships" `supabase/migrations/20261010061028_foundation.sql:287-288`; "admins insert/update/delete memberships" `supabase/migrations/20261010061126_advisor_fixes.sql:10-17`.
- Trigger `memberships_owner_guard` (authenticated role only; owner rows need `is_org_owner`) — `supabase/migrations/20261017030000_mcp_oauth.sql:24-38`.
- The only insert in the repo is `create_organization`'s owner row — `supabase/migrations/20261010061028_foundation.sql:66-67`. No TS code inserts, updates or deletes memberships.
- Reads: `currentMembership` (oldest membership = the user's organization) and `memberOrganizations` — `web/src/lib/memberships.ts:11-21,24-33`; `getCurrentOrg` — `web/src/lib/auth.ts:26-28`; `getOrgAccess` — `web/src/lib/plans/access.ts:13-18`; MCP key owner still a member — `web/src/lib/mcp/auth.ts:33-39`; OAuth token user — `web/src/lib/mcp/auth.ts:65-67`; `isMember` in the OAuth store — `web/src/lib/oauth/supabase-store.ts:94-100`; Settings — `web/src/app/settings/page.tsx:42`.

Citations: `supabase/migrations/20261010061028_foundation.sql:20-27,34-43,66-67,287-288`; `supabase/migrations/20261010061126_advisor_fixes.sql:10-17`; `supabase/migrations/20261017030000_mcp_oauth.sql:19-38`; `web/src/lib/memberships.ts:3-33`

## Connected to

- **owns:** nothing
- **owned-by:** [organization](organization.md)
- **joins:** [member-role](member-role.md) (the `role` column); [platform-admin](platform-admin.md) bypasses it inside `is_member`/`is_org_admin`
- **looks-like-but-is-not:** [oauth-grant](../access/oauth-grant.md) — an app's access to an organization, not a person's

## If you change this

- **Hits:** `is_member`, `is_org_admin`, `is_org_owner` and so every RLS policy; `memberships_owner_guard`; `currentMembership`/`getCurrentOrg` and everything that takes "the user's first organization" (`web/src/lib/memberships.ts:10`); MCP and OAuth principal checks.
- **Does not hit:** [platform-admin](platform-admin.md) (separate table, no role column).

Ghost: invitations, seat limits and organization switching are planned, not built — `docs/decisions/DECISION_LOG.md:568-578` (D-046), `docs/product/ROADMAP.md:78-83`.

## Surfaces

| Surface | Role |
|---|---|
| `create_organization` RPC (`supabase/migrations/20261010061028_foundation.sql:66-67`) | writes (owner row) |
| Every page via `getCurrentOrg` (`web/src/lib/auth.ts:26-28`) | reads |
| `/api/mcp` auth (`web/src/lib/mcp/auth.ts:33-39,65-67`) | reads |
| `/settings` (`web/src/app/settings/page.tsx:42`) | reads |
| Every RLS policy through `is_member()` (`supabase/migrations/20261010061028_foundation.sql:35-43`) | reads |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

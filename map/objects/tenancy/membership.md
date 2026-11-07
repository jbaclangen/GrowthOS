---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-11-07
commit: 5757423
entity: supabase/migrations/20261010061028_foundation.sql
---

# Membership (`memberships`)

The link between a Supabase user and an organization, carrying the user's role; it is what `is_member()` and every RLS policy test.

## Why this shape

RLS must not recurse through its own table, so the helpers are `security definer` (`supabase/migrations/20261010061028_foundation.sql:34-43`). "members read memberships" returns co-members' rows too, so the reads in `web/src/lib/memberships.ts` filter by the user's id (`web/src/lib/memberships.ts:3-6`); `getOrgAccess` and the assistant's `getOrg` read through one of them, `firstOrganization` (`web/src/lib/plans/access.ts:16`, `web/src/app/api/assistant/route.ts:63-65`). Admins may write memberships, which would let an admin make themselves owner; a trigger reserves owner rows for owners (`supabase/migrations/20261017030000_mcp_oauth.sql:19-23`). The app's own writes (joining, role changes, removals) use the secret key, so that trigger doesn't see them; `canManageRole` keeps the owner role out of them instead (`supabase/migrations/20261107154953_team_invitations.sql:10-12`).

## Shape

- PK (`organization_id`, `user_id`), `role` `member_role`, index on `user_id` — `supabase/migrations/20261010061028_foundation.sql:20-27`; the default is now `analyst` and `member` rows became `analyst` — `supabase/migrations/20261023092945_roles_and_permissions.sql:23-27`.
- Policies: "members read memberships" `supabase/migrations/20261010061028_foundation.sql:287-288`; "admins insert/update/delete memberships" `supabase/migrations/20261010061126_advisor_fixes.sql:10-17`.
- Trigger `memberships_owner_guard` (authenticated role only; owner rows need `is_org_owner`) — `supabase/migrations/20261017030000_mcp_oauth.sql:24-38`.
- Writes: `create_organization` inserts the owner row — `supabase/migrations/20261010061028_foundation.sql:66-67`. App code writes with the secret key (`createSupabaseAdminClient`), scoped to an organization it has authorised: insert on joining an invite — `web/src/app/invite/[token]/actions.ts:51-57`; role change — `web/src/app/settings/team-actions.ts:111`; removal — `web/src/app/settings/team-actions.ts:134`. The rules and the audit row are on [team-invitation](team-invitation.md) and [invite-and-join](../../processes/invite-and-join.md).
- Settings → Team lists every member of the organization with their email (service client; emails live in `auth.users`) — `web/src/lib/team/team-server.ts:15-29`.
- Reads: `currentMembership` (oldest membership = the user's organization), `firstOrganization` (the same row with plan and trial) and `memberOrganizations` — `web/src/lib/memberships.ts:12-23,28-39,42-52`; `getCurrentOrg` — `web/src/lib/auth.ts:26-28`; `getOrgAccess` through `firstOrganization` — `web/src/lib/plans/access.ts:16`; the assistant's `getOrg` through `firstOrganization` — `web/src/app/api/assistant/route.ts:65`; OAuth consent — `web/src/app/oauth/authorize/actions.ts:30`; MCP key owner still a member, and their role — `web/src/lib/mcp/auth.ts:33-42`; OAuth token user and role — `web/src/lib/mcp/auth.ts:69-72`; `memberRole()` for permission checks — `web/src/lib/team/server.ts:8-16`; `has_permission()` — `supabase/migrations/20261023092945_roles_and_permissions.sql:30-35`; `isMember` in the OAuth store — `web/src/lib/oauth/supabase-store.ts:94-100`; Settings — `web/src/app/settings/page.tsx:44`.

Citations: `supabase/migrations/20261010061028_foundation.sql:20-27,34-43,66-67,287-288`; `supabase/migrations/20261010061126_advisor_fixes.sql:10-17`; `supabase/migrations/20261017030000_mcp_oauth.sql:19-38`; `supabase/migrations/20261023092945_roles_and_permissions.sql:23-35`; `web/src/lib/memberships.ts:3-52`; `web/src/lib/team/server.ts:8-16`; `web/src/lib/plans/access.ts:16`; `web/src/app/api/assistant/route.ts:63-65`; `web/src/app/invite/[token]/actions.ts:51-57`; `web/src/app/settings/team-actions.ts:111,134`; `web/src/lib/team/team-server.ts:15-29`

## Connected to

- **owns:** nothing
- **owned-by:** [organization](organization.md)
- **joins:** [member-role](member-role.md) (the `role` column); [platform-admin](platform-admin.md) bypasses it inside `is_member`/`is_org_admin`; [team-invitation](team-invitation.md) (an accepted invite becomes a membership; members and open invites are counted as seats)
- **looks-like-but-is-not:** [oauth-grant](../access/oauth-grant.md) — an app's access to an organization, not a person's

## If you change this

- **Hits:** `is_member`, `is_org_admin`, `is_org_owner` and so every RLS policy; `has_permission` and `memberRole` and so every permission gate; `memberships_owner_guard`; `currentMembership`/`getCurrentOrg`, `firstOrganization`/`getOrgAccess` and the assistant's `getOrg`, and everything that takes "the user's first organization" (`web/src/lib/memberships.ts:10,25`); MCP and OAuth principal checks; seat counting (`web/src/lib/team/team-server.ts:77-86`) and the Team list.
- **Does not hit:** [platform-admin](platform-admin.md) (separate table, no role column).

Ghost: organization switching and more than one business per account — an invite is refused for an account that already belongs to a business (`web/src/lib/team/invitations.ts:62-64`); planned in `docs/product/ROADMAP.md:82-83` (PL-6), open as Q-051 and Q-047 (`docs/decisions/OPEN_QUESTIONS.md:42,46`; `docs/architecture/ROLES_AND_PERMISSIONS.md:156-157`).

## Surfaces

| Surface | Role |
|---|---|
| `create_organization` RPC (`supabase/migrations/20261010061028_foundation.sql:66-67`) | writes (owner row) |
| `acceptInvitation` (`web/src/app/invite/[token]/actions.ts:51-57`) | writes (insert, secret key) |
| `changeMemberRole`, `removeMember` (`web/src/app/settings/team-actions.ts:111,134`) | writes (update, delete; secret key) |
| Every page via `getCurrentOrg` (`web/src/lib/auth.ts:26-28`) | reads |
| `/plans` and the header plan label via `getOrgAccess` (`web/src/app/plans/page.tsx:25`, `web/src/app/layout.tsx:56`), and `/api/assistant` (`web/src/app/api/assistant/route.ts:65`), both through `firstOrganization` | reads |
| `/api/mcp` auth (`web/src/lib/mcp/auth.ts:33-42,69-72`) | reads |
| `/settings` (`web/src/app/settings/page.tsx:44`) | reads |
| Permission gates via `memberRole()` (`web/src/lib/team/server.ts:8-21`) and `has_permission()` (`supabase/migrations/20261023092945_roles_and_permissions.sql:30-35`) | reads |
| Every RLS policy through `is_member()` (`supabase/migrations/20261010061028_foundation.sql:35-43`) | reads |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

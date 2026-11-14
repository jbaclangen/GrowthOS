---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-11-14
commit: ed8c44c
entity: supabase/migrations/20261010061028_foundation.sql
---

# Membership (`memberships`)

The link between a Supabase user and an organization, carrying the user's role; it is what `is_member()` and every RLS policy test.

## Why this shape

RLS must not recurse through its own table, so the helpers are `security definer` (`supabase/migrations/20261010061028_foundation.sql:34-43`). "members read memberships" returns co-members' rows too, so the reads in `web/src/lib/memberships.ts` filter by the user's id (`web/src/lib/memberships.ts:3-6`); `getOrgAccess` and the assistant's `getOrg` read through one of them, `currentOrganization`, with the business the person chose (`web/src/lib/plans/access.ts:18`, `web/src/app/api/assistant/route.ts:64-66`; [switch-business](../../processes/switch-business.md)). Owner memberships are also what an account's business limit counts ([account-trial](account-trial.md)). Admins may write memberships, which would let an admin make themselves owner; a trigger reserves owner rows for owners (`supabase/migrations/20261017030000_mcp_oauth.sql:19-23`). It first fired on insert and update only, so an admin (or platform staff) could delete the owner's membership with the publishable key and leave the business without an owner; since 2026-11-14 it fires on delete too and keeps a business's last owner (`supabase/migrations/20261114040239_memberships_owner_guard_delete.sql:6-11`; `docs/architecture/ROLES_AND_PERMISSIONS.md:167-172`). The app's own writes (joining, role changes, removals) use the secret key, so that trigger doesn't see them; `canManageRole` keeps the owner role out of them instead (`supabase/migrations/20261107154953_team_invitations.sql:10-12`).

## Shape

- PK (`organization_id`, `user_id`), `role` `member_role`, index on `user_id` — `supabase/migrations/20261010061028_foundation.sql:20-27`; the default is now `analyst` and `member` rows became `analyst` — `supabase/migrations/20261023092945_roles_and_permissions.sql:23-27`.
- Policies: "members read memberships" `supabase/migrations/20261010061028_foundation.sql:287-288`; "admins insert/update/delete memberships" `supabase/migrations/20261010061126_advisor_fixes.sql:10-17`.
- Trigger `memberships_owner_guard`, first version: before insert or update, authenticated role only; making or changing an owner row needs `is_org_owner` — `supabase/migrations/20261017030000_mcp_oauth.sql:24-38`.
- In force since 2026-11-14 (applied with the founder's yes as version 20261114040239): `supabase/migrations/20261114040239_memberships_owner_guard_delete.sql` replaces the guard to fire before delete too (only an owner removes an owner), refuses removing or re-roling a business's last owner, and returns `coalesce(new, old)` so deletes and cascades go through — `supabase/migrations/20261114040239_memberships_owner_guard_delete.sql:1-31,36-68`. `migration.test.ts` reads this file as the newest definition — `web/src/lib/team/migration.test.ts:114-154`.
- Writes: `create_organization` inserts the owner row (current definition, D-062) — `supabase/migrations/20261108103906_business_limits.sql:112` (first at `supabase/migrations/20261010061028_foundation.sql:66-67`). App code writes with the secret key (`createSupabaseAdminClient`), scoped to an organization it has authorised: insert on joining an invite — `web/src/app/invite/[token]/actions.ts:51-57`; role change — `web/src/app/settings/team-actions.ts:116`; removal — `web/src/app/settings/team-actions.ts:139`. The rules and the audit row are on [team-invitation](team-invitation.md) and [invite-and-join](../../processes/invite-and-join.md).
- Settings → Team lists every member of the organization with their email (service client; emails live in `auth.users`) — `web/src/lib/team/team-server.ts:15-29`.
- Reads: `currentOrganization` / `currentMembership` (the chosen business if the user belongs to it, else the oldest membership), `memberOrganizations` and `ownedOrganizations` (role owner, for the business limit) — `web/src/lib/memberships.ts:14-53`; `getCurrentOrg` (optionally for one named business, through `memberRole`) — `web/src/lib/auth.ts:33-44`; `getOrgAccess` — `web/src/lib/plans/access.ts:18`; the assistant's `getOrg` — `web/src/app/api/assistant/route.ts:66`; `memberOrganizations` for the header switcher `web/src/app/layout.tsx:63`, Settings → Businesses `web/src/app/settings/businesses-section.tsx:25`, the invite page and `acceptInvitation` (already a member?) `web/src/app/invite/[token]/page.tsx:44`, `web/src/app/invite/[token]/actions.ts:24` and the OAuth consent page `web/src/app/oauth/authorize/page.tsx:64`; OAuth consent action — `web/src/app/oauth/authorize/actions.ts:30`; MCP key owner still a member, and their role — `web/src/lib/mcp/auth.ts:33-42`; OAuth token user and role — `web/src/lib/mcp/auth.ts:69-72`; `memberRole()` for permission checks — `web/src/lib/team/server.ts:8-16`; `has_permission()` (newest definition) — `supabase/migrations/20261108091111_remove_business.sql:15-20`; `isMember` in the OAuth store — `web/src/lib/oauth/supabase-store.ts:94-101`; Settings (each business's name for key labels, `keys.manage_any`) — `web/src/app/settings/page.tsx:45,50-56`.

Citations: `supabase/migrations/20261010061028_foundation.sql:20-27,34-43,66-67,287-288`; `supabase/migrations/20261010061126_advisor_fixes.sql:10-17`; `supabase/migrations/20261017030000_mcp_oauth.sql:19-38`; `supabase/migrations/20261023092945_roles_and_permissions.sql:23-27`; `supabase/migrations/20261108091111_remove_business.sql:15-20`; `supabase/migrations/20261108103906_business_limits.sql:112`; `supabase/migrations/20261114040239_memberships_owner_guard_delete.sql:1-68`; `web/src/lib/memberships.ts:3-53`; `web/src/lib/auth.ts:33-44`; `web/src/lib/team/server.ts:8-16`; `web/src/lib/team/migration.test.ts:114-154`; `web/src/lib/plans/access.ts:18`; `web/src/app/api/assistant/route.ts:64-66`; `web/src/app/invite/[token]/actions.ts:24,51-57`; `web/src/app/settings/team-actions.ts:116,139`; `web/src/lib/team/team-server.ts:15-29`; `docs/architecture/ROLES_AND_PERMISSIONS.md:167-172`

## Connected to

- **owns:** nothing
- **owned-by:** [organization](organization.md)
- **joins:** [member-role](member-role.md) (the `role` column); [platform-admin](platform-admin.md) bypasses it inside `is_member`/`is_org_admin`; [team-invitation](team-invitation.md) (an accepted invite becomes a membership; members and open invites are counted as seats); [account-trial](account-trial.md) (owner rows count toward the business limit)
- **looks-like-but-is-not:** [oauth-grant](../access/oauth-grant.md) — an app's access to an organization, not a person's

## If you change this

- **Hits:** `is_member`, `is_org_admin`, `is_org_owner` and so every RLS policy; `has_permission` and `memberRole` and so every permission gate; `memberships_owner_guard` with its delete and last-owner rules (2026-11-14) and their test; `currentMembership`/`getCurrentOrg`, `currentOrganization`/`getOrgAccess` and the assistant's `getOrg`, and everything that takes "the business the user is working on" ([switch-business](../../processes/switch-business.md)); the business limit (`ownedOrganizations`, `create_organization()`; [account-trial](account-trial.md)); MCP and OAuth principal checks; seat counting (`web/src/lib/team/team-server.ts:77-86`) and the Team list.
- **Does not hit:** [platform-admin](platform-admin.md) (separate table, no role column).

Since D-062 a person can belong to several businesses and own up to their plan's limit, enforced by `supabase/migrations/20261108103906_business_limits.sql` (applied 2026-11-08).

## Surfaces

| Surface | Role |
|---|---|
| `create_organization` RPC (`supabase/migrations/20261108103906_business_limits.sql:112`) | writes (owner row) |
| `acceptInvitation` (`web/src/app/invite/[token]/actions.ts:51-57`) | writes (insert, secret key) |
| `changeMemberRole`, `removeMember` (`web/src/app/settings/team-actions.ts:116,139`) | writes (update, delete; secret key) |
| Admin or platform staff with the publishable key ("admins delete memberships", `supabase/migrations/20261010061126_advisor_fixes.sql:16-17`) | can delete any member's membership except an owner's: that is refused since 2026-11-14 (`supabase/migrations/20261114040239_memberships_owner_guard_delete.sql:48-50`) |
| Every page via `getCurrentOrg` (`web/src/lib/auth.ts:33-44`) | reads |
| `/plans` and the header plan label via `getOrgAccess` (`web/src/app/plans/page.tsx:29`, `web/src/app/layout.tsx:62,66`), and `/api/assistant` (`web/src/app/api/assistant/route.ts:66`), both through `currentOrganization` | reads |
| Header switcher and Settings → Businesses via `memberOrganizations` (`web/src/app/layout.tsx:63`, `web/src/app/settings/businesses-section.tsx:25`) | reads |
| `/api/mcp` auth (`web/src/lib/mcp/auth.ts:33-42,69-72`) | reads |
| `/settings` (`web/src/app/settings/page.tsx:45`) | reads |
| Permission gates via `memberRole()` (`web/src/lib/team/server.ts:8-21`) and `has_permission()` (`supabase/migrations/20261108091111_remove_business.sql:15-20`) | reads |
| Every RLS policy through `is_member()` (`supabase/migrations/20261010061028_foundation.sql:35-43`) | reads |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

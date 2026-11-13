---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
entity: supabase/migrations/20261107154953_team_invitations.sql
---

# Team invitation (`team_invitations`, with `team_events`)

A one-time invite link for one email address and one role (Settings → Team), plus `team_events`, the append-only log of invites, withdrawals, joins, role changes and removals; the seat rules and the manage-below-your-role rule that gate them live in `web/src/lib/team/`.

## Why this shape

The link is a bearer secret, so only its SHA-256 is stored and the token is shown once, like every other secret (`supabase/migrations/20261107154953_team_invitations.sql:3-6`; `web/src/lib/team/invitations.ts:5-6`). The invitee isn't a member yet, so no RLS policy can let them write; every write uses the secret key after app-code checks, and clients only read through `team.manage` (`supabase/migrations/20261107154953_team_invitations.sql:35-40,58-62`). For the same reason `memberships_owner_guard` never sees these writes, so the owner role is kept out by `canManageRole` and the role check on the table (`:10-12,19`). Braventa sends no email yet (Q-010), so the manager copies the link (`web/src/lib/team/invitations.ts:1-3`).

## Shape

- `team_invitations`: `email` lowercase 3–320, `role` never `owner` or `client_approver`, `token_hash` unique hex-64, `invited_by`, `expires_at` default 7 days, `accepted_at`/`accepted_by`, `revoked_at` — `supabase/migrations/20261107154953_team_invitations.sql:15-27`; one open invite per address per business (partial unique index) — `:31-33`; select policy `has_permission(org, 'team.manage')`, column grant without `token_hash` — `:35-40`.
- `team_events`: `action` ∈ `invited | invite_revoked | joined | role_changed | removed`, `actor_id`, `subject_email`, `subject_user_id`, `role_from`, `role_to` — `supabase/migrations/20261107154953_team_invitations.sql:43-53`; read by `team.manage`, no client writes — `:58-62`. Writer `recordTeamEvent` — `web/src/lib/team/team-server.ts:88-109`.
- Token `brv_inv_` + 43 base64url characters, hash, path `/invite/<token>`, 7-day TTL — `web/src/lib/team/invitations.ts:11-19`; email normalized — `:21-27`; state `open | accepted | revoked | expired` — `:35-42`; why a signed-in person can't accept (already a member, used, withdrawn, expired, another email; belonging to another business no longer blocks, D-062) — `:44-62`.
- Who manages whom: `INVITABLE_ROLES` (no client approver), `canManageRole` (holds `team.manage` and the target's permissions are a strict subset of the actor's), `assignableRoles` — `web/src/lib/team/roles.ts:122-138`.
- Seats: allowances per tier (full 2/5/10, analyst 5/10/unlimited) — `web/src/lib/team/seats.ts:15-19`; seat kind per role (owner takes a full seat, client approver none yet) — `:23-34`; `seatUsage`, `seatAvailable` (refusal names the plan and points to Plans), `seatSummary` — `:39-69`.
- Reads (service client; caller passes an organization it has authorised): `teamMembers` (emails from `auth.users`) — `web/src/lib/team/team-server.ts:15-29`; `openInvitations` — `:31-42`; `invitationByTokenHash` — `:56-74`; `seatState` counts members plus open invites at the effective tier — `:77-86`.

Citations: `supabase/migrations/20261107154953_team_invitations.sql:1-62`; `web/src/lib/team/invitations.ts:1-62`; `web/src/lib/team/seats.ts:1-69`; `web/src/lib/team/team-server.ts:8-109`; `web/src/lib/team/roles.ts:122-138`; `web/src/app/settings/team-actions.ts:13-29`

## Connected to

- **owns:** `team_events` rows (same migration)
- **owned-by:** [organization](organization.md) (`on delete cascade`, `supabase/migrations/20261107154953_team_invitations.sql:17,45`)
- **joins:** [membership](membership.md) (an accepted invite becomes a membership; members and open invites count as seats); [member-role](member-role.md) (`team.manage`, the role on the invite); [plan-tier](plan-tier.md) (`effectiveAccess` picks the allowance, `web/src/lib/team/team-server.ts:83`); [mcp-access-key](../access/mcp-access-key.md) and [oauth-grant](../access/oauth-grant.md) (revoked when a member is removed)
- **looks-like-but-is-not:** [membership](membership.md) — an invite is not access until Join; [oauth-grant](../access/oauth-grant.md) — an app's access, not a person's; the `brv_` personal key and `brv_inv_` link share a prefix family but nothing else

## If you change this

- **Hits:** [invite-and-join](../../processes/invite-and-join.md); Settings → Team (`web/src/app/settings/team-section.tsx`, `team-forms.tsx`, `team-actions.ts`); `/invite/[token]` ([app-routes](../config/app-routes.md)); the unit tests `web/src/lib/team/invitations.test.ts`, `seats.test.ts`, `web/src/app/settings/team-actions.test.ts`; the Roles section of [assistant-knowledge](../access/assistant-knowledge.md), which states the seats and invite rules in prose (`web/src/lib/assistant/knowledge.ts:252-255`); `docs/architecture/ROLES_AND_PERMISSIONS.md` §8; `docs/architecture/DATA_MODEL.md`.
- **Does not hit:** the pipeline, the report, Search Console; `memberships_owner_guard` (secret-key writes bypass it).

Ghost: invite emails (Q-010), buying extra seats (Stripe; prices stay off the app and site), client approver invites (D-047) — `docs/architecture/ROLES_AND_PERMISSIONS.md` §7; `web/src/lib/team/seats.ts:2-3`.

## Surfaces

| Surface | Role |
|---|---|
| Settings → Team (`web/src/app/settings/team-section.tsx:13-21`) | reads (members, open invites, seats) |
| `inviteMember`, `revokeInvitation` (`web/src/app/settings/team-actions.ts:38-95`), each for the business the form named (`organizationId`, `manager()` `:23-29`) | writes `team_invitations`, `team_events` (secret key) |
| `changeMemberRole`, `removeMember` (`web/src/app/settings/team-actions.ts:99-150`) | write `team_events` (and `memberships`) |
| `/invite/[token]` page and `acceptInvitation` (`web/src/app/invite/[token]/page.tsx:30`; `web/src/app/invite/[token]/actions.ts:17-68`) | reads by token hash; claims the invite, writes `team_events` |
| Owner or admin (`team.manage`) | creates, copies once, sends, withdraws |

## See

- Source: `supabase/migrations/20261107154953_team_invitations.sql`, `web/src/lib/team/invitations.ts`, `web/src/lib/team/seats.ts`, `web/src/lib/team/team-server.ts`
- As built: `docs/architecture/ROLES_AND_PERMISSIONS.md`

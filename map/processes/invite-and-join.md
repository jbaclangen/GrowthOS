---
type: process
universe: live
status: verified
verified: 2026-11-07
commit: 5757423
consumes: ["[[team-invitation]]", "[[membership]]", "[[member-role]]", "[[plan-tier]]"]
produces: ["[[team-invitation]]", "[[membership]]"]
---

# invite-and-join

An owner or admin invites someone by a copied one-time link, the invitee joins the business from it, and managers change or remove people below their own role.

## Input → Movement → Output

A manager enters an email address and a role in Settings → Team and gets a one-time `/invite/<token>` link to send themselves. The invitee opens it, signs in or creates an account with that address, and selects Join, which re-checks the link, the address, the seat and that the account has no other business. The result is a `memberships` row with the invited role, a claimed `team_invitations` row and a `team_events` row; role changes and removals update or delete the membership and log the same way.

## Why this shape

No policy can let a non-member insert their own membership, so every write goes through server actions with the secret key, each re-running the checks the page showed (`web/src/app/invite/[token]/actions.ts:13-15`; `web/src/app/settings/team-actions.ts:12-14`). The invite is claimed before the membership is inserted so one link can't be used twice at once, and the claim is undone if the insert fails (`web/src/app/invite/[token]/actions.ts:41-57`). The seat check runs again at join because the plan or team may have changed since the invite (`:15`, `:34-39`).

## Steps

1. Settings renders the Team section for any member; controls only when `assignableRoles` is non-empty (`team.manage`) — `web/src/app/settings/page.tsx:63`; `web/src/app/settings/team-section.tsx:12-20,44,56-62`.
2. `inviteMember`: manager check — `web/src/app/settings/team-actions.ts:18-24`; email and an assignable role — `:38-41`; not already a member — `:43-45`; a previous open invite for the address must be one the manager could replace — `:47-49`; seat check with that invite set aside — `:50-52`; old link revoked, new token hashed and inserted with a 7-day expiry — `:54-67`; `invited` event — `:68`; link returned once — `:70-71`.
3. The manager copies the link from the form and sends it by their own channel (no email, Q-010) — `web/src/app/settings/team-forms.tsx:8-10,37-39`.
4. A signed-out invitee hitting `/invite/<token>` is redirected to `/login?next=/invite/<token>` (the path is not in `PUBLIC_PATHS`) — `web/src/proxy.ts:46-53`; the login page shows invite copy for that `next` — `web/src/app/login/page.tsx:22,29-30`; sign-up carries `next` through the email confirmation — `web/src/app/login/actions.ts:38,41`.
5. The invite page loads the invite by token hash and shows the business and role, or the blocker (with Sign out for the wrong account) — `web/src/app/invite/[token]/page.tsx:27-53,63-82`; blockers — `web/src/lib/team/invitations.ts:47-66`.
6. `acceptInvitation`: token shape and lookup — `web/src/app/invite/[token]/actions.ts:17-21`; same blockers — `:23-32`; seat check without this invite's held seat — `:34-39`; claim — `:41-49`; membership insert, undo on failure — `:51-57`; `joined` event — `:58-65`; redirect to `/dashboard` — `:66`.
7. `revokeInvitation` (Withdraw): only an invite whose role the manager can manage — `web/src/app/settings/team-actions.ts:74-90`.
8. `changeMemberRole`: both the current and the new role must be below the manager's — `web/src/app/settings/team-actions.ts:94-105`; seat check when the seat kind changes — `:106-110`; update and `role_changed` event — `:111-121`.
9. `removeMember`: target below the manager's role — `web/src/app/settings/team-actions.ts:126-132`; membership deleted — `:134`; their personal keys and OAuth grants for the business revoked — `:138-142`; `removed` event — `:143`.

## Human gate

Two people act: the manager decides to create the invite (email, role) and sends the link themselves; the invitee selects Join (`web/src/app/invite/[token]/accept-form.tsx:6-12`). Nothing joins without that click, and role changes and removals are each a manager's explicit form submit (`web/src/app/settings/team-section.tsx:44-50`).

## If you change this

- **Hits:** [team-invitation](../objects/tenancy/team-invitation.md), [membership](../objects/tenancy/membership.md), [member-role](../objects/tenancy/member-role.md) (`canManageRole`), [plan-tier](../objects/tenancy/plan-tier.md) (seat allowances), [mcp-access-key](../objects/access/mcp-access-key.md) and [oauth-grant](../objects/access/oauth-grant.md) (removal), [app-routes](../objects/config/app-routes.md) (`/invite/[token]`, `?next=`), [assistant-knowledge](../objects/access/assistant-knowledge.md) (`/invite/[token]` in `APP_ROUTES`, the Roles prose).
- **Does not hit:** the pipeline, the report, onboarding; `create_organization` (still the only path to an owner).

## Surfaces

| Surface | Role |
|---|---|
| Owner or admin (`team.manage`) | invites, copies and sends the link, withdraws, changes roles, removes |
| Invitee | opens the link, signs in with the invited address, selects Join |
| `web/src/proxy.ts` | sends a signed-out invitee to `/login?next=` |
| Server actions with the secret key | write `team_invitations`, `memberships`, `team_events`, revoke keys and grants |

## See

- Objects: [[team-invitation]], [[membership]], [[member-role]], [[plan-tier]]
- Source: `web/src/app/settings/team-actions.ts`, `web/src/app/invite/[token]/`

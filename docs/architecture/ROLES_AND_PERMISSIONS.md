# Roles and permissions

**Status:** foundation built 2026-10-23 (D-046; research README §4 step 4; the spec step of D-052); invitations by
link, seat limits, role changes and removals built 2026-11-07 (§8). Describes the code as it is. Invite emails (Q-010),
buying extra seats (Stripe), client approval links (D-047) and seat prices on the site are not built; §7 lists what is
open.

Every member of an organization has one of eight fixed roles with fixed permissions (D-046; research
[SEATS_ROLES_MODULES_2026-10-17.md](../research/SEATS_ROLES_MODULES_2026-10-17.md) §2). There are no custom roles.
Two places hold the same matrix and a unit test proves they agree:

- `web/src/lib/team/roles.ts`: the role list, the permission list, `can(role, permission)` and the approval rule.
  Pure logic, unit-tested in `roles.test.ts`, following the `tiers.ts` and `registry.ts` pattern. Server code reads the
  user's role with `memberRole()` in `web/src/lib/team/server.ts`.
- `public.has_permission(org uuid, perm text)` in the database (migration `20261023092945_roles_and_permissions.sql`,
  applied 2026-10-23): the same matrix for triggers and, later, RLS write policies. `migration.test.ts` in
  `web/src/lib/team/` parses the SQL and compares every role and permission with `can()`, and checks the approval
  rule in the newest definition of the `content_items` guard.

Rule (CLAUDE.md): a role check in the app goes through `can()`; a role check in SQL goes through `has_permission()`.
No app code compares a role to a literal such as `"owner"`. In SQL, `is_org_admin()`, `is_org_owner()` and
`memberships_owner_guard` still compare role text: they predate the matrix and carry the `memberships` and
service-key policies, so a matrix change doesn't reach them until they move to `has_permission()`.

## 1. Roles

`memberships.role` is the enum `member_role`. Ids are snake_case; labels are sentence case.

| Id | Label | Who |
|---|---|---|
| `owner` | Owner | The person who created the business; `create_organization()` makes them the owner. Only an owner can make another owner (`memberships_owner_guard`, D-044) |
| `admin` | Admin | Runs the business in Braventa short of billing, integrations and service keys |
| `marketing_manager` | Marketing manager | Runs analyses, corrects the diagnosis, works the plan, approves others' drafts |
| `social_media_manager` | Social media manager | Drafts content; channel reports; the planner's approver toggle later |
| `copywriter` | Copywriter | Drafts content for approval |
| `content_creator` | Content creator | Drafts content for approval |
| `analyst` | Analyst | View-only, plus reports and the read-only assistant. The least privilege a member can have |
| `client_approver` | Client approver | An outside client who approves assigned items through a signed link (D-047, not built). No permission today |

The old `member` value (owner, admin, member before 2026-10-23) was mapped to `analyst`, the least privilege: in the
production database that touched 0 rows (2 owners, nothing else). The column's default is `analyst`; nothing inserts a
membership today except `create_organization()`, which sets `owner`. The previous enum type (renamed `member_role_v1`
by the migration) was dropped from the SQL editor the same day, because the MCP tool refuses destructive statements;
that drop isn't a recorded migration.

`is_member()` (any role, or platform staff) and `is_org_admin()` (owner or admin, or platform staff) keep working as
before and still carry every RLS policy. `is_org_owner()` keeps the service-key policies. `has_permission()` has no
platform-staff bypass: staff without a membership have no permission, in SQL and in the app alike.

## 2. Permissions

Ids follow the research matrix rows. "Enforced today" is where code checks the permission; a permission that nothing
enforces yet is still in the matrix so the next feature doesn't invent its own rule.

| Id | Means | Enforced today |
|---|---|---|
| `billing.view` | See the plan, credits and invoices | Not yet: no billing. `/plans` and its "Talk to us" request stay open to every member |
| `billing.manage` | Change the plan, pay, top up | Not yet: no billing |
| `team.manage` | Invite, change roles, remove members | Settings → Team and `app/settings/team-actions.ts`, with the manage-below-your-role rule (§8). RLS on `memberships` (`is_org_admin`) allows the same two roles |
| `integrations.connect` | Connect, choose a property for, reconnect and disconnect a tool (Google Search Console) | `GET /api/integrations/google/start` and `callback`, `chooseSearchConsoleProperty`, `disconnectSearchConsoleAction`, the Search Console card and the "Connect your tools" plan line (`lib/integrations/connect-step.ts`) |
| `keys.manage_own` | Create and revoke a personal access key | `createAccessKey` and the Settings key form, once the user has a business (§6). Revoking one's own key isn't gated (RLS: own rows only) |
| `keys.manage_any` | Create and revoke service keys; disconnect any app, not only one's own | `createServiceKey`, the Service keys section, `disconnectApp` for another person's grant; RLS `is_org_owner` on service keys |
| `profile.edit` | Edit the business profile and answer discovery | `saveOwnerInputs`; every onboarding action (`submitDiscovery`, `skipDiscovery`, `submitReview`, `continueAfterConnect`, `submitFollowUps`, `skipFollowUps`); MCP `braventa_submit_discovery`, `braventa_confirm_priorities`, `braventa_answer_follow_up_questions` |
| `analysis.run` | Start or re-run an analysis (uses credits) | `startAnalysis` once the business exists, `rerunAnalysis`; MCP `braventa_start_onboarding` |
| `diagnosis.correct` | Mark findings right or wrong, request the update, confirm the diagnosis | `setFindingVerdict`, `requestDiagnosisUpdate`, `confirmDiagnosis` |
| `plan_items.update_own` | Accept, dismiss or mark done the items assigned to oneself | Not yet: plan items have no assignee. See §7 |
| `plan_items.update_any` | Accept, dismiss or mark done any item | `setPlanItemStatus` |
| `content.draft` | Write or edit a draft | Not yet: nothing lets a person draft; the pipeline writes every draft. The approval guard records `created_by` on client inserts, ready for it |
| `content.approve` | Approve, reject or undo a draft someone else wrote | `setContentStatus`; trigger `guard_content_item_write` |
| `content.approve_own` | Approve one's own draft | Same two places. Owner only (D-046) |
| `reports.view` | See performance reports (Search performance, later analytics) | Not yet: every member reads every page of their organization through RLS |
| `reports.export` | Export a report | Not yet: no export |
| `assistant.use` | Ask Braventa (the in-app assistant) | Not yet: the plan rule (`lib/assistant/access.ts`) is the only gate |

"Reports" means performance reports, not the analysis page: a copywriter reads the diagnosis, plan and drafts like
every member.

## 3. The matrix

As code enforces it (`ROLE_PERMISSIONS` in `roles.ts`; the `case perm` in `has_permission()`).

| Permission | Owner | Admin | Marketing manager | Social media manager | Copywriter | Content creator | Analyst | Client approver |
|---|---|---|---|---|---|---|---|---|
| `billing.view` | Yes | Yes | — | — | — | — | — | — |
| `billing.manage` | Yes | — | — | — | — | — | — | — |
| `team.manage` | Yes | Yes | — | — | — | — | — | — |
| `integrations.connect` | Yes | — | — | — | — | — | — | — |
| `keys.manage_own` | Yes | Yes | Yes | Yes | — | — | — | — |
| `keys.manage_any` | Yes | — | — | — | — | — | — | — |
| `profile.edit` | Yes | Yes | Yes | — | — | — | — | — |
| `analysis.run` | Yes | Yes | Yes | — | — | — | — | — |
| `diagnosis.correct` | Yes | Yes | Yes | — | — | — | — | — |
| `plan_items.update_own` | Yes | Yes | Yes | Yes | Yes | Yes | — | — |
| `plan_items.update_any` | Yes | Yes | Yes | — | — | — | — | — |
| `content.draft` | Yes | Yes | Yes | Yes | Yes | Yes | — | — |
| `content.approve` | Yes | Yes | Yes | — | — | — | — | — |
| `content.approve_own` | Yes | — | — | — | — | — | — | — |
| `reports.view` | Yes | Yes | Yes | Yes | — | — | Yes | — |
| `reports.export` | Yes | Yes | Yes | — | — | — | Yes | — |
| `assistant.use` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | — |

Where this differs from the research matrix, and why:

- **Keys:** the research gives Admin full key rights. D-044 and the current RLS keep service keys owner-only, and the
  founder's instruction for this build was that service keys keep their rule, so `keys.manage_any` is Owner only.
- **Client approver:** the research says "approve or reject assigned items" and "shared report only". Nothing assigns
  items or shares reports yet, and D-047's approval link is a separate, signed path, so the role has no permission
  until that ships. No such membership exists.
- **Social media manager approval** needs the planner's approver toggle (D-049), which doesn't exist, so the role
  doesn't approve.
- **Integrations:** the research shows View for Admin and Marketing manager. Viewing the connection card isn't a
  permission: every member sees it; only connecting is gated.

## 4. The approval rule

D-046: no one approves their own work except the Owner, and every approval is recorded (D-013, D-018).

- `content_items.created_by` (added 2026-10-23, nullable) is the author. The approval guard trigger sets it to
  `auth.uid()` on every client insert and keeps it unchanged on updates, so a client can't claim or hide authorship.
  Drafts the pipeline writes with the service client have no author, so the rule only bites once a user-authored draft
  exists.
- Approving needs `content.approve`; approving an item whose `created_by` is the approver needs `content.approve_own`.
  `setContentStatus` checks both with `can()` and `approvalAllowed()` before writing, and the trigger
  `guard_content_item_write` checks both again with `has_permission()`, so a direct Data API call can't get around the
  action. Rejecting and undoing need `content.approve` too.
- The trigger refuses a client change of `organization_id` (migration
  `20261023224450_content_guard_pins_organization.sql`, applied 2026-10-24). Without it, the `members all` policy would let a member
  without `content.approve` move a draft into a business they own (anyone can create one), approve it there and move
  it back. No app path moves content between businesses.
- The approver stays database-set: `approved_by = auth.uid()`, `approved_at = now()` on approval, cleared otherwise
  (D-018). Server code with the secret key is not restricted, as before.

## 5. The AI assistant connection (MCP)

A personal access key or an OAuth sign-in acts with its user's role: `authenticateMcp` reads the membership's role, and
`handleMessage` refuses a tool whose `permission` the role lacks, with the same message the web action gives. The
tools that write carry the web action's permission (§2). Service keys belong to the business, not a person
(D-044), and keep their rule: they can call every onboarding tool. Read tools (`braventa_get_*`) have no permission.

## 6. Settings

Settings shows the signed-in user's role in words under the page title ("Your role in Acme Plumbing is owner."), then
the Team section (§8). Personal access keys need `keys.manage_own` since invitations exist: copywriters, content
creators and analysts see why instead of the key form, and `createAccessKey` refuses them. A user with no business yet
can still create a key, which creates the business with them as owner (D-036).

## 7. Open

- **`plan_items.update_own`** waits on an assignee on plan items; until then only `plan_items.update_any` is checked.
- **Client approvers** get their permissions with D-047's approval link and item assignment.
- **RLS write policies** still say "member": a member can write the M-all tables directly with the publishable key
  ([SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) §2). `has_permission()` is there to tighten them; nothing is
  rewritten yet.
- **Invite emails** need transactional email (Q-010); today the manager copies the link. **Buying extra seats** needs
  Stripe; seat prices stay off the app and the site (D-039, D-046).
- **More than one business per account** (Q-051): an invite is refused for an account that already belongs to a
  business, because the app reads the first membership (Q-047).
- **RLS on `memberships`** still lets anyone `is_org_admin()` (owner, admin) write memberships directly with the
  publishable key; the app's own writes go through §8's rules with the secret key. Moving those policies to
  `has_permission('team.manage')` and the manage-below-your-role rule is part of the RLS rewrite above.
- **`organization_modules.enabled`** (Q-048) can now get its rule: a permission id here, then a write path.
- **Research matrix differences** (§3) are the founder's to confirm or widen: Admin and keys, client approver rights,
  Admin and integrations.

## 8. Team: invitations, seats, role changes

Built 2026-11-07 (founder choices that day: invite by copied link, block at the seat limit). Code:
`web/src/lib/team/invitations.ts`, `seats.ts`, `team-server.ts`, `canManageRole()` in `roles.ts`,
`web/src/app/settings/team-*.tsx` and `team-actions.ts`, `web/src/app/invite/[token]/`. Migration
`20261107130000_team_invitations.sql`.

**Who manages whom.** `team.manage` (owner, admin) opens Settings → Team's controls. A manager may invite, re-role or
remove only people whose role holds strictly fewer permissions than their own, and give only such a role
(`canManageRole`, `assignableRoles`). So an owner manages admins and everyone below, an admin manages everyone below
admin but not other admins, no one manages an owner or changes their own role, and the owner role is never given in the
app. Client approvers can't be invited until D-047's approval link exists. Every member sees the member list.

**Invitations.** An invite is for one email address and one role. The manager copies a one-time link
(`/invite/brv_inv_…`) and sends it themselves; Braventa sends no email yet (Q-010). Only the token's SHA-256 is stored
(`team_invitations.token_hash`). A link works once, for 7 days, and only for an account with the invited address.
Inviting the same address again withdraws the old link. A signed-out invitee is sent to sign in or create an account
and comes back to the link (`?next=`, through the email confirmation too); selecting Join checks everything again,
claims the invite and adds the membership. An account that already belongs to a business can't join a second one yet
(Q-051).

**Seats (D-046).** Full seats 2 / 5 / 10 on Basic / Pro (and the trial) / Premium; analyst seats 5 / 10 / unlimited.
Every role except analyst and client approver takes a full seat, the owner's included. Open invites hold their seat.
An invite, a role change that moves someone between seat kinds, and joining are refused when the plan has no seat
left; the message points to Plans. Nothing is removed when a plan shrinks (a trial ending): new invites are refused
until people leave. Two people joining in the same second can go one seat over; accepted for now.

**Writes.** Invitations have no client write policy; joining, role changes and removals write `memberships` with the
secret key, scoped to the manager's own business (or the invite's business), after the checks above. Removing someone
also revokes their personal keys and Sign in with Braventa grants for that business (the MCP server already refuses a
non-member). Every invite, withdrawal, join, role change and removal is recorded in `team_events` (append-only, read by
`team.manage`), the start of SECURITY_AND_PRIVACY.md §11's audit log.

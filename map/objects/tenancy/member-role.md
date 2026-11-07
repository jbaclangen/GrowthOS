---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-11-07
commit: 5757423
entity: supabase/migrations/20261023092945_roles_and_permissions.sql
---

# Member role (`member_role`)

The enum on a membership — eight fixed roles (D-046) — plus the one permission matrix (`can()` in TS, `has_permission()` in SQL) and the three older SQL helpers that decide what each may do.

## Why this shape

Policies test membership through `security definer` helpers so they never recurse (`supabase/migrations/20261010061028_foundation.sql:34`). `is_org_owner` came later, without the platform-admin bypass, as the boundary for owner-only actions (`supabase/migrations/20261017030000_mcp_oauth.sql:8-19`). D-046's eight roles replaced `owner`/`admin`/`member`; Postgres can't drop an enum value, so the type was replaced (`supabase/migrations/20261023092945_roles_and_permissions.sql:3-6`). The matrix lives in two places a test keeps equal (`web/src/lib/team/roles.ts:1-6`; `docs/architecture/ROLES_AND_PERMISSIONS.md:10-23`).

## Shape

- Enum, eight values; `member` rows became `analyst`, the new default — `supabase/migrations/20261023092945_roles_and_permissions.sql:19-27` (replaces `supabase/migrations/20261010061028_foundation.sql:18`); `memberships.role` `foundation.sql:23`. TS `ROLES`/`Role` and labels — `web/src/lib/team/roles.ts:8-30`.
- Matrix: `ROLE_PERMISSIONS` `web/src/lib/team/roles.ts:81-102`, `can()` `:108-112`; SQL `has_permission(org, perm)` (no platform-admin bypass) `supabase/migrations/20261023092945_roles_and_permissions.sql:30-60`; equality test `web/src/lib/team/migration.test.ts`. Server read `memberRole()`/`hasPermission()` — `web/src/lib/team/server.ts:8-21`. Where each permission is enforced: `docs/architecture/ROLES_AND_PERMISSIONS.md:55-73` (§2).
- `is_member(org)`: member or platform admin — `supabase/migrations/20261010061028_foundation.sql:35-43`. `is_org_admin(org)`: owner/admin or platform admin — `:45-54`. Both revoked from anon, granted to authenticated — `supabase/migrations/20261010061126_advisor_fixes.sql:4-7`.
- `is_org_owner(org)`: owners only, no platform-admin bypass — `supabase/migrations/20261017030000_mcp_oauth.sql:9-17`.
- SQL owner-only uses: service-key policies `supabase/migrations/20261017030000_mcp_oauth.sql:228-233`; `memberships_owner_guard` `:24-38`. Admin uses: "admins update org" `supabase/migrations/20261010061028_foundation.sql:284-285`; membership writes `supabase/migrations/20261010061126_advisor_fixes.sql:11-17`. `has_permission` use: the approval guard `supabase/migrations/20261023224450_content_guard_pins_organization.sql:46-55`.
- `web/src/lib/memberships.ts:8,22` still types the role as a plain string; `can()` holds nothing for an unknown one (`web/src/lib/team/roles.ts:104-112`). Owner-only gates, now through `can()`: `keys.manage_any` for service keys `web/src/app/settings/integrations-actions.ts:25` and another person's app `:77`, Settings `web/src/app/settings/page.tsx:52,154`; `integrations.connect` for Search Console start `web/src/app/api/integrations/google/start/route.ts:36` and callback `web/src/app/api/integrations/google/callback/route.ts:47`, choosing a property and disconnecting `web/src/app/settings/connections-actions.ts:24,40,52`, the Search Console card `web/src/components/connections/search-console-card.tsx:77`, the connect step's `role` `web/src/app/onboarding/[sessionId]/connect/page.tsx:66` → `owner-only` card state and line `web/src/lib/integrations/connect-step.ts:38,42,73`.
- `team.manage` (owner, admin) opens Settings → Team's controls; a manager may invite, re-role or remove only a role holding strictly fewer permissions than their own — `canManageRole`/`assignableRoles` `web/src/lib/team/roles.ts:118-134`, matrix `:84`. The invitations, seats and team actions built on it: [team-invitation](team-invitation.md), [invite-and-join](../../processes/invite-and-join.md). `keys.manage_own` gates personal keys — `web/src/app/settings/actions.ts:34-35` ([mcp-access-key](../access/mcp-access-key.md)).
- Settings role line — `web/src/app/settings/page.tsx:54,61` → `roleSentence` `web/src/lib/team/roles.ts:158-161`. MCP: a key or sign-in carries its user's role — `web/src/lib/mcp/principal.ts:10-12,54-63`; write tools carry a `permission` — `web/src/lib/mcp/tools.ts:43`, refused at `web/src/lib/mcp/protocol.ts:92-93`.

Citations: `supabase/migrations/20261010061028_foundation.sql:18,23,35-54,284-285`; `supabase/migrations/20261010061126_advisor_fixes.sql:4-17`; `supabase/migrations/20261017030000_mcp_oauth.sql:9-38,228-233`; `supabase/migrations/20261023092945_roles_and_permissions.sql:3-6,19-27,30-60`; `supabase/migrations/20261023224450_content_guard_pins_organization.sql:46-55`; `web/src/lib/team/roles.ts:8-30,81-112,118-134,158-161`; `web/src/lib/team/server.ts:8-21`; `web/src/lib/memberships.ts:8,22`

## Connected to

- **owns:** nothing
- **owned-by:** [membership](membership.md)
- **joins:** [platform-admin](platform-admin.md) (bypass inside `is_member`/`is_org_admin`, not in `is_org_owner` or `has_permission`); [mcp-access-key](../access/mcp-access-key.md) (service keys are owner-only); [integration-connection](../integrations/integration-connection.md) (connecting is owner-only); [content-item](../report/content-item.md) (`content.approve`, `content.approve_own`); [mcp-tool-call](../access/mcp-tool-call.md) (write tools need the caller's permission); [team-invitation](team-invitation.md) (an invite carries a role, never owner or client approver; seats are counted by role)
- **looks-like-but-is-not:** [plan-tier](plan-tier.md) — what the organization may use, not who in it may act

## If you change this

- **Hits:** every RLS policy; both copies of the matrix and `web/src/lib/team/migration.test.ts`; the gates in `docs/architecture/ROLES_AND_PERMISSIONS.md:55-73`; `docs/architecture/DATA_MODEL.md:47-50,60`.
- **Does not hit:** [plan-tier](plan-tier.md) gates (`effectiveAccess` never reads the role).

Ghost: client approver permissions (D-047), `plan_items.update_own` and per-permission RLS write policies (the `memberships` policies still use `is_org_admin`) — `docs/architecture/ROLES_AND_PERMISSIONS.md:149-153,158-160`. Permissions nothing checks yet: `billing.*`, `content.draft`, `reports.*`, `assistant.use` — `docs/architecture/ROLES_AND_PERMISSIONS.md:57-58,68,71-73`. (§2's rows for `team.manage` and `keys.manage_own`, `:59,61`, still say not enforced; the code enforces both.)

## Surfaces

| Surface | Role |
|---|---|
| RLS policies (`supabase/migrations/20261010061028_foundation.sql:282-320`) | reads via helpers |
| Approval guard (`supabase/migrations/20261023224450_content_guard_pins_organization.sql:46-55`) | reads (`has_permission`) |
| Settings → service keys (`web/src/app/settings/integrations-actions.ts:25`) | reads (`keys.manage_any`) |
| Settings role line (`web/src/app/settings/page.tsx:54,61`) | reads |
| Settings → Team and its actions (`web/src/app/settings/team-section.tsx:14-15`; `web/src/app/settings/team-actions.ts:18-24`) | reads (`team.manage` through `assignableRoles`/`canManageRole`) |
| Personal key form and `createAccessKey` (`web/src/app/settings/page.tsx:56`; `web/src/app/settings/actions.ts:35`) | reads (`keys.manage_own`) |
| Google OAuth routes (`web/src/app/api/integrations/google/start/route.ts:36`) | reads (`integrations.connect`) |
| Search Console property and disconnect (`web/src/app/settings/connections-actions.ts:24`) | reads (`integrations.connect`) |
| Write actions (`web/src/app/analysis/actions.ts:55,81,154`; `web/src/app/analysis/plan-actions.ts:37,63,108,158`; `web/src/app/onboarding/[sessionId]/actions.ts:21`) | reads (`analysis.run`, `profile.edit`, `diagnosis.correct`, `plan_items.update_any`) |
| Draft approval (`web/src/app/analysis/actions.ts:117-118`) | reads (`content.approve`, `content.approve_own`) |
| Connect step (`web/src/app/onboarding/[sessionId]/connect/page.tsx:66`) | reads (`integrations.connect`) |
| `/api/mcp` (`web/src/lib/mcp/protocol.ts:92-93`) | reads (tool `permission`) |

## See

- Source: `supabase/migrations/20261023092945_roles_and_permissions.sql`, `web/src/lib/team/roles.ts`
- As built: `docs/architecture/ROLES_AND_PERMISSIONS.md`, `docs/architecture/DATA_MODEL.md`

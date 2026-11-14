---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
entity: supabase/migrations/20261023092945_roles_and_permissions.sql
---

# Member role (`member_role`)

The enum on a membership — eight fixed roles (D-046) — plus the one permission matrix (`can()` in TS, `has_permission()` in SQL) and the three older SQL helpers that decide what each may do.

## Why this shape

Policies test membership through `security definer` helpers so they never recurse (`supabase/migrations/20261010061028_foundation.sql:34`). `is_org_owner` came later, without the platform-admin bypass, as the boundary for owner-only actions (`supabase/migrations/20261017030000_mcp_oauth.sql:8-17`). D-046's eight roles replaced `owner`/`admin`/`member`; Postgres can't drop an enum value, so the type was replaced (`supabase/migrations/20261023092945_roles_and_permissions.sql:3-6`). The matrix lives in two places a test keeps equal (`web/src/lib/team/roles.ts:1-6`; `docs/architecture/ROLES_AND_PERMISSIONS.md:10-22`).

## Shape

- Enum, eight values; `member` rows became `analyst`, the new default — `supabase/migrations/20261023092945_roles_and_permissions.sql:19-27` (replaces `supabase/migrations/20261010061028_foundation.sql:18`); `memberships.role` `foundation.sql:23`. TS `ROLES`/`Role` and labels — `web/src/lib/team/roles.ts:8-30`.
- Matrix: `ROLE_PERMISSIONS` `web/src/lib/team/roles.ts:81-106`, `can()` `:112-116`; SQL `has_permission(org, perm)` (no platform-admin bypass), created at `supabase/migrations/20261023092945_roles_and_permissions.sql:30-60` and replaced whole by the newest definition, which adds `organization.delete` — `supabase/migrations/20261108091111_remove_business.sql:15-47`; the equality test reads that newest definition — `web/src/lib/team/migration.test.ts:18-25,51-76`. Server read `memberRole()`/`hasPermission()` — `web/src/lib/team/server.ts:8-21`. Where each permission is enforced: `docs/architecture/ROLES_AND_PERMISSIONS.md:60-79` (§2).
- `is_member(org)`: member or platform admin — `supabase/migrations/20261010061028_foundation.sql:35-43`. `is_org_admin(org)`: owner/admin or platform admin — `:45-54`. Both revoked from anon, granted to authenticated — `supabase/migrations/20261010061126_advisor_fixes.sql:4-7`.
- `is_org_owner(org)`: owners only, no platform-admin bypass — `supabase/migrations/20261017030000_mcp_oauth.sql:9-17`.
- SQL owner-only uses: service-key policies `supabase/migrations/20261017030000_mcp_oauth.sql:226-233`; `memberships_owner_guard` `:24-38` (its delete extension is written, not applied: [membership](membership.md)). Admin uses: "admins update org" `supabase/migrations/20261010061028_foundation.sql:284-285`; membership writes `supabase/migrations/20261010061126_advisor_fixes.sql:11-17`. `has_permission` use: the approval guard `supabase/migrations/20261023224450_content_guard_pins_organization.sql:46-55`.
- `web/src/lib/memberships.ts:12,23` still types the role as a plain string; `can()` holds nothing for an unknown one (`web/src/lib/team/roles.ts:112-116`). Owner-only gates, through `can()`: `keys.manage_any` (matrix row `web/src/lib/team/roles.ts:91`) for service keys `web/src/app/settings/integrations-actions.ts:31` and another person's app `:86`, Settings `web/src/app/settings/page.tsx:56,162`; `integrations.connect` (matrix row `web/src/lib/team/roles.ts:88`) for the Google start and callback routes `web/src/app/api/integrations/google/start/route.ts:39`, `web/src/app/api/integrations/google/callback/route.ts:55`, the HubSpot ones `web/src/app/api/integrations/hubspot/start/route.ts:38`, `web/src/app/api/integrations/hubspot/callback/route.ts:49`, choosing a property and disconnecting `web/src/app/settings/connections-actions.ts:28,44,71,84,99,115`, the connection cards `web/src/components/connections/search-console-card.tsx:78`, `web/src/components/connections/analytics-card.tsx:74`, `web/src/components/connections/hubspot-card.tsx:77`, the connect step's `role` `web/src/app/onboarding/[sessionId]/connect/page.tsx:73` → `owner-only` card state and line `web/src/lib/integrations/connect-step.ts:38,46,77`. `organization.delete` (owner only, D-061, `web/src/lib/team/roles.ts:104-105`) gates Remove business: [remove-business](../../processes/remove-business.md).
- `team.manage` (owner, admin) opens Settings → Team's controls; a manager may invite, re-role or remove only a role holding strictly fewer permissions than their own — `canManageRole`/`assignableRoles` `web/src/lib/team/roles.ts:122-138`, matrix `:86`. The invitations, seats and team actions built on it: [team-invitation](team-invitation.md), [invite-and-join](../../processes/invite-and-join.md). `keys.manage_own` (matrix row `web/src/lib/team/roles.ts:89`) gates personal keys — `web/src/app/settings/actions.ts:56-57` ([mcp-access-key](../access/mcp-access-key.md)).
- Settings role line — `web/src/app/settings/page.tsx:58,65` → `roleSentence` `web/src/lib/team/roles.ts:162-165`. MCP: a key or sign-in carries its user's role — `web/src/lib/mcp/principal.ts:10-12,54-63`; write tools carry a `permission` — `web/src/lib/mcp/tools.ts:43`, refused at `web/src/lib/mcp/protocol.ts:92-93`.

Citations: `supabase/migrations/20261010061028_foundation.sql:18,23,34-54,284-285`; `supabase/migrations/20261010061126_advisor_fixes.sql:4-17`; `supabase/migrations/20261017030000_mcp_oauth.sql:8-38,226-233`; `supabase/migrations/20261023092945_roles_and_permissions.sql:3-6,19-27,30-60`; `supabase/migrations/20261108091111_remove_business.sql:15-47`; `supabase/migrations/20261023224450_content_guard_pins_organization.sql:46-55`; `web/src/lib/team/roles.ts:1-30,81-116,122-138,162-165`; `web/src/lib/team/server.ts:8-21`; `web/src/lib/team/migration.test.ts:18-25,51-76`; `web/src/lib/memberships.ts:12,23`

## Connected to

- **owns:** nothing
- **owned-by:** [membership](membership.md)
- **joins:** [platform-admin](platform-admin.md) (bypass inside `is_member`/`is_org_admin`, not in `is_org_owner` or `has_permission`); [mcp-access-key](../access/mcp-access-key.md) (service keys are owner-only); [integration-connection](../integrations/integration-connection.md) (connecting is owner-only); [content-item](../report/content-item.md) (`content.approve`, `content.approve_own`); [mcp-tool-call](../access/mcp-tool-call.md) (write tools need the caller's permission); [team-invitation](team-invitation.md) (an invite carries a role, never owner or client approver; seats are counted by role)
- **looks-like-but-is-not:** [plan-tier](plan-tier.md) — what the organization may use, not who in it may act

## If you change this

- **Hits:** every RLS policy; both copies of the matrix (a new permission means a migration that replaces the whole `has_permission()`) and `web/src/lib/team/migration.test.ts`; the gates in `docs/architecture/ROLES_AND_PERMISSIONS.md:60-79`; `docs/architecture/DATA_MODEL.md:51-54,68`.
- **Does not hit:** [plan-tier](plan-tier.md) gates (`effectiveAccess` never reads the role).

Ghost: client approver permissions (D-047), `plan_items.update_own` and per-permission RLS write policies (the `memberships` policies still use `is_org_admin`) — `docs/architecture/ROLES_AND_PERMISSIONS.md:157-161,164-166`. Permissions nothing checks yet: `billing.*`, `content.draft`, `reports.*`, `assistant.use` — `docs/architecture/ROLES_AND_PERMISSIONS.md:62-63,73,76-78`.

## Surfaces

| Surface | Role |
|---|---|
| RLS policies (`supabase/migrations/20261010061028_foundation.sql:282-320`) | reads via helpers |
| Approval guard (`supabase/migrations/20261023224450_content_guard_pins_organization.sql:46-55`) | reads (`has_permission`) |
| Settings → service keys (`web/src/app/settings/integrations-actions.ts:31`) | reads (`keys.manage_any`) |
| Settings role line (`web/src/app/settings/page.tsx:58,65`) | reads |
| Settings → Team and its actions (`web/src/app/settings/team-section.tsx:15-16`; `web/src/app/settings/team-actions.ts:23-29`) | reads (`team.manage` through `assignableRoles`/`canManageRole`) |
| Settings → Businesses Remove (`web/src/app/settings/businesses-section.tsx:104`) | reads (`organization.delete`) |
| Personal key form and `createAccessKey` (`web/src/app/settings/page.tsx:60`; `web/src/app/settings/actions.ts:57`) | reads (`keys.manage_own`) |
| Google and HubSpot OAuth routes (`web/src/app/api/integrations/google/start/route.ts:39`; `web/src/app/api/integrations/hubspot/start/route.ts:38`) | reads (`integrations.connect`) |
| Property choice and disconnect (`web/src/app/settings/connections-actions.ts:28,99`) | reads (`integrations.connect`) |
| Write actions (`web/src/app/analysis/actions.ts:70,97,170`; `web/src/app/analysis/plan-actions.ts:37,63,108,158`; `web/src/app/onboarding/[sessionId]/actions.ts:21`) | reads (`analysis.run`, `profile.edit`, `diagnosis.correct`, `plan_items.update_any`) |
| Draft approval (`web/src/app/analysis/actions.ts:133-138`) | reads (`content.approve`, `content.approve_own`) |
| Connect step (`web/src/app/onboarding/[sessionId]/connect/page.tsx:73`) | reads (`integrations.connect`) |
| `/api/mcp` (`web/src/lib/mcp/protocol.ts:92-93`) | reads (tool `permission`) |

## See

- Source: `supabase/migrations/20261023092945_roles_and_permissions.sql`, `web/src/lib/team/roles.ts`
- As built: `docs/architecture/ROLES_AND_PERMISSIONS.md`, `docs/architecture/DATA_MODEL.md`

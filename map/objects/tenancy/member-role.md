---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261023092945_roles_and_permissions.sql
---

# Member role (`member_role`)

The enum on a membership — eight fixed roles (D-046) — plus the one permission matrix (`can()` in TS, `has_permission()` in SQL) and the three older SQL helpers that decide what each may do.

## Why this shape

Policies test membership through `security definer` helpers so they never recurse (`supabase/migrations/20261010061028_foundation.sql:34`). `is_org_owner` came later, without the platform-admin bypass, as the boundary for owner-only actions (`supabase/migrations/20261017030000_mcp_oauth.sql:8-19`). D-046's eight roles replaced `owner`/`admin`/`member`; Postgres can't drop an enum value, so the type was replaced (`supabase/migrations/20261023092945_roles_and_permissions.sql:3-6`). The matrix lives in two places a test keeps equal (`web/src/lib/team/roles.ts:1-6`; `docs/architecture/ROLES_AND_PERMISSIONS.md:9-22`).

## Shape

- Enum, eight values; `member` rows became `analyst`, the new default — `supabase/migrations/20261023092945_roles_and_permissions.sql:19-27` (replaces `supabase/migrations/20261010061028_foundation.sql:18`); `memberships.role` `foundation.sql:23`. TS `ROLES`/`Role` and labels — `web/src/lib/team/roles.ts:8-30`.
- Matrix: `ROLE_PERMISSIONS` `web/src/lib/team/roles.ts:81-102`, `can()` `:108-112`; SQL `has_permission(org, perm)` (no platform-admin bypass) `supabase/migrations/20261023092945_roles_and_permissions.sql:30-60`; equality test `web/src/lib/team/migration.test.ts`. Server read `memberRole()`/`hasPermission()` — `web/src/lib/team/server.ts:8-21`. Where each permission is enforced: `docs/architecture/ROLES_AND_PERMISSIONS.md:54-72` (§2).
- `is_member(org)`: member or platform admin — `supabase/migrations/20261010061028_foundation.sql:35-43`. `is_org_admin(org)`: owner/admin or platform admin — `:45-54`. Both revoked from anon, granted to authenticated — `supabase/migrations/20261010061126_advisor_fixes.sql:4-7`.
- `is_org_owner(org)`: owners only, no platform-admin bypass — `supabase/migrations/20261017030000_mcp_oauth.sql:9-17`.
- SQL owner-only uses: service-key policies `supabase/migrations/20261017030000_mcp_oauth.sql:228-233`; `memberships_owner_guard` `:24-38`. Admin uses: "admins update org" `supabase/migrations/20261010061028_foundation.sql:284-285`; membership writes `supabase/migrations/20261010061126_advisor_fixes.sql:11-17`. `has_permission` use: the approval guard `supabase/migrations/20261023224450_content_guard_pins_organization.sql:46-55`.
- `web/src/lib/memberships.ts:8,20` still types the role as a plain string; `can()` holds nothing for an unknown one (`web/src/lib/team/roles.ts:104-112`). Owner-only gates, now through `can()`: `keys.manage_any` for service keys `web/src/app/settings/integrations-actions.ts:25` and another person's app `:77`, Settings `web/src/app/settings/page.tsx:51,145`; `integrations.connect` for Search Console start `web/src/app/api/integrations/google/start/route.ts:36` and callback `web/src/app/api/integrations/google/callback/route.ts:47`, choosing a property and disconnecting `web/src/app/settings/connections-actions.ts:24,40,52`, the Search Console card `web/src/components/connections/search-console-card.tsx:77`, the connect step's `role` `web/src/app/onboarding/[sessionId]/connect/page.tsx:66` → `owner-only` card state and line `web/src/lib/integrations/connect-step.ts:38,42,73`.
- Settings role line — `web/src/app/settings/page.tsx:53,58` → `roleSentence` `web/src/lib/team/roles.ts:140-143`. MCP: a key or sign-in carries its user's role — `web/src/lib/mcp/principal.ts:10-12,54-63`; write tools carry a `permission` — `web/src/lib/mcp/tools.ts:42`, refused at `web/src/lib/mcp/protocol.ts:92-93`.

Citations: `supabase/migrations/20261010061028_foundation.sql:18,23,35-54,284-285`; `supabase/migrations/20261010061126_advisor_fixes.sql:4-17`; `supabase/migrations/20261017030000_mcp_oauth.sql:9-38,228-233`; `supabase/migrations/20261023092945_roles_and_permissions.sql:3-6,19-27,30-60`; `supabase/migrations/20261023224450_content_guard_pins_organization.sql:46-55`; `web/src/lib/team/roles.ts:8-30,81-112,140-143`; `web/src/lib/team/server.ts:8-21`; `web/src/lib/memberships.ts:8,20`

## Connected to

- **owns:** nothing
- **owned-by:** [membership](membership.md)
- **joins:** [platform-admin](platform-admin.md) (bypass inside `is_member`/`is_org_admin`, not in `is_org_owner` or `has_permission`); [mcp-access-key](../access/mcp-access-key.md) (service keys are owner-only); [integration-connection](../integrations/integration-connection.md) (connecting is owner-only); [content-item](../report/content-item.md) (`content.approve`, `content.approve_own`); [mcp-tool-call](../access/mcp-tool-call.md) (write tools need the caller's permission)
- **looks-like-but-is-not:** [plan-tier](plan-tier.md) — what the organization may use, not who in it may act

## If you change this

- **Hits:** every RLS policy; both copies of the matrix and `web/src/lib/team/migration.test.ts`; the gates in `docs/architecture/ROLES_AND_PERMISSIONS.md:54-72`; `docs/architecture/DATA_MODEL.md:46-49,59`.
- **Does not hit:** [plan-tier](plan-tier.md) gates (`effectiveAccess` never reads the role).

Ghost: invitations, seat limits, a role UI, client approver permissions (D-047), `keys.manage_own`, `plan_items.update_own` and per-permission RLS write policies — `docs/decisions/DECISION_LOG.md:583-586`, `docs/architecture/ROLES_AND_PERMISSIONS.md:144-158`. The other permissions §2 lists as not enforced yet (`billing.*`, `team.manage`, `content.draft`, `reports.*`, `assistant.use`) — `docs/architecture/ROLES_AND_PERMISSIONS.md:56-72`.

## Surfaces

| Surface | Role |
|---|---|
| RLS policies (`supabase/migrations/20261010061028_foundation.sql:282-320`) | reads via helpers |
| Approval guard (`supabase/migrations/20261023224450_content_guard_pins_organization.sql:46-55`) | reads (`has_permission`) |
| Settings → service keys (`web/src/app/settings/integrations-actions.ts:25`) | reads (`keys.manage_any`) |
| Settings role line (`web/src/app/settings/page.tsx:53,58`) | reads |
| Google OAuth routes (`web/src/app/api/integrations/google/start/route.ts:36`) | reads (`integrations.connect`) |
| Search Console property and disconnect (`web/src/app/settings/connections-actions.ts:24`) | reads (`integrations.connect`) |
| Write actions (`web/src/app/analysis/actions.ts:55,81,154`; `web/src/app/analysis/plan-actions.ts:37,63,108,158`; `web/src/app/onboarding/[sessionId]/actions.ts:21`) | reads (`analysis.run`, `profile.edit`, `diagnosis.correct`, `plan_items.update_any`) |
| Draft approval (`web/src/app/analysis/actions.ts:117-118`) | reads (`content.approve`, `content.approve_own`) |
| Connect step (`web/src/app/onboarding/[sessionId]/connect/page.tsx:66`) | reads (`integrations.connect`) |
| `/api/mcp` (`web/src/lib/mcp/protocol.ts:92-93`) | reads (tool `permission`) |

## See

- Source: `supabase/migrations/20261023092945_roles_and_permissions.sql`, `web/src/lib/team/roles.ts`
- As built: `docs/architecture/ROLES_AND_PERMISSIONS.md`, `docs/architecture/DATA_MODEL.md`

---
type: object
cluster: access
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
entity: supabase/migrations/20261017030000_mcp_oauth.sql
---

# Connected app (`oauth_grants`)

One person's approval for one OAuth client to use the MCP server for one organization; Settings lists it under "Connected apps".

## Why this shape

Tokens belong to a grant (their family), so disconnecting or detecting refresh-token reuse revokes everything at once (`supabase/migrations/20261017030000_mcp_oauth.sql:99-102`). A replayed authorization code inserts the grant already revoked, so the genuine exchange fails on the primary key instead of going live (`:101-102`; `web/src/lib/oauth/supabase-store.ts:39-45,54-61`; `web/src/lib/oauth/grants.ts:172-185`). Revoked rows stay as the record of what was connected (`…mcp_oauth.sql:250-251`).

## Shape

- Columns: `user_id`, `client_id` (FK), `client_name`, `scopes` (1–10), `resource`, `last_used_at`, `revoked_at`, `revoked_reason` `user | refresh_reuse | code_reuse | membership` — `supabase/migrations/20261017030000_mcp_oauth.sql:103-115`
- RLS "members read"; column grant leaves out `client_id`, `resource` and `revoked_reason` — `:119-124`
- Writers (service client): `createGrant`, `revokeGrant` — `web/src/lib/oauth/supabase-store.ts:39-64`; Settings disconnect sets `revoked_reason: "user"` and revokes its tokens — `web/src/app/settings/integrations-actions.ts:72-95`; someone else's grant needs `keys.manage_any` ([member-role](../tenancy/member-role.md)) — `:77`, `web/src/lib/team/roles.ts:89`
- `/api/mcp` reads `revoked_at` and bumps `last_used_at` — `web/src/lib/mcp/auth.ts:66-67,77-80`; a revoked grant is refused — `web/src/lib/mcp/principal.ts:74-76`
- Reader: `ConnectedApps` (unrevoked grants; a live refresh token decides the "Signed out" chip) — `web/src/app/settings/integrations-sections.tsx:17-36,58`; disconnect offered by the same rule — `:52`, `web/src/app/settings/page.tsx:50-51`

Citations: `supabase/migrations/20261017030000_mcp_oauth.sql:98-124`, `web/src/lib/oauth/supabase-store.ts:39-64`

## Connected to

- **owns:** [oauth-token](oauth-token.md) (FK `grant_id`, cascade); [mcp-tool-call](mcp-tool-call.md) rows via `oauth_grant_id`
- **owned-by:** [organization](../tenancy/organization.md), [oauth-client](oauth-client.md), a user ([membership](../tenancy/membership.md))
- **joins:** nothing else
- **looks-like-but-is-not:** [mcp-access-key](mcp-access-key.md) (no consent screen, no client); [integration-connection](../integrations/integration-connection.md)

## If you change this

- **Hits:** [mcp-onboarding](../../processes/mcp-onboarding.md) (OAuth path), Settings → Connected apps, `web/src/lib/oauth/grants.ts`, `docs/architecture/MCP_SERVER.md` §3
- **Does not hit:** personal and service keys, the pipeline

## Surfaces

| Surface | Role |
|---|---|
| `/oauth/token` (`web/src/lib/oauth/grants.ts`) | writes |
| Settings → Connected apps | reads; disconnect writes |
| `POST /api/mcp` | reads, `last_used_at` |
| The person who connected, or a holder of `keys.manage_any` (owner) | disconnects |

## See

- Source: `supabase/migrations/20261017030000_mcp_oauth.sql`, `web/src/lib/oauth/supabase-store.ts`
- As built: `docs/architecture/DATA_MODEL.md` (row `oauth_grants`, line 106)

---
type: object
cluster: access
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
entity: supabase/migrations/20261017030000_mcp_oauth.sql
---

# OAuth token (`oauth_tokens`, with `oauth_authorization_codes`)

The hashed secrets of the OAuth flow: one-time authorization codes, then access tokens (`brv_at_…`, 1 hour) and refresh tokens (`brv_rt_…`, 30 days, rotated on every use).

## Why this shape

Only SHA-256 hashes are stored and `token_hash` is never granted to clients, so a read of the table yields nothing usable (`supabase/migrations/20261017030000_mcp_oauth.sql:4-6,182-184`). A rotated refresh token keeps `rotated_at` and `successor_id`: a second presentation within 60 s while the successor is unused is a retry, later it ends the whole grant (`:152-154,171`; `web/src/lib/oauth/supabase-store.ts:77-90`). Codes carry `grant_id` before the grant exists so a replayed code can revoke what it issued (`…mcp_oauth.sql:127-128`).

## Shape

- `oauth_tokens`: `grant_id` FK, `kind` `access | refresh`, `token_hash` unique, `scopes`, `resource`, `expires_at`, `revoked_at`, `rotated_at`, `successor_id`, `last_used_at` — `supabase/migrations/20261017030000_mcp_oauth.sql:155-172`; RLS "members read", grant without `token_hash`, `rotated_at` or `successor_id` — `:178-184`
- `oauth_authorization_codes`: `code_hash`, `grant_id`, `redirect_uri`, `code_challenge` (PKCE S256), `expires_at`, `used_at` — `:129-143`; RLS on, no policies — `:148-149`
- Token prefixes and classifier — `web/src/lib/oauth/tokens.ts:8-9,17-18,59`
- Writers (service client): `insertCode`, `consumeCode` — `web/src/lib/oauth/supabase-store.ts:23-38`; `insertTokens`, `consumeRefreshToken`, `revokeToken` — `:65-93`
- `/api/mcp` resolves an access token by hash, then its grant and membership — `web/src/lib/mcp/auth.ts:60-81`; the membership's role goes with the call — `:69-72`, `web/src/lib/mcp/principal.ts:87` ([member-role](../tenancy/member-role.md), `docs/architecture/ROLES_AND_PERMISSIONS.md` §5)
- Cleanup a day after expiry: `oauth_cleanup` — `…mcp_oauth.sql:252-262`

Citations: `supabase/migrations/20261017030000_mcp_oauth.sql:126-184`, `web/src/lib/oauth/supabase-store.ts:23-93`

## Connected to

- **owns:** nothing
- **owned-by:** [oauth-grant](oauth-grant.md), [oauth-client](oauth-client.md), [organization](../tenancy/organization.md)
- **joins:** nothing
- **looks-like-but-is-not:** [mcp-access-key](mcp-access-key.md) (long-lived, no refresh); the Google refresh token on [integration-connection](../integrations/integration-connection.md) (encrypted, not hashed, because Braventa must present it)

## If you change this

- **Hits:** `web/src/lib/oauth/grants.ts`, `/oauth/token`, `/oauth/revoke`, `authenticateMcp`, `docs/architecture/MCP_SERVER.md` §3 and §7
- **Does not hit:** key-based auth, Settings key lists, the pipeline

## Surfaces

| Surface | Role |
|---|---|
| `/oauth/authorize` (codes), `/oauth/token` (exchange, refresh), `/oauth/revoke` | writes |
| `POST /api/mcp` | reads, `last_used_at` |
| Settings → Connected apps | reads `grant_id` for liveness; disconnect revokes |

## See

- Source: `supabase/migrations/20261017030000_mcp_oauth.sql`, `web/src/lib/oauth/supabase-store.ts`
- As built: `docs/architecture/MCP_SERVER.md`

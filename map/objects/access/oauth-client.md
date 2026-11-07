---
type: object
cluster: access
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
entity: supabase/migrations/20261017030000_mcp_oauth.sql
---

# OAuth client (`oauth_clients`)

An app (claude.ai, Claude Desktop/Code, ChatGPT or anything else) registered through `/oauth/register` (RFC 7591) so it can start "Sign in with Braventa".

## Why this shape

Registration is unauthenticated, so the table is global (no `organization_id`), has RLS on with no policies, and only the service role touches it (`supabase/migrations/20261017030000_mcp_oauth.sql:41-42,64-65`). Abuse is capped by a trigger under advisory locks: 10 registrations per IP hash per hour and 500 per hour overall, with first-party AI clients exempt from the overall cap (`:67-96`). Secrets are hashed (`:46-47`); the IP is stored only as an HMAC (`:53-55`).

## Shape

- `client_id` `brv_client_…` unique; `client_secret_hash` for confidential clients; `token_endpoint_auth_method` `none | client_secret_post | client_secret_basic`; `client_name`, `client_uri`, `redirect_uris` (1–10); `registration_ip_hash`; `first_party` — `supabase/migrations/20261017030000_mcp_oauth.sql:43-60`
- Trigger `oauth_clients_rate_limit` before insert — `:71-96`; `P0001 rate_limited` → HTTP 429 with `Retry-After` — `web/src/app/oauth/register/route.ts:58-60`
- Insert: `web/src/app/oauth/register/route.ts:41-57`; IP hash `registrationIpHash` `web/src/lib/oauth/supabase-store.ts:133-138`
- Read: `findClient`, `authenticateClient` — `web/src/lib/oauth/supabase-store.ts:106-128`
- Cleanup: clients with no code or grant after 7 days, `oauth_cleanup` — `…mcp_oauth.sql:252-262`, called by `cleanUpOAuth` `supabase-store.ts:142-145`

Citations: `supabase/migrations/20261017030000_mcp_oauth.sql:40-96`, `web/src/app/oauth/register/route.ts:41-60`

## Connected to

- **owns:** [oauth-grant](oauth-grant.md), [oauth-token](oauth-token.md) (FK `client_id`, cascade)
- **owned-by:** nothing (global)
- **joins:** nothing
- **looks-like-but-is-not:** [mcp-access-key](mcp-access-key.md) (a credential, not an app); [integration-connection](../integrations/integration-connection.md) (Braventa as a client of Google)

## If you change this

- **Hits:** `web/src/app/oauth/*`, `web/src/lib/oauth/*`, `docs/architecture/MCP_SERVER.md` §3
- **Does not hit:** key-based MCP auth, the pipeline, tenant RLS helpers

## Surfaces

| Surface | Role |
|---|---|
| `POST /oauth/register` | writes |
| `/oauth/authorize`, `/oauth/token`, `/oauth/revoke` | read (`findClient`, `authenticateClient`) |
| AI client vendors | register once per connector |

## See

- Source: `supabase/migrations/20261017030000_mcp_oauth.sql`, `web/src/app/oauth/register/route.ts`
- As built: `docs/architecture/MCP_SERVER.md`

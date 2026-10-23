---
type: object
cluster: access
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261011140425_mcp_access.sql
---

# MCP tool call (`mcp_tool_calls`)

One row per `tools/call` on `/api/mcp`: the audit log members may read and the counter behind the per-credential rate limit.

## Why this shape

Rate limiting and auditing read the same rows, so a tool call refused for scope, role or arguments, or one that fails, still counts (`web/src/app/api/mcp/route.ts:85-96,106-114`); trial-paused and rate-limited calls are answered without a row (`:102-104,111-113`). The row carries `key_id` or `oauth_grant_id`, and the limit counts whichever the request used (`:86`), so a key and an OAuth grant on the same organization have separate budgets. Clients never write it (`supabase/migrations/20261011140425_mcp_access.sql:51`).

## Shape

- Columns: `key_id` (set null on key delete), `oauth_grant_id`, `tool` (≤ 80), `ok`, `error` (≤ 300), `created_at` — `supabase/migrations/20261011140425_mcp_access.sql:36-44`; `supabase/migrations/20261017030000_mcp_oauth.sql:243-245`
- RLS "members read"; insert/update/delete revoked from clients — `…mcp_access.sql:48-51`
- Limits `RATE_PER_MINUTE = 30`, `RATE_PER_HOUR = 300` — `web/src/app/api/mcp/route.ts:20-21`; checked only for `tools/call` with an id, after the trial gate — `:100-114`
- Writer: `log` in the route (service client, error cut to 300 chars) — `:87-96`; called by `handleMessage` on scope refusal, role refusal, bad arguments, success and failure — `web/src/lib/mcp/protocol.ts:87-90,92-95,101,106,116` (role refusal: [member-role](../tenancy/member-role.md), `docs/architecture/ROLES_AND_PERMISSIONS.md` §5)

Citations: `supabase/migrations/20261011140425_mcp_access.sql:35-51`, `web/src/app/api/mcp/route.ts:85-114`

## Connected to

- **owns:** nothing
- **owned-by:** [organization](../tenancy/organization.md); [mcp-access-key](mcp-access-key.md) or [oauth-grant](oauth-grant.md)
- **joins:** nothing else
- **looks-like-but-is-not:** [ai-usage](../pipeline/ai-usage.md) (model spend, written by the router); [assistant-usage](assistant-usage.md) (in-app assistant questions)

## If you change this

- **Hits:** [mcp-onboarding](../../processes/mcp-onboarding.md), `docs/architecture/MCP_SERVER.md` §2 and §9
- **Does not hit:** Settings key management, the OAuth token endpoints, the pipeline

## Surfaces

| Surface | Role |
|---|---|
| `POST /api/mcp` | writes, counts |
| Members (RLS) | may read; no page lists it at this commit (`mcp_tool_calls` appears only in the route) |

## See

- Source: `supabase/migrations/20261011140425_mcp_access.sql`, `web/src/app/api/mcp/route.ts`
- As built: `docs/architecture/MCP_SERVER.md`

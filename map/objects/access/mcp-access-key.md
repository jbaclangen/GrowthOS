---
type: object
cluster: access
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261011140425_mcp_access.sql
---

# Access key (`mcp_access_keys`)

A bearer credential for the MCP server: a personal key (`brv_…`, one user) or an owner-created service key (`brv_sk_…`, one organization), stored only as a SHA-256 hash.

## Why this shape

The key is shown once and only its hash is kept, so a database read can't leak a usable credential (`supabase/migrations/20261011140425_mcp_access.sql:1-3,11`); the select grant leaves out only `key_hash` (`supabase/migrations/20261017030000_mcp_oauth.sql:236-237`). Personal and service keys share one table so `/api/mcp` resolves both with one lookup (`web/src/lib/mcp/auth.ts:20-25`); a trigger clears `user_id` on service keys and a check keeps the two kinds apart (`…mcp_oauth.sql:195-196,200-211`).

## Shape

- Base columns: `name` (1–60), `key_prefix`, `key_hash` unique hex-64, `last_used_at`, `revoked_at` — `supabase/migrations/20261011140425_mcp_access.sql:5-15`
- Phase 2: `kind` `personal | service`, `scopes` ⊆ `onboarding | read | write` (default `onboarding`), `expires_at`, `created_by` — `supabase/migrations/20261017030000_mcp_oauth.sql:189-193`
- Personal key `brv_` + 32 random bytes base64url, SHA-256 hash — `web/src/lib/mcp/keys.ts:6-15`; service key `generateSecret("service")` — `web/src/lib/oauth/tokens.ts:16,44`
- Policies: own personal keys read/insert/revoke (revoke is one-way) — `…mcp_oauth.sql:217-225`; owner service keys — `:227-233` (`is_org_owner` `:9-15`)
- Limits: 5 active personal keys — `web/src/app/settings/actions.ts:11,34-39`; 10 active service keys — `web/src/lib/mcp/service-keys.ts:6`, `web/src/app/settings/integrations-actions.ts:37-39`
- Create (user client; organization created if missing): `web/src/app/settings/actions.ts:15-49`; service `integrations-actions.ts:21-54`; revoke `actions.ts:67-78`, `integrations-actions.ts:56-67`
- Permissions ([member-role](../tenancy/member-role.md)): service key create needs `keys.manage_any` — `web/src/app/settings/integrations-actions.ts:25`, `web/src/lib/team/roles.ts:89`; personal keys are not gated by `keys.manage_own` yet — `docs/architecture/ROLES_AND_PERMISSIONS.md:146-148`
- Lookup and `last_used_at` (service client): `web/src/lib/mcp/auth.ts:20-57`; expiry `:29-31`; owner must still be a member, and the key acts with that member's role `:32-43`; service keys carry no role — `web/src/lib/mcp/principal.ts:10-12,59-63` (`docs/architecture/ROLES_AND_PERMISSIONS.md` §5)

Citations: `supabase/migrations/20261011140425_mcp_access.sql:5-33`, `supabase/migrations/20261017030000_mcp_oauth.sql:187-240`

## Connected to

- **owns:** [mcp-tool-call](mcp-tool-call.md) rows via `key_id`
- **owned-by:** [organization](../tenancy/organization.md); personal keys by a user ([membership](../tenancy/membership.md))
- **joins:** [plan-tier](../tenancy/plan-tier.md) through `mcpAccess` (`web/src/lib/mcp/access.ts:13-15`)
- **looks-like-but-is-not:** [oauth-token](oauth-token.md) (`brv_at_…`, issued by the OAuth flow, bound to a grant)

## If you change this

- **Hits:** [mcp-onboarding](../../processes/mcp-onboarding.md), Settings → Integrations (the AI assistant card and Service keys), `docs/architecture/MCP_SERVER.md` §7–8
- **Does not hit:** the OAuth tables, [assistant-usage](assistant-usage.md), the pipeline

## Surfaces

| Surface | Role |
|---|---|
| Settings (`web/src/app/settings/actions.ts`, `integrations-actions.ts`) | writes through RLS |
| `POST /api/mcp` → `authenticateMcp` | reads hash, writes `last_used_at` |
| Owner / user | creates, copies once, revokes |

## See

- Source: `supabase/migrations/20261011140425_mcp_access.sql`, `supabase/migrations/20261017030000_mcp_oauth.sql`
- As built: `docs/architecture/MCP_SERVER.md`

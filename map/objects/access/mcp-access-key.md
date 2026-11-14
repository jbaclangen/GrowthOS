---
type: object
cluster: access
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
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
- Policies: own personal keys read/insert/revoke (revoke is one-way) — `supabase/migrations/20261017030000_mcp_oauth.sql:217-225`; owner service keys — `:227-233` (`is_org_owner` `:9-15`)
- Limits: 5 active personal keys (the count is the user's own, across their businesses) — `web/src/app/settings/actions.ts:16,59-64`; 10 active service keys — `web/src/lib/mcp/service-keys.ts:6`, `web/src/app/settings/integrations-actions.ts:45-47`
- Create (user client) for the business the page showed (D-062): both forms post its `organizationId` — `web/src/app/settings/key-form.tsx:49-56`, `web/src/app/settings/service-key-form.tsx:16`; a malformed or foreign id is refused, never replaced by the cookie's business — personal `web/src/app/settings/actions.ts:33-43`, service (a missing id too) `integrations-actions.ts:26-30`. A user with no business posts a business name instead, which creates it — `actions.ts:34,44-55`; a personal-key form that posts neither (a page rendered before forms named their business) falls back to the business the user is working on — `actions.ts:29-39`. Create: `actions.ts:20-75`; service `integrations-actions.ts:24-63`; revoke `actions.ts:93-104`, `integrations-actions.ts:65-76`. Settings names each personal key's business when the user has several — `web/src/app/settings/page.tsx:52-54,134`
- Permissions ([member-role](../tenancy/member-role.md)): service key create needs `keys.manage_any` — `web/src/app/settings/integrations-actions.ts:31`, `web/src/lib/team/roles.ts:91`; a personal key needs `keys.manage_own` in the business it is for — `web/src/app/settings/actions.ts:56-57`, and Settings shows the refusal instead of the key form — `web/src/app/settings/page.tsx:59-60,117-121`; matrix `web/src/lib/team/roles.ts:89`, spec `docs/architecture/ROLES_AND_PERMISSIONS.md:150-152` (§6). Removing a member revokes their personal keys for the business — `web/src/app/settings/team-actions.ts:141-147` ([invite-and-join](../../processes/invite-and-join.md))
- Lookup and `last_used_at` (service client): `web/src/lib/mcp/auth.ts:20-57`; expiry `:29-31`; owner must still be a member, and the key acts with that member's role `:32-43`; service keys carry no role — `web/src/lib/mcp/principal.ts:10-12,59-63` (`docs/architecture/ROLES_AND_PERMISSIONS.md` §5)

Citations: `supabase/migrations/20261011140425_mcp_access.sql:5-33`, `supabase/migrations/20261017030000_mcp_oauth.sql:187-240`

## Connected to

- **owns:** [mcp-tool-call](mcp-tool-call.md) rows via `key_id`
- **owned-by:** [organization](../tenancy/organization.md); personal keys by a user ([membership](../tenancy/membership.md))
- **joins:** [plan-tier](../tenancy/plan-tier.md) through `mcpAccess` (`web/src/lib/mcp/access.ts:13-15`)
- **looks-like-but-is-not:** [oauth-token](oauth-token.md) (`brv_at_…`, issued by the OAuth flow, bound to a grant)

## If you change this

- **Hits:** [mcp-onboarding](../../processes/mcp-onboarding.md), Settings → Integrations (the AI assistant card and Service keys), `web/src/app/settings/key-actions.test.ts` (which business a key is created for), `docs/architecture/MCP_SERVER.md` §7–8
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

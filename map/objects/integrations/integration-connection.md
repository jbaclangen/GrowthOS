---
type: object
cluster: integrations
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261011161133_search_console.sql
---

# Search Console connection (`integration_connections`)

One row per organization and provider holding the Google Search Console link, its encrypted refresh token and its sync state; the app calls it "Connect Google Search Console".

## Why this shape

The refresh token is the only secret, so it sits in one column clients can never select (`supabase/migrations/20261011161133_search_console.sql:41-45`) and is written only by server code that has already authorised the organization (`web/src/app/api/integrations/google/callback/route.ts:69-70`). One row per provider (`search_console.sql:28`) means reconnecting replaces rather than accumulates.

## Shape

- Keys: `id`, `organization_id`; `unique (organization_id, provider)`, `unique (id, organization_id)` — `supabase/migrations/20261011161133_search_console.sql:11-12,28-29`
- `provider` check: only `google_search_console` — `:13`; TS `PROVIDER` `web/src/lib/integrations/search-console.ts:15`
- `status`: `active | paused | revoked | error` — `search_console.sql:21`; a revoked row keeps no token — `:31`
- `refresh_token_ciphertext` `v1:` AES-256-GCM through `encryptSecret`/`decryptSecret` — `:16,75`; `web/src/lib/integrations/secret-box.ts:36-37`
- `available_properties`, `selected_property`, `last_error`, `last_synced_at`, `last_attempted_at` (10-minute guard) — `search_console.sql:18-25`
- RLS "members read"; column grants exclude the token — `:38-45`
- Writers (service client): upsert `web/src/lib/integrations/search-console.ts:388-403`; sync `:427-428`; property choice `:518-522`; disconnect `:544-556`
- Readers (user client, non-secret columns): `web/src/components/connections/search-console-card.tsx:59-64`; Ask Braventa `web/src/lib/assistant/context.ts:54-59` (`status`, `selected_property`)

Citations: `supabase/migrations/20261011161133_search_console.sql:10-45`, `web/src/lib/integrations/search-console.ts:367-405`

## Connected to

- **owns:** [search-console-snapshot](search-console-snapshot.md) (composite FK, `…search_console.sql:62-63`)
- **owned-by:** [organization](../tenancy/organization.md)
- **joins:** [plan-tier](../tenancy/plan-tier.md) through `searchConsoleAccess` (`web/src/lib/integrations/search-console-access.ts:12-15`); [module-registry](../modules/module-registry.md) (`search_visibility`)
- **looks-like-but-is-not:** [legacy-integration](legacy-integration.md) (`integrations`, unused); [oauth-grant](../access/oauth-grant.md) (apps signing in to Braventa, not Braventa signing in to Google)

## If you change this

- **Hits:** [connect-search-console](../../processes/connect-search-console.md), [sync-search-console](../../processes/sync-search-console.md), the Settings and connect-step cards, `docs/architecture/SEARCH_CONSOLE_SETUP.md`
- **Does not hit:** [mcp-access-key](../access/mcp-access-key.md), the OAuth tables, the job step machine

## Surfaces

| Surface | Role |
|---|---|
| `/api/integrations/google/callback` (`saveConnection`) | writes |
| Settings → Connections, `/onboarding/[sessionId]/connect` (`search-console-card.tsx`) | reads |
| `web/src/app/settings/connections-actions.ts` (refresh, choose property, disconnect) | writes |
| scoring / diagnosis_update steps (`searchConsoleSummaryForPrompt`) | reads `status` |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) (`loadBusinessSummary`) | reads `status`, `selected_property` |
| Owner (`integrations.connect`, `web/src/lib/team/roles.ts:86`; where it is checked: `docs/architecture/ROLES_AND_PERMISSIONS.md:59`) | connects, chooses the property, disconnects |

## See

- Source: `supabase/migrations/20261011161133_search_console.sql`, `web/src/lib/integrations/search-console.ts`
- As built: `docs/architecture/SEARCH_CONSOLE_SETUP.md`

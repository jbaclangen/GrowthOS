---
type: object
cluster: integrations
universe: live
status: verified
verified: 2026-11-08
commit: 7c0f6ca
entity: supabase/migrations/20261011161133_search_console.sql
---

# Tool connection (`integration_connections`): Google and HubSpot

One row per organization and provider (each Google product, Search Console and Google Analytics 4, and HubSpot) holding the encrypted refresh token and that provider's sync state. The app shows one "Connect Google" button for both Google products (one sign-in writes a row per product the owner granted) and a "Connect HubSpot" button.

## Why this shape

The refresh token is the only secret, so it sits in one column clients can never select (`supabase/migrations/20261011161133_search_console.sql:41-45`) and is written only by server code that has already authorised the organization (`web/src/app/api/integrations/google/callback/route.ts:74-75`). One row per provider (`search_console.sql:28`) means reconnecting replaces rather than accumulates; one consent screen covers both products, but each granted product gets its own row with the same token encrypted separately, so each keeps its own property, status and refresh guard (`web/src/lib/integrations/google-connection.ts:6-10`).

## Shape

- Keys: `id`, `organization_id`; `unique (organization_id, provider)`, `unique (id, organization_id)` — `supabase/migrations/20261011161133_search_console.sql:11-12,28-29`
- `provider` check: `google_search_console`, `google_analytics` and `hubspot` — `supabase/migrations/20261108043117_hubspot_connection.sql:11-13` (Google Analytics added at `20261107224123_google_analytics.sql:14-16`, applied 2026-11-08); TS `PROVIDER` `web/src/lib/integrations/search-console.ts:15`, `web/src/lib/integrations/google-analytics.ts:16`; `GoogleProvider`, `GOOGLE_PROVIDERS` `web/src/lib/integrations/google-connection.ts:12-13`; `HUBSPOT_PROVIDER` `web/src/lib/integrations/hubspot.ts:27`
- `external_account_id`, `external_account_name` (HubSpot portal id and domain; null for the Google products), granted to members — `20261108043117_hubspot_connection.sql:17-22`
- `status`: `active | paused | revoked | error` — `search_console.sql:21`; a revoked row keeps no token — `:31`
- `refresh_token_ciphertext` `v1:` AES-256-GCM through `encryptSecret`/`decryptSecret` — `:16`; `web/src/lib/integrations/google-connection.ts:68`; `web/src/lib/integrations/secret-box.ts:36-37`
- `available_properties`, `selected_property`, `last_error`, `last_synced_at`, `last_attempted_at` (10-minute guard) — `search_console.sql:18-25`; `property_labels` jsonb (GA4 display names for the property picker, granted to clients) — `20261107224123_google_analytics.sql:18-20`
- RLS "members read"; column grants exclude the token — `search_console.sql:38-45`
- Writers (service client): `saveGoogleConnection` (one upsert per granted product; products not granted this time are cleared) `web/src/lib/integrations/google-connection.ts:40-81`; `disconnectGoogle` clears both rows `:102-112` through `clearConnection` `:82-99`; Search Console sync `web/src/lib/integrations/search-console.ts:388-389`, property choice `:479-483`; GA4 sync `web/src/lib/integrations/google-analytics.ts:396-397`, property choice `:496-500`
- Readers (user client, non-secret columns): `web/src/components/connections/search-console-card.tsx:59-64`, `web/src/components/connections/analytics-card.tsx:57-62`; Ask Braventa `web/src/lib/assistant/context.ts:56-61` (Search Console row only: `status`, `selected_property`)
- HubSpot rows: writers `saveHubSpotConnection` `web/src/lib/integrations/hubspot.ts:215-252`, `syncHubSpot` `:259-316`, `disconnectHubSpot` `:338-365`; reader the HubSpot card `web/src/components/connections/hubspot-card.tsx` (portal, status, last fetch). Ask Braventa doesn't read them. The Google writers filter on `GOOGLE_PROVIDERS`, so they never touch a HubSpot row

Citations: `supabase/migrations/20261011161133_search_console.sql:10-45`, `supabase/migrations/20261107224123_google_analytics.sql:13-20`, `web/src/lib/integrations/google-connection.ts:6-113`

## Connected to

- **owns:** [search-console-snapshot](search-console-snapshot.md) (composite FK, `…search_console.sql:62-63`); [analytics-snapshot](analytics-snapshot.md) (composite FK, `…google_analytics.sql:34-35`); [hubspot-snapshot](hubspot-snapshot.md) (composite FK, `…hubspot_connection.sql:37-38`)
- **owned-by:** [organization](../tenancy/organization.md)
- **joins:** [plan-tier](../tenancy/plan-tier.md) through `searchConsoleAccess` (`web/src/lib/integrations/search-console-access.ts:12-15`) and `googleAnalyticsAccess` (`web/src/lib/integrations/google-analytics-access.ts:12-15`); [module-registry](../modules/module-registry.md) (`search_visibility`, `analytics`)
- **looks-like-but-is-not:** [legacy-integration](legacy-integration.md) (`integrations`, unused); [oauth-grant](../access/oauth-grant.md) (apps signing in to Braventa, not Braventa signing in to Google)

## If you change this

- **Hits:** [connect-search-console](../../processes/connect-search-console.md), [sync-search-console](../../processes/sync-search-console.md), [sync-google-analytics](../../processes/sync-google-analytics.md), [connect-hubspot](../../processes/connect-hubspot.md), [sync-hubspot](../../processes/sync-hubspot.md), the Settings and connect-step cards (each says its data feeds the diagnosis and the growth score, `web/src/components/connections/search-console-card.tsx:162-165`, `web/src/components/connections/analytics-card.tsx:170-173`), `docs/architecture/SEARCH_CONSOLE_SETUP.md`. The GA4 migration adds `property_labels`, which `saveGoogleConnection` and `clearConnection` write for both providers (`google-connection.ts:71,93`), so the Search Console connect and disconnect also need it applied.
- **Does not hit:** [mcp-access-key](../access/mcp-access-key.md), the OAuth tables, the job step machine

## Surfaces

| Surface | Role |
|---|---|
| `/api/integrations/google/callback` (`saveGoogleConnection`) | writes |
| Settings → Connections, `/onboarding/[sessionId]/connect` (`search-console-card.tsx`, `analytics-card.tsx`) | reads |
| `web/src/app/settings/connections-actions.ts` (refresh, choose property for each product, disconnect Google) | writes |
| scoring / diagnosis_update steps (`searchConsoleSummaryForPrompt`, `analyticsSummaryForPrompt`) | reads `status` |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) (`loadBusinessSummary`) | reads `status`, `selected_property` (Search Console) |
| Owner (`integrations.connect`, `web/src/lib/team/roles.ts:86`; where it is checked: `docs/architecture/ROLES_AND_PERMISSIONS.md:60`) | connects, chooses the properties, disconnects |

## See

- Source: `supabase/migrations/20261011161133_search_console.sql`, `supabase/migrations/20261107224123_google_analytics.sql`, `web/src/lib/integrations/google-connection.ts`
- As built: `docs/architecture/SEARCH_CONSOLE_SETUP.md`

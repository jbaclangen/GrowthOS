---
type: object
cluster: integrations
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
entity: supabase/migrations/20261011161133_search_console.sql
---

# Tool connection (`integration_connections`): Google and HubSpot

One row per organization and provider (each Google product, Search Console and Google Analytics 4, and HubSpot) holding the encrypted refresh token and that provider's sync state. The app shows one "Connect Google" button for both Google products (one sign-in writes a row per product the owner granted) and a "Connect HubSpot" button.

## Why this shape

The refresh token is the only secret, so it sits in one column clients can never select (`supabase/migrations/20261011161133_search_console.sql:41-45`) and is written only by server code that has already authorised the organization (`web/src/app/api/integrations/google/callback/route.ts:76-77`). One row per provider (`search_console.sql:28`) means reconnecting replaces rather than accumulates; one consent screen covers both products, but each granted product gets its own row with the same token encrypted separately, so each keeps its own property, status and refresh guard (`web/src/lib/integrations/google-connection.ts:6-10`).

## Shape

- Keys: `id`, `organization_id`; `unique (organization_id, provider)`, `unique (id, organization_id)` — `supabase/migrations/20261011161133_search_console.sql:11-12,28-29`
- `provider` check: `google_search_console`, `google_analytics` and `hubspot` — `supabase/migrations/20261108043117_hubspot_connection.sql:11-13` (Google Analytics added at `20261107224123_google_analytics.sql:14-16`, applied 2026-11-08); TS `PROVIDER` `web/src/lib/integrations/search-console.ts:15`, `web/src/lib/integrations/google-analytics.ts:16`; `GoogleProvider`, `GOOGLE_PROVIDERS` `web/src/lib/integrations/google-connection.ts:12-13`; `HUBSPOT_PROVIDER` `web/src/lib/integrations/hubspot.ts:27`
- `external_account_id`, `external_account_name` (HubSpot portal id and domain; null for the Google products), granted to members — `20261108043117_hubspot_connection.sql:17-22`
- `status`: `active | paused | revoked | error` — `search_console.sql:21`; a revoked row keeps no token — `supabase/migrations/20261011161133_search_console.sql:31`
- `refresh_token_ciphertext` `v1:` AES-256-GCM through `encryptSecret`/`decryptSecret` — `supabase/migrations/20261011161133_search_console.sql:16`; `web/src/lib/integrations/google-connection.ts:71`; `web/src/lib/integrations/secret-box.ts:36-37`
- `available_properties`, `selected_property`, `last_error`, `last_synced_at`, `last_attempted_at` (10-minute guard) — `search_console.sql:18-25`; `property_labels` jsonb (GA4 display names for the property picker, granted to clients) — `20261107224123_google_analytics.sql:18-20`
- RLS "members read"; column grants exclude the token — `search_console.sql:38-45`
- Writers (service client): `saveGoogleConnection` (one upsert per granted product; products not granted this time are cleared) `web/src/lib/integrations/google-connection.ts:43-84`; `disconnectGoogle` clears both rows `:105-116` through `clearConnection` `:86-103`; Search Console sync `web/src/lib/integrations/search-console.ts:388-389`, property choice `:479-483`; GA4 sync `web/src/lib/integrations/google-analytics.ts:396-397`, property choice `:500-504`
- Readers (user client, non-secret columns): `web/src/components/connections/search-console-card.tsx:60-65`, `web/src/components/connections/analytics-card.tsx:57-62`, `web/src/components/connections/hubspot-card.tsx:59-64`; Ask Braventa `web/src/lib/assistant/context.ts:58-64` (all three providers: `provider`, `status`, `selected_property`, worded by `web/src/lib/assistant/prompt.ts:94-117`)
- HubSpot rows: writers `saveHubSpotConnection` `web/src/lib/integrations/hubspot.ts:215-252`, `syncHubSpot` `:259-317`, `disconnectHubSpot` `:385-409`; reader the HubSpot card (portal, status, last fetch). The Google writers filter on `GOOGLE_PROVIDERS`, so they never touch a HubSpot row
- One read crosses organizations: disconnecting or removing a business reads the HubSpot tokens other businesses hold for the same portal (service client, `external_account_id`, not `revoked`) to decide between uninstalling the app and revoking only this business's token — `otherPortalTokens` `hubspot.ts:335-359`, `endHubSpotAccess` `web/src/lib/integrations/hubspot.ts:361-379`

Citations: `supabase/migrations/20261011161133_search_console.sql:10-45`, `supabase/migrations/20261107224123_google_analytics.sql:13-20`, `web/src/lib/integrations/google-connection.ts:6-130`, `web/src/lib/integrations/hubspot.ts:212-427`

## Connected to

- **owns:** [search-console-snapshot](search-console-snapshot.md) (composite FK, `…search_console.sql:62-63`); [analytics-snapshot](analytics-snapshot.md) (composite FK, `…google_analytics.sql:34-35`); [hubspot-snapshot](hubspot-snapshot.md) (composite FK, `…hubspot_connection.sql:37-38`)
- **owned-by:** [organization](../tenancy/organization.md)
- **joins:** [plan-tier](../tenancy/plan-tier.md) through `searchConsoleAccess` (`web/src/lib/integrations/search-console-access.ts:12-15`) and `googleAnalyticsAccess` (`web/src/lib/integrations/google-analytics-access.ts:12-15`); [module-registry](../modules/module-registry.md) (`search_visibility`, `analytics`)
- **looks-like-but-is-not:** [legacy-integration](legacy-integration.md) (`integrations`, unused); [oauth-grant](../access/oauth-grant.md) (apps signing in to Braventa, not Braventa signing in to Google)

## If you change this

- **Hits:** [connect-search-console](../../processes/connect-search-console.md), [sync-search-console](../../processes/sync-search-console.md), [sync-google-analytics](../../processes/sync-google-analytics.md), [connect-hubspot](../../processes/connect-hubspot.md), [sync-hubspot](../../processes/sync-hubspot.md), the Settings and connect-step cards (each says its data feeds the diagnosis and the growth score, `web/src/components/connections/search-console-card.tsx:166-169`, `web/src/components/connections/analytics-card.tsx:173-176`), Ask Braventa's connection lines, `docs/architecture/SEARCH_CONSOLE_SETUP.md`. The GA4 migration adds `property_labels`, which `saveGoogleConnection` and `clearConnection` write for both providers (`google-connection.ts:74,96`), so the Search Console connect and disconnect also need it applied.
- **Does not hit:** [mcp-access-key](../access/mcp-access-key.md), the OAuth tables, the job step machine

## Surfaces

| Surface | Role |
|---|---|
| `/api/integrations/google/callback` (`saveGoogleConnection`, for the business sealed in the OAuth state, D-062: `web/src/app/api/integrations/google/callback/route.ts:54`) | writes |
| Settings → Connections, `/onboarding/[sessionId]/connect` (`search-console-card.tsx`, `analytics-card.tsx`) | reads |
| `web/src/app/settings/connections-actions.ts` (refresh, choose property for each product, disconnect Google; for the business the form names, `web/src/app/settings/connections-actions.ts:24-31`) | writes |
| scoring / diagnosis_update steps (`searchConsoleSummaryForPrompt`, `analyticsSummaryForPrompt`) | reads `status` |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) (`loadBusinessSummary`) | reads `provider`, `status`, `selected_property` (Search Console, Google Analytics 4, HubSpot) |
| Owner (`integrations.connect`, `web/src/lib/team/roles.ts:88`; where it is checked: `docs/architecture/ROLES_AND_PERMISSIONS.md:64`, which still names only Search Console) | connects, chooses the properties, disconnects |
| Remove business ([remove-business](../../processes/remove-business.md): `revokeGoogleForRemoval` `google-connection.ts:118-130`, `revokeHubSpotForRemoval` `hubspot.ts:411-427`) | revokes the tokens at the provider (HubSpot: only this business's token while another business uses the portal); the rows go with the organization (`on delete cascade`, `search_console.sql:12`) |

## See

- Source: `supabase/migrations/20261011161133_search_console.sql`, `supabase/migrations/20261107224123_google_analytics.sql`, `web/src/lib/integrations/google-connection.ts`
- As built: `docs/architecture/SEARCH_CONSOLE_SETUP.md`

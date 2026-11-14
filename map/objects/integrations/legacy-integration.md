---
type: object
cluster: integrations
universe: leftover
status: verified
verified: 2026-11-14
commit: 1917f9a
entity: supabase/migrations/20261010061028_foundation.sql
---

# Legacy integration (`integrations`)

The foundation migration's generic "connected external account" table; no TypeScript reads or writes it, and the live connections (Search Console, Google Analytics 4, HubSpot) use `integration_connections` instead.

## Why this shape

It was designed before any integration existed, with tokens meant for Supabase Vault (`supabase/migrations/20261010061028_foundation.sql:212-213`). The first real integration needed provider-specific columns and app-side encryption, so the Search Console migration says it replaces this table rather than extending it (`supabase/migrations/20261011161133_search_console.sql:7-8`). It stays: dropping it is a research proposal, not a decision (`docs/research/CRM_MCP_AND_DATA_MODEL_2026-10-17.md:88`, `docs/research/README.md:275`).

## Shape

- Columns: `provider` text (comment lists hubspot, wordpress, google_analytics, search_console, stripe), `status` default `pending`, `external_account_id`, `scopes[]`, `metadata`, `vault_secret_id`, `connected_at`, `last_synced_at`; `unique (organization_id, provider)` — `supabase/migrations/20261010061028_foundation.sql:204-218`
- RLS "members read" from the shared loop — `supabase/migrations/20261010061028_foundation.sql:312-321`
- No TypeScript reference: `from("integrations")` has no match in `web/src` or `site/src` at this commit
- Documented as not used — `docs/architecture/DATA_MODEL.md:97`

Citations: `supabase/migrations/20261010061028_foundation.sql:204-218`, `supabase/migrations/20261011161133_search_console.sql:7-8`

## Connected to

- **owns:** nothing
- **owned-by:** [organization](../tenancy/organization.md)
- **joins:** nothing
- **looks-like-but-is-not:** [integration-connection](integration-connection.md) (the live table); the "Coming soon" tools in `web/src/lib/integrations/tool-catalog.ts` (ghost, planned in `docs/product/INTEGRATIONS_ROADMAP.md:12-15`)

## If you change this

- **Hits:** only the docs that mention it: `docs/architecture/DATA_MODEL.md:97,132,233`, `docs/architecture/SECURITY_AND_PRIVACY.md:34,228`, `docs/architecture/SYSTEM_ARCHITECTURE.md:285`, `docs/product/MVP_SCOPE.md:83`
- **Does not hit:** any process card; nothing in `web/src` or `site/src`

## Surfaces

| Surface | Role |
|---|---|
| none in the app | none |
| Supabase dashboard | reads (empty) |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

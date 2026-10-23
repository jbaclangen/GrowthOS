---
type: object
cluster: integrations
universe: leftover
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261010061028_foundation.sql
---

# Legacy integration (`integrations`)

The foundation migration's generic "connected external account" table; no TypeScript reads or writes it, and Search Console uses `integration_connections` instead.

## Why this shape

It was designed before any integration existed, with tokens meant for Supabase Vault (`supabase/migrations/20261010061028_foundation.sql:212-213`). The first real integration needed provider-specific columns and app-side encryption, so the Search Console migration says it replaces this table rather than extending it (`supabase/migrations/20261011161133_search_console.sql:7-8`). It stays because dropping it is a migration nobody has needed yet.

## Shape

- Columns: `provider` text (comment lists hubspot, wordpress, google_analytics, search_console, stripe), `status` default `pending`, `external_account_id`, `scopes[]`, `metadata`, `vault_secret_id`, `connected_at`, `last_synced_at` — `supabase/migrations/20261010061028_foundation.sql:204-215`
- RLS "members read" from the shared loop — `:312-320`
- No TypeScript reference: `from("integrations")` has no match in `web/src` or `site/src` at this commit
- Documented as not used — `docs/architecture/DATA_MODEL.md:81`

Citations: `supabase/migrations/20261010061028_foundation.sql:204-215`, `supabase/migrations/20261011161133_search_console.sql:7-8`

## Connected to

- **owns:** nothing
- **owned-by:** [organization](../tenancy/organization.md)
- **joins:** nothing
- **looks-like-but-is-not:** [integration-connection](integration-connection.md) (the live table); the "Coming soon" tools in `web/src/lib/integrations/tool-catalog.ts` (ghost, planned in `docs/product/INTEGRATIONS_ROADMAP.md:6-10`)

## If you change this

- **Hits:** `docs/architecture/DATA_MODEL.md:81` only
- **Does not hit:** any process card; nothing in `web/src` or `site/src`

## Surfaces

| Surface | Role |
|---|---|
| none in the app | none |
| Supabase dashboard | reads (empty) |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md`

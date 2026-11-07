---
type: object
cluster: integrations
universe: live
status: verified
verified: 2026-11-08
commit: acc6bc5
entity: supabase/migrations/20261108120000_hubspot_connection.sql
---

# HubSpot snapshot (`hubspot_snapshots`)

One row per fetch of counts and totals from an organization's HubSpot portal (contacts, companies, deals); the latest row is what the HubSpot card shows. Holds no CRM records (D-058).

## Why this shape

Braventa reads CRM records only to count them, so the row has one `metrics` jsonb of counts, sums and the portal's own stage and source labels, bounded at 32 KB so a bug can't store record lists (`supabase/migrations/20261108120000_hubspot_connection.sql:32`; `web/src/lib/integrations/hubspot-metrics.ts:221`). The composite FK ties each row to a connection of the same organization (`…hubspot_connection.sql:36`).

## Shape

- Columns: `connection_id`, `portal_id`, `period_start/end`, `metrics` jsonb, `fetched_at` — `supabase/migrations/20261108120000_hubspot_connection.sql:24-38`
- `metrics` type: `HubSpotMetrics` (`version: 1`) — `web/src/lib/integrations/hubspot-metrics.ts:27`; deal properties read: `DEAL_PROPERTIES` `:128`; aggregation `aggregateDeals` `:151`
- RLS "members read", select-only grant — `…hubspot_connection.sql:42-46`
- Insert: `syncHubSpot` `web/src/lib/integrations/hubspot.ts:299`; prune to 12 `:31,319`
- Delete: another portal connected `:233-234`; disconnect `:353`
- Read: the HubSpot card (`web/src/components/connections/hubspot-card.tsx`), user client

## Connected to

- **owns:** nothing
- **owned-by:** [integration-connection](integration-connection.md), [organization](../tenancy/organization.md)
- **joins:** [plan-tier](../tenancy/plan-tier.md) through `hubspotAccess` (`web/src/lib/integrations/hubspot-access.ts:12`)
- **looks-like-but-is-not:** [search-console-snapshot](search-console-snapshot.md) (Google data, feeds the diagnosis); the CRM module in [module-registry](../modules/module-registry.md) (`crm`, not live: nothing reads these rows into the diagnosis yet, Q-060); [contact-request](contact-request.md) (Braventa's own HubSpot portal)

## If you change this

- **Hits:** [sync-hubspot](../../processes/sync-hubspot.md); what is stored, kept or shown → the hand-written disclosures on `/legal/privacy` (HubSpot section), `/legal/subprocessors`, `/legal/dpa`, `docs/architecture/SECURITY_AND_PRIVACY.md` §6 and `docs/architecture/HUBSPOT_SETUP.md`; storing anything beyond counts needs a new decision (D-058)
- **Does not hit:** the pipeline steps, the growth score, Ask Braventa

## Surfaces

| Surface | Role |
|---|---|
| `syncHubSpot` (callback, Settings refresh) | writes |
| HubSpot card (Settings, connect step) | reads the latest row |
| `disconnectHubSpot` (owner, `integrations.connect`) | deletes |

## See

- Source: `supabase/migrations/20261108120000_hubspot_connection.sql`, `web/src/lib/integrations/hubspot-metrics.ts`
- As built: `docs/architecture/HUBSPOT_SETUP.md`

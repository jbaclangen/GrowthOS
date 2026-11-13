---
type: object
cluster: integrations
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
entity: supabase/migrations/20261108043117_hubspot_connection.sql
---

# HubSpot snapshot (`hubspot_snapshots`)

One row per fetch of counts and totals from an organization's HubSpot portal (contacts, companies, deals); the latest row is what the HubSpot card shows. Holds no CRM records (D-059).

## Why this shape

Braventa reads CRM records only to count them, so the row has one `metrics` jsonb of counts, sums and the portal's own stage and source labels, bounded at 32 KB so a bug can't store record lists (`supabase/migrations/20261108043117_hubspot_connection.sql:33`; `web/src/lib/integrations/hubspot-metrics.ts:221`). The composite FK ties each row to a connection of the same organization (`…hubspot_connection.sql:37-38`).

## Shape

- Columns: `connection_id`, `portal_id`, `period_start/end`, `metrics` jsonb, `fetched_at` — `supabase/migrations/20261108043117_hubspot_connection.sql:25-39`
- `metrics` type: `HubSpotMetrics` (`version: 1`) — `web/src/lib/integrations/hubspot-metrics.ts:27`; deal properties read: `DEAL_PROPERTIES` `:128`; aggregation `aggregateDeals` `:151`
- RLS "members read", select-only grant — `…hubspot_connection.sql:43-47`
- Insert: `syncHubSpot` `web/src/lib/integrations/hubspot.ts:299`; prune to 12 `:31,319-333`
- Delete: another portal connected `web/src/lib/integrations/hubspot.ts:233-234`; disconnect, every row of the organization `web/src/lib/integrations/hubspot.ts:395` (also when another business keeps the app installed in the same portal, `web/src/lib/integrations/hubspot.ts:381-384`); removing the business deletes them with the organization (`on delete cascade`, `…hubspot_connection.sql:27`)
- Read: the HubSpot card, latest row through the user client — `web/src/components/connections/hubspot-card.tsx:65-71`. Nothing else in `web/src` reads the table

## Connected to

- **owns:** nothing
- **owned-by:** [integration-connection](integration-connection.md), [organization](../tenancy/organization.md)
- **joins:** [plan-tier](../tenancy/plan-tier.md) through `hubspotAccess` (`web/src/lib/integrations/hubspot-access.ts:12`)
- **looks-like-but-is-not:** [search-console-snapshot](search-console-snapshot.md) (Google data, feeds the diagnosis); the CRM module in [module-registry](../modules/module-registry.md) (`crm`, not live: nothing reads these rows into the diagnosis yet, Q-063); [contact-request](contact-request.md) (Braventa's own HubSpot portal)

## If you change this

- **Hits:** [sync-hubspot](../../processes/sync-hubspot.md); what is stored, kept or shown → the hand-written disclosures on `/legal/privacy` (HubSpot section), `/legal/subprocessors`, `/legal/dpa`, `docs/architecture/SECURITY_AND_PRIVACY.md` §6 and `docs/architecture/HUBSPOT_SETUP.md`; storing anything beyond counts needs a new decision (D-059)
- **Does not hit:** the pipeline steps, the growth score, Ask Braventa (it reads only the connection's `status`, `web/src/lib/assistant/context.ts:58-64`, never these rows)

## Surfaces

| Surface | Role |
|---|---|
| `syncHubSpot` (callback, Settings refresh) | writes |
| HubSpot card (Settings, connect step) | reads the latest row |
| `disconnectHubSpot` (owner, `integrations.connect`) | deletes |

## See

- Source: `supabase/migrations/20261108043117_hubspot_connection.sql`, `web/src/lib/integrations/hubspot-metrics.ts`
- As built: `docs/architecture/HUBSPOT_SETUP.md`

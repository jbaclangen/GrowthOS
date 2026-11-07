---
type: process
universe: live
status: verified
verified: 2026-11-08
commit: acc6bc5
consumes: ["[[integration-connection]]", "[[organization]]", "[[plan-tier]]", "[[member-role]]"]
produces: ["[[hubspot-snapshot]]"]
---

# sync-hubspot

Braventa fetches one snapshot of HubSpot counts for an organization and keeps the last twelve; disconnecting uninstalls the app and deletes them.

## Input → Movement → Output

Input: an active HubSpot connection, triggered by the OAuth callback or Settings "Refresh HubSpot counts". Movement: `syncHubSpot` re-checks plan access, applies the 10-minute guard, mints an access token (keeping a rotated refresh token), runs throttled CRM searches and a deal list, aggregates, inserts, prunes and updates the connection. Output: a new `hubspot_snapshots` row and connection status. Nothing downstream reads it into the diagnosis yet (Q-060).

## Why this shape

Records are summed in memory and only counts are stored (D-058), so the search totals and a fixed deal property list are all the sync asks for (`web/src/lib/integrations/hubspot.ts:67-102`; `web/src/lib/integrations/hubspot-metrics.ts:128`). Searches wait 250 ms each because HubSpot's search API allows 5 a second per portal (`hubspot.ts:33,67-68`). The plan gate runs on every sync, so an ended trial pauses instead of fetching (`hubspot.ts:274-277`).

## Steps

1. Load the connection; revoked, no token or no portal → `not-connected` — `web/src/lib/integrations/hubspot.ts:259-268`.
2. Plan gate `hubspotAccess`; not allowed → `paused` — `:274-277`.
3. 10-minute guard on `last_attempted_at` unless `skipGuard` — `:279`.
4. Decrypt, mint an access token, store a rotated refresh token — `:293-295`; `web/src/lib/integrations/hubspot-oauth.ts:137`.
5. `fetchMetrics`: lifecycle and source options, deal pipelines (`0-3`), contact and company search totals, deal list up to `MAX_DEALS` — `hubspot.ts:112`; aggregation `hubspot-metrics.ts:151`.
6. Size check, insert, prune to 12, mark `active` — `hubspot.ts:297-310`; errors → `describeHubSpotError` → status + `last_error` — `:194`.
7. Callers: callback `web/src/app/api/integrations/hubspot/callback/route.ts:108`; Settings refresh (any member) `web/src/app/settings/connections-actions.ts:76-80`.
8. Disconnect (owner, `integrations.connect`): uninstall the app and revoke the token, delete every snapshot, blank the row — `hubspot.ts:338-365`; `hubspot-oauth.ts:175`; action `connections-actions.ts:83-91`.

## Human gate

None inside the sync. The owner decides to disconnect.

## If you change this

- **Hits:** [hubspot-snapshot](../objects/integrations/hubspot-snapshot.md), the HubSpot card's counts (`web/src/components/connections/hubspot-card.tsx`), the privacy disclosures that list what is counted (`/legal/privacy` HubSpot section), `docs/architecture/HUBSPOT_SETUP.md` §1–2
- **Does not hit:** [score-and-diagnose](score-and-diagnose.md) (the CRM module isn't live), [connect-hubspot](connect-hubspot.md) before its step 8, MCP, Ask Braventa

## Surfaces

| Surface | Role |
|---|---|
| `syncHubSpot` (callback, Settings refresh) | writes snapshot + connection |
| HubSpot card | reads the latest snapshot |
| HubSpot CRM APIs (search, list, pipelines, properties; version 2026-09) | source |

## See

- Objects: [hubspot-snapshot](../objects/integrations/hubspot-snapshot.md), [integration-connection](../objects/integrations/integration-connection.md), [member-role](../objects/tenancy/member-role.md)
- Source: `web/src/lib/integrations/hubspot.ts`

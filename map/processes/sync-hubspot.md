---
type: process
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
consumes: ["[[integration-connection]]", "[[organization]]", "[[plan-tier]]", "[[member-role]]"]
produces: ["[[hubspot-snapshot]]"]
---

# sync-hubspot

Braventa fetches one snapshot of HubSpot counts for an organization and keeps the last twelve; disconnecting ends the business's HubSpot access (uninstalling the app unless another business still uses the portal) and deletes them.

## Input → Movement → Output

Input: an active HubSpot connection, triggered by the OAuth callback or Settings "Refresh HubSpot counts". Movement: `syncHubSpot` re-checks plan access, applies the 10-minute guard, mints an access token (keeping a rotated refresh token), runs throttled CRM searches and a deal list, aggregates, inserts, prunes and updates the connection. Output: a new `hubspot_snapshots` row and connection status. Nothing downstream reads it into the diagnosis yet (Q-063).

## Why this shape

Records are summed in memory and only counts are stored (D-059), so the search totals and a fixed deal property list are all the sync asks for (`web/src/lib/integrations/hubspot.ts:67-102`; `web/src/lib/integrations/hubspot-metrics.ts:128`). Searches wait 250 ms each because HubSpot's search API allows 5 a second per portal (`hubspot.ts:33,67-68`). The plan gate runs on every sync, so an ended trial pauses instead of fetching (`hubspot.ts:274-277`). An install is per portal, and two businesses in Braventa can connect the same portal (D-062), so disconnecting uninstalls the app only when no other business still uses it (`hubspot.ts:335-338,361-365`).

## Steps

1. Load the connection; revoked, no token or no portal → `not-connected` — `web/src/lib/integrations/hubspot.ts:259-268`.
2. Plan gate `hubspotAccess`; not allowed → `paused` — `web/src/lib/integrations/hubspot.ts:274-277`.
3. 10-minute guard on `last_attempted_at` unless `skipGuard` — `web/src/lib/integrations/hubspot.ts:279`.
4. Decrypt, mint an access token, store a rotated refresh token — `web/src/lib/integrations/hubspot.ts:293-295`; `web/src/lib/integrations/hubspot-oauth.ts:140`.
5. `fetchMetrics`: lifecycle and source options, deal pipelines (`0-3`), contact and company search totals, deal list up to `MAX_DEALS` — `hubspot.ts:112`; aggregation `hubspot-metrics.ts:151`.
6. Size check, insert, prune to 12, mark `active` — `hubspot.ts:297-310`; errors → `describeHubSpotError` → status + `last_error` — `web/src/lib/integrations/hubspot.ts:194`.
7. Callers: callback `web/src/app/api/integrations/hubspot/callback/route.ts:110`; Settings refresh (any member, for the business the form names) `web/src/app/settings/connections-actions.ts:106-111`, `:95-102`.
8. Disconnect (owner, `integrations.connect`): `endHubSpotAccess` uninstalls the app (which also revokes the token) when no other business has a live connection to the same portal; otherwise it revokes only this business's token, or nothing when another business holds the same token — `hubspot.ts:361-379` (other businesses' tokens read across organizations with the service client, `web/src/lib/integrations/hubspot.ts:335-359`); `hubspot-oauth.ts:167,178`. Then every snapshot is deleted and the row blanked to `revoked` — `hubspot.ts:385-409`; action `connections-actions.ts:113-122`. Removing the business ends the access the same way (`revokeHubSpotForRemoval` `hubspot.ts:411-427`, [remove-business](remove-business.md)).

## Human gate

None inside the sync. The owner decides to disconnect.

## If you change this

- **Hits:** [hubspot-snapshot](../objects/integrations/hubspot-snapshot.md), the HubSpot card's counts and disconnect note (`web/src/components/connections/hubspot-card.tsx:32-33,65-71`), the privacy disclosures that list what is counted (`/legal/privacy` HubSpot section), Ask Braventa's HubSpot line, which reads the `status` the sync sets (`web/src/lib/assistant/context.ts:96`, `web/src/lib/assistant/prompt.ts:114-117`), and its knowledge (`web/src/lib/assistant/knowledge.ts:238`), `docs/architecture/HUBSPOT_SETUP.md` §1–2
- **Does not hit:** [score-and-diagnose](score-and-diagnose.md) (the CRM module isn't live), [connect-hubspot](connect-hubspot.md) before its step 8, MCP

## Surfaces

| Surface | Role |
|---|---|
| `syncHubSpot` (callback, Settings refresh) | writes snapshot + connection |
| HubSpot card | reads the latest snapshot |
| Ask Braventa | reads the connection's `status`, not the counts |
| HubSpot CRM APIs (search, list, pipelines, properties; version 2026-09) | source |

## See

- Objects: [hubspot-snapshot](../objects/integrations/hubspot-snapshot.md), [integration-connection](../objects/integrations/integration-connection.md), [member-role](../objects/tenancy/member-role.md)
- Source: `web/src/lib/integrations/hubspot.ts`

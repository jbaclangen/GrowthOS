---
type: process
universe: live
status: verified
verified: 2026-11-08
commit: 0121252
consumes: ["[[organization]]", "[[membership]]", "[[member-role]]", "[[plan-tier]]"]
produces: ["[[integration-connection]]", "[[hubspot-snapshot]]"]
---

# connect-hubspot

An owner installs Braventa's unlisted HubSpot app in their portal and comes back with an encrypted refresh token and a first snapshot of counts.

## Input → Movement → Output

Input: a signed-in owner of a Pro, Premium or trial organization selecting "Connect HubSpot" in Settings or on the onboarding connect step, on a deployment with the HubSpot app configured. Movement: the start route seals state in a cookie and redirects to HubSpot; the callback verifies the cookie, exchanges the code, introspects the token, checks the scopes, stores the token encrypted and runs the first sync. Output: an `active` `integration_connections` row with `provider = 'hubspot'`, usually a first `hubspot_snapshots` row, and a `?hubspot=` outcome code on the page the flow started from.

## Why this shape

HubSpot documents no PKCE for app OAuth, so the sealed cookie bound to user, organization and the `hubspot` provider tag is what stops a callback attaching a stranger's portal to a tenant or replaying a Search Console state (`web/src/lib/integrations/hubspot-oauth.ts:78-95`). The scope check stops a partial install from storing a token that can't count deals (`web/src/app/api/integrations/hubspot/callback/route.ts:77`).

## Steps

1. `GET /api/integrations/hubspot/start`: `hubspotConfigured`, `can(role, "integrations.connect")`, plan gate `hubspotAccess` — `web/src/app/api/integrations/hubspot/start/route.ts:26-39`.
2. Redirect URI from the allowlist (`hubspotAppRedirectUri`) — `start/route.ts:41`; `web/src/lib/integrations/hubspot-oauth.ts:36-52`.
3. Redirect to `app.hubspot.com/oauth/authorize` with the read scopes — `start/route.ts:45`; `hubspot-oauth.ts:22,56`; state sealed into `brv_hubspot_oauth` (600 s, path-scoped) — `start/route.ts:48`.
4. `GET /api/integrations/hubspot/callback`: open the cookie, owner again, `hubspotStateMatches` — `web/src/app/api/integrations/hubspot/callback/route.ts:36-46`; plan gate again — `:62`.
5. Exchange the code (OAuth API `2026-09`) and introspect for portal id, domain and scopes — `callback/route.ts:69-70`; `hubspot-oauth.ts:127,145`.
6. All three scopes required, else revoke — `callback/route.ts:77`; `hubspot-oauth.ts:190`.
7. `saveHubSpotConnection`: revoke a replaced token, drop snapshots of another portal, upsert encrypted — `callback/route.ts:83`; `web/src/lib/integrations/hubspot.ts:215-252`.
8. First sync with `skipGuard` — `callback/route.ts:97` → [sync-hubspot](sync-hubspot.md).

## Human gate

The owner approves on HubSpot's install screen (between steps 3 and 4), including HubSpot's "unverified app" warning while the app is unlisted.

## If you change this

- **Hits:** [integration-connection](../objects/integrations/integration-connection.md), [sync-hubspot](sync-hubspot.md), [connect-step](../objects/onboarding/connect-step.md), [member-role](../objects/tenancy/member-role.md), `hubspot/src/app/app-hsmeta.json` (scopes and redirect URLs, kept equal by `web/src/lib/integrations/hubspot.test.ts`), `docs/architecture/HUBSPOT_SETUP.md`
- **Does not hit:** the pipeline steps, MCP (which skips the connect step), the OAuth server under `/oauth/*`

## Surfaces

| Surface | Role |
|---|---|
| Owner | starts, installs the app in HubSpot |
| `/api/integrations/hubspot/start`, `/api/integrations/hubspot/callback` | run the flow |
| Settings → Connections, `/onboarding/[sessionId]/connect` | start link (`hubspotStartHref`), outcome notice |
| HubSpot OAuth | install screen, token exchange, introspection |

## See

- Objects: [[integration-connection]], [[hubspot-snapshot]], [[organization]], [[plan-tier]]
- Source: `web/src/app/api/integrations/hubspot/start/route.ts`, `web/src/app/api/integrations/hubspot/callback/route.ts`

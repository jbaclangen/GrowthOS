---
type: process
universe: live
status: stale
consumes: ["[[organization]]", "[[membership]]", "[[member-role]]", "[[plan-tier]]", "[[legal-acceptance]]"]
produces: ["[[integration-connection]]", "[[hubspot-snapshot]]", "[[legal-acceptance]]"]
---

# connect-hubspot

An owner ticks the agreement box, installs Braventa's unlisted HubSpot app in their portal and comes back with an encrypted refresh token, a recorded agreement and a first snapshot of counts.

## Input → Movement → Output

Input: a signed-in owner of a Pro, Premium or trial organization submitting the "Connect HubSpot" form (with its required checkbox) in Settings or on the onboarding connect step, on a deployment with the HubSpot app configured. Movement: the start route checks the checkbox, seals state in a cookie and redirects to HubSpot; the callback verifies the cookie, exchanges the code, introspects the token, checks the scopes, stores the token encrypted, records the agreement and runs the first sync. Output: an `active` `integration_connections` row with `provider = 'hubspot'`, a `legal_acceptances` row (`hubspot_connect`), usually a first `hubspot_snapshots` row, and a `?hubspot=` outcome code on the page the flow started from.

## Why this shape

HubSpot documents no PKCE for app OAuth, so the sealed cookie bound to user, organization and the `hubspot` provider tag is what stops a callback attaching a stranger's portal to a tenant or replaying a Search Console state (`web/src/lib/integrations/hubspot-oauth.ts:80-95`). The scope check stops a partial install from storing a token that can't count deals (`web/src/app/api/integrations/hubspot/callback/route.ts:78`). The agreement is recorded only after HubSpot approves, as for Search Console (D-057).

## Steps

1. The form: `HubSpotConnectForm`, a GET form with the required checkbox (`agree=yes`) — `web/src/components/connections/connect-form.tsx`.
2. `GET /api/integrations/hubspot/start`: `hubspotConfigured`, `can(role, "integrations.connect")`, `consentGiven` (else `consent-needed`), plan gate `hubspotAccess` — `web/src/app/api/integrations/hubspot/start/route.ts:27-42`.
3. Redirect URI from the allowlist (`hubspotAppRedirectUri`) — `start/route.ts:44`; `web/src/lib/integrations/hubspot-oauth.ts:36-52`.
4. Redirect to `app.hubspot.com/oauth/authorize` with the read scopes — `start/route.ts:48`; `hubspot-oauth.ts:22,56`; state (with `consented`) sealed into `brv_hubspot_oauth` (600 s, path-scoped) — `start/route.ts:51`.
5. `GET /api/integrations/hubspot/callback`: open the cookie, owner again, `hubspotStateMatches` — `web/src/app/api/integrations/hubspot/callback/route.ts:37-47`; plan gate again — `:63`.
6. Exchange the code (OAuth API `2026-09`) and introspect for portal id, domain and scopes — `callback/route.ts:70-71`; `hubspot-oauth.ts:129,147`.
7. All three scopes required, else revoke — `callback/route.ts:78`; `hubspot-oauth.ts:192`.
8. `saveHubSpotConnection`: revoke a replaced token, drop snapshots of another portal, upsert encrypted — `callback/route.ts:84`; `web/src/lib/integrations/hubspot.ts:215-252`.
9. Record the agreement (`hubspot_connect`, subject the portal domain) — `callback/route.ts:100`.
10. First sync with `skipGuard` — `callback/route.ts:108` → [sync-hubspot](sync-hubspot.md).

## Human gate

The owner ticks the agreement box (step 1) and approves on HubSpot's install screen (between steps 4 and 5), including HubSpot's "unverified app" warning while the app is unlisted.

## If you change this

- **Hits:** [integration-connection](../objects/integrations/integration-connection.md), [sync-hubspot](sync-hubspot.md), [legal-acceptance](../objects/access/legal-acceptance.md), [connect-step](../objects/onboarding/connect-step.md), [member-role](../objects/tenancy/member-role.md), `hubspot/src/app/app-hsmeta.json` (scopes and redirect URLs, kept equal by `web/src/lib/integrations/hubspot.test.ts`), `docs/architecture/HUBSPOT_SETUP.md`, `docs/architecture/LEGAL_ACCEPTANCE.md`
- **Does not hit:** the pipeline steps, MCP (which skips the connect step), the OAuth server under `/oauth/*`

## Surfaces

| Surface | Role |
|---|---|
| Owner | ticks the box, installs the app in HubSpot |
| `/api/integrations/hubspot/start`, `/api/integrations/hubspot/callback` | run the flow |
| Settings → Connections, `/onboarding/[sessionId]/connect` | connect form, outcome notice |
| HubSpot OAuth | install screen, token exchange, introspection |

## See

- Objects: [[integration-connection]], [[hubspot-snapshot]], [[legal-acceptance]], [[organization]], [[plan-tier]]
- Source: `web/src/app/api/integrations/hubspot/start/route.ts`, `web/src/app/api/integrations/hubspot/callback/route.ts`

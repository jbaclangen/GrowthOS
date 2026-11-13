---
type: process
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
consumes: ["[[organization]]", "[[membership]]", "[[member-role]]", "[[plan-tier]]", "[[legal-acceptance]]"]
produces: ["[[integration-connection]]", "[[hubspot-snapshot]]", "[[legal-acceptance]]"]
---

# connect-hubspot

An owner ticks the agreement box, installs Braventa's unlisted HubSpot app in their portal and comes back with an encrypted refresh token, a recorded agreement and a first snapshot of counts.

## Input → Movement → Output

Input: a signed-in owner of a Pro, Premium or trial organization submitting the "Connect HubSpot" form (with its required checkbox and the business the page showed) in Settings or on the onboarding connect step, on a deployment with the HubSpot app configured. Movement: the start route checks the checkbox, seals state in a cookie and redirects to HubSpot; the callback verifies the cookie, exchanges the code, introspects the token, checks the scopes, stores the token encrypted, records the agreement and runs the first sync. Output: an `active` `integration_connections` row with `provider = 'hubspot'`, a `legal_acceptances` row (`hubspot_connect`), usually a first `hubspot_snapshots` row, and a `?hubspot=` outcome code on the page the flow started from.

## Why this shape

HubSpot documents no PKCE for app OAuth, so the sealed cookie bound to user, organization and the `hubspot` provider tag is what stops a callback attaching a stranger's portal to a tenant or replaying a Search Console state (`web/src/lib/integrations/hubspot-oauth.ts:83-98`). The scope check stops a partial install from storing a token that can't count deals (`web/src/app/api/integrations/hubspot/callback/route.ts:80-83`). The agreement is recorded only after HubSpot approves, as for Search Console (D-057).

## Steps

1. The form: `HubSpotConnectForm`, a GET form with the required checkbox (`agree=yes`) and the business it acts on (`organizationId`, D-062) — `web/src/components/connections/connect-form.tsx:40-67` (hidden field `:58`).
2. `GET /api/integrations/hubspot/start`: `hubspotConfigured`; the business the form named (`getCurrentOrg(user, organizationId)`); `can(role, "integrations.connect")`, `consentGiven` (else `consent-needed`), plan gate `hubspotAccess` — `web/src/app/api/integrations/hubspot/start/route.ts:27-44` (business `:36`).
3. Redirect URI from the allowlist (`hubspotAppRedirectUri`) — `start/route.ts:46-47`; `web/src/lib/integrations/hubspot-oauth.ts:39-55`.
4. Redirect to `app.hubspot.com/oauth/authorize` with `oauth` and the read scopes — `start/route.ts:50`; `hubspot-oauth.ts:25,59`; state (with the business id and `consented`) sealed into `brv_hubspot_oauth` (600 s, path-scoped) — `start/route.ts:51-61`.
5. `GET /api/integrations/hubspot/callback`: open the cookie, `hubspotStateMatches` on state and user (else `expired`), then the business sealed in the state, not the one current now, and its owner check again (else `owner-only`) — `web/src/app/api/integrations/hubspot/callback/route.ts:41-49`; plan gate again — `:65`.
6. Exchange the code (OAuth API `2026-09`) and introspect for portal id, domain and scopes — `callback/route.ts:72-73`; `hubspot-oauth.ts:132,150`.
7. All three scopes required, else revoke — `callback/route.ts:80-83`; `hubspot-oauth.ts:195`.
8. `saveHubSpotConnection`: revoke a replaced token, drop snapshots of another portal, upsert encrypted — `callback/route.ts:86`; `web/src/lib/integrations/hubspot.ts:215-252`.
9. Record the agreement (`hubspot_connect`, subject the portal domain) — `callback/route.ts:101-108`.
10. First sync with `skipGuard` — `callback/route.ts:110` → [sync-hubspot](sync-hubspot.md).

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

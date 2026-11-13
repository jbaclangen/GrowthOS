---
type: process
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
consumes: ["[[organization]]", "[[membership]]", "[[member-role]]", "[[plan-tier]]"]
produces: ["[[integration-connection]]", "[[search-console-snapshot]]", "[[analytics-snapshot]]", "[[legal-acceptance]]"]
---

# connect-search-console

An owner sends Braventa to Google's consent screen once ("Connect Google") and comes back with an encrypted refresh token for each Google product they granted (Search Console, Google Analytics 4) and a first snapshot of each.

## Input → Movement → Output

Input: a signed-in owner of a Pro, Premium or trial organization submitting the "Connect Google" form (with its required checkbox and the business the page showed) from either card in Settings or on the onboarding connect step. Movement: the start route checks the checkbox, seals state in a cookie and redirects to Google with both read-only scopes; the callback verifies the cookie, exchanges the code with PKCE, keeps the products whose scope was granted, stores one encrypted row per product, records the agreement and runs each product's first sync. Output: an `active` `integration_connections` row per granted product, a `legal_acceptances` row (`search_console_connect`), usually a first `search_console_snapshots` and/or `analytics_snapshots` row, and a `?gsc=` outcome code on the page the flow started from.

## Why this shape

Without the sealed cookie bound to user and organization, a callback could attach a stranger's Google account to a tenant (`web/src/lib/integrations/google-oauth.ts:82-95,114-115`). Without the exact return-to allowlist, `?returnTo=` would be an open redirect (`web/src/lib/integrations/return-to.ts:1-13`). Google lets the owner untick either scope, so the callback keeps only what was granted, and with neither it revokes and stores nothing (`web/src/app/api/integrations/google/callback/route.ts:87-96`). One sign-in means one token: revoking it at Google ends both products, so the two rows are saved and cleared together (`web/src/lib/integrations/google-connection.ts:6-10`).

## Steps

1. `GET /api/integrations/google/start`: resolve `returnTo` against the allowlist; refuse when not configured — `web/src/app/api/integrations/google/start/route.ts:30-31`.
2. The business the form named (`?organizationId=`, D-062: `getCurrentOrg(user, organizationId)`), else `no-business`; `can(role, "integrations.connect")` (owner only, `web/src/lib/team/roles.ts:88`; [member-role](../objects/tenancy/member-role.md)), else `owner-only`; the checkbox (`consentGiven`), else `consent-needed`; plan gate `searchConsoleAccess` read through the user's client (the same Pro rule as `googleAnalyticsAccess`, `web/src/lib/integrations/google-analytics-access.ts:12-15`) — `start/route.ts:33-45` (business `web/src/app/api/integrations/google/start/route.ts:37`, permission `web/src/app/api/integrations/google/start/route.ts:39`, checkbox `web/src/app/api/integrations/google/start/route.ts:41`); `web/src/lib/integrations/search-console-access.ts:12-15`.
3. Random state + PKCE verifier; redirect to Google with `openid email`, `webmasters.readonly` and `analytics.readonly` — `start/route.ts:50-55`; `web/src/lib/integrations/google-oauth.ts:16-19,64-69`.
4. Seal `{state, verifier, userId, orgId, redirectUri, expiresAt, returnTo, consented}` into the `brv_google_oauth` cookie (httpOnly, 600 s, path-scoped) — `start/route.ts:56-66`; `google-oauth.ts:22-23,95`.
5. `GET /api/integrations/google/callback`: open the cookie and `stateMatches` on state + user (else `expired`); then the business sealed in the state, not the one current now, needs `integrations.connect` again (else `owner-only`); failures return to Settings — `web/src/app/api/integrations/google/callback/route.ts:47-55` (state `:51`, business `:54`, permission `:55`).
6. Google error or missing code → outcome code — `web/src/app/api/integrations/google/callback/route.ts:59-62`; plan gate again (`searchConsoleAccess`) — `web/src/app/api/integrations/google/callback/route.ts:64-75`.
7. Exchange the code with the verifier — `web/src/app/api/integrations/google/callback/route.ts:79-85`; keep the products whose scope was granted, none → revoke and `scope-missing`; no refresh token → revoke — `web/src/app/api/integrations/google/callback/route.ts:87-100`.
8. `saveGoogleConnection` (service client, scoped to the authorised org): revoke the old tokens once each, clear the products not granted this time, drop a product's snapshots if the Google account changed, upsert one row per granted product with `encryptSecret` — `callback/route.ts:102-115`; `web/src/lib/integrations/google-connection.ts:43-84`; `web/src/lib/integrations/secret-box.ts:36`. Then record the agreement (`search_console_connect`, subject the Google account email; [legal-acceptance](../objects/access/legal-acceptance.md)) — `callback/route.ts:116-124`.
9. First sync of each granted product with `skipGuard: true`, in parallel; outcome `connected` when all succeed, `choose-property` when one needs a property, else `connected-sync-failed` — `callback/route.ts:126-136` → [sync-search-console](sync-search-console.md), [sync-google-analytics](sync-google-analytics.md).
10. Both cards render `SearchConsoleConnectForm`, a GET form to the start route with `returnTo`, the business (`organizationId`) and the required checkbox — `web/src/components/connections/connect-form.tsx:8-35` (used at `web/src/components/connections/search-console-card.tsx:232`, `web/src/components/connections/analytics-card.tsx:143`); outcome codes starting `ga-` scroll to the Google Analytics card — `return-to.ts:15-24`.
11. Disconnect ("Disconnect Google", on either card): revoke at Google, then clear both rows and both products' snapshots — `web/src/app/settings/connections-actions.ts:81-91` (needs `integrations.connect` `:84`, for the business the form names `:24-31`); `google-connection.ts:105-116`.

## Human gate

The owner approves on Google's consent screen and may untick either product (between steps 4 and 5). Nothing else waits; the first syncs run before the redirect (`callback/route.ts:33-34`).

## If you change this

- **Hits:** [integration-connection](../objects/integrations/integration-connection.md), [sync-search-console](sync-search-console.md), [sync-google-analytics](sync-google-analytics.md), [connect-step](../objects/onboarding/connect-step.md), [member-role](../objects/tenancy/member-role.md) (who holds `integrations.connect`), [legal-acceptance](../objects/access/legal-acceptance.md), `docs/architecture/SEARCH_CONSOLE_SETUP.md` (registered redirect URIs `google-oauth.ts:25-27`, the consent screen's scopes), `docs/architecture/LEGAL_ACCEPTANCE.md`
- **Does not hit:** the pipeline steps; MCP, which skips the connect step (`web/src/app/onboarding/[sessionId]/connect/page.tsx:28`); the OAuth server under `/oauth/*`

## Surfaces

| Surface | Role |
|---|---|
| Owner | starts, consents on Google, may untick a product |
| `/api/integrations/google/start`, `/api/integrations/google/callback` | run the flow |
| Settings → Connections, `/onboarding/[sessionId]/connect` (Search Console and Google Analytics cards) | start link, outcome notice, disconnect |
| Google OAuth | consent, token exchange, revocation |

## See

- Objects: [[integration-connection]], [[search-console-snapshot]], [[analytics-snapshot]], [[legal-acceptance]], [[organization]], [[plan-tier]]
- Source: `web/src/app/api/integrations/google/start/route.ts`, `web/src/app/api/integrations/google/callback/route.ts`, `web/src/lib/integrations/google-connection.ts`

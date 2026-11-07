---
type: process
universe: live
status: verified
verified: 2026-11-08
commit: 2dd74b3
consumes: ["[[organization]]", "[[membership]]", "[[member-role]]", "[[plan-tier]]"]
produces: ["[[integration-connection]]", "[[search-console-snapshot]]", "[[analytics-snapshot]]"]
---

# connect-search-console

An owner sends Braventa to Google's consent screen once ("Connect Google") and comes back with an encrypted refresh token for each Google product they granted (Search Console, Google Analytics 4) and a first snapshot of each.

## Input → Movement → Output

Input: a signed-in owner of a Pro, Premium or trial organization opening "Connect Google" from either card in Settings or on the onboarding connect step. Movement: the start route seals state in a cookie and redirects to Google with both read-only scopes; the callback verifies the cookie, exchanges the code with PKCE, keeps the products whose scope was granted, stores one encrypted row per product and runs each product's first sync. Output: an `active` `integration_connections` row per granted product, usually a first `search_console_snapshots` and/or `analytics_snapshots` row, and a `?gsc=` outcome code on the page the flow started from.

## Why this shape

Without the sealed cookie bound to user and organization, a callback could attach a stranger's Google account to a tenant (`web/src/lib/integrations/google-oauth.ts:82-95,114-115`). Without the exact return-to allowlist, `?returnTo=` would be an open redirect (`web/src/lib/integrations/return-to.ts:1-12`). Google lets the owner untick either scope, so the callback keeps only what was granted, and with neither it revokes and stores nothing (`web/src/app/api/integrations/google/callback/route.ts:85-94`). One sign-in means one token: revoking it at Google ends both products, so the two rows are saved and cleared together (`web/src/lib/integrations/google-connection.ts:6-10`).

## Steps

1. `GET /api/integrations/google/start`: resolve `returnTo` against the allowlist; refuse when not configured — `web/src/app/api/integrations/google/start/route.ts:30-31`.
2. `can(role, "integrations.connect")` (owner only, `web/src/lib/team/roles.ts:86`; [member-role](../objects/tenancy/member-role.md)), else `owner-only`; plan gate `searchConsoleAccess` read through the user's client (the same Pro rule as `googleAnalyticsAccess`, `web/src/lib/integrations/google-analytics-access.ts:12-15`) — `start/route.ts:33-43` (permission `:36`); `web/src/lib/integrations/search-console-access.ts:12-15`.
3. Random state + PKCE verifier; redirect to Google with `openid email`, `webmasters.readonly` and `analytics.readonly` — `start/route.ts:48-53`; `web/src/lib/integrations/google-oauth.ts:16-19,64-69`.
4. Seal `{state, verifier, userId, orgId, redirectUri, expiresAt, returnTo}` into the `brv_google_oauth` cookie (httpOnly, 600 s, path-scoped) — `start/route.ts:54-64`; `google-oauth.ts:22-23,95`.
5. `GET /api/integrations/google/callback`: open the cookie, `integrations.connect` again, `stateMatches` on state + user + org; failures return to Settings — `web/src/app/api/integrations/google/callback/route.ts:47-55` (permission `:51`).
6. Google error or missing code → outcome code — `:56-59`; plan gate again (`searchConsoleAccess`) — `:61-72`.
7. Exchange the code with the verifier — `:76-82`; keep the products whose scope was granted, none → revoke and `scope-missing`; no refresh token → revoke — `:84-97`.
8. `saveGoogleConnection` (service client, scoped to the authorised org): revoke the old tokens once each, clear the products not granted this time, drop a product's snapshots if the Google account changed, upsert one row per granted product with `encryptSecret` — `callback/route.ts:100-113`; `web/src/lib/integrations/google-connection.ts:40-81`; `web/src/lib/integrations/secret-box.ts:36`.
9. First sync of each granted product with `skipGuard: true`, in parallel; outcome `connected` when all succeed, `choose-property` when one needs a property, else `connected-sync-failed` — `callback/route.ts:124-134` → [sync-search-console](sync-search-console.md), [sync-google-analytics](sync-google-analytics.md).
10. Both cards build the start link with `searchConsoleStartHref` — `return-to.ts:25-26`; outcome codes starting `ga-` scroll to the Google Analytics card — `:14-23`.
11. Disconnect ("Disconnect Google", on either card): revoke at Google, then clear both rows and both products' snapshots — `web/src/app/settings/connections-actions.ts:79-89` (needs `integrations.connect` `:82`); `google-connection.ts:102-113`.

## Human gate

The owner approves on Google's consent screen and may untick either product (between steps 4 and 5). Nothing else waits; the first syncs run before the redirect (`callback/route.ts:33-34`).

## If you change this

- **Hits:** [integration-connection](../objects/integrations/integration-connection.md), [sync-search-console](sync-search-console.md), [sync-google-analytics](sync-google-analytics.md), [connect-step](../objects/onboarding/connect-step.md), [member-role](../objects/tenancy/member-role.md) (who holds `integrations.connect`), `docs/architecture/SEARCH_CONSOLE_SETUP.md` (registered redirect URIs `google-oauth.ts:24-26`, the consent screen's scopes)
- **Does not hit:** the pipeline steps; MCP, which skips the connect step (`web/src/app/onboarding/[sessionId]/connect/page.tsx:24`); the OAuth server under `/oauth/*`

## Surfaces

| Surface | Role |
|---|---|
| Owner | starts, consents on Google, may untick a product |
| `/api/integrations/google/start`, `/api/integrations/google/callback` | run the flow |
| Settings → Connections, `/onboarding/[sessionId]/connect` (Search Console and Google Analytics cards) | start link, outcome notice, disconnect |
| Google OAuth | consent, token exchange, revocation |

## See

- Objects: [[integration-connection]], [[search-console-snapshot]], [[analytics-snapshot]], [[organization]], [[plan-tier]]
- Source: `web/src/app/api/integrations/google/start/route.ts`, `web/src/app/api/integrations/google/callback/route.ts`, `web/src/lib/integrations/google-connection.ts`

---
type: process
universe: live
status: verified
verified: 2026-11-07
commit: 5757423
consumes: ["[[organization]]", "[[membership]]", "[[member-role]]", "[[plan-tier]]"]
produces: ["[[integration-connection]]", "[[search-console-snapshot]]"]
---

# connect-search-console

An owner sends Braventa to Google's consent screen and comes back with an encrypted refresh token and a first snapshot.

## Input → Movement → Output

Input: a signed-in owner of a Pro, Premium or trial organization opening "Connect Google Search Console" from Settings or the onboarding connect step. Movement: the start route seals state in a cookie and redirects to Google; the callback verifies the cookie, exchanges the code with PKCE, checks the scope, stores the token encrypted and runs the first sync. Output: an `active` `integration_connections` row, usually a first `search_console_snapshots` row, and a `?gsc=` outcome code on the page the flow started from.

## Why this shape

Without the sealed cookie bound to user and organization, a callback could attach a stranger's Google account to a tenant (`web/src/lib/integrations/google-oauth.ts:91-92,110-113`). Without the exact return-to allowlist, `?returnTo=` would be an open redirect (`web/src/lib/integrations/return-to.ts:1-12`). Without the scope check, a consent with the Search Console box unticked would store a useless token (`web/src/app/api/integrations/google/callback/route.ts:81-86`).

## Steps

1. `GET /api/integrations/google/start`: resolve `returnTo` against the allowlist; refuse when not configured — `web/src/app/api/integrations/google/start/route.ts:30-31`.
2. `can(role, "integrations.connect")` (owner only, `web/src/lib/team/roles.ts:86`; [member-role](../objects/tenancy/member-role.md)), else `owner-only`; plan gate `searchConsoleAccess` read through the user's client — `start/route.ts:33-43` (permission `:37`); `web/src/lib/integrations/search-console-access.ts:12-15`. Then the connect form's checkbox (`agree=yes`, D-057), else `consent-needed` — `start/route.ts:39`.
3. Random state + PKCE verifier; redirect to Google with scope `webmasters.readonly` — `start/route.ts:48-53`; `web/src/lib/integrations/google-oauth.ts:14-16`.
4. Seal `{state, verifier, userId, orgId, redirectUri, expiresAt, returnTo, consented}` into the `brv_google_oauth` cookie (httpOnly, 600 s, path-scoped) — `start/route.ts:54-64`; `google-oauth.ts:19-20,92`.
5. `GET /api/integrations/google/callback`: open the cookie, `integrations.connect` again, `stateMatches` on state + user + org; failures return to Settings — `web/src/app/api/integrations/google/callback/route.ts:44-51` (permission `:48`).
6. Google error or missing code → outcome code — `:53-56`; plan gate again — `:59-69`.
7. Exchange the code with the verifier — `:73-79`; require the Search Console scope and a refresh token, else revoke at Google — `:81-90`.
8. `saveConnection` (service client, scoped to the authorised org): revoke the replaced token, drop snapshots if the Google account changed, upsert with `encryptSecret` — `callback/route.ts:92-104`; `web/src/lib/integrations/search-console.ts:367-405`; `web/src/lib/integrations/secret-box.ts:36`.
9. Record the owner's confirmation in [legal-acceptance](../objects/access/legal-acceptance.md) (`search_console_connect`, subject the Google email) when the sealed state says they ticked it — `callback/route.ts:105-113`.
10. First sync with `skipGuard: true`; outcome `connected`, `choose-property` or `connected-sync-failed` — `callback/route.ts:115-116` → [sync-search-console](sync-search-console.md).
11. Both entry pages render `SearchConsoleConnectForm`, a GET form to the start route with the required checkbox (connect and reconnect) — `web/src/components/connections/connect-form.tsx:7-31`; `web/src/components/connections/search-console-card.tsx:222-227,306-308`.

## Human gate

The owner ticks the connect checkbox (before step 1) and approves on Google's consent screen (between steps 4 and 5). Nothing else waits; the first sync runs before the redirect (`callback/route.ts:29-30`).

## If you change this

- **Hits:** [integration-connection](../objects/integrations/integration-connection.md), [sync-search-console](sync-search-console.md), [connect-step](../objects/onboarding/connect-step.md), [member-role](../objects/tenancy/member-role.md) (who holds `integrations.connect`), `docs/architecture/SEARCH_CONSOLE_SETUP.md` (registered redirect URIs, `google-oauth.ts:22-24`)
- **Does not hit:** the pipeline steps; MCP, which skips the connect step (`web/src/app/onboarding/[sessionId]/connect/page.tsx:22`); the OAuth server under `/oauth/*`

## Surfaces

| Surface | Role |
|---|---|
| Owner | starts, consents on Google |
| `/api/integrations/google/start`, `/api/integrations/google/callback` | run the flow |
| Settings → Connections, `/onboarding/[sessionId]/connect` | start link, outcome notice |
| Google OAuth | consent, token exchange |

## See

- Objects: [[integration-connection]], [[search-console-snapshot]], [[organization]], [[plan-tier]]
- Source: `web/src/app/api/integrations/google/start/route.ts`, `web/src/app/api/integrations/google/callback/route.ts`

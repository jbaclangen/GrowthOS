---
type: process
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
consumes: ["[[organization]]", "[[membership]]", "[[member-role]]", "[[plan-tier]]"]
produces: ["[[integration-connection]]", "[[search-console-snapshot]]"]
---

# connect-search-console

An owner sends Braventa to Google's consent screen and comes back with an encrypted refresh token and a first snapshot.

## Input → Movement → Output

Input: a signed-in owner of a Pro, Premium or trial organization opening "Connect Google Search Console" from Settings or the onboarding connect step. Movement: the start route seals state in a cookie and redirects to Google; the callback verifies the cookie, exchanges the code with PKCE, checks the scope, stores the token encrypted and runs the first sync. Output: an `active` `integration_connections` row, usually a first `search_console_snapshots` row, and a `?gsc=` outcome code on the page the flow started from.

## Why this shape

Without the sealed cookie bound to user and organization, a callback could attach a stranger's Google account to a tenant (`web/src/lib/integrations/google-oauth.ts:89-90,108-111`). Without the exact return-to allowlist, `?returnTo=` would be an open redirect (`web/src/lib/integrations/return-to.ts:1-12`). Without the scope check, a consent with the Search Console box unticked would store a useless token (`web/src/app/api/integrations/google/callback/route.ts:80-85`).

## Steps

1. `GET /api/integrations/google/start`: resolve `returnTo` against the allowlist; refuse when not configured — `web/src/app/api/integrations/google/start/route.ts:29-30`.
2. `can(role, "integrations.connect")` (owner only, `web/src/lib/team/roles.ts:86`; [member-role](../objects/tenancy/member-role.md)), else `owner-only`; plan gate `searchConsoleAccess` read through the user's client — `start/route.ts:32-40` (permission `:36`); `web/src/lib/integrations/search-console-access.ts:12-15`.
3. Random state + PKCE verifier; redirect to Google with scope `webmasters.readonly` — `start/route.ts:45-50`; `web/src/lib/integrations/google-oauth.ts:14-16`.
4. Seal `{state, verifier, userId, orgId, redirectUri, expiresAt, returnTo}` into the `brv_google_oauth` cookie (httpOnly, 600 s, path-scoped) — `start/route.ts:51-61`; `google-oauth.ts:19-20,90`.
5. `GET /api/integrations/google/callback`: open the cookie, `integrations.connect` again, `stateMatches` on state + user + org; failures return to Settings — `web/src/app/api/integrations/google/callback/route.ts:43-50` (permission `:47`).
6. Google error or missing code → outcome code — `:52-55`; plan gate again — `:58-68`.
7. Exchange the code with the verifier — `:72-78`; require the Search Console scope and a refresh token, else revoke at Google — `:80-89`.
8. `saveConnection` (service client, scoped to the authorised org): revoke the replaced token, drop snapshots if the Google account changed, upsert with `encryptSecret` — `callback/route.ts:91-103`; `web/src/lib/integrations/search-console.ts:367-405`; `web/src/lib/integrations/secret-box.ts:36`.
9. First sync with `skipGuard: true`; outcome `connected`, `choose-property` or `connected-sync-failed` — `callback/route.ts:105-106` → [sync-search-console](sync-search-console.md).
10. Both entry pages build the start link with `searchConsoleStartHref` — `return-to.ts:21-26`.

## Human gate

The owner approves on Google's consent screen (between steps 4 and 5). Nothing else waits; the first sync runs before the redirect (`callback/route.ts:28-29`).

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

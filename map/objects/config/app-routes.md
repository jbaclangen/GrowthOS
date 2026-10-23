---
type: object
cluster: config
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: web/src/proxy.ts
---

# App routes (`web/src/app`)

The page and API surface of app.braventa.io: which paths exist, which work without a session, and which server
actions write.

## Why this shape

One cookie gate in `web/src/proxy.ts` refreshes the Supabase session and sends signed-out visitors to `/login`;
authorization itself is RLS (`web/src/proxy.ts:4-5`). Paths that external callers hit without a cookie (MCP clients,
Postgres hand-offs, OAuth, metadata) are listed once in `PUBLIC_PATHS` and check their own credential
(`web/src/proxy.ts:6-22`). Every page must also be described to the in-app assistant: a unit test fails when a
`page.tsx` under `web/src/app` is missing from `APP_ROUTES` or a listed route no longer exists
(`web/src/lib/assistant/assistant.test.ts:216-242`, `web/src/lib/assistant/knowledge.ts:27`).

## Shape

- Gate: `PUBLIC_PATHS` `web/src/proxy.ts:11-22`; redirect to `/login?next=` `:49-54`; matcher `:58-60`.
- Root layout: tier/trial badge and assistant bar per request, `web/src/app/layout.tsx:48-63`.
- Security headers on every path (`X-Robots-Tag` noindex, `X-Frame-Options: DENY`, CSP `form-action 'self'`):
  `web/next.config.ts:4-14,20-22`. Crawlers disallowed everywhere: `web/src/app/robots.ts:3-6`.

Pages (gate = beyond the session cookie):

| Path | Purpose | Gate | Citation |
|---|---|---|---|
| `/` | entry; forwards a Supabase `code` to `/auth/callback`, else dashboard or login | public | `web/src/app/page.tsx:5,16-17` |
| `/login` | sign in / sign up; actions `signIn`, `signUp`, `signOut` | public | `web/src/app/login/page.tsx:6,24`; `web/src/app/login/actions.ts:19,32,48` |
| `/dashboard` | current business, latest report, all businesses | session | `web/src/app/dashboard/page.tsx:12,65,103` |
| `/onboarding` | start form | session | `web/src/app/onboarding/page.tsx:6,15` |
| `/onboarding/[sessionId]` | discovery; redirects when the session isn't open | RLS | `web/src/app/onboarding/[sessionId]/page.tsx:10,34-35` |
| `/onboarding/[sessionId]/review` | confirm priorities; not while `discovering` | RLS | `web/src/app/onboarding/[sessionId]/review/page.tsx:11,32-34` |
| `/onboarding/[sessionId]/connect` | Connect your tools; Search Console for Pro + trial, owner only, paused on Basic | RLS, role, plan | `web/src/app/onboarding/[sessionId]/connect/page.tsx:19-22,53,65` |
| `/onboarding/[sessionId]/questions` | follow-ups; requires status `following_up` | RLS | `web/src/app/onboarding/[sessionId]/questions/page.tsx:12,37` |
| `/analysis/[id]` | report; another organization's id is `notFound` | RLS | `web/src/app/analysis/[id]/page.tsx:17,36-38` |
| `/search` | read-only Search Console snapshot; paused on Basic | plan | `web/src/app/search/page.tsx:10,20-21,49,86-89` |
| `/plans` | tiers, trial countdown, Talk to us | session | `web/src/app/plans/page.tsx:8,25-38,87-89` |
| `/settings` | MCP keys, connected apps, service keys (owner), Search Console; MCP paused after the trial | role, plan | `web/src/app/settings/page.tsx:15,44,56,73-75,93,140-141` |
| `/oauth/authorize` | OAuth consent; checks the session itself, keeps its query | public | `web/src/app/oauth/authorize/page.tsx:16-23,53,61` |

API routes:

| Route | Credential | Citation |
|---|---|---|
| `POST /api/mcp` | bearer `brv_at_` (OAuth), `brv_` (personal), `brv_sk_` (service); Origin check; tool calls paused after the trial | `web/src/app/api/mcp/route.ts:8-14,36,40-42,76,94-96`; `web/src/lib/mcp/access.ts:3-6` |
| `POST /api/assistant` | session, same origin; plan gate | `web/src/app/api/assistant/route.ts:8-13,34-38`; `web/src/lib/assistant/handler.ts:53`; `web/src/lib/assistant/access.ts:3-6` |
| `POST /api/jobs/continue` | HMAC of job id + step; 202 then `after()` | `web/src/app/api/jobs/continue/route.ts:6-13,21,35-38` |
| `GET /api/integrations/google/start` | session, owner, Pro or trial | `web/src/app/api/integrations/google/start/route.ts:18-21,26,31-39` |
| `GET /api/integrations/google/callback` | same session, owner, state cookie, Pro | `web/src/app/api/integrations/google/callback/route.ts:20-28,37,43-47,67` |
| `GET /api/health/integrations` | none; 404 in production | `web/src/app/api/health/integrations/route.ts:21-26` |
| `GET /auth/callback` | PKCE code / OTP hash | `web/src/app/auth/callback/route.ts:6-9` |
| `POST /oauth/register`, `/oauth/token`, `/oauth/revoke` | open (DB rate limit), client auth, client auth | `web/src/app/oauth/register/route.ts:9-13,21`; `web/src/app/oauth/token/route.ts:8-11`; `web/src/app/oauth/revoke/route.ts:6-8` |
| `GET /.well-known/oauth-authorization-server/[[...path]]`, `/.well-known/oauth-protected-resource/[[...path]]` | none | each `route.ts:5-7` |
| `/api/n8n/*` | **ghost**: no route under `web/src/app/api/`; planned in `CLAUDE.md:72-73`, `docs/architecture/SYSTEM_ARCHITECTURE.md:237-239` | |

Server actions that write: `web/src/app/analysis/actions.ts:20,64,98,116` (`create_organization`, `ai_jobs`,
`content_items`, `business_profiles`); `web/src/app/analysis/plan-actions.ts:11-12,20,52,96`
(`diagnosis_findings`, `diagnoses`, `growth_plan_items`); `web/src/app/onboarding/[sessionId]/actions.ts:13-14,30,105`;
`web/src/app/plans/actions.ts:9-10,20-22` (`upgrade_requests`); `web/src/app/settings/actions.ts:8-9,15,67`
(`mcp_access_keys`); `web/src/app/settings/integrations-actions.ts:9,18,53,69`;
`web/src/app/settings/connections-actions.ts:10-13,28,35,47`; `web/src/app/oauth/authorize/actions.ts:13-15`.

Citations: `web/src/proxy.ts:11-22`, `web/src/lib/assistant/assistant.test.ts:216-242`

## Connected to

- **owns:** nothing (route group; data lives in the tables the actions write)
- **owned-by:** —
- **joins:** [assistant-knowledge](../access/assistant-knowledge.md) (`APP_ROUTES`), [mcp-access-key](../access/mcp-access-key.md), [oauth-client](../access/oauth-client.md), [plan-tier](../tenancy/plan-tier.md), [onboarding-session](../onboarding/onboarding-session.md), [job-dispatch](../pipeline/job-dispatch.md), [integration-connection](../integrations/integration-connection.md), [env-config](env-config.md), [deploy-targets](deploy-targets.md)
- **looks-like-but-is-not:** [site-pages](site-pages.md) (braventa.io, a separate Next app); `PUBLIC_PATHS` is a cookie gate, not authorization (`web/src/proxy.ts:4-5`)

## If you change this

- **Hits:** `PUBLIC_PATHS` for any route an external caller hits without a cookie; `APP_ROUTES` plus `npm run help:doc` for every page added or removed (the test fails otherwise, [build-help-doc](../../processes/build-help-doc.md)); [deploy-targets](deploy-targets.md) for paths outside callers post to (`/api/jobs/continue`, the Google callback, `/api/mcp`, `/auth/callback`); the headers apply to every path (`web/next.config.ts:21`).
- **Does not hit:** `site/` routes; the schema; tokens.

## Surfaces

| Surface | Role |
|---|---|
| Browser (signed-in owner) | reads pages, writes through server actions |
| `web/src/proxy.ts` | gates every request |
| MCP clients, Postgres `pg_net`, Google OAuth, Supabase Auth links | call the public API routes ([deploy-targets](deploy-targets.md)) |
| `web/src/lib/assistant/assistant.test.ts` | checks every page is in `APP_ROUTES` |
| Processes | [start-analysis](../../processes/start-analysis.md), [ask-braventa](../../processes/ask-braventa.md), [mcp-onboarding](../../processes/mcp-onboarding.md), [job-step-machine](../../processes/job-step-machine.md), [connect-search-console](../../processes/connect-search-console.md) |

## See

- Source: `web/src/proxy.ts`, `web/src/app/`
- As built: `docs/architecture/SYSTEM_ARCHITECTURE.md`

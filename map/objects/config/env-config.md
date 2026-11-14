---
type: object
cluster: config
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
entity: web/src/lib/env.ts
---

# Environment configuration (`env()`)

The environment variable names the app and the site read, where each is validated, and which may reach a browser.
Names only; values live in `web/.env.local` and the Vercel projects, never in the repo.

## Why this shape

`web/src/lib/env.ts` imports `server-only` (`web/src/lib/env.ts:1`), so a client component that touches it fails the build; each
variable is validated on first use and trimmed, so one missing integration doesn't take the others down and a pasted
line break can't break a key silently (`web/src/lib/env.ts:4-7,41-51`). `envConfigured()` lets optional integrations degrade (`web/src/lib/env.ts:53-56`).
The rule behind it: secrets are server-only and never `NEXT_PUBLIC_` (`CLAUDE.md:94`).

## Shape

| Name | `web/src/lib/env.ts` | Browser-visible | Also read raw |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `web/src/lib/env.ts:9` | yes | `web/src/proxy.ts:27`, `web/src/lib/supabase/client.ts:5` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `web/src/lib/env.ts:10` | yes | `web/src/proxy.ts:28`, `web/src/lib/supabase/client.ts:6` |
| `SUPABASE_SECRET_KEY` | `web/src/lib/env.ts:11` | no (bypasses RLS, `web/.env.example:6`) | |
| `OPENROUTER_API_KEY` | `web/src/lib/env.ts:12` | no | |
| `N8N_BASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_SECRET` | `web/src/lib/env.ts:13-15` | no | only the dev health route uses the client (`docs/architecture/INTEGRATIONS.md:34`) |
| `GOOGLE_API_KEY` | `web/src/lib/env.ts:16` | no | |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | `web/src/lib/env.ts:19-20`, optional `web/src/lib/env.ts:17-18` | no | |
| `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET` | `web/src/lib/env.ts:23-24`, optional `web/src/lib/env.ts:21-22` | no | HubSpot connection (`docs/architecture/HUBSPOT_SETUP.md`); `hubspotConfigured` `web/src/lib/integrations/hubspot-oauth.ts:35-37` |
| `INTEGRATIONS_ENCRYPTION_KEY` | `web/src/lib/env.ts:26-28` (32 bytes, base64) | no | |
| `NEXT_PUBLIC_APP_URL` | `web/src/lib/env.ts:29` (defaults to localhost) | yes | `web/src/app/login/actions.ts:43`, `web/src/lib/integrations/google-oauth.ts:53`, `web/src/lib/integrations/hubspot-oauth.ts:54`, `web/src/lib/pipeline/dispatch.ts:44`, `web/src/lib/oauth/server-metadata.ts:12` |
| `JOB_CONTINUE_SECRET` | `web/src/lib/env.ts:32`, optional `web/src/lib/env.ts:30-31` | no | `web/src/app/api/health/integrations/route.ts:96,101` |
| `JOB_DISPATCH` | `web/src/lib/env.ts:36`, optional `web/src/lib/env.ts:33-35` | no | |

Read outside the schema: `AI_MODE` `web/src/lib/ai/router.ts:36`; `VERCEL`, `NODE_ENV`
`web/src/lib/pipeline/dispatch.ts:39`; `PORT`, `NODE_ENV` `web/src/lib/pipeline/dispatch.ts:63-64`; `NODE_ENV`
`web/src/app/api/health/integrations/route.ts:24`; `NODE_ENV` `web/src/lib/oauth/server-metadata.ts:12`; `NODE_ENV` `web/src/lib/organizations/current.ts:24` (the `brv_business` cookie is `secure` in production). Dev-tool variables (`HEALTH_*`, `EVAL_*`, `AUDIT_JSON`,
`BRAND_TOOLS_DIR`) are listed on [generators](generators.md).

Site (its own process, Vercel `braventa-site`): `SITE_INDEXABLE` `site/src/lib/indexing.ts:2`; `CONTACT_HASH_SALT`
`site/src/lib/spam.ts:6,12`; `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_GUID` `site/src/lib/hubspot.ts:23,53`;
`HUBSPOT_ACCESS_TOKEN` `site/src/lib/hubspot.ts:51`; `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
`site/src/app/contact/actions.ts:47-48`.

Where names are listed: `web/.env.example:1-58` (complete, with server-only marks `web/.env.example:6,29,38,40,47,52`);
`docs/architecture/SYSTEM_ARCHITECTURE.md:260-270` (every name in the schema plus `AI_MODE`, with the optional
connection variables and the defaults). Which project holds which: `docs/architecture/SYSTEM_ARCHITECTURE.md:251-252`,
`docs/marketing/CONTACT_PIPELINE.md:25`.

Citations: `web/src/lib/env.ts:1,8-37,41-56`, `CLAUDE.md:94`

## Connected to

- **owns:** nothing stored
- **owned-by:** —
- **joins:** [deploy-targets](deploy-targets.md) (where values are set), [app-routes](app-routes.md), [site-pages](site-pages.md), [ai-worker](../pipeline/ai-worker.md) (`AI_MODE`, `OPENROUTER_API_KEY`), [job-dispatch](../pipeline/job-dispatch.md) (`JOB_DISPATCH`, `JOB_CONTINUE_SECRET`), [integration-connection](../integrations/integration-connection.md) (`INTEGRATIONS_ENCRYPTION_KEY`, `GOOGLE_OAUTH_*`, `HUBSPOT_CLIENT_*`), [generators](generators.md)
- **looks-like-but-is-not:** `web/.env.example` (a template; it holds no values and is not read by code); `.claude/launch.json` (dev server ports, not app config)

## If you change this

- **Hits:** a new variable → `web/src/lib/env.ts` schema, `web/.env.example`, `docs/architecture/SYSTEM_ARCHITECTURE.md:260-270`, the Vercel project ([deploy-targets](deploy-targets.md)) and, when optional, an `envConfigured()` check; rotating `INTEGRATIONS_ENCRYPTION_KEY` makes stored connections unreadable (`web/.env.example:42`); `JOB_CONTINUE_SECRET` must differ per environment because they share one database (`web/.env.example:49-50`); production needs `JOB_DISPATCH=database` (`web/.env.example:52-57`).
- **Does not hit:** tokens, the schema, the assistant knowledge base.

## Surfaces

| Surface | Role |
|---|---|
| Vercel `braventa-app`, `braventa-site` (Production env) | hold values |
| `web/.env.local` | local values; read by the dev server and the `tsx` scripts |
| `GET /api/health/integrations` | reports which are configured (dev only) |
| `web/scripts/health-check.mts` | reads `web/.env.local`, never prints secrets (`web/scripts/health-check.mts:8`) |

## See

- Source: `web/src/lib/env.ts`
- As built: `docs/architecture/SYSTEM_ARCHITECTURE.md` §5

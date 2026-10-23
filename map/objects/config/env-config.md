---
type: object
cluster: config
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: web/src/lib/env.ts
---

# Environment configuration (`env()`)

The environment variable names the app and the site read, where each is validated, and which may reach a browser.
Names only; values live in `web/.env.local` and the Vercel projects, never in the repo.

## Why this shape

`web/src/lib/env.ts` imports `server-only` (`:1`), so a client component that touches it fails the build; each
variable is validated on first use and trimmed, so one missing integration doesn't take the others down and a pasted
line break can't break a key silently (`:4-7,37-47`). `envConfigured()` lets optional integrations degrade (`:49-52`).
The rule behind it: secrets are server-only and never `NEXT_PUBLIC_` (`CLAUDE.md:85`).

## Shape

| Name | `web/src/lib/env.ts` | Browser-visible | Also read raw |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `:9` | yes | `web/src/proxy.ts:27`, `web/src/lib/supabase/client.ts:5` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `:10` | yes | `web/src/proxy.ts:28`, `web/src/lib/supabase/client.ts:6` |
| `SUPABASE_SECRET_KEY` | `:11` | no (bypasses RLS, `web/.env.example:6`) | |
| `OPENROUTER_API_KEY` | `:12` | no | |
| `N8N_BASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_SECRET` | `:13-15` | no | only the dev health route uses the client (`docs/architecture/INTEGRATIONS.md:34`) |
| `GOOGLE_API_KEY` | `:16` | no | |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | `:19-20`, optional `:17-18` | no | |
| `INTEGRATIONS_ENCRYPTION_KEY` | `:22-24` (32 bytes, base64) | no | |
| `NEXT_PUBLIC_APP_URL` | `:25` (defaults to localhost) | yes | `web/src/app/login/actions.ts:37`, `web/src/lib/integrations/google-oauth.ts:50`, `web/src/lib/pipeline/dispatch.ts:44`, `web/src/lib/oauth/server-metadata.ts:12` |
| `JOB_CONTINUE_SECRET` | `:28`, optional `:26-27` | no | `web/src/app/api/health/integrations/route.ts:93` |
| `JOB_DISPATCH` | `:32`, optional `:29-31` | no | |

Read outside the schema: `AI_MODE` `web/src/lib/ai/router.ts:36`; `VERCEL`, `NODE_ENV`
`web/src/lib/pipeline/dispatch.ts:39`; `PORT`, `NODE_ENV` `web/src/lib/pipeline/dispatch.ts:63-64`; `NODE_ENV`
`web/src/app/api/health/integrations/route.ts:24`; `NODE_ENV` `web/src/lib/oauth/server-metadata.ts:12`. Dev-tool variables (`HEALTH_*`, `EVAL_*`, `AUDIT_JSON`,
`BRAND_TOOLS_DIR`) are listed on [generators](generators.md).

Site (its own process, Vercel `braventa-site`): `SITE_INDEXABLE` `site/src/lib/indexing.ts:2`; `CONTACT_HASH_SALT`
`site/src/lib/spam.ts:6,12`; `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_GUID` `site/src/lib/hubspot.ts:23,53`;
`HUBSPOT_ACCESS_TOKEN` `site/src/lib/hubspot.ts:51`; `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
`site/src/app/contact/actions.ts:47-48`.

Where names are listed: `web/.env.example:1-49` (complete, with server-only marks `:6,29,31,38,43`);
`docs/architecture/SYSTEM_ARCHITECTURE.md:256-259` (ten names; `GOOGLE_OAUTH_*`, `INTEGRATIONS_ENCRYPTION_KEY`,
`JOB_CONTINUE_SECRET` and `JOB_DISPATCH` are missing there, a doc lag to fix). Which project holds which:
`docs/architecture/SYSTEM_ARCHITECTURE.md:247-248`, `docs/marketing/CONTACT_PIPELINE.md:25`.

Citations: `web/src/lib/env.ts:1,8-33,37-52`, `CLAUDE.md:85`

## Connected to

- **owns:** nothing stored
- **owned-by:** —
- **joins:** [deploy-targets](deploy-targets.md) (where values are set), [app-routes](app-routes.md), [site-pages](site-pages.md), [ai-worker](../pipeline/ai-worker.md) (`AI_MODE`, `OPENROUTER_API_KEY`), [job-dispatch](../pipeline/job-dispatch.md) (`JOB_DISPATCH`, `JOB_CONTINUE_SECRET`), [integration-connection](../integrations/integration-connection.md) (`INTEGRATIONS_ENCRYPTION_KEY`, `GOOGLE_OAUTH_*`), [generators](generators.md)
- **looks-like-but-is-not:** `web/.env.example` (a template; it holds no values and is not read by code); `.claude/launch.json` (dev server ports, not app config)

## If you change this

- **Hits:** a new variable → `web/src/lib/env.ts` schema, `web/.env.example`, `docs/architecture/SYSTEM_ARCHITECTURE.md:256-259`, the Vercel project ([deploy-targets](deploy-targets.md)) and, when optional, an `envConfigured()` check; rotating `INTEGRATIONS_ENCRYPTION_KEY` makes stored connections unreadable (`web/.env.example:33`); `JOB_CONTINUE_SECRET` must differ per environment because they share one database (`web/.env.example:39-41`); production needs `JOB_DISPATCH=database` (`web/.env.example:43-48`).
- **Does not hit:** tokens, the schema, the assistant knowledge base.

## Surfaces

| Surface | Role |
|---|---|
| Vercel `braventa-app`, `braventa-site` (Production env) | hold values |
| `web/.env.local` | local values; read by the dev server and the `tsx` scripts |
| `GET /api/health/integrations` | reports which are configured (dev only) |
| `web/scripts/health-check.mts` | reads `web/.env.local`, never prints secrets (`:8`) |

## See

- Source: `web/src/lib/env.ts`
- As built: `docs/architecture/SYSTEM_ARCHITECTURE.md` §5

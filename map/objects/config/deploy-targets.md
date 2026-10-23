---
type: object
cluster: config
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: docs/architecture/SYSTEM_ARCHITECTURE.md
---

# Deploy targets and inbound consumers

What runs the code outside this tree, and what outside the tree calls into it: the two Vercel projects, the one
Supabase project, and every external caller of an app route.

## Why this shape

One Supabase project serves every environment (`docs/architecture/SYSTEM_ARCHITECTURE.md:251,255-256`), so a local
dev server writes to production data (Q-009, `docs/decisions/OPEN_QUESTIONS.md:18`) and per-environment secrets have
to keep one environment from running another's steps (`web/.env.example:39-41`). Production never calls itself
(Vercel answers a self-call chain with 508), so Postgres posts the analysis hand-offs
(`docs/architecture/SYSTEM_ARCHITECTURE.md:156-164`). Nothing deploys through GitHub Actions: there is no `.github/`
directory at `62d0c69`.

## Shape

Live:

- **Vercel `braventa-app`**: root `web`, production branch `main`, `https://app.braventa.io`, Hobby tier (300 s per
  invocation, `web/src/app/onboarding/page.tsx:7-9`), env vars set for Production only
  (`docs/architecture/SYSTEM_ARCHITECTURE.md:247`; D-011 `docs/decisions/DECISION_LOG.md:131-132`).
- **Vercel `braventa-site`**: root `site`, `main`, `https://braventa.io` (`www` redirects); Hostinger is registrar and
  DNS (`docs/architecture/SYSTEM_ARCHITECTURE.md:248`; `docs/marketing/SITEMAP.md:12`); `HUBSPOT_*` and
  `CONTACT_HASH_SALT` live there (`docs/marketing/CONTACT_PIPELINE.md:25,41`; `site/src/lib/spam.ts:6`;
  `site/src/lib/hubspot.ts:9-10`). Deploy state is read with `gh api repos/jbaclangen/GrowthOS/commits/main/statuses`
  (`.claude/agents/braventa-health-check.md:18`).
- **Supabase project `mlztvhvmsullvwawwamc`**: Postgres + Auth + RLS for every environment (`CLAUDE.md:66`;
  `docs/architecture/SYSTEM_ARCHITECTURE.md:22,251`; `.mcp.json:5`; `docs/architecture/SEARCH_CONSOLE_SETUP.md:83`).
- **Postgres → `POST /api/jobs/continue`**: `pg_net` from an insert trigger, `pg_cron` sweeper every minute; the URL
  must be `https://…/api/jobs/continue` (`supabase/migrations/20261017110000_job_dispatches.sql:55-56,68,103-105,339-340`;
  `web/src/lib/pipeline/dispatch.ts:52,68-72`).
- **Google OAuth client** (GCP project `growth-os-511206`, `docs/architecture/SYSTEM_ARCHITECTURE.md:253`): redirect
  URIs `https://app.braventa.io/api/integrations/google/callback` and the localhost:3000 one, plus the origin of
  `NEXT_PUBLIC_APP_URL`; preview URLs don't work (`docs/architecture/SEARCH_CONSOLE_SETUP.md:54-59`;
  `docs/architecture/INTEGRATIONS.md:74-77`; `web/.env.example:24-26`; `web/src/lib/integrations/google-oauth.ts:18,49-50`).
- **Supabase Auth email links** → `/auth/callback?next=` and the Site URL root `/`
  (`web/src/app/login/actions.ts:37,41`; `web/src/app/page.tsx:5,16`; `docs/architecture/SECURITY_AND_PRIVACY.md:79-80`;
  `docs/architecture/SYSTEM_ARCHITECTURE.md:259-261`).
- **MCP clients** (Claude Code, Claude Desktop, claude.ai, ChatGPT, MCP Inspector, n8n HTTP node) → `/api/mcp`,
  `/oauth/*`, `/.well-known/*` (`docs/developers/MCP_AND_API.md:13,41-45,103,145-147`;
  `docs/architecture/MCP_SERVER.md:28,163,170`; `docs/product/CONNECT_YOUR_AI_ASSISTANT.md:30,47`;
  `docs/product/CONNECT_CHATGPT.md:24,44-47`).
- **HubSpot** (outbound from the site): Forms API, portal 247150427 (`docs/architecture/INTEGRATIONS.md:38`;
  `site/src/lib/hubspot.ts:53`).
- **Health check** defaults to the production URLs (`web/scripts/health-check.mts:17-18`).

Ghost (named, not wired):

- **n8n** at `n8nautomations.pixelmarketingdesign.com`, callbacks to `/api/n8n/*`: no route exists and `proxy.ts`
  would redirect it (`CLAUDE.md:67,72-73`; `docs/architecture/SYSTEM_ARCHITECTURE.md:23,29,52,81,237-239,252`;
  `docs/architecture/INTEGRATIONS.md:34`; `web/src/lib/integrations/n8n.ts:4-5,38-39`; `web/.env.example:17`; host Q-006).
- **support.braventa.io**, **community.braventa.io**: planned (`docs/product/SUPPORT_SITE.md:1-5`;
  `docs/marketing/SITEMAP.md:14`; `docs/architecture/SYSTEM_ARCHITECTURE.md:249-250`).

Doc lag: `docs/architecture/SYSTEM_ARCHITECTURE.md:21,247-248` still say "planned" / "Deploying (2026-10-11)" for
the two Vercel projects.

Citations: `docs/architecture/SYSTEM_ARCHITECTURE.md:244-253`

## Connected to

- **owns:** nothing in the tree
- **owned-by:** —
- **joins:** [env-config](env-config.md) (values live in the Vercel projects), [app-routes](app-routes.md) (the routes called), [job-dispatch](../pipeline/job-dispatch.md) (`job_dispatches` → `pg_net`), [integration-connection](../integrations/integration-connection.md) (Google client), [oauth-client](../access/oauth-client.md) and [mcp-access-key](../access/mcp-access-key.md) (MCP callers), [contact-request](../integrations/contact-request.md) (HubSpot), [generators](generators.md) (`health`)
- **looks-like-but-is-not:** `.claude/launch.json` (local dev ports); the Google Drive docs mirror (outside the repo, no code reads it)

## If you change this

- **Hits:** a new public route → `PUBLIC_PATHS` and this list; a new redirect URI → the GCP client and `docs/architecture/SEARCH_CONSOLE_SETUP.md:54-56`; a new env var → both the Vercel project and `web/.env.example`; moving `NEXT_PUBLIC_APP_URL` → Supabase Auth Site URL / redirect allow-list (`docs/architecture/SYSTEM_ARCHITECTURE.md:259-261`), the Google client and `job_dispatches` URL check; a second Supabase project → Q-009 and every migration.
- **Does not hit:** tokens, page copy.

## Surfaces

| Surface | Role |
|---|---|
| Vercel (two projects), Hostinger DNS | serve |
| Supabase (`pg_net`, `pg_cron`, Auth) | store; posts hand-offs; sends email links |
| Google, MCP clients, HubSpot | call in / are called |
| `.claude/agents/braventa-health-check.md`, `npm run health` | read state |

## See

- Source: `docs/architecture/SYSTEM_ARCHITECTURE.md` §5
- As built: `docs/architecture/INTEGRATIONS.md`

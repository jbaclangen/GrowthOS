---
type: object
cluster: config
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
entity: docs/architecture/SYSTEM_ARCHITECTURE.md
---

# Deploy targets and inbound consumers

What runs the code outside this tree, and what outside the tree calls into it: the two Vercel projects, the one
Supabase project, and every external caller of an app route.

## Why this shape

One Supabase project serves every environment (`docs/architecture/SYSTEM_ARCHITECTURE.md:255,259-260`), so a local
dev server writes to production data (Q-009, `docs/decisions/OPEN_QUESTIONS.md:18`) and per-environment secrets have
to keep one environment from running another's steps (`web/.env.example:47-50`). Production never calls itself
(Vercel answers a self-call chain with 508), so Postgres posts the analysis hand-offs
(`docs/architecture/SYSTEM_ARCHITECTURE.md:158-166`). Nothing deploys through GitHub Actions: there is no `.github/`
directory at `1917f9a`.

## Shape

Live:

- **Vercel `braventa-app`**: root `web`, production branch `main`, `https://app.braventa.io`, live since 2026-10-11,
  Hobby tier (300 s per invocation, `web/src/app/onboarding/page.tsx:12-14`), env vars set for Production only
  (`docs/architecture/SYSTEM_ARCHITECTURE.md:22,251`; `docs/marketing/SITEMAP.md:13`; D-011
  `docs/decisions/DECISION_LOG.md:164-166`).
- **Vercel `braventa-site`**: root `site`, `main`, `https://braventa.io` (`www` redirects), live since 2026-10-11;
  Hostinger is registrar and DNS (`docs/architecture/SYSTEM_ARCHITECTURE.md:252`; `docs/marketing/SITEMAP.md:12`); `HUBSPOT_*` and
  `CONTACT_HASH_SALT` live there (`docs/marketing/CONTACT_PIPELINE.md:25,41`; `site/src/lib/spam.ts:6`;
  `site/src/lib/hubspot.ts:9-10`). Deploy state is read with `gh api repos/jbaclangen/GrowthOS/commits/main/statuses`
  (`.claude/agents/braventa-health-check.md:18`).
- **Supabase project `mlztvhvmsullvwawwamc`**: Postgres + Auth + RLS for every environment (`CLAUDE.md:78`;
  `docs/architecture/SYSTEM_ARCHITECTURE.md:23,255`; `.mcp.json:5`; `docs/architecture/SEARCH_CONSOLE_SETUP.md:99`).
- **Postgres → `POST /api/jobs/continue`**: `pg_net` from an insert trigger, `pg_cron` sweeper every minute; the URL
  must be `https://…/api/jobs/continue` (`supabase/migrations/20261017110000_job_dispatches.sql:55-56,68,103-105,339-340`;
  `web/src/lib/pipeline/dispatch.ts:52,68-72`).
- **Google OAuth client** (GCP project `growth-os-511206`, `docs/architecture/SYSTEM_ARCHITECTURE.md:257`): redirect
  URIs `https://app.braventa.io/api/integrations/google/callback` and the localhost:3000 one, plus the origin of
  `NEXT_PUBLIC_APP_URL`; preview URLs don't work (`docs/architecture/SEARCH_CONSOLE_SETUP.md:70-75`;
  `docs/architecture/INTEGRATIONS.md:77-80`; `web/.env.example:24-26`; `web/src/lib/integrations/google-oauth.ts:21,52-53`).
  GA4 shares the client; its production setup (the two Analytics APIs and the `analytics.readonly` scope on the consent
  screen) is not recorded as done (`docs/architecture/SYSTEM_ARCHITECTURE.md:26`; `docs/architecture/INTEGRATIONS.md:35`).
- **HubSpot app** `braventa_crm_reader` (unlisted, defined in `hubspot/`): redirect URLs
  `https://app.braventa.io/api/integrations/hubspot/callback` and the localhost:3000 one
  (`hubspot/src/app/app-hsmeta.json:10-13`; `web/.env.example:32-34`; `web/src/lib/integrations/hubspot-oauth.ts:31-33,53-54`).
  Set up in production: the app is uploaded, its env vars are set and a first portal has been connected since
  2026-11-08; HubSpot hasn't reviewed the app, so installers see an "unverified app" warning
  (`docs/architecture/HUBSPOT_SETUP.md:3-6`; `docs/architecture/INTEGRATIONS.md:37`). D-059 is history and still reads
  "Not set up" (`docs/decisions/DECISION_LOG.md:894-895`); the steps are in `docs/architecture/HUBSPOT_SETUP.md` §3.
- **Supabase Auth email links** → `/auth/callback?next=` and the Site URL root `/`
  (`web/src/app/login/actions.ts:41-45`; `web/src/app/page.tsx:5,16`; `docs/architecture/SECURITY_AND_PRIVACY.md:96-97`;
  `docs/architecture/SYSTEM_ARCHITECTURE.md:270-272`).
- **MCP clients** (Claude Code, Claude Desktop, claude.ai, ChatGPT, MCP Inspector, n8n HTTP node) → `/api/mcp`,
  `/oauth/*`, `/.well-known/*` (`docs/developers/MCP_AND_API.md:13,41-45,103,145-147`;
  `docs/architecture/MCP_SERVER.md:28,168,175`; `docs/product/CONNECT_YOUR_AI_ASSISTANT.md:30,47`;
  `docs/product/CONNECT_CHATGPT.md:24,44-47`).
- **HubSpot** (outbound from the site): Forms API, portal 247150427 (`docs/architecture/INTEGRATIONS.md:38`;
  `site/src/lib/hubspot.ts:3,53`).
- **Health check** defaults to the production URLs (`web/scripts/health-check.mts:17-18`).

Ghost (named, not wired):

- **n8n** at `n8nautomations.pixelmarketingdesign.com`, callbacks to `/api/n8n/*`: no route exists and `proxy.ts`
  would redirect it (`CLAUDE.md:79,89-90`; `docs/architecture/SYSTEM_ARCHITECTURE.md:24,30,53,82,241-243,256`;
  `docs/architecture/INTEGRATIONS.md:34`; `web/src/lib/integrations/n8n.ts:4-5,38-39`; `web/.env.example:17`; host Q-006).
- **support.braventa.io**, **community.braventa.io**: planned (`docs/product/SUPPORT_SITE.md:1-5`;
  `docs/marketing/SITEMAP.md:14`; `docs/architecture/SYSTEM_ARCHITECTURE.md:253-254`).

Citations: `docs/architecture/SYSTEM_ARCHITECTURE.md:248-257`, `hubspot/src/app/app-hsmeta.json:10-13`

## Connected to

- **owns:** nothing in the tree
- **owned-by:** —
- **joins:** [env-config](env-config.md) (values live in the Vercel projects), [app-routes](app-routes.md) (the routes called), [job-dispatch](../pipeline/job-dispatch.md) (`job_dispatches` → `pg_net`), [integration-connection](../integrations/integration-connection.md) (Google client, HubSpot app), [oauth-client](../access/oauth-client.md) and [mcp-access-key](../access/mcp-access-key.md) (MCP callers), [contact-request](../integrations/contact-request.md) (HubSpot Forms), [generators](generators.md) (`health`)
- **looks-like-but-is-not:** `.claude/launch.json` (local dev ports); the Google Drive docs mirror (outside the repo, no code reads it); the two HubSpot portals (the site's Forms API portal is Braventa's own CRM, the app's OAuth app reads customers' portals)

## If you change this

- **Hits:** a new public route → `PUBLIC_PATHS` and this list; a new Google redirect URI → the GCP client and `docs/architecture/SEARCH_CONSOLE_SETUP.md:70-72`; a new HubSpot redirect URL → `hubspot/src/app/app-hsmeta.json` (uploaded with the HubSpot CLI) and `ALLOWED_ORIGINS` in `web/src/lib/integrations/hubspot-oauth.ts:33`; a new env var → both the Vercel project and `web/.env.example`; moving `NEXT_PUBLIC_APP_URL` → Supabase Auth Site URL / redirect allow-list (`docs/architecture/SYSTEM_ARCHITECTURE.md:270-272`), the Google client, the HubSpot app and `job_dispatches` URL check; a second Supabase project → Q-009 and every migration.
- **Does not hit:** tokens, page copy.

## Surfaces

| Surface | Role |
|---|---|
| Vercel (two projects), Hostinger DNS | serve |
| Supabase (`pg_net`, `pg_cron`, Auth) | store; posts hand-offs; sends email links |
| Google, HubSpot, MCP clients | call in / are called |
| `.claude/agents/braventa-health-check.md`, `npm run health` | read state |

## See

- Source: `docs/architecture/SYSTEM_ARCHITECTURE.md` §5
- As built: `docs/architecture/INTEGRATIONS.md`

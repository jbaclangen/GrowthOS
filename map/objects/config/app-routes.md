---
type: object
cluster: config
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
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
(`web/src/lib/assistant/assistant.test.ts:283-307`, `web/src/lib/assistant/knowledge.ts:28`). Since D-062 a person can
belong to several businesses, so forms that act on one post its id and the action resolves it with
`getCurrentOrg(userId, organizationId)` (for example `web/src/app/settings/team-actions.ts:17-19,23-26`; see
[switch-business](../../processes/switch-business.md)).

## Shape

- Gate: `PUBLIC_PATHS` `web/src/proxy.ts:11-22`; redirect to `/login?next=` `:49-54`; matcher `:58-60`.
- Root layout: tier/trial badge, business switcher and assistant bar per request, `web/src/app/layout.tsx:56-96`; the
  terms banner `web/src/app/layout.tsx:47-49`.
- Security headers on every path (`X-Robots-Tag` noindex, `X-Frame-Options: DENY`, CSP `form-action` limited to
  `'self'` and the Google and HubSpot consent hosts the connect forms redirect to, `FORM_ACTION` `web/next.config.ts:3-7`, kept in step by
  `web/src/lib/integrations/csp.test.ts`): `web/next.config.ts:9-20,26-28`. Crawlers disallowed everywhere: `web/src/app/robots.ts:3-6`.

Pages (gate = beyond the session cookie):

| Path | Purpose | Gate | Citation |
|---|---|---|---|
| `/` | entry; forwards a Supabase `code` to `/auth/callback`, else dashboard or login | public | `web/src/app/page.tsx:5,16-17` |
| `/login` | sign in / sign up; actions `signIn`, `signUp`, `signOut` | public | `web/src/app/login/page.tsx:6,25` (invite copy for `?next=/invite/` `:22,29-30`); `web/src/app/login/actions.ts:21,34,57` |
| `/dashboard` | the current business only (D-062): its latest report and analyzed websites, Add a business, the notice after Remove business | session | `web/src/app/dashboard/page.tsx:12,26-30,40-62,79-80,95-99,136` |
| `/onboarding` | start form; a member of a business picks that business or a new one, refused at the account's limit (D-062) | session | `web/src/app/onboarding/page.tsx:11,16,38-56` |
| `/onboarding/[sessionId]` | discovery; redirects when the session isn't open | RLS | `web/src/app/onboarding/[sessionId]/page.tsx:10,34-35` |
| `/onboarding/[sessionId]/review` | confirm priorities; not while `discovering` | RLS | `web/src/app/onboarding/[sessionId]/review/page.tsx:11,32-34` |
| `/onboarding/[sessionId]/connect` | Connect your tools for the session's business: Google (Search Console and Google Analytics 4, one sign-in) and HubSpot for Pro + trial, `integrations.connect` (owner), paused on Basic | RLS, role, plan | `web/src/app/onboarding/[sessionId]/connect/page.tsx:23-28,55,57-73,121-142`; `web/src/lib/integrations/connect-step.ts:38,77` |
| `/onboarding/[sessionId]/questions` | follow-ups; requires status `following_up` | RLS | `web/src/app/onboarding/[sessionId]/questions/page.tsx:12,37` |
| `/analysis/[id]` | report; another organization's id is `notFound` | RLS | `web/src/app/analysis/[id]/page.tsx:17,36-38` |
| `/search` | read-only Search Console snapshot; paused on Basic | plan | `web/src/app/search/page.tsx:10,20-21,49,86-89` |
| `/plans` | tiers, trial countdown, the account's business limit, Talk to us for the business shown | session | `web/src/app/plans/page.tsx:11,36-54,84-87,107-110` |
| `/settings` | your role line; Businesses (`#businesses`: switch, add, owners remove one, D-061/D-062); Team (`#team`: every member sees the list and seats; `team.manage` adds invite, withdraw, change role, remove); Integrations: MCP keys (personal key form needs `keys.manage_own`), connected apps, service keys (`keys.manage_any`, owner), Connections (Google: Search Console and Google Analytics 4 cards; HubSpot card; Coming soon tools); MCP paused after the trial | role, plan | `web/src/app/settings/page.tsx:18,56-60,65,67-68,70,72-73,78,90-98,117-121,161-163`; `web/src/app/settings/businesses-section.tsx:11-13,23,49,67-69,96-104`; `web/src/app/settings/team-section.tsx:10-16,24,45-52,57-63,77-82`; `web/src/app/settings/connections-section.tsx:9-12,18-20` |
| `/invite/[token]` | join a business from an invite link: shows the business and role, or why it can't be used; Join calls `acceptInvitation`; signed-out visitors go through `/login?next=` (not in `PUBLIC_PATHS`) | session, token | `web/src/app/invite/[token]/page.tsx:13,17,27-30,44-52,62-81` ([invite-and-join](../../processes/invite-and-join.md)) |
| `/oauth/authorize` | OAuth consent; checks the session itself, keeps its query | public | `web/src/app/oauth/authorize/page.tsx:16-23,53,61` |

API routes:

| Route | Credential | Citation |
|---|---|---|
| `POST /api/mcp` | bearer `brv_at_` (OAuth), `brv_` (personal), `brv_sk_` (service); Origin check; tool calls carry the principal's role; tool calls paused after the trial | `web/src/app/api/mcp/route.ts:8-14,36,40-42,76,82-83,101-103`; `web/src/lib/mcp/access.ts:3-6` |
| `POST /api/assistant` | session, same origin; plan gate | `web/src/app/api/assistant/route.ts:10-13,36-41`; `web/src/lib/assistant/handler.ts:54`; `web/src/lib/assistant/access.ts:3-6` |
| `POST /api/jobs/continue` | HMAC of job id + step; 202 then `after()` | `web/src/app/api/jobs/continue/route.ts:6-13,21,35-38` |
| `GET /api/integrations/google/start` | session, the business the form named, `integrations.connect` (owner), agreement box, Pro or trial | `web/src/app/api/integrations/google/start/route.ts:20-23,28,35-45` |
| `GET /api/integrations/google/callback` | same session, state cookie with the sealed business, `integrations.connect` (owner), Pro or trial | `web/src/app/api/integrations/google/callback/route.ts:25-31,43,48-55,75` |
| `GET /api/integrations/hubspot/start` | session, the business the form named, `integrations.connect` (owner), agreement box, Pro or trial | `web/src/app/api/integrations/hubspot/start/route.ts:19-22,27,36-44` |
| `GET /api/integrations/hubspot/callback` | same session, state cookie with the sealed business, `integrations.connect` (owner), Pro or trial | `web/src/app/api/integrations/hubspot/callback/route.ts:21-25,37,48-49,65` |
| `GET /api/health/integrations` | none; 404 in production | `web/src/app/api/health/integrations/route.ts:21-26` |
| `GET /auth/callback` | PKCE code / OTP hash | `web/src/app/auth/callback/route.ts:6-9` |
| `POST /oauth/register`, `/oauth/token`, `/oauth/revoke` | open (DB rate limit), client auth, client auth | `web/src/app/oauth/register/route.ts:9-13,21`; `web/src/app/oauth/token/route.ts:8-11`; `web/src/app/oauth/revoke/route.ts:6-8` |
| `GET /.well-known/oauth-authorization-server/[[...path]]`, `/.well-known/oauth-protected-resource/[[...path]]` | none | each `route.ts:5-7` |
| `/api/n8n/*` | **ghost**: no route under `web/src/app/api/`; planned in `CLAUDE.md:89-90`, `docs/architecture/SYSTEM_ARCHITECTURE.md:241-243` | |

Server actions that write: `web/src/app/analysis/actions.ts:30,88,128,158` (`create_organization`, `ai_jobs`,
`content_items`, `business_profiles`); `web/src/app/analysis/plan-actions.ts:13-16,24,59,104,152`
(`diagnosis_findings`, `diagnoses`, `growth_plan_items`, `ai_jobs`); `web/src/app/onboarding/[sessionId]/actions.ts:15-17,36,118`;
`web/src/app/plans/actions.ts:9-10,16-25` (`upgrade_requests`); `web/src/app/settings/actions.ts:13-14,20,93`
(`mcp_access_keys`); `web/src/app/settings/integrations-actions.ts:14-15,24,65,81`;
`web/src/app/settings/connections-actions.ts:15-20,24-31,35,42,62,69,82,93-102,106,113`; `web/src/app/oauth/authorize/actions.ts:15-17`;
`web/src/app/settings/team-actions.ts:13-19,38,79,99,131` (`team_invitations`, `memberships`, `team_events`,
`mcp_access_keys`, `oauth_grants`; secret key); `web/src/app/invite/[token]/actions.ts:14-17` (`team_invitations`,
`memberships`, `team_events`; secret key); `web/src/app/settings/remove-business-actions.ts:18-23,29`
(`organizations`, `organization_deletions`; secret key; [remove-business](../../processes/remove-business.md)).
`web/src/app/settings/business-actions.ts:9-12` (`switchBusiness`) writes only the `brv_business` cookie.
Which of these check a D-046 permission, and which one (matrix: [member-role](../tenancy/member-role.md)):
`web/src/app/analysis/actions.ts:19-21,70,97,134,170`, `web/src/app/analysis/plan-actions.ts:13-16`,
`web/src/app/onboarding/[sessionId]/actions.ts:15-17`, `web/src/app/settings/integrations-actions.ts:14-15,31,86`,
`web/src/app/settings/connections-actions.ts:17,28,99`, the personal-key action `web/src/app/settings/actions.ts:56-57`
(`keys.manage_own`), the team actions `web/src/app/settings/team-actions.ts:23-29` (`team.manage` through
`assignableRoles`, then `canManageRole` per target), `removeBusiness` (`organization.delete`,
`web/src/app/settings/remove-business-actions.ts:36-39`); `acceptInvitation` checks the invite, not a permission;
`switchBusiness` checks membership only; the plans and OAuth-consent actions check none.

Citations: `web/src/proxy.ts:11-22`, `web/src/lib/assistant/assistant.test.ts:283-307`

## Connected to

- **owns:** nothing (route group; data lives in the tables the actions write)
- **owned-by:** —
- **joins:** [assistant-knowledge](../access/assistant-knowledge.md) (`APP_ROUTES`), [mcp-access-key](../access/mcp-access-key.md), [oauth-client](../access/oauth-client.md), [plan-tier](../tenancy/plan-tier.md), [onboarding-session](../onboarding/onboarding-session.md), [job-dispatch](../pipeline/job-dispatch.md), [integration-connection](../integrations/integration-connection.md), [env-config](env-config.md), [deploy-targets](deploy-targets.md), [team-invitation](../tenancy/team-invitation.md), [organization](../tenancy/organization.md)
- **looks-like-but-is-not:** [site-pages](site-pages.md) (braventa.io, a separate Next app); `PUBLIC_PATHS` is a cookie gate, not authorization (`web/src/proxy.ts:4-5`)

## If you change this

- **Hits:** `PUBLIC_PATHS` for any route an external caller hits without a cookie; `APP_ROUTES` plus `npm run help:doc` for every page added or removed (the test fails otherwise, [build-help-doc](../../processes/build-help-doc.md)); [deploy-targets](deploy-targets.md) for paths outside callers post to (`/api/jobs/continue`, the Google and HubSpot callbacks, `/api/mcp`, `/auth/callback`); a new form or action that acts on a business posts its id (see Why this shape); the headers apply to every path (`web/next.config.ts:27`).
- **Does not hit:** `site/` routes; the schema; tokens.

## Surfaces

| Surface | Role |
|---|---|
| Browser (signed-in owner) | reads pages, writes through server actions |
| `web/src/proxy.ts` | gates every request |
| MCP clients, Postgres `pg_net`, Google and HubSpot OAuth, Supabase Auth links | call the public API routes ([deploy-targets](deploy-targets.md)) |
| `web/src/lib/assistant/assistant.test.ts` | checks every page is in `APP_ROUTES` |
| Processes | [start-analysis](../../processes/start-analysis.md), [ask-braventa](../../processes/ask-braventa.md), [mcp-onboarding](../../processes/mcp-onboarding.md), [job-step-machine](../../processes/job-step-machine.md), [connect-search-console](../../processes/connect-search-console.md), [connect-hubspot](../../processes/connect-hubspot.md), [invite-and-join](../../processes/invite-and-join.md), [switch-business](../../processes/switch-business.md), [remove-business](../../processes/remove-business.md) |

## See

- Source: `web/src/proxy.ts`, `web/src/app/`
- As built: `docs/architecture/SYSTEM_ARCHITECTURE.md`

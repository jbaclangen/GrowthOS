# Integrations

This document lists every external service Braventa uses or intends to use, with an honest status for each,
where the code lives, which credentials it needs, and what remains to be done. It exists so that no
document, UI string or sales conversation claims an integration that is not built. Related:
[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md), [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md),
[../product/MVP_SCOPE.md](../product/MVP_SCOPE.md), [../decisions/OPEN_QUESTIONS.md](../decisions/OPEN_QUESTIONS.md).

**Status / last reviewed: 2026-10-11** (HubSpot rows updated 2026-11-08).

---

## The rule

**Never claim an integration exists until it is implemented and tested** (brief §2.2, §11). "Configured
only" means credentials or a client exist but no customer-facing flow uses it. Marketing copy, onboarding
text and docs may only describe **Live** integrations as available; everything else is described as
planned or not mentioned. Update this table in the same change that moves an integration between states.

Status definitions:
- **Live** — used by a customer-facing flow in the current code and exercised end to end.
- **Configured only** — credentials, a client module, or a cloud API enablement exists; no product flow uses it.
- **Planned** — intended for a defined phase; no code.
- **Idea** — mentioned in the brief or discussions; no plan or decision.

## Status table

| Integration | Purpose | Status | Code location | Credentials needed | Notes |
|---|---|---|---|---|---|
| Supabase | Database, auth, RLS, system of record | **Live** | `web/src/lib/supabase/{server,client}.ts`, `web/src/proxy.ts`, `supabase/migrations/` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public), `SUPABASE_SECRET_KEY` (server-only) | Storage and Realtime not used. `pgvector` installed but unused. `pg_net` + `pg_cron` send the analysis step hand-offs in production: the app inserts into `job_dispatches`, Postgres POSTs `{jobId, step, token}` to `NEXT_PUBLIC_APP_URL/api/jobs/continue` (10 s timeout) and a sweeper re-posts a step still pending after a minute, 4 posts at most, and fails the job when the route refused a post or the 4th one failed (D-042 amended 2026-10-17: Vercel answers an app calling itself in a chain with HTTP 508). Needs the `job_dispatches` migration; `JOB_DISPATCH` (`database`/`direct`) picks the mode and must be `database` in production (unset: `database` on Vercel or for a production build with an https app URL, else `direct`); health: `job_dispatch_health()`, which also flags posts `pg_net` never answered (`select net.worker_restart();`). `.mcp.json` connects the Supabase MCP server for development only |
| OpenRouter | Model routing and provider fallback | **Live** | `web/src/lib/integrations/openrouter.ts`, called only via `web/src/lib/ai/router.ts` | `OPENROUTER_API_KEY`, `AI_MODE` | Paid models in production (`AI_MODE` defaults to paid; only `free` switches). The account enforces zero data retention, which blocks every free model, so `AI_MODE=free` fails until that changes (D-037). See [AI_ROUTING_AND_COSTS.md](AI_ROUTING_AND_COSTS.md) |
| Google PageSpeed Insights | Lighthouse performance / SEO / accessibility / best-practice scores | **Live** | `web/src/lib/integrations/google.ts` (`pageSpeed`, `pageSpeedReport`), pipeline step 1 | `GOOGLE_API_KEY` (GCP project `growth-os-511206`, key restricted to PageSpeed) | Mobile **and** desktop in parallel, 180 s timeout each (Google's time varies run to run: thebenefitlink.com's mobile run took 86 s once and over 120 s another time on 2026-10-17; desktop 41 s). They run alongside the 45 s crawl in their own `crawling` step and function invocation (D-042), so 180 s still leaves about two minutes of the 300 s limit for the writes after it. Past it, the report says PageSpeed timed out and the score uses the other modules' parts (Braventa's assessment, plus Search visibility when it has Search Console evidence). Steps cut off by the hosting limit are marked failed 10 minutes after their last progress (`lib/pipeline/jobs.ts`, `failStaleJobs`). Reads CrUX field data (`loadingExperience`: LCP, INP, CLS, overall category; may be missing or whole-site) separately from Lighthouse lab scores and metrics, plus the top 5 Lighthouse opportunities by estimated savings. Either strategy may fail on its own; the growth score still uses the mobile lab scores, as before. Key goes in the query string to Google (normal for this API) |
| Website crawler | Reads up to 25 same-site pages of the customer's site and runs deterministic checks | **Live** | `web/src/lib/integrations/crawler.ts` (cheerio), `robots.ts`, `sitemap.ts`; checks in `web/src/lib/audit/checks.ts` | None | User-Agent `Braventa/0.1; +https://braventa.io` (robots.txt product token `Braventa`). Fetches and **respects robots.txt** for every URL and redirect hop (RFC 9309: the `Braventa` group, else `*`; longest match, `*` and `$`; 4xx = no rules; 5xx or no answer = everything disallowed). If the home page is disallowed, nothing is crawled and the analysis continues with PageSpeed and the owner's answers; the report says so and shows the `User-agent: Braventa` / `Allow: /` fix. Reads sitemaps (robots.txt `Sitemap:` lines, else `/sitemap.xml`; index → up to 3 children, page sitemaps first; 200 URLs; same site only). Candidates from the sitemap and home-page links, business pages first; 4 at a time, ~45 s total budget, 15 s and 2 MB per page; up to 10 quick checks of linked pages it didn't crawl; checks the `http://` and www/non-www home page variants. Every candidate is recorded as scanned / excluded (reason) / failed (status or error) with redirect chains. No JS rendering. SSRF protections unchanged (see [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md#7-prompt-injection-posture)). Dry run without AI or DB: `npm run audit:site -- example.com` |
| n8n | Workflow execution, scheduling, orchestration | **Configured only** | `web/src/lib/integrations/n8n.ts` (`listWorkflows`, `triggerWebhook`, `verifyCallback`); used only by the dev health route | `N8N_BASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_SECRET` (>= 32 chars) | Instance `n8nautomations.pixelmarketingdesign.com`. `n8n/` folder empty: no workflows exported. **No `/api/n8n/*` routes exist**, and `proxy.ts` would redirect them to `/login` until `/api/n8n` is made public. `triggerWebhook` and `verifyCallback` are unused |
| Google Analytics 4 (Data/Admin API) | Traffic and conversion data for reporting | **Configured only** (API enabled in GCP; no code) | None | OAuth per customer property (planned); current API key is PageSpeed-only | Enablement recorded in infrastructure notes, not verifiable from the repo. `integrations.provider` comment lists `google_analytics` |
| Google Search Console | Read-only clicks, impressions, top queries and pages, device split, sitemaps, home-page URL Inspection (Pro) | **Live** for Pro in production: connected and synced on 2026-10-11 (setup: [SEARCH_CONSOLE_SETUP.md](SEARCH_CONSOLE_SETUP.md)); since 2026-10-23 its latest snapshot feeds the diagnosis and the growth score as the Search visibility module (D-051 step 6, [FEATURE_MODULES.md](FEATURE_MODULES.md) §9) | `web/src/lib/integrations/{google-oauth,search-console,search-console-access,secret-box}.ts`, `web/src/app/api/integrations/google/{start,callback}/route.ts`, `web/src/app/settings/connections-*.tsx`, `web/src/app/search/` | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `INTEGRATIONS_ENCRYPTION_KEY` (server-only); per-org OAuth refresh token, encrypted | See [Google Search Console](#google-search-console-pro) below. The scoring step calls `searchConsoleSummaryForPrompt` for organizations whose enabled modules include Search visibility (Pro, Premium, the trial). `braventa.io` itself is verified in Search Console (TXT record) — that is Braventa's own domain, not this integration |
| HubSpot | First CRM integration (D-048): read-only counts of contacts, companies and deals (Pro) | **Built, not set up** (2026-11-08): live once the founder uploads the HubSpot app and sets the env vars ([HUBSPOT_SETUP.md](HUBSPOT_SETUP.md)). Counts only, no records (D-057); not in the diagnosis or score yet | `web/src/lib/integrations/{hubspot-oauth,hubspot,hubspot-metrics,hubspot-access}.ts`, `web/src/app/api/integrations/hubspot/{start,callback}/route.ts`, `web/src/components/connections/hubspot-card.tsx`; app config in `hubspot/` | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `INTEGRATIONS_ENCRYPTION_KEY` (server-only); per-org OAuth refresh token, encrypted | See [HubSpot](#hubspot-pro-read-only) below |
| HubSpot (Braventa's own CRM) | braventa.io contact requests: notification, CRM record, replies from hello@braventa.io via Hostinger SMTP (D-034, Pixelmarketingdesign portal 247150427). Not the customer-facing integration above | **Live** (submissions arrive since the 2026-10-11 `pageUri` fix) | `site/src/lib/hubspot.ts` (Forms API, no secret; form `ce8aca1a-…`) | `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_GUID` on Vercel `braventa-site` | [CONTACT_PIPELINE.md](../marketing/CONTACT_PIPELINE.md) |
| Braventa MCP server (inbound) | Owners' AI assistants (Claude Code, Claude Desktop) fill in onboarding (D-036) | **Live, phase 1** | `web/src/app/api/mcp/route.ts`, `web/src/lib/mcp/` | None (owners' personal access keys, hashed in `mcp_access_keys`) | [MCP_SERVER.md](MCP_SERVER.md). OAuth for claude.ai/ChatGPT not built (Q-039) |
| WordPress | Publish approved blog content; read site content | **Idea** | None | Application password or OAuth per site | Brief cites founder's WordPress experience; no decision. Publishing requires approval flow (D-013) |
| Canva | Design asset creation | **Idea** | None | Canva Connect API app | Today the pipeline only produces an `image_prompt` text for a designer or image tool |
| Email provider (transactional) | Auth emails; later notifications | **Live via Supabase Auth defaults** for sign-up confirmation only | Supabase Auth (`signUp` with `emailRedirectTo`) | Configured in Supabase dashboard (custom SMTP not verified from repo) | Supabase's built-in mailer is rate-limited and not for production; choose an SMTP/transactional provider before launch |
| Email provider (marketing) | Newsletters, onboarding sequences | **Planned / not chosen** | None | TBD | Must be a separate stream with explicit opt-in (D-014) |
| Billing | Subscriptions, plan limits | **Planned / provider not chosen** | `subscriptions` table has Stripe-shaped columns; health route returns "Sprint 6" placeholder | Stripe test keys if chosen | Pricing undecided (D-012). Do not treat Stripe as decided |
| Social publishing (Facebook, Instagram, LinkedIn, Google Business Profile) | Publish approved posts | **Planned** (D-049) | None | Social planner first; publishing through Outstand behind a `Publisher` interface, run by an in-app scheduler; Google Business Profile needs Braventa's own Google app and API access | Channels appear only as labels in generated plans. Nothing publishes yet. Pro feature, after the MVP |

## Google Search Console (Pro)

Optional, read-only connection (Website Intelligence blueprint §3.5, phase 2). Founder decision 2026-10-11:
integrations that bring in more data need **Pro**. A 14-day Pro trial counts as Pro; after the trial, on Basic,
the connection is **paused** (data kept, nothing new fetched, Settings and `/search` say why and link to
`/plans`), and it resumes on Pro or Premium. Gate: `searchConsoleAccess()` in
`web/src/lib/integrations/search-console-access.ts` (= `canUse(effectiveAccess(org).tier, "search_console")`).

**Scopes.** `https://www.googleapis.com/auth/webmasters.readonly` plus `openid email` (only to show which
Google account is connected). No write scope. `include_granted_scopes=false`, so no other Google scopes are
merged in. If the owner unticks the Search Console permission on the consent screen, the callback revokes the
grant and nothing is stored (`?gsc=scope-missing`).

**Flow.**
1. Settings → Connections → **Connect Google Search Console** (a plain link; only the organization's owner,
   only with Pro access). `GET /api/integrations/google/start` creates a random `state` and a PKCE verifier,
   stores them with the user id, organization id and redirect URI in an **AES-GCM-encrypted, httpOnly,
   SameSite=Lax cookie** (`brv_google_oauth`, path `/api/integrations/google`, 10 minutes), and redirects to
   Google with `code_challenge_method=S256`, `access_type=offline`, `prompt=consent`.
2. `GET /api/integrations/google/callback` needs the same signed-in session (`proxy.ts` sends signed-out
   requests to `/login`; neither route is in `PUBLIC_PATHS`). It checks the state (constant-time), that the
   user and organization match the cookie, owner role and Pro access, then exchanges the code with the verifier.
   Denied consent → `/settings?gsc=denied`; other errors → `?gsc=error` / `expired` / `paused`.
3. The refresh token is encrypted and upserted into `integration_connections` with the service client, scoped
   to the authorised organization. A token it replaces is revoked first.
4. The first fetch runs before the redirect: list the account's sites, match the property, store a snapshot.

**Redirect URIs.** Derived from the request origin and accepted only if registered:
`https://app.braventa.io/api/integrations/google/callback` and
`http://localhost:3000/api/integrations/google/callback` (plus the origin of `NEXT_PUBLIC_APP_URL`). Anything
else (Vercel preview URLs, other ports) ends at `?gsc=redirect-mismatch`.

**Property matching.** `GET https://www.googleapis.com/webmasters/v3/sites`, verified properties only.
Ranking for the analysed website (latest `business_profiles.website_url`): `sc-domain:` for the bare host,
then `sc-domain:` for a parent domain, then the URL-prefix property for the exact origin, then other
protocol/`www` variants, then sub-folder prefixes. Picked automatically only when one property ranks clearly
first; otherwise (or when none match) the owner chooses from the account's verified properties in Settings.

**Data fetched per sync** (one row in `search_console_snapshots`):
- `searchAnalytics.query`, `dataState=final`: totals for the last 28 days ending 3 days ago and the 28 days
  before; top 25 queries; top 25 pages; device split.
- `GET .../sites/{property}/sitemaps` (optional; failure noted, not fatal).
- URL Inspection for the home page only, `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`
  (optional), shown as "Google's URL Inspection report" for that URL.
The 12 most recent snapshots per organization are kept. Refresh: "Refresh Search Console data" in Settings,
at most once per 10 minutes per organization (`last_attempted_at`). There is no scheduled sync.

**Quotas** (Google's published limits, checked 2026-10): Search Analytics allows on the order of 1,200 queries
per minute per site and per user, with a separate short-term "load" quota for expensive queries; each sync makes
five Search Analytics calls. URL Inspection: 2,000 calls per day and 600 per minute per property; each sync makes
one. A 429 keeps the connection active and shows "Google's Search Console limit is reached for now".

**Errors.** `invalid_grant` on refresh, or 401 → status `error`, "Reconnect Search Console". 403 → `error`,
"This Google account can't read the property …". 429 / 5xx → stays `active` with a message. Few impressions
(< 10 in 28 days) → "little or no search data … normal for a new website". The UI always states the property and
date range and that Search Console doesn't show every query.

**Disconnect.** Revokes the refresh token at `https://oauth2.googleapis.com/revoke`, sets
`refresh_token_ciphertext = null`, `status = 'revoked'` and clears the email and properties, and deletes all of
the organization's `search_console_snapshots`.

**In the diagnosis and the score (2026-10-23, D-051 step 6).** The pipeline's scoring step (and a correction's
diagnosis-update step) calls `searchConsoleSummaryForPrompt(db, orgId)` when the organization's enabled modules
include Search visibility: the summary of the latest snapshot goes to the diagnosis model as one fenced block with
the ref `G1`, marked as third-party data, and its measures give the module's sub-score (0.10 of the growth score;
nothing under 10 impressions). Nothing is fetched from Google during an analysis. Spec:
[FEATURE_MODULES.md](FEATURE_MODULES.md) §9.

**Not built yet:** a sync during the analysis, scheduled syncs, country and search-appearance dimensions, manual
actions and security issues, URL Inspection beyond the home page, an audit log of connect/disconnect.

## HubSpot (Pro, read-only)

HubSpot is the first CRM (D-048). Braventa augments HubSpot; it doesn't replace it. **Built 2026-11-08, not set up
yet:** until the founder uploads the app in `hubspot/` and sets the env vars ([HUBSPOT_SETUP.md](HUBSPOT_SETUP.md)),
the HubSpot card says the connection isn't set up yet.

**Phase 1, built: read-only counts.**
1. App: an unlisted marketplace OAuth app on platform 2026.09, defined as code in `hubspot/` (up to 25 installs
   without HubSpot's review). Scopes `crm.objects.contacts.read`, `crm.objects.companies.read`,
   `crm.objects.deals.read` (HubSpot adds `oauth`). Not `crm.lists.read` (nothing reads lists), `forms` or `content`.
2. Connect: the owner (`integrations.connect`) of a Pro, Premium or trial organization selects **Connect HubSpot** in
   Settings → Connections or on the onboarding step → `/api/integrations/hubspot/start` seals `{state, user, org,
   redirectUri, returnTo}` in an encrypted cookie → HubSpot's install screen → `/api/integrations/hubspot/callback`
   checks the cookie, owner and plan, exchanges the code (OAuth API `2026-09`; HubSpot documents no PKCE for apps, so
   the client secret and the sealed state carry it), introspects the token for the portal id, domain and scopes,
   requires all three scopes, and upserts `integration_connections` (`provider = 'hubspot'`, `external_account_id` =
   portal id, `external_account_name` = portal domain, the refresh token encrypted with `secret-box.ts`).
3. Sync (`syncHubSpot`): on connect and on **Refresh HubSpot counts** only, at most every 10 minutes; nothing runs in
   the background. Mints an access token (storing a rotated refresh token), then about 30 CRM searches at 4 a second
   (the search API allows 5) for totals: contacts, new contacts in the last 28 days and the 28 before, contacts by
   lifecycle stage, new contacts by original source, contacts without an owner, new contacts with no "last
   contacted" date, companies. Deals are listed (up to 5,000, only amount, stage, pipeline and dates requested) and
   summed in memory against the deal pipelines: open count and value, stale open deals (not updated in 30 days),
   created, won and lost in the period, 90-day win rate, totals per stage. One `hubspot_snapshots` row per sync,
   12 kept.
4. **Aggregates only (D-057):** the snapshot holds counts, sums and the portal's own stage and source labels. No
   names, email addresses, phone numbers, deal names, record ids or owner names are stored, logged or shown. A size
   check on `metrics` (32 KB) backs this up.
5. Disconnect (owner): uninstall the app from the portal (`DELETE /appinstalls/2026-09/external-install`, HubSpot
   emails the portal's admins), revoke the refresh token, delete every snapshot, blank the row to `revoked`.
   Reconnecting to another portal deletes the old portal's snapshots.
6. On Basic (trial ended), the connection pauses like Search Console: counts kept, nothing fetched.

**Not built yet:** the CRM module (counts in the diagnosis and growth score, D-051; next step), uninstall detection
(HubSpot's webhooks journal `APP_LIFECYCLE_EVENT`; today a sync after an uninstall fails with `invalid_grant` and the
card asks to reconnect), scheduled syncs, an audit log of connect/disconnect, owners, lists.

**Phase 2: assisted actions (later, approval required).** Create tasks or notes, update properties, enroll in
sequences. Each action is proposed, shown to a human, approved, executed, and logged (D-013). Requires write scopes
(requested one tool at a time, INTEGRATIONS_ROADMAP §2) and an audit table.

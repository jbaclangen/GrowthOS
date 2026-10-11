# Integrations

This document lists every external service Braventa uses or intends to use, with an honest status for each,
where the code lives, which credentials it needs, and what remains to be done. It exists so that no
document, UI string or sales conversation claims an integration that is not built. Related:
[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md), [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md),
[../product/MVP_SCOPE.md](../product/MVP_SCOPE.md), [../decisions/OPEN_QUESTIONS.md](../decisions/OPEN_QUESTIONS.md).

**Status / last reviewed: 2026-10-10.**

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
| Supabase | Database, auth, RLS, system of record | **Live** | `web/src/lib/supabase/{server,client}.ts`, `web/src/proxy.ts`, `supabase/migrations/` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public), `SUPABASE_SECRET_KEY` (server-only) | Storage and Realtime not used. `pgvector` installed but unused. `.mcp.json` connects the Supabase MCP server for development only |
| OpenRouter | Model routing and provider fallback | **Live** | `web/src/lib/integrations/openrouter.ts`, called only via `web/src/lib/ai/router.ts` | `OPENROUTER_API_KEY`, `AI_MODE` | Free tier in use (`AI_MODE=free`); paid chains configured but need credits. See [AI_ROUTING_AND_COSTS.md](AI_ROUTING_AND_COSTS.md) |
| Google PageSpeed Insights | Lighthouse performance / SEO / accessibility / best-practice scores | **Live** | `web/src/lib/integrations/google.ts` (`pageSpeed`, `pageSpeedReport`), pipeline step 1 | `GOOGLE_API_KEY` (GCP project `growth-os-511206`, key restricted to PageSpeed) | Mobile **and** desktop in parallel, 120 s timeout each (slow sites take ~90 s). Reads CrUX field data (`loadingExperience`: LCP, INP, CLS, overall category; may be missing or whole-site) separately from Lighthouse lab scores and metrics, plus the top 5 Lighthouse opportunities by estimated savings. Either strategy may fail on its own; the growth score still uses the mobile lab scores, as before. Key goes in the query string to Google (normal for this API) |
| Website crawler | Reads up to 25 same-site pages of the customer's site and runs deterministic checks | **Live** | `web/src/lib/integrations/crawler.ts` (cheerio), `robots.ts`, `sitemap.ts`; checks in `web/src/lib/audit/checks.ts` | None | User-Agent `Braventa/0.1; +https://braventa.io` (robots.txt product token `Braventa`). Fetches and **respects robots.txt** for every URL and redirect hop (RFC 9309: the `Braventa` group, else `*`; longest match, `*` and `$`; 4xx = no rules; 5xx or no answer = everything disallowed). If the home page is disallowed, nothing is crawled and the analysis continues with PageSpeed and the owner's answers; the report says so and shows the `User-agent: Braventa` / `Allow: /` fix. Reads sitemaps (robots.txt `Sitemap:` lines, else `/sitemap.xml`; index → up to 3 children, page sitemaps first; 200 URLs; same site only). Candidates from the sitemap and home-page links, business pages first; 4 at a time, ~45 s total budget, 15 s and 2 MB per page; up to 10 quick checks of linked pages it didn't crawl; checks the `http://` and www/non-www home page variants. Every candidate is recorded as scanned / excluded (reason) / failed (status or error) with redirect chains. No JS rendering. SSRF protections unchanged (see [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md#7-prompt-injection-posture)). Dry run without AI or DB: `npm run audit:site -- example.com` |
| n8n | Workflow execution, scheduling, orchestration | **Configured only** | `web/src/lib/integrations/n8n.ts` (`listWorkflows`, `triggerWebhook`, `verifyCallback`); used only by the dev health route | `N8N_BASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_SECRET` (>= 32 chars) | Instance `n8nautomations.pixelmarketingdesign.com`. `n8n/` folder empty: no workflows exported. **No `/api/n8n/*` routes exist**, and `proxy.ts` would redirect them to `/login` until `/api/n8n` is made public. `triggerWebhook` and `verifyCallback` are unused |
| Google Analytics 4 (Data/Admin API) | Traffic and conversion data for reporting | **Configured only** (API enabled in GCP; no code) | None | OAuth per customer property (planned); current API key is PageSpeed-only | Enablement recorded in infrastructure notes, not verifiable from the repo. `integrations.provider` comment lists `google_analytics` |
| Google Search Console | Search queries, impressions, indexing | **Configured only** (API enabled in GCP; no code) | None | OAuth per customer site (planned) | `braventa.io` itself is verified in Search Console (TXT record) — that is for Braventa's own domain, not a customer integration |
| HubSpot | First CRM integration: pipeline and lead summaries | **Planned** (priority) | None. Health route returns a "Sprint 5" placeholder | HubSpot public app (OAuth client id/secret), per-org tokens in Vault | See plan below |
| HubSpot (Braventa's own CRM) | braventa.io contact requests: notification, CRM record, replies from hello@braventa.io via Hostinger SMTP (D-034, Pixelmarketingdesign portal 247150427). Not the customer-facing integration above | **Live** (submissions arrive since the 2026-10-11 `pageUri` fix) | `site/src/lib/hubspot.ts` (Forms API, no secret; form `ce8aca1a-…`) | `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_GUID` on Vercel `braventa-site` | [CONTACT_PIPELINE.md](../marketing/CONTACT_PIPELINE.md) |
| Braventa MCP server (inbound) | Owners' AI assistants (Claude Code, Claude Desktop) fill in onboarding (D-036) | **Live, phase 1** | `web/src/app/api/mcp/route.ts`, `web/src/lib/mcp/` | None (owners' personal access keys, hashed in `mcp_access_keys`) | [MCP_SERVER.md](MCP_SERVER.md). OAuth for claude.ai/ChatGPT not built (Q-039) |
| WordPress | Publish approved blog content; read site content | **Idea** | None | Application password or OAuth per site | Brief cites founder's WordPress experience; no decision. Publishing requires approval flow (D-013) |
| Canva | Design asset creation | **Idea** | None | Canva Connect API app | Today the pipeline only produces an `image_prompt` text for a designer or image tool |
| Email provider (transactional) | Auth emails; later notifications | **Live via Supabase Auth defaults** for sign-up confirmation only | Supabase Auth (`signUp` with `emailRedirectTo`) | Configured in Supabase dashboard (custom SMTP not verified from repo) | Supabase's built-in mailer is rate-limited and not for production; choose an SMTP/transactional provider before launch |
| Email provider (marketing) | Newsletters, onboarding sequences | **Planned / not chosen** | None | TBD | Must be a separate stream with explicit opt-in (D-014) |
| Billing | Subscriptions, plan limits | **Planned / provider not chosen** | `subscriptions` table has Stripe-shaped columns; health route returns "Sprint 6" placeholder | Stripe test keys if chosen | Pricing undecided (D-012). Do not treat Stripe as decided |
| Social publishing (Facebook, Instagram, LinkedIn, Google Business Profile) | Publish approved posts | **Idea** | None | Platform apps and per-org OAuth; platform review | Channels appear only as labels in generated plans. Nothing publishes. Platform policies and app review are significant work |

## HubSpot-first plan (Planned)

HubSpot is the first CRM because of the founder's experience (brief §3.E). Braventa augments HubSpot; it
does not replace it. Nothing below is built.

**Phase 1 — read-only summaries.**
1. Create a HubSpot **public app** (OAuth 2.0) owned by Braventa; request the minimum read scopes needed
   for contacts, companies, deals and owners (exact scope list to be fixed during build). No write scopes.
2. Connect flow: org admin clicks Connect -> HubSpot consent -> `/api/integrations/hubspot/callback`
   (server route) exchanges the code, then stores the refresh and access tokens in **Supabase Vault** and
   writes only `vault_secret_id`, `external_account_id` (portal id), `scopes`, `status = 'connected'`,
   `connected_at` to `integrations` via the admin client, scoped to the admin's authorised org.
   The OAuth `state` parameter must bind to the user and org to prevent cross-tenant connection.
3. Sync: a scheduled job (n8n or a cron route) pulls bounded snapshots (counts, stage totals, stale deals,
   missing fields) into tenant tables (e.g. `crm_snapshots`, with `organization_id` + RLS). Store aggregates
   and identifiers, not full contact records, unless a feature needs them.
4. Analysis: `crm_analyst` worker summarises the snapshot (aggregates only by default; minimise personal
   data sent to models — no free-tier models for CRM data). Output as a `reports` row
   (`report_type = 'crm_summary'`).
5. Disconnect: revoke the token at HubSpot, delete the Vault secret, set `status = 'revoked'`, delete synced
   rows per the retention decision.

**Phase 2 — assisted actions (later, approval required).** Create tasks or notes, update properties, enrol
in sequences. Each action is proposed, shown to a human, approved, executed, and logged (D-013). Requires
write scopes and an audit table.

**Prerequisites before Phase 1:** Vault-backed token storage and helper functions; `/api/...` callback
route made public in `proxy.ts` with its own authentication; an audit log for connect/disconnect; a
documented data-retention rule for CRM data; HubSpot app listing requirements reviewed.

# CRM integration and AI-ready data model (research, 2026-10-17)

**Status:** research for founder decision; nothing here is built. Unverified facts are marked [unverified]. Key claims were checked against vendor docs and the repo on 2026-10-17; see "Verification" at the end.

## A. CRM integration: API or MCP

### A1. Comparison

| CRM | Official MCP server | Auth | Read/write via MCP | Community servers | REST auth and scopes | Rate limits | Marketplace review |
|---|---|---|---|---|---|---|---|
| **HubSpot** | Yes, remote, `https://mcp.hubspot.com`. GA 2026-04-13 (changelog updated 2026-04-15). | OAuth 2.1 with PKCE, required for every connection. The client credential is created under Development > MCP Connectors (earlier called "MCP Auth Apps"; the URL path is still `mcp-auth-apps`). Scopes are not set by hand: HubSpot derives them from the tools available at install plus the permissions the installing user grants, and users must reinstall when scopes change. Every action respects the user's HubSpot permissions. | **Read:** contacts, companies, deals, tickets, line items, quotes, invoices, orders, products, lists, campaigns, pages, blogs, activities. **Write (current docs, 31 tools, much wider than at GA):** CRM records (contacts, companies, deals, tickets, leads, line items, products, appointments, courses, listings, projects, services, custom objects; quotes in beta on Revenue Hub Pro/Ent); activities (calls, emails, meetings, notes, tasks); content (create, edit and publish landing pages, website pages and blog posts; Claude, ChatGPT and Gemini only); campaigns; marketing email drafts; pipelines, custom properties, static segments and AEO prompts. At GA, writes covered only contacts, companies, deals, tickets, line items, products and activities. A third-party post dates the expansion to 2026-09-15 [unverified]. With Sensitive Data on, activities and conversation data are blocked. | peakmojo/mcp-hubspot (about 120 stars, license [unverified]). Not worth copying now that the official server exists. | Public app OAuth with granular scopes, e.g. `crm.objects.contacts.read` / `.write`, `crm.objects.deals.read` / `.write`. Date-based paths, e.g. `/crm/objects/2026-09/contacts`. `2026-09` is Current since 2026-09-08; `2026-03` now gets critical fixes only. | 110 requests per 10 s per installing account (marketplace-distributed OAuth apps and legacy public apps); no daily cap stated. The CRM Search API is excluded and has its own limit: 5 requests/s per account, with no rate-limit headers. | No review for private distribution (up to 10 allowlisted accounts, 100 for Solution Partners; static-token apps 1 account) or for an unlisted marketplace OAuth app (up to 25 accounts on platform 2025.2 or later, enforced since 2025-09-22, lifted once HubSpot reviews and lists the app). Every app signs the Acceptable Use Policy before installing outside developer test accounts. Certification needs at least 6 months listed, 60 active installs (unique, unaffiliated production accounts with activity in the past 30 days) and enough API traffic. From 2026-11-02, apps must be on a supported platform version; legacy apps and Projects 2023.2/2025.1 are rejected for new listings. Supported today: 2026.09 (Current since 2026-09-08), 2026.03 and 2025.2. 2025.2 is going unsupported, with migration to 2026.09 due by March 2027. |
| **GoHighLevel** | Yes, hosted by the vendor (LeadConnector). Two documented setups: per-client OAuth endpoints (current developer docs) and an older token setup at `https://services.leadconnectorhq.com/mcp/` (help center, modified 2026-07-09). | **Current (OAuth only):** Claude (Claude.ai, Claude Code, Cowork) uses `https://services.leadconnectorhq.com/mcp/anthropic/v2`; ChatGPT and OpenAI clients use `/mcp/openai/v2/` (Codex `/mcp/openai/v2/codex`); Muse uses `/mcp/muse/v2/`. Sign-in and consent pick the sub-account(s); no token is created by hand. **Older:** a per-location Private Integration Token sent as Bearer, plus a `locationId` header. | The OAuth server exposes 4 unified tools (`list_locations`, `search_operations`, `describe_operation`, `execute_operation`) covering 550+ operations: contacts, conversations, calendars, opportunities and more. Named tools such as `calendars_get-calendar-events` and `blogs_get-blogs` belong to the older token setup [unverified]. One sub-account per connection for the token setup and for individual OAuth users. Agencies can connect once across several or all sub-accounts (bulk install, still rolling out); each request runs against one chosen sub-account. | mastanley13/GoHighLevel-MCP is the most-starred (about 195 stars, 207 forks, 2026-10-17). Its LICENSE file is a custom non-commercial "GoHighLevel MCP Server Community License" (StrategixAI LLC) that bans commercial resale and paid products based on it; GitHub reports NOASSERTION because it can't map the text to SPDX. Its package.json and README claim ISC, which contradicts the LICENSE file. **Not cleared for commercial use: do not copy.** Next: BusyBee3333/Go-High-Level-MCP-2026-Complete (121 stars, "Other") and basicmachines-co/open-ghl-mcp (52 stars, AGPL-3.0). | API v2 with OAuth through a Marketplace app, location or agency scoped. Scopes like `contacts.readonly` [scope names unverified]. | 100 per 10 s and 200k per day, per Marketplace app per resource (a location, or a company for agency calls). Official, for API 2.0 with OAuth. Sandbox and trial accounts cap Private Integration Tokens at 25 per 10 s and 10k per day, shared across the account. | Marketplace app review needed for public distribution [details unverified]. |
| **Salesforce** | Hosted MCP servers, GA April 2026 (blog dated 2026-04-29). Developer, Enterprise, Performance and Unlimited Editions; not Professional or lower. | Admin creates an External Client App (Connected Apps are not supported). OAuth authorization-code flow with PKCE only, scopes `mcp_api` and `refresh_token`. No client credentials, service accounts or machine-to-machine flow planned; dynamic client registration is not on the roadmap. Per user. | Data, flows, Apex actions, queries. Servers are off by default. | The DX MCP server (`salesforcecli/mcp`, Apache-2.0 [unverified]) reportedly reaches end of life on 2026-11-02 [single source]. | OAuth connected app or External Client App. | Org-wide 24-hour allocation (about 100k+ by license). 25 concurrent long-running requests. | AgentExchange (formerly AppExchange) security review: about 4–6 weeks for a first pass (1–2 weeks verification plus 3–4 weeks first test), plus 2–3 weeks per resubmission. Needed only to distribute on AgentExchange, not for a customer's admin to create an External Client App and connect. |
| **Pipedrive** | Yes, native remote server at `https://mcp.pipedrive.ai/mcp`, launched 2026-06-30, all plans (press release). | OAuth. Follows the user's existing permissions, and actions are recorded in Pipedrive's change logs. | 37 read and write tools: search deals, persons, orgs and leads; create and update records; convert lead to deal. | Several with 75–300 tools, API-token based, local. | OAuth required for Marketplace apps. | Daily token budget per company (about 30k × plan multiplier × seats [unverified]). Burst limit over a 2 s window. Webhooks are free. | Marketplace approval exists [details unverified]. |
| **Zoho CRM** | Yes, pre-built servers (e.g. Data Insights, read-only, COQL) plus a custom MCP Console. | Zoho OAuth, configured in the CRM Developer Hub. | Mostly read. Some tools write (update records, add notes). | CData (commercial), Pipedream (hosted), Python repos. | OAuth 2.0, 1-hour access tokens, multi-DC hosts. | Credits per 24-hour rolling window by edition. Concurrency 5–25. | Zoho Marketplace [unverified]. |
| **monday CRM** | Yes: hosted Platform MCP plus the open-source `mondaycom/mcp`. | OAuth (hosted) or API token (local). | Boards, items, updates: read and write. | **The official repo is MIT** (LICENSE file, Copyright (c) 2025 monday.com). MIT covers the server code; calls to the monday.com API stay under monday.com's Developer Terms. | GraphQL API, OAuth scopes. | Complexity-based [unverified]. | monday marketplace [unverified]. |
| **Keap** | **Yes: a first-party Keap connector for Claude**, documented by parent company Thryv (article created 2026-01-08, updated 2026-08-29). Served from `https://api.keap.com/mcp`, listed in Claude's connector directory, needs a paid Claude plan. The 2026-02-20 forum answer saying there is none is outdated or limited to Max Classic. | OAuth through the Thryv login (`login.labs.thryv.com`). The server's OAuth metadata lists only `offline_access` (refresh tokens), so there is no read-only mode. | Reads and writes most Keap objects. Delete functions are deliberately left out. | None notable. | OAuth 2.0. `scope=full` is the only valid value, so there is **no read-only option**. Personal Access Tokens run with the creating user's permissions; Service Account Keys grant admin access. Neither is scoped. | [unverified] | Keap partner program [unverified]. |
| **Close** | Yes, `https://mcp.close.com/mcp` (directory listings). | OAuth with read / write / destructive levels. | Leads, contacts, opportunities, emails, calls, tasks, notes, transcripts. Glama marked it "unhealthy" at its last test. | n/a | API key or OAuth [unverified]. | [unverified] | [unverified] |

### A2. Architecture options

1. **Braventa as an MCP client of each vendor's server.** Not recommended as the backbone:
   - These servers are built for an interactive user in an AI client. Scopes follow the tools the vendor exposes plus the user's grants, not what the integration needs (HubSpot), and the tool set changes without versioning (HubSpot widened its write tools after GA).
   - Each call needs an LLM in the loop to choose tools, which costs tokens and gives nondeterministic results. That is a poor fit for repeatable snapshots in a diagnosis.
   - Salesforce allows only per-user authorization-code + PKCE, with no machine-to-machine flow.
   - Fine later for an in-app "ask your CRM" chat, not for ingestion.
2. **Direct REST APIs with per-tenant OAuth. Recommended for ingestion and future write actions.**
   - It builds on what exists, but only part of it is built today:
     - `integration_connections` exists, but its provider check allows only `google_search_console`, so a migration must widen it.
     - AES-256-GCM token encryption exists (`web/src/lib/integrations/secret-box.ts`).
     - PKCE S256 plus encrypted-state OAuth routes exist for Google only (`/api/integrations/google/start` and `/callback`).
     - There is one snapshot table, `search_console_snapshots`; per-provider snapshot tables are the planned pattern.
     - The Pro gate exists (`tiers.ts` `canUse`), but covers only `search_console`.
     - n8n does not execute approved writes yet: no `/api/n8n/*` routes exist and `n8n/` is empty. That is planned (D-041).
   - Changed: the foundation is partial, so HubSpot needs a provider-check migration, its own OAuth route pair, a first CRM snapshot table and a gate entry, and write actions wait on the n8n callback routes.
   - It is deterministic, cheap, scope-minimal (read-only first), and testable.
3. **Bundling or adapting open-source MCP servers.** Avoid:
   - Most run over stdio with a single API key or PIT, not multi-tenant OAuth.
   - Running third-party code server-side next to tenant tokens is a supply-chain risk.
   - Licenses are often missing, custom or restrictive. GoHighLevel's most popular repo has a custom non-commercial license that contradicts its own ISC claim, and the third most popular is AGPL-3.0.
   - Copy only code that is MIT or Apache-2.0 (e.g. `mondaycom/mcp`), and keep attribution. Trust the LICENSE file, not the README or package.json.
   - **Flag GPL/AGPL:** AGPL code used in a hosted SaaS obliges you to release your source. Run a license check (`license-checker` or GitHub's license API) in CI for any copied code.

**For Claude users there is a zero-build path.** The owner connects Claude to **both** Braventa's MCP server and the vendor's official server (HubSpot, Pipedrive, GoHighLevel through its OAuth Claude endpoint, Keap, Close). Claude then combines them on the user side. Braventa only documents this. It does not hold vendor tokens for this path. HubSpot's server can now publish landing pages, website pages and blog posts; those writes happen in HubSpot under the owner's own permissions, outside Braventa's approval flow (D-013), and the docs should say so. Changed: Keap joins this path (it has an official connector), and GoHighLevel's Claude endpoint is now vendor-documented.

### A3. Recommendation

- **First CRM: HubSpot, read-only.**
  - It is already step 4 in the Pro integrations order (`docs/product/INTEGRATIONS_ROADMAP.md`, D-041) and item 3 of "Next" in `docs/product/ROADMAP.md`.
  - It has a free CRM that small businesses commonly use.
  - It has the best docs and granular `.read` scopes.
  - Its official MCP server covers the Claude-side story.
  - Distribute it as an unlisted marketplace OAuth app on platform 2026.09. That allows up to 25 accounts with no marketplace review, which covers the ~3 testers. Private distribution is capped lower, at 10 allowlisted accounts. Going past 25 accounts needs HubSpot's review and a listing. Changed: the install caps are now confirmed (25 unlisted, 10 private, not "about 25"), so growth past 25 HubSpot customers needs a marketplace listing.
  - Use the current date-based API version (`2026-09`), not v3/v4 and not `2026-03`. It gets the longest support window (until about March 2028). Changed: the draft said `2026-03`, but `2026-09` became Current on 2026-09-08, `2026-03` now gets critical fixes only, and platform 2025.2 goes unsupported by March 2027.
- **Alternate: GoHighLevel**, if the first testers are agency-managed service businesses. It is very common in that segment. Rate limits are per location and generous. Its official MCP server now uses OAuth, with one agency connection across sub-accounts rolling out. Confirm with the testers first (open item in the roadmap).
- **Defer Salesforce.** Hosted MCP needs Enterprise Edition or above (or a Developer org), which few small service businesses run. The AgentExchange security review (about 4–6 weeks, plus 2–3 weeks per resubmission) applies only if Braventa lists there. Changed: the review is not needed for a customer's admin to connect, so the deferral now rests on the edition requirement.
- **Defer Keap for ingestion.** Its REST OAuth has only `scope=full`, so there is no read-only option. Keap does have an official Claude connector, so it belongs in the zero-build path. Changed: the draft said Keap had no official MCP server.

## B. HubSpot-style data model and public API

### B1. HubSpot principles worth copying

- **Uniform object model.** Standard objects (contacts, companies, deals, tickets) and custom objects (`/crm/v3/schemas`) share one CRUD surface: `/crm/objects/{version}/{objectType}`.
- **Activities are objects too:** calls, emails, meetings, notes, tasks. This replaces the legacy "engagements" API.
- **Properties are typed, self-describing schema.** `/crm/{ver}/properties/{objectType}` gives name, label, type, fieldType, options and group. Reads return only the properties you request (`?properties=`).
- **Associations are first-class, typed and labelled** (v4: `/crm/v4/associations/{from}/{to}/...`, plus association labels). There are no hidden foreign keys in the API.
- **Search:** `POST /objects/{type}/search` with `filterGroups` (OR of ANDs), `sorts`, `query` and `limit` (max 200). Paging uses an `after` cursor.
- **Batch:** `/batch/read|create|update|upsert|archive`, up to 100 per call.
- **Pipelines** (`/crm/{ver}/pipelines/{objectType}`) give ordered stages for status-like fields.
- **Webhooks:** app-level subscriptions (`object.creation`, `object.propertyChange`, `object.deletion`) with signed payloads.
- **Versioning:** date-based (`/2026-09/`), two releases a year (March and September), at least 18 months of support: 6 months Current, then Supported with critical and security fixes only, then Unsupported.
- **Scopes:** one per object and action (`crm.objects.contacts.read`).

### B2. Proposed Braventa objects, mapped to current tables

| API object type | Backed by | Change needed |
|---|---|---|
| `businesses` | `business_profiles` | Expose as is. `intelligence` jsonb as a read-only property group. |
| `contacts` (CRM-synced people) | **new** `contacts` | New tenant table: `source`, `external_ids` jsonb. PII, Pro only, deleted on disconnect. |
| `website_pages` | `knowledge_documents` (`source_type=website_page`) plus per-page data in `audit_runs.coverage` and per-page findings in `audit_findings.page_url` | Add a view or table `website_pages` that normalises the coverage jsonb. Pages with identical text share one `knowledge_documents` row (dedupe on `content_hash`). |
| `audits`, `audit_findings` | `audit_runs`, `audit_findings` | Read only. |
| `diagnoses`, `diagnosis_findings` | same tables | Writable only through the existing verdict columns. |
| `plan_items` | `growth_plan_items` | `status` as a pipeline: proposed (default), accepted, dismissed, done. |
| `content_items`, `content_calendars` | same tables | `status` as a pipeline. `guard_content_item_write` (D-018) lets signed-in members move status only among `needs_approval`, `approved` and `rejected`, and blocks `scheduled`/`published` for them. It does not bind `service_role`, which the MCP route uses, so API and MCP handlers must refuse `approved`, `scheduled` and `published` in code (D-013). |
| `campaigns` | `campaigns` (unused today) | Wire up. |
| `assets` | **new** `assets` + Supabase Storage | New table. |
| `notes` / `activities` | **new** `activities` (type, body, occurred_at) | HubSpot-style engagements, so AI can log work. |
| `integrations` | `integration_connections` | Expose non-secret columns. **Drop the unused `integrations` table** to end the duplication. |
| `users` / `members` | `memberships` | Read only. |
| `reports` | `reports` | Read only. |

**Associations.** Keep the native foreign keys as the source of truth and expose them as typed associations (diagnosis to findings, plan item to findings, audit finding to page). Add one generic `associations` table for links users create (contact to plan item, asset to content item). Columns: `organization_id`, `from_type`, `from_id`, `to_type`, `to_id`, `label`. Use composite same-org foreign keys where possible, otherwise a trigger check.

**Properties schema.** Add an `object_properties` registry. Most entries are generated from code (Zod or TypeScript types). Custom properties live in a `custom_properties jsonb` column per object. That gives `GET /properties/{type}` without dynamic DDL.

### B3. Endpoint sketch (`app.braventa.io/api/v1`, or date-versioned `/api/2026-11/`)

```
GET    /objects/{type}?properties=&limit=&after=
GET    /objects/{type}/{id}?associations=
POST   /objects/{type}                 PATCH /objects/{type}/{id}    DELETE (archive)
POST   /objects/{type}/search          {filterGroups, sorts, query, limit, after}
POST   /objects/{type}/batch/{read|create|update|archive}   (≤100)
GET|PUT|DELETE /objects/{from}/{id}/associations/{to}[/{toId}]
GET    /properties/{type}              GET /pipelines/{type}
POST   /objects/content_items/{id}/request-approval    (no approve or publish endpoint)
POST   /webhooks/subscriptions         GET /webhooks/deliveries
```

**Auth.**
- Phase 1: generalise `mcp_access_keys` into `api_keys` with `scopes text[]`. Store only the SHA-256 hash and a short display prefix, as today.
- Phase 2: an OAuth 2.1 authorization server ("Sign in with Braventa", already planned for claude.ai and ChatGPT connectors).
- Scopes: `businesses.read`, `audits.read`, `diagnoses.read|write`, `plan.read|write`, `content.read|write`, `contacts.read|write`, `assets.read|write`, `webhooks.manage`.
- **Never offer `content.publish` to API clients.**

**Webhooks.**
- An outbox `events` table, written by triggers.
- Deliveries signed with HMAC-SHA256 plus a timestamp, retried with backoff.
- Events like `plan_item.status_changed`, `content_item.needs_approval`, `diagnosis.ready`. These match the planned n8n callbacks.

**MCP mapping.**
- Keep the 7 onboarding tools.
- Add generic tools that call the same service layer as REST: `braventa_list_objects`, `braventa_get_object`, `braventa_search_objects`, `braventa_create_object`, `braventa_update_object`, `braventa_get_properties`, `braventa_associate`.
- Add a few domain tools: `braventa_get_growth_plan`, `braventa_draft_post`, `braventa_request_approval`.
- One handler serves both REST and MCP. Each tool declares the scope it requires.

### B4. Security

- Every new table gets `organization_id` plus RLS via `is_member()`.
- The API layer resolves the org from the key or token and scopes every service-client query to it. It never trusts ids passed in by the client.
- The existing column grants stay the guard for what owners may change.
- Scopes are checked per handler. Default deny.
- Generalise `mcp_tool_calls` into an `api_audit_log`: key or token, scope, object, action, ids, ok/error. No payload secrets.
- D-013: API and MCP can create drafts and request approval. Approve and publish happen only in the app UI. Enforce this in the shared handler: `guard_content_item_write` skips `service_role`, which the MCP route (and any API using the admin client) runs as. Changed: the draft relied on the trigger, which does not bind the admin client.
- CRM data and AI-written text count as untrusted input to models.
- Rate limits per key, extending today's 30/min and 300/hour (counted from `mcp_tool_calls`).

## Risks

- Vendor MCP tool sets, URLs and auth change without versioning. Salesforce changed URLs and scopes at GA, HubSpot widened its write tools after GA, and GoHighLevel moved from a per-location token to per-client OAuth endpoints. Don't build ingestion on them.
- CRM data adds PII. It needs Privacy Policy and sub-processor updates, retention rules, and deletion on disconnect.
- Hosting a public API before product-market fit is maintenance load. Ship a read-only surface first: objects GET, search and properties.
- Marketplace timelines:
  - An unlisted HubSpot app stops at 25 installs until HubSpot reviews and lists it. Certification needs 6 months listed and 60 active installs.
  - HubSpot platform 2025.2 is going unsupported; migration to 2026.09 is due by March 2027.
  - Salesforce's AgentExchange review takes about 4–6 weeks, plus 2–3 weeks per resubmission, and applies only to a listing.
  - GoHighLevel's review takes weeks [unverified].
- AGPL, non-commercial or unlicensed code copied from community servers creates legal exposure. A repo's README or package.json can claim a different license than its LICENSE file.
- Doc conflicts to log:
  - `INTEGRATIONS_ROADMAP.md` lists `forms` and `content` among the HubSpot read scopes. HubSpot does not mark them legacy, but neither is a `.read` scope: `content` reaches the website page, landing page, marketing email and blog APIs, and `forms` the Forms APIs. That breaks the roadmap's read-only-first rule; drop them or justify them. Changed: the draft called them legacy and only asked to check them.
  - `integrations` and `integration_connections` overlap in purpose. `docs/architecture/INTEGRATIONS.md` still plans the HubSpot connect flow to write to `integrations`; point it at `integration_connections`.
- New decisions need entries in `DECISION_LOG.md` (public API, data model) and `OPEN_QUESTIONS.md` (first CRM: HubSpot or GoHighLevel).

## Sources

- https://developers.hubspot.com/changelog/remote-hubspot-mcp-server-is-now-generally-available
- https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-hubspot-mcp-server
- https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines
- https://developers.hubspot.com/docs/api-reference/2026-03/overview
- https://developers.hubspot.com/changelog/introducing-date-based-api-versioning
- https://developers.hubspot.com/changelog/app-listing-and-app-certification-requirement-updates-for-may-2026
- https://developers.hubspot.com/docs/apps/developer-platform/list-apps/apply-for-certification/applying-for-app-certification
- https://marketplace.gohighlevel.com/docs/other/mcp
- https://marketplace.gohighlevel.com/docs/other/rate-limits
- https://revenuegeeks.com/guides/gohighlevel-mcp
- https://explainx.ai/mcp-servers/gohighlevel
- https://developer.salesforce.com/blogs/2026/04/salesforce-hosted-mcp-servers-are-now-generally-available
- https://developer.salesforce.com/docs/platform/einstein-for-devs/guide/hostedmcp.html
- https://www.cleanlist.ai/blog/2026-10-05-salesforce-mcp-server-review
- https://developer.salesforce.com/blogs/2024/11/api-limits-and-monitoring-your-api-usage
- https://www.pipedrive.com/en/newsroom/pipedrive-launches-native-mcp-server-bringing-crm-workflows-directly-into-ai-assistants
- https://developers.pipedrive.com/changelog/post/breaking-changes-token-based-rate-limits-for-api-requests
- https://www.zoho.com/crm/developer/docs/mcp/overview.html
- https://help.zoho.com/portal/en/community/topic/credit-calculation-and-concurrency-in-zoho-crm-apis
- https://github.com/mondaycom/mcp
- https://developer.monday.com/api-reference/docs/mondaycom-mcp
- https://integration.keap.com/t/is-there-an-official-keap-max-classic-mcp-server/93970
- https://developer.infusionsoft.com/services/authentication
- https://mcpservers.org/remote-mcp-servers/close
- https://mcpservers.org/servers/peakmojo/mcp-hubspot
- https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server
- https://developers.hubspot.com/docs/api-reference/legacy/crm/search-the-crm
- https://developers.hubspot.com/docs/apps/developer-platform/list-apps/apply-for-certification/certification-requirements
- https://developers.hubspot.com/docs/developer-tooling/platform/versioning
- https://developers.hubspot.com/changelog/legacy-apis-and-legacy-apps-whats-going-unsupported-and-when
- https://developers.hubspot.com/docs/apps/developer-platform/build-apps/manage-apps-in-hubspot
- https://developers.hubspot.com/changelog/new-marketplace-distribution-app-install-limits
- https://developers.hubspot.com/docs/api-reference/latest/crm/objects/contacts/guide
- https://developers.hubspot.com/docs/api-reference/latest/crm/objects/deals/guide
- https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/scopes
- https://help.gohighlevel.com/support/solutions/articles/155000005741-how-to-use-the-highlevel-mcp-server
- https://help.gohighlevel.com/support/solutions/articles/48001060529-highlevel-api-documentation
- https://ideas.gohighlevel.com/changelog/private-integration-tokens-pits-now-available-for-sandbox-trial-accounts
- https://github.com/mastanley13/GoHighLevel-MCP/blob/main/LICENSE
- https://api.github.com/repos/mastanley13/GoHighLevel-MCP
- https://help.salesforce.com/s/articleView?id=platform.api_catalog_manage_mcp_servers.htm&type=5
- https://github.com/forcedotcom/mcp-hosted/wiki/Security-and-Permissions
- https://github.com/forcedotcom/mcp-hosted/wiki/Confirming-Availability
- https://developer.salesforce.com/docs/platform/isvforce/guide/security-review-how-it-works.html
- https://support.pipedrive.com/en/article/mcp-claude
- https://support.pipedrive.com/en/article/mcp
- https://learn.thryv.com/hc/en-us/articles/42512021865741-Connect-Claude-to-Keap-Using-the-Keap-Connector
- https://api.keap.com/.well-known/oauth-protected-resource/mcp
- https://developer.infusionsoft.com/getting-started-oauth-keys/
- https://developer.infusionsoft.com/pat-and-sak/
- https://github.com/mondaycom/mcp/blob/master/LICENSE
- Repo (checked 2026-10-17):
  - `supabase/migrations/20261010061028_foundation.sql` (`integrations`, `campaigns`, `knowledge_documents`, `business_profiles.intelligence`)
  - `supabase/migrations/20261011161133_search_console.sql` (`integration_connections` provider check, `search_console_snapshots`)
  - `supabase/migrations/20261010121043_content_approval_guard.sql` (`guard_content_item_write`)
  - `supabase/migrations/20261010164133_diagnosis_and_plan.sql` (`growth_plan_items.status`)
  - `supabase/migrations/20261011140425_mcp_access.sql` (`mcp_access_keys`, `mcp_tool_calls`)
  - `supabase/migrations/20261011160802_website_audit.sql` (`audit_runs.coverage`, `audit_findings.page_url`)
  - `web/src/lib/integrations/secret-box.ts`, `web/src/lib/integrations/google-oauth.ts`, `web/src/lib/integrations/search-console-access.ts`, `web/src/lib/plans/tiers.ts`
  - `web/src/app/api/integrations/google/start/route.ts`, `web/src/app/api/mcp/route.ts`, `web/src/lib/mcp/tools.ts`, `web/src/lib/pipeline/website-intel.ts`
  - `docs/architecture/INTEGRATIONS.md`, `docs/architecture/DATA_MODEL.md`, `docs/architecture/MCP_SERVER.md`, `docs/product/INTEGRATIONS_ROADMAP.md`, `docs/product/ROADMAP.md`, `docs/decisions/DECISION_LOG.md` (D-041)

## Verification (2026-10-17)

| id | claim (short) | result | source |
|---|---|---|---|
| crm-01 | HubSpot remote MCP: URL, GA date, OAuth 2.1 + PKCE, auto scopes, write list | Corrected: UI is now "MCP Connectors"; scopes come from tools plus user grants; write list much wider (content publish, campaigns, emails, pipelines); Sensitive Data also blocks conversations | [HubSpot MCP doc](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server), [GA changelog](https://developers.hubspot.com/changelog/remote-hubspot-mcp-server-is-now-generally-available) |
| crm-02 | HubSpot 110/10 s per account; Search about 5/s | Confirmed: Search is 5/s per account (mark removed); 110/10 s also covers legacy public apps | [Usage guidelines](https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines), [CRM search](https://developers.hubspot.com/docs/api-reference/legacy/crm/search-the-crm) |
| crm-03 | HubSpot certification 6 months + 60 installs; v2025.2/v2026.03 from 2026-11-02 | Corrected: rule is "a supported version"; 2026.09 is Current; 2025.2 going unsupported by March 2027 | [Certification requirements](https://developers.hubspot.com/docs/apps/developer-platform/list-apps/apply-for-certification/certification-requirements), [Versioning](https://developers.hubspot.com/docs/developer-tooling/platform/versioning) |
| crm-04 | HubSpot private/unlisted installs need no review; cap about 25 | Corrected: unlisted marketplace cap is exactly 25 (2025.2+); private OAuth capped at 10 (100 for Solution Partners); static token 1 | [Manage apps](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/manage-apps-in-hubspot), [Install limits](https://developers.hubspot.com/changelog/new-marketplace-distribution-app-install-limits) |
| crm-05 | HubSpot date-based versions, 2/year, 18 months; granular scopes | Confirmed; current version is now `2026-09` | [Date-based versioning](https://developers.hubspot.com/changelog/introducing-date-based-api-versioning), [Contacts guide](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/contacts/guide) |
| crm-06 | GoHighLevel MCP: PIT + `locationId`; Claude OAuth endpoint third-party only | Corrected: vendor docs now use OAuth with per-client endpoints (Claude `/mcp/anthropic/v2`); PIT is the older setup; agencies can span sub-accounts | [GHL MCP docs](https://marketplace.gohighlevel.com/docs/other/mcp), [Help center](https://help.gohighlevel.com/support/solutions/articles/155000005741-how-to-use-the-highlevel-mcp-server) |
| crm-07 | GoHighLevel 100/10 s, 200k/day per app per location | Confirmed (OAuth API 2.0; resource can also be a company) | [GHL rate limits](https://marketplace.gohighlevel.com/docs/other/rate-limits) |
| crm-08 | mastanley13/GoHighLevel-MCP about 132 stars, no license | Corrected: about 195 stars; custom non-commercial LICENSE (NOASSERTION = unmapped), contradicts its ISC claim | [LICENSE](https://github.com/mastanley13/GoHighLevel-MCP/blob/main/LICENSE) |
| crm-09 | Salesforce hosted MCP GA April 2026, Enterprise+, PKCE only, review weeks to months | Corrected: also Developer Edition; review now "AgentExchange", about 4–6 weeks, only for listings | [Salesforce Help](https://help.salesforce.com/s/articleView?id=platform.api_catalog_manage_mcp_servers.htm&type=5), [Security review](https://developer.salesforce.com/docs/platform/isvforce/guide/security-review-how-it-works.html) |
| crm-10 | Pipedrive native remote MCP 2026-06-30, all plans, OAuth | Confirmed | [Pipedrive press release](https://www.pipedrive.com/en/newsroom/pipedrive-launches-native-mcp-server-bringing-crm-workflows-directly-into-ai-assistants) |
| crm-11 | Keap: no official MCP; only `full` scope | Corrected: official Keap connector for Claude exists (`api.keap.com/mcp`); `full`-only scope confirmed (mark removed) | [Thryv article](https://learn.thryv.com/hc/en-us/articles/42512021865741-Connect-Claude-to-Keap-Using-the-Keap-Connector), [Keap OAuth keys](https://developer.infusionsoft.com/getting-started-oauth-keys/) |
| crm-12 | `mondaycom/mcp` is MIT | Confirmed from the LICENSE file (hedge removed) | [LICENSE](https://github.com/mondaycom/mcp/blob/master/LICENSE) |
| crm-13 | Braventa has connections table, secret box, OAuth routes, snapshot tables, Pro gate, n8n writes | Corrected: Google-only provider check and routes, one snapshot table, no n8n writes yet | `supabase/migrations/20261011161133_search_console.sql`, `docs/architecture/INTEGRATIONS.md` |
| crm-14 | `integrations` duplicates `integration_connections`; `campaigns` unused | Confirmed; `INTEGRATIONS.md` still plans HubSpot on `integrations` | `supabase/migrations/20261010061028_foundation.sql`, `docs/architecture/DATA_MODEL.md` |
| crm-15 | MCP keys hashed; `mcp_tool_calls`; 7 tools; 30/min, 300/hour | Confirmed (hash plus a short prefix) | `supabase/migrations/20261011140425_mcp_access.sql`, `web/src/app/api/mcp/route.ts` |
| crm-16 | `guard_content_item_write` keeps approved/published app-only; plan statuses | Corrected: members can set `approved`; trigger blocks only `scheduled`/`published` for clients and skips `service_role`; cites D-018. Plan statuses confirmed | `supabase/migrations/20261010121043_content_approval_guard.sql` |
| crm-17 | Pages in `knowledge_documents` + `audit_runs.coverage`; `intelligence` jsonb | Confirmed (findings also in `audit_findings.page_url`) | `supabase/migrations/20261011160802_website_audit.sql`, `web/src/lib/pipeline/website-intel.ts` |
| crm-18 | HubSpot is roadmap step 4; `forms`/`content` scopes are legacy | Corrected: step 4 in `INTEGRATIONS_ROADMAP.md` (item 3 in `ROADMAP.md`); scopes are not legacy but are not read-only | [HubSpot scopes](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/scopes), `docs/product/INTEGRATIONS_ROADMAP.md` |

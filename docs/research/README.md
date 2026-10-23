# Research index and founder decisions (2026-10-17)

**Status:** the founder made decisions 1 to 8 (§2) on 2026-10-18, recorded as D-045 to D-052 in
[DECISION_LOG.md](../decisions/DECISION_LOG.md), and chose Pixel Marketing Design as the applying entity for the
provider applications (§3, D-053). Nothing in this folder is built. The docs stay as the research record; where they
differ from a decision, the decision wins.

On 2026-10-17 the founder asked for:
- CRM integrations through an API or MCP;
- a HubSpot-style data model, so AI apps can work on Braventa data;
- a Metricool- or GoHighLevel-style social planner with posting, scheduling and approvals;
- team seats with roles, permissions and pricing, with suggested plan names Brand / Professional / Business /
  Organization (these conflict with the decided Basic / Pro / Premium, D-030 and D-039);
- features split into modules (Business Intelligence, SEO, Ads, and so on);
- a rule to research before building.

The three docs below answer those asks. Each was checked against vendor docs and the repo on 2026-10-17 and corrected
in place. Each ends with a "Verification (2026-10-17)" table.

| Ask | Answered in |
|---|---|
| CRM integrations, API or MCP | CRM doc §A |
| HubSpot-style data model and public API | CRM doc §B |
| Social planner with posting, scheduling and approvals | Social doc (all sections) |
| Team seats, roles, permissions, seat pricing, plan names | Seats doc §1–§4 |
| Feature modules | Seats doc §5–§6 |
| Research before building | Seats doc §7 |

Short names used below: **CRM doc** = [CRM_MCP_AND_DATA_MODEL_2026-10-17.md](CRM_MCP_AND_DATA_MODEL_2026-10-17.md),
**Social doc** = [SOCIAL_PLANNER_2026-10-17.md](SOCIAL_PLANNER_2026-10-17.md), **Seats doc** =
[SEATS_ROLES_MODULES_2026-10-17.md](SEATS_ROLES_MODULES_2026-10-17.md).

## 1. The three docs

### CRM integration and AI-ready data model

**Question:** should Braventa reach CRMs through the vendors' MCP servers or their REST APIs, which CRM comes first,
and how should Braventa's own data be shaped so AI apps can work on it? **Recommendation:** use direct REST APIs with
per-tenant OAuth for ingestion, not vendor MCP servers. Those servers are built for an interactive user, change their
tools without versioning, and need a model in the loop for every call. The first CRM is HubSpot, read-only: an unlisted
marketplace app on platform 2026.09 (up to 25 installs with no review) on API version `2026-09`. GoHighLevel is the
alternate if the first testers are agency-managed. Defer Salesforce (needs Enterprise Edition or above) and Keap
ingestion (no read-only scope). For Claude users, document a zero-build path: the owner connects Claude to both
Braventa's MCP server and the vendor's official server. For Braventa's data, copy HubSpot's uniform object model:
typed properties, first-class associations, search, and date-based versions, mapped onto existing tables. Ship a
read-only public API first, with scoped API keys generalized from `mcp_access_keys`. Never offer `content.publish` to
API clients. **Confidence after verification:** verifiers re-checked 18 claims: 8 confirmed and 10 corrected. The
corrections changed details, not the direction:
- the API version is `2026-09`, not `2026-03`;
- the install caps are exactly 25 (unlisted) and 10 (private);
- the integration foundation is only partly built (Google-only provider check and routes, one snapshot table, no n8n
  write path);
- the content approval trigger skips `service_role`, so API and MCP handlers must enforce D-013 in code;
- Keap has an official Claude connector;
- GoHighLevel's MCP server moved to OAuth.

Confidence is high for HubSpot facts and the API-over-MCP direction. It is lower for GoHighLevel's marketplace review
and scope names and for Pipedrive, Zoho and Close limits, which stay marked [unverified].

### Social planner

**Question:** how should Braventa offer a Metricool- or GoHighLevel-style planner with posting, scheduling and
approvals, and should it build or buy the publishing layer? **Recommendation:** build the planner, calendar, approvals,
revisions and audit trail in Braventa. They are the product, and they let D-013 be enforced in the database: a variant
publishes only if its approved revision is the current one. Buy publishing from a unified API behind a `Publisher`
interface:
- Outstand is the main option, picked after a one-week spike. Managed keys are included, so Facebook, Instagram and
  LinkedIn need no developer app of Braventa's own.
- Zernio and Ayrshare are the fallbacks.
- Launch with Facebook Pages, Instagram, Google Business Profile and LinkedIn. Skip X.
- Run the scheduler on Supabase Cron (pg_cron), because Vercel Hobby cron runs only once a day.
- Apply for Google Business Profile API access now. It is on the critical path: every route, Outstand included, needs
  Braventa's own Google app.

**Confidence after verification:** verifiers re-checked 18 claims: 8 confirmed and 10 corrected. Two corrections changed
the recommendation:
- Zernio moved from co-main option to fallback, because its per-account pricing costs about $138 a month at 10
  customers against Outstand's $19, and Outstand's managed keys turned out to be included, not a paid add-on;
- Google Business Profile moved onto the critical path, because Google gives no review time and reported delays in
  September 2026.

Confidence is high for each network's API constraints and for the scheduler choice. It is medium for the vendor choice,
because the vendors are small companies whose prices change often. It is low for review timelines, which are mostly
marked [U].

### Team seats, roles and feature modules

**Question:** how should Braventa add team seats with roles, permissions and seat prices? What should happen to the
founder's plan names? How should features split into modules? **Recommendation:**
- **Roles:** eight fixed roles (Owner, Admin, Marketing manager, Social media manager, Copywriter, Content creator,
  Analyst, Client approver), no custom roles in v1, and no self-approval except by the Owner.
- **Seats:** 2 / 5 / 10 full seats included on Basic / Pro / Premium. Extra full seats cost $29 / $39 / quoted. Analyst
  and client approver seats are free, up to set caps.
- **Plan names:** keep Basic / Pro / Premium as feature tiers and add an account type, Brand or Agency/Organization
  (option A).
- **Modules:** add a module registry. The growth plan is the core that combines modules. The growth score is a
  renormalized mean of the enabled modules that have evidence. A six-step migration changes no behavior until step 6,
  which adds the first new module: Search Console in the diagnosis.
- **Process:** an eight-step research-before-building process (§7).

**Confidence after verification:** verifiers re-checked 18 claims: 11 confirmed and 7 corrected. The corrections:
- Admin keeps today's owner-only rule for connecting integrations by default;
- `growth_plan_items.area` is free text, so its backfill needs a normalizing lookup;
- tier prices exist in the docs only;
- Later's outside reviewers can only comment, which weakens the case for free client approvers on Basic.

Repo facts and competitor prices are mostly from official pages, so confidence in them is high. The seat prices and the
per-brand agency prices are unvalidated proposals: D-039 covers tier prices and credits, not seats.

## 2. Decisions the founder needs to make

Each decision needs a new DECISION_LOG entry once made (and any superseded entry marked). Open items go to
OPEN_QUESTIONS.

### 1. Plan names and account types
- **Context:** the founder's names (Brand, Professional, Business, Organization) conflict with D-030 (Basic / Pro /
  Premium) and the D-039 prices. The names are in `web/src/lib/plans/tiers.ts`, on the site's `/pricing` and on the app's
  `/plans`. No page shows a price yet, and there is no checkout, so renaming costs less now than it will later.
- **Options:**
  - A. Keep Basic / Pro / Premium as feature tiers and add an account type: **Brand** (one business) or
    **Agency/Organization** (many businesses, priced per extra brand, for example +$59 or +$149 per brand by tier;
    unvalidated).
  - B. Rename the tiers: Brand = Basic, Professional = Pro, Business = Premium, plus Organization as a fourth,
    multi-business tier.
  - C. Use the names for seat types (Brand seat, Professional seat).
- **Recommendation:** A.
- **Cost and risk:**
  - A: one new column, `organizations.account_type`, and no copy changes. Low risk. It also answers Q-001 and Q-003 in
    line with their provisional defaults.
  - B: `TIERS` labels change (ids stay), plus the site, the docs and an entry superseding D-030's naming. A fourth price
    is needed.
  - C: confusing, because "brand" is already `brand_profiles` and Metricool's billing unit.
- **Also needed:** a per-brand price for agency accounts, and answers to Q-001 (owner or agency buyer) and Q-003 (one
  org per client or many businesses per org).
- **Source:** Seats doc §4 and §0.

### 2. Seat roles and seat prices
- **Context:**
  - Today `member_role` has only owner, admin and member. There are no invitations, no seat limits and no permission
    system. Search Console connect, property choice and disconnect are owner-only in code.
  - ROADMAP.md (Next, item 8) builds team access "only if agencies prove to be a buying segment", so building seats now
    changes that order.
  - D-018 says to revisit who may approve once organizations have roles.
- **Choices inside this decision:**
  - Roles: adopt the eight-role matrix in Seats doc §2 with fixed permissions and no custom roles in v1.
  - Approval rules: no one approves their own work except the Owner (so a one-person business still works), and every
    approval is recorded.
  - Integrations: may Admins connect and disconnect integrations? Today only the Owner can, and the proposal keeps it
    that way unless the founder widens it.
  - Seat prices. The options:
    - **Proposed:** full seats included 2 / 5 / 10 (Basic / Pro / Premium); extra full seat $29 / $39 / quoted (target
      $35); analyst seats free up to 5 / 10 / unlimited; client approvers free up to 3 / 10 / unlimited.
    - **Per-user pricing** like social-first tools (Hootsuite, Sprout Social, Agorapulse: $79 to $399 per user).
    - **Cheap or unlimited users** like Later ($3.75 to $5 per extra user), Buffer or GoHighLevel (unlimited users).
- **Recommendation:** the proposed matrix and prices. Following D-039, the prices stay off the site until checkout exists.
- **Cost and risk:**
  - Build: a pure, tested `web/src/lib/team/roles.ts`; an SQL helper `has_permission(org, perm)` for RLS write
    policies; an `invitations` table; and the three owner-only checks moved into an `integrations.connect` permission,
    with behavior unchanged.
  - AI cost sits with the organization (`monthly_ai_budget_usd`, default $5), so extra seats spend the same budget
    faster. The credit system that would bound this is not built.
  - $29 and $39 come from applying D-039's 1.5× premium to HubSpot Starter's core seat ($20) and Canva Business ($25).
    D-039 does not cover seats, so this needs the founder's approval.
  - Email invitations need transactional email (Q-010). Charging for seats needs Stripe.
- **Source:** Seats doc §0–§3.

### 3. Client approvers on Basic, or on Pro and up only
- **Options:**
  - A. Free on Basic, up to 3 (Pro up to 10, Premium unlimited).
  - B. Pro and up only.
- **Recommendation:** A, as the Seats doc table proposes, because owner sign-off is core to D-013. The doc labels this a
  founder choice.
- **Cost and risk:**
  - A puts on Basic a feature most tools sell on middle or upper tiers (Agorapulse Professional and up, Sprout Advanced,
    Metricool Advanced and up). Verification also found that Later's outside reviewers can only comment, so market
    support for A is weaker than first stated.
  - B is the market norm and gives Pro another reason to upgrade. On Basic, only a member with an approving role could
    approve, so an outside client would need a full seat.
  - Under either option the approval link is single-use and signed, stored as a hash, expires after 7 days, and logs
    every action.
- **Depends on:** decisions 1 and 2.
- **Source:** Seats doc §1 ("What the market does") and §3; Social doc §1 and §3 ("Client approval link").

### 4. First CRM: HubSpot or GoHighLevel
- **Context:** D-041 already lists HubSpot read-only as step 4 of the Pro integrations order. MVP_SCOPE.md and Q-011
  call it the first Next-phase item. The open item is whether the first testers use HubSpot or GoHighLevel
  (INTEGRATIONS_ROADMAP.md §6).
- **Options:**
  - A. HubSpot read-only first.
  - B. GoHighLevel first.
  - In both cases, defer Salesforce and Keap ingestion. Pipedrive, Close, Keap and GoHighLevel are covered for Claude
    users by the zero-build path.
- **Recommendation:** A, over direct REST with per-tenant OAuth, distributed as an unlisted marketplace app on platform
  2026.09 with API version `2026-09`. Choose B only if the testers are mostly agency-managed businesses on GoHighLevel.
  Ask them before building.
- **Cost and risk:**
  - HubSpot needs:
    - a migration widening the `integration_connections` provider check, which allows only Google today;
    - an OAuth start and callback route pair;
    - a first CRM snapshot table;
    - a `tiers.ts` gate entry.
  - Write actions wait on the `/api/n8n/*` callback routes, which don't exist yet.
  - Beyond 25 HubSpot customers, the app needs HubSpot's review and a marketplace listing. Certification needs 6 months
    listed and 60 active installs.
  - CRM data is personal data. It needs Privacy Policy and sub-processor updates, retention rules, and deletion on
    disconnect.
  - Drop `forms` and `content` from the planned read scopes: neither is read-only.
  - GoHighLevel's rate limits are generous (100 requests per 10 s, 200k a day per location), but its marketplace review
    is unverified. Its most-starred community MCP server has a non-commercial license, so don't copy it.
- **Source:** CRM doc §A1–§A3 and "Risks".

### 5. Social publishing: buy or build, and launch networks
- **Context:**
  - MVP_SCOPE.md §4 lists publishing as out of scope, and ROADMAP.md lists it under Later (CS-12). Under MVP_SCOPE §6, it
    needs a recorded decision first.
  - D-041 plans social accounts as step 6 of the Pro order and says actions are "executed by n8n". The Social doc instead
    proposes an in-app scheduler and worker (pg_cron calling a dispatch route), with n8n taking over later. That
    conflicts with D-041 and touches Q-031 (agent execution model) and Q-006 (n8n host). Decide which one runs
    publishing.
- **Options for publishing:**
  - Build direct connectors: about $0 in API costs, 4 to 8 developer-weeks plus each network's review, and ongoing
    maintenance as the APIs change.
  - Buy a unified API (assuming 4 networks and about 120 posts a month per customer):

    | Customers | Outstand | Zernio | Ayrshare |
    |---|---|---|---|
    | 10 | $19/mo | ~$138/mo | $299/mo |
    | 100 | ~$78/mo | ~$618/mo | ~$1,230/mo |
    | 1,000 | ~$479/mo | custom | custom (Enterprise) |

    Outstand's managed keys cover Facebook, Instagram, LinkedIn, Threads, TikTok, YouTube, Pinterest and Bluesky, but
    not X or Google Business Profile.
- **Options for launch networks:**
  - Facebook Pages, Instagram, Google Business Profile and LinkedIn.
  - Add X: $0.015 a post, or $0.20 with a link, and it needs Braventa's own X app.
  - Add TikTok or YouTube Shorts: these need video and an audit.
- **Recommendation:**
  - Build the planner, approvals and audit trail.
  - Buy publishing from Outstand after a one-week spike, behind a `Publisher` interface, with Zernio and Ayrshare as
    fallbacks. Move high-volume networks to direct connectors later.
  - Launch with Facebook Pages, Instagram, Google Business Profile and LinkedIn. Skip X. Add TikTok, YouTube Shorts,
    Pinterest, Threads and Bluesky later.
  - Publishing is a Pro feature (D-030, D-041). Don't let Google Business Profile approval block the launch.
- **Cost and risk:**
  - The vendors are small companies and their prices change often (Zernio repriced in May 2026), so keep the adapter
    thin.
  - A token leak means someone can post as the client. Encrypt tokens, request minimal scopes, and support revocation.
  - A timeout can cause a double post. Use an idempotency key and check the provider before any retry.
  - Notifications need transactional email (Q-010). Jobs must fit the hosting time limit (#31).
  - Before building, update MVP_SCOPE.md, PLANS_AND_TIERS.md and DECISION_LOG.md. Until publishing ships, copy must not
    claim it.
- **Source:** Social doc "Bottom line", §2 ("Unified APIs"), §3 ("Scheduler", "Launch order and why", "Buy vs build"),
  "Phased plan" and "Risks".

### 6. Public API scope: a read-only v1
- **Options:**
  - A. No public REST API yet; extend the MCP server only. Q-039 already asks whether to add read-only plan and draft
    tools.
  - B. A read-only v1: objects GET, search and properties over the existing tables, with the same handlers exposed as
    MCP tools.
  - C. The full sketch: create, update, archive, batch, associations and webhooks.
- **Recommendation:** B. One handler serves both REST and MCP. Each tool declares the scope it needs, and the default is
  deny.
- **Rules under any option:** API and MCP clients can create drafts and request approval. Approval and publishing happen
  only in the app. `content.publish` is never offered. `guard_content_item_write` does not bind `service_role`, which the
  MCP route runs as, so handlers must refuse `approved`, `scheduled` and `published` in code.
- **Sub-choices:**
  - Path versioning: `/api/v1` or date-based `/api/2026-11/`. The doc leaves this open.
  - Auth: phase 1 generalizes `mcp_access_keys` into `api_keys` with `scopes text[]`, storing only a hash and a short
    prefix. Phase 2 is an OAuth 2.1 server, the same work as Q-039.
- **Cost and risk:**
  - New `api_keys` and `api_audit_log` tables, plus per-key rate limits that extend today's 30 a minute and 300 an hour.
  - A public API before product-market fit adds maintenance.
  - The data model additions can come with or after v1: `contacts` (personal data, Pro only, waits on CRM ingestion),
    `activities`, `assets`, `associations` and `object_properties`. So can dropping the unused `integrations` table.
  - Needs DECISION_LOG entries for the public API and the data model.
- **Source:** CRM doc §B1–§B4 and "Risks".

### 7. Module architecture and the first new module
- **Options:**
  - A. Adopt the module registry (`web/src/lib/modules/registry.ts`), the `organization_modules` and `module_runs`
    tables, and `module_id` on findings and plan items. The growth score becomes a renormalized weighted mean of the
    enabled modules that have evidence, stored with a `score_version` and the list of modules used.
  - B. Keep the single pipeline and add each new area as its own code path.
- **Recommendation:** A, through the six-step path. Steps 1 to 5 change no behavior: register today's pipeline as three
  modules, add and backfill `module_id`, split the score (with a snapshot test), split the prompts (identical output),
  and loop the website job over the enabled modules. Step 6 adds the first new module.
- **First new module options:**
  - Search visibility (Search Console in the diagnosis). Already planned (INTEGRATIONS_ROADMAP.md step 2), and
    `searchConsoleSummaryForPrompt` is written but has no callers.
  - CRM intelligence: waits on decision 4 and the HubSpot app.
  - Local SEO: waits on Google Business Profile API access.
  - Search ads: no connector was researched.
- **Recommendation:** Search visibility.
- **Also confirm the module-to-tier map in Seats doc §5:**
  - Basic: business intelligence, website and technical SEO, conversion and messaging, and the content studio;
  - Pro: search visibility, local SEO, social media, search ads, email marketing, video, CRM intelligence, analytics and
    automation;
  - Premium: custom integrations.

  Module names stay descriptive (D-010). The founder's "Business Intelligence, SEO, Ads" fit that rule.
- **Cost and risk:**
  - Five refactor PRs come before any new value. They touch scoring and prompts, which snapshot tests guard.
  - Once more modules feed the score, the public explanation of the growth score (D-035: PageSpeed about a third, AI
    assessment about two-thirds) must change. Scores should show "based on N modules" so an upgrade isn't read as
    improvement.
  - `growth_plan_items.area` is free text, so its backfill needs a lookup that normalizes values, with a null fallback.
- **Source:** Seats doc §0, §5 and §6.

### 8. Research before building as a standing rule
- **Options:** adopt the eight-step process in Seats doc §7 as written (brief, read the repo, look outside, options,
  decide, spec, build, review after launch), or a lighter version.
- **Recommendation:** adopt it as written. Suggested threshold (not in the doc): use it for any change that adds an
  integration, a paid vendor, a table, a price or a public claim. Record it in DECISION_LOG. If the founder wants it in
  CLAUDE.md's working rules too, add it there. These three docs are its first use.
- **Cost and risk:** applied to every small change, it slows work. The threshold keeps the effort in proportion.
- **Source:** Seats doc §7.

## 3. Apply now, regardless of the decisions

Provider reviews drive the timeline more than code does (Social doc "Risks"). The steps below cost little and are needed
under every option above.

**Choose the applying entity first.** Meta Business Verification and LinkedIn's Community Management API need a
registered legal organization. The US LLC isn't registered yet (CONTACT_PIPELINE.md). Decide whether to apply under the
current entity, Pixel Marketing Design, or wait for the LLC. Before choosing, check each provider's rules for moving an
app to another business.

| Application | Why now | What it needs | Time | Source |
|---|---|---|---|---|
| Google Business Profile API, "Application for Basic API Access" | On the critical path. Every route needs Braventa's own Google app: Outstand has no managed keys for it. Local SEO (D-041) needs it too. Quota is 0 until approved, then 300 per minute | The GBP API contact form with the Google Cloud project number. A Business Profile, verified and active for 60+ days and listing a website, with the request sent from an owner or manager email. If no such profile exists, creating and verifying one starts the 60-day clock | Google gives no time and reported processing delays on 2026-09-15 | Social doc §2, §3, "Phased plan" |
| Meta Business Verification, then App Review (Advanced Access) | A hedge against the vendor, a later direct connector, and the read scopes for D-041's social connections | One Meta app. One submission can include the Facebook (`pages_manage_posts`, `pages_read_engagement`, `pages_show_list`) and Instagram (`instagram_business_basic`, `instagram_business_content_publish`) permissions. Start Business Verification now. Meta's submission guide asks how each permission is used, so submit App Review once the connect flow works | App Review: Meta says decisions come within a week. Business Verification: no stated time; third parties report days to about 30 days | Social doc §2 |
| LinkedIn Community Management API | Company-page posting (`w_organization_social`) | A dedicated app with no other API products. Development tier: verified business email, organization, website, an app verified by the organization's Page, a registered legal organization. Standard tier: form, screen recording of each use case, test credentials; discretionary, and a refusal means a new app. Use a separate app for personal posting ("Share on LinkedIn", self-serve), because adding it blocks a later Community Management request on the same app | Not stated | Social doc §2, §3 |
| TikTok Content Posting API audit | A later network. Unaudited apps post privately only, to at most 5 users per 24 h | Create the app now. The audit checks the required posting screen (creator nickname, privacy dropdown with nothing preselected, interaction toggles, commercial-content disclosure, consent text, preview) | TikTok gives no time; third parties say 2 to 6 weeks | Social doc §2 |
| Pinterest trial, then Standard access | A later network | A demo video that shows the OAuth flow | Days to weeks, often stalls (third-party) | Social doc §2 |
| HubSpot developer app on platform 2026.09 | D-041 already includes HubSpot read-only | An unlisted marketplace OAuth app (up to 25 installs, no review). Sign the Acceptable Use Policy before installing outside test accounts | None for unlisted use | CRM doc §A1, §A3 |
| Google OAuth verification for the existing Search Console client | Search Console is live, and GA4 is next in D-041 | Plan scope additions (GA4, later Business Profile) so they go through as few verification passes as possible | Several days to a few weeks (SEARCH_CONSOLE_SETUP.md) | [SEARCH_CONSOLE_SETUP.md](../architecture/SEARCH_CONSOLE_SETUP.md) |

Other no-regret steps:
- **Ask the ~3 testers** which CRM they use, which networks they post to, whether an agency runs their marketing, and
  who approves their posts. The answers feed decisions 1, 3, 4 and 5 and Q-001.
- **Choose a transactional email provider (Q-010).** Seat invitations, approval notifications and the D-040 trial
  reminders all need it.
- **Add a license check to CI** (`license-checker` or GitHub's license API) before copying any community code. Copy
  only MIT or Apache-2.0 code, keep attribution, and trust the LICENSE file over the README or package.json (CRM doc §A2).
- **Correct the planned HubSpot scopes and the HubSpot connect plan** (see section 5).
- **Fix the stale docs** listed in section 5.

## 4. Suggested build order

Public launch is planned for the end of October 2026 (D-040). It needs Stripe, transactional email and legal pages
(Q-010, Q-032). None of the work below is needed for launch. The order assumes the recommendations are accepted. GA4
(D-041 step 3) and Canva and HeyGen (step 5) were not part of this research and slot in per D-041.

| # | Step | Waits on | Unblocks |
|---|---|---|---|
| 0 | Applications and tester questions (section 3) | Choice of applying entity | Google Business Profile, Meta and LinkedIn connectors; decisions 4 and 5 |
| 1 | Record decisions 1 to 8. Update MVP_SCOPE.md, PLANS_AND_TIERS.md and ROADMAP.md. Fix the stale docs | Founder | Everything below |
| 2 | The "Connect your tools" discovery step and Pro gate (INTEGRATIONS_ROADMAP.md step 1, already planned) | — | Steps 3 and 5 |
| 3 | Module registry steps 1 to 5 (no behavior change), then Search visibility as the first new module. If Search Console reaches the diagnosis before the registry exists, it gets moved into a module later; doing the registry first avoids writing it twice | Decision 7 | Later modules |
| 4 | Roles and permissions foundation: `roles.ts`, `has_permission()`, the owner-only checks moved into `integrations.connect`. **Built 2026-10-23** ([ROLES_AND_PERMISSIONS.md](../architecture/ROLES_AND_PERMISSIONS.md)). Then invitations and seat limits | Decision 2. Invitations need Q-010; charging for seats needs Stripe | Steps 6 and 8 |
| 5 | CRM read-only (HubSpot or GoHighLevel): provider-check migration, OAuth routes, snapshot table, gate entry, CRM intelligence module | Decision 4, the HubSpot app, Privacy Policy and sub-processor updates. Step 3 if modules are adopted | The `contacts` object; CRM write actions later |
| 6 | Social planner without publishing: tables and RLS, month and list calendar, per-network variants, media library, internal approval, client approval link, comments, revisions, audit trail | Decisions 3 and 5, step 4. Notifications need Q-010 | Step 7 |
| 7 | Publishing: vendor spike (one week), `Publisher` interface, pg_cron scheduler and worker. Facebook, Instagram and LinkedIn through the vendor's managed keys; Google Business Profile once Google approves | Step 6, the vendor choice, Google Business Profile approval, and who executes publishing (decision 5: in-app worker or n8n) | Later networks; direct connectors |
| 8 | Read-only public API v1 and generic MCP tools; `api_keys`, `api_audit_log` | Decision 6, step 4 (roles set what keys may do) | Webhooks; write endpoints |
| 9 | Later: approved write actions through n8n (`/api/n8n/*`, Q-006 host), the event outbox and webhooks, OAuth 2.1 for the API and connectors (Q-039), more modules in D-041 order, planner extras (best time, queues, CSV, first comment, analytics), TikTok, Shorts, Pinterest, Threads and Bluesky, direct connectors for high-volume networks, custom roles | Earlier steps | — |

Once step 4 is in, steps 5, 6 and 8 can run in parallel. The order shown follows D-041 (CRM before social).

## 5. Stale docs

**Fixed on 2026-10-18:** the stale docs in the first two lists below were corrected, except
`WEBSITE_INTELLIGENCE_GAP_REPORT.md`, which stays a dated snapshot (its update note says which sections describe the
earlier state).

Found by the research:
- **Crawl page count.** These say the crawl covers 6 pages; the code (`crawler.ts:86`, `MAX_PAGES = 25`) and D-038 say
  25:
  - `docs/product/BUSINESS_METHODOLOGY.md:43`
  - `docs/marketing/WEBSITE_MESSAGING.md:43` and `:65`
  - `docs/product/SUPPORT_SITE.md:18`
  - `docs/architecture/AI_ROUTING_AND_COSTS.md:188`
  - `docs/product/WEBSITE_INTELLIGENCE_GAP_REPORT.md:89`. Check whether this report is meant to stay a dated snapshot.
- **Semrush plan names.** `docs/product/PRICING_PROPOSAL.md:59` and `:89` cite Semrush "Pro / Guru" (~$140 / ~$250).
  Semrush now lists SEO $139, Starter $199, Pro+ $299 and Advanced (custom), billed monthly. Line 89's "level with Semrush
  Guru" comparison needs a new anchor.
- **HubSpot read scopes.** `docs/product/INTEGRATIONS_ROADMAP.md` §3 lists `forms` and `content` among the HubSpot read
  scopes. Neither is a read-only scope (`content` reaches the page, landing page, email and blog APIs), which breaks the
  roadmap's read-only-first rule. Drop them or justify them.
- **HubSpot connect plan.** The HubSpot-first plan in `docs/architecture/INTEGRATIONS.md` writes connections to the
  unused `integrations` table, which duplicates `integration_connections`. Point it at `integration_connections` (the CRM
  doc also suggests dropping `integrations`).
- **Review times.** `docs/product/INTEGRATIONS_ROADMAP.md:77` and `:82` say app reviews take weeks. Meta says App Review
  decisions come within a week. The long waits are Business Verification, Google Business Profile access (no stated
  time; delays reported) and the other networks.
- **Module E name.** `docs/product/BUSINESS_METHODOLOGY.md` names module E only by its letter. Its name, "CRM
  Intelligence", appears only in `docs/product/PRODUCT_OVERVIEW.md:114`.

Noticed while writing this index (not in the research docs):
- `docs/marketing/WEBSITE_MESSAGING.md:43` also says "mobile PageSpeed". D-038 runs mobile and desktop.
- `docs/architecture/INTEGRATIONS.md` (HubSpot-first plan) stores tokens in Supabase Vault and has an "org admin"
  connect. The built pattern uses `web/src/lib/integrations/secret-box.ts` (AES-256-GCM) and owner-only connect.
- `docs/product/INTEGRATIONS_ROADMAP.md:51` and `:84` say X needs a "paid API tier". X is now pay-per-use ($0.015 a post,
  $0.20 with a link), and the legacy Basic and Pro plans moved to it (Social doc §2).
- `docs/product/ROADMAP.md` lists "Analytics integrations (GA4, Search Console)" under Later. Search Console is live, and
  GA4 is D-041 step 3.
- `docs/product/MVP_SCOPE.md` (lines 106–110) and Q-011 call HubSpot the "first Next-phase item". D-041 puts it fourth in
  the Pro integrations order.

Docs that change once the decisions are made (not stale yet):
- `docs/product/MVP_SCOPE.md` §4 (publishing is out of scope)
- `docs/product/ROADMAP.md` (CS-12 publishing under Later; Next item 8, team access only if agencies prove a buying
  segment)
- `docs/product/PLANS_AND_TIERS.md` (seats, account type, publishing tier)
- D-018 (who may approve, once roles or publishing arrive)
- D-035's growth score explanation (once modules change the score)
- Q-001, Q-003, Q-011 and Q-039, plus a new open question for the first CRM (HubSpot or GoHighLevel)

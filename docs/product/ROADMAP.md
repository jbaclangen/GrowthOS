# Braventa — Roadmap and business model

This document sequences Braventa's capabilities into three phases — Now (MVP proof of concept), Next
(validation with paying customers), and Later (future vision) — and sets out the business model and a
configurable pricing framework. It is a planning document, not a commitment: items move only when
evidence or a founder decision supports it. Tier names and prices are decided (D-030, D-039; seat prices D-046,
planned); other limits and entitlements in the pricing framework are placeholders.

**Status / last reviewed: 2026-10-18.** Phase contents align with [MVP_SCOPE.md](MVP_SCOPE.md) and
[PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md). Sequencing is **Provisional** until confirmed in
[DECISION_LOG.md](../decisions/DECISION_LOG.md); the Pro integrations, modules, team access, planner and API items
in Next follow founder decisions D-041 and D-045 – D-053, none of which is built yet.

**Label mapping to the [product vision](GrowthOS_Product_Vision_and_Planning_Context.md) (§8, D-019).**
The vision asks for Current / MVP / Next / Later / Exploratory. In these docs: **Current** = status *Live*;
**MVP** = class *MVP*; **Next** = *Next phase*; **Later** = *Future vision*; **Exploratory** = ideas with no
requirement ID and no validated need yet (listed in §3.1 below). Gaps between the vision and the code are
in [IMPLEMENTATION_ASSESSMENT_2026-10-10.md](IMPLEMENTATION_ASSESSMENT_2026-10-10.md).

---

## 1. Now — MVP proof of concept

**Goal:** a service-business owner gets a credible assessment, priorities, and usable on-brand drafts in
one sitting. Growth Loop coverage: Understand, plus plan, create, approve.

| Item | Requirement | Status |
|---|---|---|
| Sign-up, organization, dashboard | PL-1 – PL-4 | Live |
| Website reading, PageSpeed, business profile | BI-1 – BI-4, WI-1 – WI-3 | Live |
| Growth score, five opportunities, 30-day plan | MS-1, MS-3, MS-4, CS-1 | Live |
| First five drafts with approve / reject / undo | CS-2 – CS-4 | Live |
| AI routing, budget, usage logging, RLS | AN-1, NFRs | Live |
| Complete Braventa rename in UI strings | D-003 | In progress |
| Copy and export approved drafts | CS-7 | Not started |
| Edit and regenerate drafts | CS-5, CS-6 | Not started |
| Edit business profile; provenance labels | BI-5, BI-6, MS-2 | Not started |
| Draft the next batch | CS-8 | Not started |
| Password reset | PL-5 | Not started |
| Paid AI mode for real customers | NFR performance | Live (production runs paid models, D-037) |
| Guided onboarding questions | BI-12 (D-021) | Live |
| Opportunity tracking; "do this first" summary | MS-5, UX-1 (D-022) | Live (delivered by ON-8) |
| AI-assisted onboarding, stage 1: catalog, discovery, top three, website analysis in parallel | ON-1 – ON-4 (D-028) | Live |
| AI-assisted onboarding, stage 2: adaptive follow-ups, saved progress | ON-5, ON-6 | Live |
| AI-assisted onboarding, stage 3: confirmed diagnosis and single plan (replaces 5 opportunities) | ON-7, ON-8 (delivers MS-5, UX-1) | Live |

**Exit criteria:** the MVP items above are live, and the first design partners can complete the
first-run journey ([USER_JOURNEYS.md](USER_JOURNEYS.md)) without help.

## 2. Next — validation with paying customers

**Goal:** prove that service businesses pay for and keep using Braventa; put connected tools to work in the
diagnosis (the first, Google Search Console, is connected for Pro and, since 2026-10-23, feeds the diagnosis and
the growth score as the Search visibility module). Ordered by recommended priority.

> **Tiers and build order (D-030, D-041):** the items below that connect tools or act for the owner are **Pro** features. They follow D-041's order ([INTEGRATIONS_ROADMAP.md](INTEGRATIONS_ROADMAP.md) §5) as amended by the founder decisions of 2026-10-18 (D-045 – D-053), in the sequence of the [research README](../research/README.md) §4: the "Connect your tools" step, then the module registry and Search visibility (item 3); then roles and permissions (item 8); then HubSpot read-only (item 3), the social planner and publishing (item 9) and the read-only public API (item 10), which can run in parallel once roles are in. GA4, Canva and HeyGen slot in per D-041. Where the proposed Pro order in [PLANS_AND_TIERS.md](PLANS_AND_TIERS.md) §5 differs from D-041, this roadmap follows D-041. The public sites follow [SITEMAP.md](../marketing/SITEMAP.md) and [SUPPORT_SITE.md](SUPPORT_SITE.md) (D-031).

1. **Production readiness:** the app runs on `app.braventa.io` on Vercel (D-011), and analyses run as a chain
   of steps that each fit the hosting function-duration limit (D-042, see
   [SYSTEM_ARCHITECTURE.md](../architecture/SYSTEM_ARCHITECTURE.md)). Still to do: plain-language error
   messages; account and business deletion (PL-8).
2. **Billing and plan limits:** Stripe subscriptions using the `subscriptions` table (PL-7); limits
   enforced from the pricing framework once decided.
3. **Connected tools and modules, read-only first (Pro, D-041, D-051, D-048):** the Google Search Console
   connection is live, the "Connect your tools" step in discovery with the Pro gate is built (D-054), the module
   registry (D-051 steps 1–5) is built and scores say "Based on N modules", and Search visibility, the first new
   module, is live (D-051 step 6, 2026-10-23: Search Console data in the diagnosis and the score,
   [FEATURE_MODULES.md](../architecture/FEATURE_MODULES.md) §9); next GA4 (WI-6); then a HubSpot read-only CRM summary:
   connect, pipeline summary, data quality, follow-up recommendations (CRM-1 – CRM-4), over HubSpot's REST API with
   per-tenant OAuth as an unlisted HubSpot app (D-048). GoHighLevel replaces HubSpot if the testers turn out to be
   agency-managed; ask them first. Built first with design partners who use these tools. Order:
   [INTEGRATIONS_ROADMAP.md](INTEGRATIONS_ROADMAP.md) §5.
4. **AI assistant (committed, D-020):** a read-only help and report assistant is live (D-043); next,
   knowledge-base retrieval (BI-8) then the assistant grounded in it (BI-11); goals and objectives (BI-7, MS-6). Opportunity tracking moved into Now (D-022).
5. **Quality gate:** automated QA review before approval (CS-9).
6. **Website checklist and improvement plan** (WI-4, WI-5).
7. **Customer-facing usage view** and weekly summary (AN-3, AN-4).
8. **Team access (decided, D-046, D-047):** eight fixed roles with fixed permissions, no custom roles in v1; no one
   approves their own work except the Owner; connecting integrations stays Owner-only. First the roles and
   permissions foundation, then invitations, seat limits and organization switching (PL-6), and client approvers
   (free up to a cap per tier) with a single-use, signed approval link. Invitations need transactional email
   (Q-010); charging for extra seats needs Stripe (item 2). Each organization also gets an account type, Brand or
   Agency/Organization (D-045).
9. **Social planner, then publishing (Pro, D-049; CS-12, moved from Later):** first the planner without publishing:
   calendar, per-network variants, media library, internal and client approval, comments, revisions and audit trail.
   Then publishing through Outstand (chosen after a one-week spike) behind a `Publisher` interface, run by an in-app
   scheduler: Facebook Pages, Instagram and LinkedIn, and Google Business Profile once Google approves access. X is
   skipped. A post goes out only if its approved revision is the current one (D-013). Publishing is out of the MVP
   (MVP_SCOPE.md §4); until it ships, nothing may say Braventa publishes. Detail:
   [INTEGRATIONS_ROADMAP.md](INTEGRATIONS_ROADMAP.md) §4.
10. **Read-only public API v1 (D-050):** objects GET, search and properties over the existing tables, with the same
    handlers exposed as MCP tools; each tool declares its scope, and the default is deny. Scoped `api_keys`
    (generalized from `mcp_access_keys`), an `api_audit_log` and per-key rate limits. API and MCP clients may create
    drafts and request approval; approval and publishing happen only in the app. Path versioning is still open.
11. **First n8n workflows** with callbacks to `/api/n8n/*`, execution log, retries (AU-3 – AU-6);
    scheduled weekly re-assessment (AU-4).
12. **Long-form drafts:** blog and email (CS-10).
13. **Document upload** (BI-9). (Knowledge-base retrieval moved up with the assistant, item 4.)

**Exit criteria:** validation metrics in [MVP_SCOPE.md](MVP_SCOPE.md#5-success-metrics-for-validation-with-paying-customers)
met or consciously revised; pricing decided.

## 3. Later — future vision

- (Scheduling and publishing, CS-12, moved to Next, item 9 — D-049.) Later publishing work: TikTok, YouTube Shorts,
  Pinterest, Threads and Bluesky; direct connectors for high-volume networks; planner extras (best time, queues, CSV
  import, first comment, post analytics).
- HubSpot task creation and CRM workflow automation (CRM-5, CRM-6); additional CRMs (CRM-7). Salesforce and Keap
  ingestion are deferred (D-048).
- More modules, in D-041 order, from the module-to-tier map (D-051); public API write endpoints and webhooks
  (D-050); custom roles (D-046).
- Trigger-based automations and client-configured authorised automations (AU-7, AU-8).
- The full Improve stage: planned vs actual, outcome learning, next-best-action recommendations
  (AN-5 – AN-7). (Search Console and GA4 moved to Next with the Pro integrations — D-041; the Search Console
  connection is live.)
- Campaign planning, repurposing, video scripts and creative briefs (MS-7, CS-11).
- (Grounded Q&A assistant moved to Next — D-020; the read-only in-app assistant shipped — D-043.)
- Agency features: multi-client reporting (CS-13). (Client approvers and roles moved to Next with team access,
  item 8 — D-046, D-047.)
- Marketing site at braventa.io (D-011), community, and partner programme.

### 3.1 Exploratory — no requirement ID until a need is validated

- Canva or other design-tool automation for creative assets (vision §10).
- Video generation beyond scripts and briefs.
- WordPress or other CMS write access for controlled website changes (vision §8.2).
- Reusable workflow template library for customers (vision §8.6).
- Making the Growth Loop visible as a navigation or progress element in the app (vision §6) — see UX-2.

**Resolved 2026-10-10:** guided onboarding (BI-12) and opportunity tracking + "do this first" (MS-5, UX-1) moved into
the MVP (D-021, D-022); the assistant is committed for Next (D-020). **2026-10-17:** a read-only in-app assistant
shipped ahead of retrieval (D-043). **2026-10-18:** the founder decided account types, team roles and seats, client
approvers, the first CRM, social publishing, the public API and feature modules (D-045 – D-051); team access no longer
waits for agencies to prove a buying segment, and publishing (CS-12) moved from Later to Next. None of it is built.

## 4. Business model and pricing framework

### 4.1 Business model

Subscription software, plus optional implementation, onboarding, and managed services (brief §1.1, §4).
The software creates recurring value through the Growth Loop; services serve customers who want help
setting up or running the system. Services should be sold on top of the software, never instead of it,
so the product remains the centre of the relationship.

Potential revenue streams (brief §4): monthly and annual subscriptions; onboarding and implementation;
CRM configuration and optimisation; advanced automation packages; website and conversion optimisation;
managed marketing operations; premium integrations or usage allowances.

### 4.2 Subscription framework

**Tier names and prices are decided in [PLANS_AND_TIERS.md](PLANS_AND_TIERS.md) (D-030, D-039; seats D-046).** Every other
limit and entitlement below is an Assumption — not decided (D-012). The
framework defines the variables, not their values. Implement plan limits as configuration (for example,
a `plans` definition keyed by plan id) so values can change without code changes.

| Variable | Description | Tier 1 (Assumption — not decided, D-012) | Tier 2 (Assumption — not decided, D-012) | Tier 3 (Assumption — not decided, D-012) |
|---|---|---|---|---|
| `tier_name` | Display name | `{{tier_1_name}}` | `{{tier_2_name}}` | `{{tier_3_name}}` |
| `price_monthly` / `price_annual` | Price per billing period | `{{p1}}` | `{{p2}}` | `{{p3}}` |
| `businesses` | Business profiles per organization | `{{b1}}` (e.g. 1) | `{{b2}}` | `{{b3}}` (agency-sized) |
| `analysis_runs` | Full assessments per month | `{{r1}}` | `{{r2}}` | `{{r3}}` |
| `draft_batches` | Content batches (or drafts) per month | `{{d1}}` | `{{d2}}` | `{{d3}}` |
| `ai_budget_usd` | Internal AI cost ceiling per month (maps to `organizations.monthly_ai_budget_usd`; never shown as a price) | `{{a1}}` | `{{a2}}` | `{{a3}}` |
| `connected_tools` | Number of integrations (CRM, analytics, publishing) | `{{c1}}` (e.g. 0) | `{{c2}}` | `{{c3}}` |
| `seats` | Members per organization | `{{s1}}` | `{{s2}}` | `{{s3}}` |
| `modules` | Which capability areas are included | `{{m1}}` | `{{m2}}` | `{{m3}}` |
| `automation_runs` | Workflow executions per month (once Automation exists) | n/a | `{{w2}}` | `{{w3}}` |
| `support_level` | Support channel and response time | `{{sl1}}` | `{{sl2}}` | `{{sl3}}` |
| `trial` | Trial length and limits | `{{trial}}` | — | — |

**Usage dimensions to choose between** (Assumption — not decided, D-012). Pick at most two primary
meters to keep pricing understandable for owner-operators:

| Dimension | Pros | Cons |
|---|---|---|
| Businesses | Simple; maps to agency value | Owners have one business, so no expansion path |
| Analysis runs / draft batches | Tracks delivered value and AI cost | Customers may ration use |
| Connected tools | Rewards integration depth | Penalises the behaviour that makes Braventa sticky |
| Seats | Familiar | Owner-operators have one or two users |
| AI usage allowance | Protects margin | Hard for customers to reason about; keep internal where possible |

**Guardrails for any pricing decision:** the AI cost per customer at the tier's usage limit
(from `ai_usage`) must stay well under the tier price; the internal AI budget is a safety ceiling, not a
customer-facing unit; usage and limits must be visible to the customer (brief §5, app UI principles).

### 4.3 Service add-ons framework

**All scope, delivery, and pricing below is an Assumption — not decided (D-012).** No service is
currently offered.

| Service | Scope (variable) | Pricing model (variable) | Prerequisite in product |
|---|---|---|---|
| Onboarding | Guided setup, profile review, first plan walk-through: `{{onboarding_scope}}` | One-off `{{onboarding_fee}}` | MVP |
| CRM configuration and optimisation | HubSpot pipeline, properties, data clean-up: `{{crm_scope}}` | Project `{{crm_fee}}` | CRM Intelligence (Next) |
| Automation packages | Pre-built n8n workflows configured for the client: `{{automation_scope}}` | Package `{{automation_fee}}` plus optional retainer | Automation (Next/Later) |
| Website and conversion optimisation | Implementing Website Intelligence recommendations: `{{website_scope}}` | Project `{{website_fee}}` | Website Intelligence (MVP/Next) |
| Managed marketing operations | Ongoing content approval, publishing, reporting on the client's behalf: `{{managed_scope}}` | Monthly retainer `{{managed_fee}}` | Publishing (Next, D-049) and reporting (Later); client-authorized approvals (D-013) |
| Premium integrations or usage packs | Additional connected tools or runs | Add-on `{{addon_fee}}` | Billing (Next) |

Managed services that act for a client must still follow the approval model: the client either approves
items or explicitly authorises the service to approve on their behalf (D-013).

## Related documents

- [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md) · [BUSINESS_METHODOLOGY.md](BUSINESS_METHODOLOGY.md) ·
  [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) · [MVP_SCOPE.md](MVP_SCOPE.md) · [USER_JOURNEYS.md](USER_JOURNEYS.md)
- [SYSTEM_ARCHITECTURE.md](../architecture/SYSTEM_ARCHITECTURE.md) · [INTEGRATIONS.md](../architecture/INTEGRATIONS.md)
- [BRAND_BIBLE.md](../brand/BRAND_BIBLE.md) · [VOICE_AND_MESSAGING.md](../brand/VOICE_AND_MESSAGING.md)
- [DECISION_LOG.md](../decisions/DECISION_LOG.md) · [OPEN_QUESTIONS.md](../decisions/OPEN_QUESTIONS.md)

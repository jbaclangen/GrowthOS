# Braventa — Roadmap and business model

This document sequences Braventa's capabilities into three phases — Now (MVP proof of concept), Next
(validation with paying customers), and Later (future vision) — and sets out the business model and a
configurable pricing framework. It is a planning document, not a commitment: items move only when
evidence or a founder decision supports it. No prices or entitlements are decided (D-012); every number
in the pricing framework is a placeholder.

**Status / last reviewed: 2026-10-10.** Phase contents align with [MVP_SCOPE.md](MVP_SCOPE.md) and
[PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md). Sequencing is **Provisional** until confirmed in
[DECISION_LOG.md](../decisions/DECISION_LOG.md).

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
| Paid AI mode for real customers | NFR performance | Configuration ready, not switched |

**Exit criteria:** the MVP items above are live, and the first design partners can complete the
first-run journey ([USER_JOURNEYS.md](USER_JOURNEYS.md)) without help.

## 2. Next — validation with paying customers

**Goal:** prove that service businesses pay for and keep using Braventa; add the first connected tool.
Ordered by recommended priority.

1. **Production readiness:** deploy to `app.braventa.io` on Vercel (D-011); confirm the analysis run fits
   the hosting function-duration limits or move long runs to n8n (see
   [SYSTEM_ARCHITECTURE.md](../architecture/SYSTEM_ARCHITECTURE.md)); plain-language error messages;
   account and business deletion (PL-8).
2. **Billing and plan limits:** Stripe subscriptions using the `subscriptions` table (PL-7); limits
   enforced from the pricing framework once decided.
3. **HubSpot read-only CRM summary:** connect, pipeline summary, data quality, follow-up
   recommendations (CRM-1 – CRM-4). Built first with HubSpot-using design partners.
4. **Opportunity tracking:** accept, dismiss, done (MS-5); goals and objectives (BI-7, MS-6).
5. **Quality gate:** automated QA review before approval (CS-9).
6. **Website checklist and improvement plan** (WI-4, WI-5).
7. **Customer-facing usage view** and weekly summary (AN-3, AN-4).
8. **Team access:** invitations, roles, organization switching (PL-6), only if agencies prove to be a
   buying segment.
9. **First n8n workflows** with callbacks to `/api/n8n/*`, execution log, retries (AU-3 – AU-6);
   scheduled weekly re-assessment (AU-4).
10. **Long-form drafts:** blog and email (CS-10).
11. **Knowledge base retrieval and document upload** (BI-8, BI-9).

**Exit criteria:** validation metrics in [MVP_SCOPE.md](MVP_SCOPE.md#5-success-metrics-for-validation-with-paying-customers)
met or consciously revised; pricing decided.

## 3. Later — future vision

- Scheduling and publishing through connected tools, with approval by default (CS-12).
- HubSpot task creation and CRM workflow automation (CRM-5, CRM-6); additional CRMs (CRM-7).
- Trigger-based automations and client-configured authorised automations (AU-7, AU-8).
- Analytics integrations (GA4, Search Console) and the full Improve stage: planned vs actual, outcome
  learning, next-best-action recommendations (AN-5 – AN-7).
- Campaign planning, repurposing, video scripts and creative briefs (MS-7, CS-11).
- Grounded Q&A assistant (BI-11).
- Agency features: client approval views, multi-client reporting (CS-13).
- Marketing site at braventa.io (D-011), community, and partner programme.

### 3.1 Exploratory — no requirement ID until a need is validated

- Canva or other design-tool automation for creative assets (vision §10).
- Video generation beyond scripts and briefs.
- WordPress or other CMS write access for controlled website changes (vision §8.2).
- Reusable workflow template library for customers (vision §8.6).
- Making the Growth Loop visible as a navigation or progress element in the app (vision §6) — see UX-2.

**Pending founder decisions that could move items into the MVP:** Q-021 (assistant), Q-022 (guided
onboarding questions, BI-12), Q-023 (opportunity tracking MS-5 and "do this first" summary UX-1).

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

**Every tier name, limit, entitlement, and price below is an Assumption — not decided (D-012).** The
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
| Managed marketing operations | Ongoing content approval, publishing, reporting on the client's behalf: `{{managed_scope}}` | Monthly retainer `{{managed_fee}}` | Publishing and reporting (Later); client-authorised approvals (D-013) |
| Premium integrations or usage packs | Additional connected tools or runs | Add-on `{{addon_fee}}` | Billing (Next) |

Managed services that act for a client must still follow the approval model: the client either approves
items or explicitly authorises the service to approve on their behalf (D-013).

## Related documents

- [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md) · [BUSINESS_METHODOLOGY.md](BUSINESS_METHODOLOGY.md) ·
  [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) · [MVP_SCOPE.md](MVP_SCOPE.md) · [USER_JOURNEYS.md](USER_JOURNEYS.md)
- [SYSTEM_ARCHITECTURE.md](../architecture/SYSTEM_ARCHITECTURE.md) · [INTEGRATIONS.md](../architecture/INTEGRATIONS.md)
- [BRAND_BIBLE.md](../brand/BRAND_BIBLE.md) · [VOICE_AND_MESSAGING.md](../brand/VOICE_AND_MESSAGING.md)
- [DECISION_LOG.md](../decisions/DECISION_LOG.md) · [OPEN_QUESTIONS.md](../decisions/OPEN_QUESTIONS.md)

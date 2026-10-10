# Braventa — Product overview

This document explains what Braventa is, who it is for, which problems it solves, and how its
capability areas fit together. It is the entry point to the product specification: read it first,
then go to [BUSINESS_METHODOLOGY.md](BUSINESS_METHODOLOGY.md) for how the product thinks,
[PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) for what it must do,
[MVP_SCOPE.md](MVP_SCOPE.md) for what is in scope now, [USER_JOURNEYS.md](USER_JOURNEYS.md) for how
people use it, and [ROADMAP.md](ROADMAP.md) for sequencing and the business model.

**Status / last reviewed: 2026-10-10.** Derived from the founder brief
([FOUNDER_BRIEF_2026-10-10.md](../decisions/FOUNDER_BRIEF_2026-10-10.md)) and checked against the
code on `main` at commit `17ab57a` plus uncommitted working-tree changes.

---

## 1. What Braventa is

Braventa is a **business growth system** for service businesses. It connects a business's website,
marketing, CRM, and content into one system that shows the owner what to do next and helps them get
it done.

- **Tagline:** Run your growth as one system.
- **One-sentence description:** Braventa connects your website, marketing, CRM, and content into one
  growth system that shows you what to do next — and helps you get it done.
- **Category label:** Business growth system.

These lines are canonical (D-005 in [DECISION_LOG.md](../decisions/DECISION_LOG.md)); the full
messaging system lives in [VOICE_AND_MESSAGING.md](../brand/VOICE_AND_MESSAGING.md) and the brand
foundation in [BRAND_BIBLE.md](../brand/BRAND_BIBLE.md).

Braventa is delivered as subscription software, with optional implementation, onboarding, and managed
services (see [ROADMAP.md](ROADMAP.md#4-business-model-and-pricing-framework)). "GrowthOS" is the
internal codename of the repository and the original concept; it is never a public name (D-001).

### What exists today

Braventa is a **proof of concept**. One end-to-end flow works: a signed-in user enters a website
address; Braventa reads the site, builds a business profile, calculates a growth score, identifies
five opportunities, drafts a 30-day content plan, and writes the first five posts for the user to
approve or reject. Nothing is published anywhere. There are no connected tools (no CRM, no social
accounts, no analytics) yet. Details and file references are in [MVP_SCOPE.md](MVP_SCOPE.md#2-what-is-live-today).

## 2. Who it serves

### Primary audience (from the brief, §1.6)

- Small and medium-sized businesses, especially **service businesses** with repeatable lead
  generation and follow-up.
- Owner-operated companies without in-house marketing or operations teams.
- Businesses that already use a website, a CRM, email, or social platforms but whose tools do not
  work together.
- Businesses that need better systems but cannot justify hiring a team of specialists.

### Secondary audience (provisional)

- **Agencies and consultants** who serve several such businesses. The data model already supports
  one organization holding several business profiles, and organizations with several members, but
  the product has no team or client-switching features yet (see
  [USER_JOURNEYS.md](USER_JOURNEYS.md#3-agency-or-consultant-managing-several-businesses)).

### Candidate early verticals — hypotheses to validate

None of these is a confirmed target market. Braventa is not restricted to a vertical without evidence
or an explicit founder decision.

| Hypothesis | Why it might fit | What would validate it |
|---|---|---|
| Home and trade services | High dependence on local search and referrals; owners rarely have marketing staff | Paying customers retained beyond the first month |
| Solar and electrical contractors | Long, high-value sales cycles where follow-up discipline matters (CRM Intelligence fit) | CRM-connected pilots show recovered leads |
| Construction and related professional services | Project-based work with credibility-driven content needs | Approval rate of drafted content; repeat use |
| Marketing-dependent local businesses | Need consistent content and a converting website | Weekly return usage |
| Other service businesses with repeatable acquisition workflows | Same underlying problem pattern | Any of the above |

## 3. Problems Braventa solves

Braventa addresses operating problems, not "write me a post" requests. The brief (§1.5) lists them;
grouped by what Braventa does about each:

| Problem | Braventa's response | Where it stands |
|---|---|---|
| Owners do not know which marketing activities deserve priority | A growth assessment with ranked opportunities, impact and effort | Live (website-based) |
| Content takes time and lacks a strategy | A content plan tied to opportunities, then drafts in the business's voice | Live (30-day plan, first 5 drafts) |
| Websites attract visitors but do not convert | Website and conversion analysis with concrete first steps | Partial (inside the assessment; no dedicated report) |
| Business information is scattered | A structured business profile and knowledge base built once and reused | Partial (profile built from the website; crawled pages stored, not yet reused) |
| Marketing is disconnected from sales | CRM Intelligence linking activity to pipeline | Planned |
| Leads are lost through inconsistent follow-up | Follow-up recommendations and tasks from CRM data | Planned |
| CRMs decay into poorly maintained databases | CRM data-quality observations | Planned |
| Several uncoordinated vendors | One system and, optionally, managed services on top | Planned (services not yet offered) |
| Reporting says what happened, not what to do next | Recommendations attached to every summary | Planned |
| AI tools produce disconnected outputs | Outputs grounded in one shared business profile, approved by a human, executed through connected workflows | Partial (shared profile and approval exist; execution does not) |

## 4. The seven capability areas at a glance

Module names stay descriptive (D-010). Classification and status are defined in
[PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md).

| | Capability area | What it does | Classification | Status |
|---|---|---|---|---|
| A | **Business Intelligence** | Builds and maintains the structured profile of the business: services, customers, offers, voice, strengths, gaps | MVP | Partial |
| B | **Marketing Strategy** | Growth assessment, opportunities, priorities, content strategy, action plans | MVP | Partial |
| C | **Content Studio** | Content calendars, drafts in brand voice, quality checks, approval | MVP (social drafts and approval); rest Next phase | Partial |
| D | **Website Intelligence** | Website, SEO, content-quality, and conversion analysis with a prioritised improvement plan | MVP (inside the assessment); dedicated report Next phase | Partial |
| E | **CRM Intelligence** | Connects to the CRM (HubSpot first) for pipeline summaries, data quality, and follow-up recommendations | Next phase | Not started |
| F | **Automation** | Workflow templates, triggers, schedules, approval steps, execution logs, retries | Next phase / Future vision | Not started |
| G | **Analytics and Optimization** | Activity and workflow reporting, AI usage and cost, data-based recommendations | Next phase | Not started (some data captured, no UI) |

## 5. How the modules map onto the Growth Loop

The Braventa Growth Loop (D-004) is the methodology behind the modules. It has three stages and nine
steps; full detail in [BUSINESS_METHODOLOGY.md](BUSINESS_METHODOLOGY.md).

| Stage | Steps | Primary modules | Supporting modules |
|---|---|---|---|
| **Understand** | 1 Understand the business · 2 Identify opportunities and bottlenecks · 3 Set priorities and objectives | A Business Intelligence, B Marketing Strategy | D Website Intelligence, E CRM Intelligence |
| **Act** | 4 Build the action plan · 5 Create the assets · 6 Execute through connected workflows | B Marketing Strategy, C Content Studio, F Automation | D, E (recommendations become tasks) |
| **Improve** | 7 Measure results · 8 Learn from outcomes · 9 Improve the strategy and workflows | G Analytics and Optimization | All modules receive the learnings |

Today only **Understand** (from the website alone) and the first half of **Act** (plan, draft, approve)
exist. **Execute** and the whole **Improve** stage are planned.

## 6. What Braventa is not

Per the brief (§1.7). These are positioning boundaries, and also guardrails for feature requests.

- **Not an AI content generator.** Content is one output of a strategy grounded in the business
  profile, not the product.
- **Not a social media scheduler.** Braventa may eventually publish through connected tools, but
  scheduling is a means, not the category.
- **Not a CRM replacement.** Braventa makes the customer's existing CRM (HubSpot first) work harder;
  it does not store the system of record for their contacts and deals.
- **Not a website builder.** It analyses and recommends website changes; it does not host sites.
- **Not an automation agency.** Services may be sold on top, but the product is the system.
- **Not a chatbot with access to business information.** Answers and drafts are grounded in a
  structured profile and lead to actions and approvals.
- **Not fully autonomous.** Human approval is the default before anything is published or sent
  (D-013). Braventa never promises guaranteed revenue, rankings, or leads.

## Related documents

- [BUSINESS_METHODOLOGY.md](BUSINESS_METHODOLOGY.md) · [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) ·
  [MVP_SCOPE.md](MVP_SCOPE.md) · [USER_JOURNEYS.md](USER_JOURNEYS.md) · [ROADMAP.md](ROADMAP.md)
- [SYSTEM_ARCHITECTURE.md](../architecture/SYSTEM_ARCHITECTURE.md) · [INTEGRATIONS.md](../architecture/INTEGRATIONS.md)
- [DECISION_LOG.md](../decisions/DECISION_LOG.md) · [OPEN_QUESTIONS.md](../decisions/OPEN_QUESTIONS.md)

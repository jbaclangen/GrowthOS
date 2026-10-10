> **Status:** Founder-provided **strategic planning context**, received 2026-10-10 and added to the repo
> unchanged below this note. It is *not* a founder decision and *not* an approved specification: per its
> own §16 it ranks **below current verified implementation and above unapproved ideas** in the
> source-of-truth hierarchy (see [`/CLAUDE.md`](../../CLAUDE.md)). Where it differs from approved docs,
> the comparison and open decisions are in [`IMPLEMENTATION_ASSESSMENT_2026-10-10.md`](IMPLEMENTATION_ASSESSMENT_2026-10-10.md)
> and decision D-019. Do not edit the text below; record changes in [`DECISION_LOG.md`](../decisions/DECISION_LOG.md).

# GrowthOS --- Product Vision & Planning Context

**Purpose:** Give Claude Code durable context about the original
GrowthOS concept, the product direction, ideas discussed so far, and the
intended business outcome. Read this before major product, architecture,
UX, or roadmap decisions.

**Status:** Planning context, not a requirement to build every idea
immediately.

**Brand context:** The current master-brand direction is **Braventa** at
**braventa.io**. **GrowthOS** is the original working concept and
methodology behind the product. Do not rename the app or change existing
implementation branding automatically.

------------------------------------------------------------------------

## 1. Why This Document Exists

The app is already under development. This document is meant to give
Claude the strategic context behind the project---not to restart the
project or replace working decisions.

When starting work: 1. Inspect the repository and understand what
already exists. 2. Compare the current implementation with this vision.
3. Preserve working code and approved decisions. 4. Separate implemented
functionality, approved plans, and exploratory ideas. 5. Propose major
architectural, scope, or branding changes before making them. 6.
Document decisions and verify changes.

Treat this file as strategic context, not permission to build every idea
listed here.

## 2. The Original Product Idea

GrowthOS began as an idea for a subscription-based app that packages
digital marketing, CRM, AI automation, web presence, content production,
and business-growth services into a coherent system for business owners.

The central idea is to help a business understand what it needs, decide
what to do next, and use AI plus connected tools to carry out repetitive
or complex work. Instead of forcing owners to buy disconnected tools,
learn every platform, or coordinate multiple specialists, the product
should bring useful workflows and intelligence into one guided
experience.

The product should combine: - A guided understanding of the business. -
AI-assisted diagnosis and prioritization. - Practical plans and
recommendations. - Creation of useful marketing and operational
assets. - Workflows that execute through integrations and automation. -
Measurement of results and ongoing improvement. - A subscription model
that makes capabilities accessible and repeatable.

The ambition is more than a generic chatbot or a collection of AI
writing tools. It should become a practical **business growth operating
layer**: it understands the business context, helps choose the right
work, coordinates tools and AI, and makes progress visible.

## 3. The Problems It Should Solve

Small and midsize businesses often struggle with: - Disconnected
website, CRM, advertising, social media, email, content, and reporting
tools. - Inconsistent marketing because owners and small teams are busy
running the business. - Inconsistent lead follow-up, messy CRM data, and
missed opportunities. - Uncertainty about what to prioritize and whether
marketing is working. - Content and campaign production that takes too
much time. - Expensive agency services or DIY software that is difficult
to set up and maintain. - Piecemeal, fragile automations that are
difficult to understand. - Reports that show activity without clearly
explaining what to do next. - No simple view of the work needed to grow
the business.

GrowthOS/Braventa should help owners move from **"I know I need to grow,
but I don't know what to do next"** to **"I have a prioritized plan, the
right tools are connected, the work is moving, and I can see what is
improving."**

Do not promise guaranteed revenue, guaranteed leads, fully autonomous
business management, or unsubstantiated outcomes.

## 4. Intended Audience

The initial audience is expected to include: - Small and midsize
businesses. - Owner-operated businesses and lean teams. - Service
businesses that need lead generation, follow-up, content, and a strong
web presence. - Businesses that cannot justify a large internal
marketing or operations team. - Businesses that already use software but
struggle to connect it into a repeatable process.

Potential early verticals include home and trade services, solar and
electrical businesses, construction, and professional services. These
are candidate segments, not validated or exclusive markets.

Design for non-technical owners. Lead with outcomes rather than model
names and technical jargon. Ask for information progressively, explain
what is automated versus what needs approval, and never assume customers
have a dedicated marketing operations team.

## 5. Product Positioning

**Working positioning statement:** An AI-powered business growth system
that helps small businesses understand their priorities, improve
marketing and operations, and connect repeatable work across their
existing tools.

### What it is

-   A guided system for business growth and operational improvement.
-   A context-aware AI workspace using the business profile and
    connected data.
-   Modular capabilities that can be enabled over time.
-   A coordination layer for strategy, content, websites, CRM,
    analytics, and automation.
-   A subscription product that may be complemented by paid onboarding,
    implementation, or managed services.

### What it is not

-   Merely a chatbot or AI content generator.
-   Necessarily a replacement for HubSpot or another CRM.
-   An unrestricted autonomous agent.
-   A promise that every integration or feature is available on day one.
-   A reason to rebuild working infrastructure without a clear benefit.

## 6. The GrowthOS Methodology

The original concept follows a continuous improvement loop:

1.  **Understand** --- Learn the business, audience, offer, goals,
    resources, current tools, and constraints.
2.  **Diagnose** --- Identify bottlenecks, missed opportunities, gaps,
    and friction.
3.  **Prioritize** --- Rank actions by impact, effort, urgency,
    confidence, and available resources.
4.  **Plan** --- Turn priorities into a roadmap, campaigns, tasks, and
    workflows.
5.  **Create** --- Prepare content briefs, copy, landing-page
    recommendations, email sequences, campaign plans, and documentation.
6.  **Execute** --- Complete work in the app or through approved
    integrations and automation.
7.  **Measure** --- Track activity, completion, performance, usage, and
    outcomes where reliable data exists.
8.  **Learn** --- Compare results with intended outcomes and identify
    what worked.
9.  **Optimize** --- Adjust recommendations and workflows using current
    evidence and business context.

Make this loop visible to users. Do not simply produce AI ideas and
leave the owner to figure out implementation.

## 7. Intended User Journey

1.  The owner signs up and creates a business workspace.
2.  The app asks guided questions about the company, products/services,
    target audience, geography, goals, challenges, and current tools.
3.  The owner can provide a website URL and connect supported platforms.
4.  The app creates an editable business profile and baseline
    assessment, distinguishing confirmed facts from AI inferences.
5.  The app presents a prioritized set of opportunities and explains why
    each matters.
6.  The owner selects a goal or recommended action.
7.  The app creates a practical plan and relevant assets.
8.  The owner reviews and approves actions that affect external systems.
9.  Supported workflows execute through app features, integrations, or
    n8n.
10. The owner sees task status, results, usage, relevant costs, and next
    steps.
11. The profile and recommendations improve as verified information
    becomes available.

The app should feel like a guided workspace, not a dashboard full of
disconnected widgets. The next best action should be easy to understand.

## 8. Candidate Capability Areas

These are capabilities from the original vision, **not all MVP
requirements**. Maintain a roadmap marking each item **Current**,
**MVP**, **Next**, **Later**, or **Exploratory**.

### 8.1 Business Profile and Intelligence

Maintain shared business context used across the product: - Company
overview, industry, location/service area, and size. -
Products/services, offers, differentiators, and pricing context when
supplied. - Target customers, buyer problems, and customer journey. -
Goals, constraints, budget, capacity, and priorities. - Website, social
profiles, CRM, analytics, and connected tools. - Brand voice, visual
identity, approved claims, and content preferences. - Current marketing
activities and known performance data.

The user must be able to inspect and correct the profile. Do not
silently present AI inferences as confirmed facts.

### 8.2 Website Intelligence and Audit

Potential features: - Review a public website's positioning, offers,
structure, calls to action, and conversion journey. - Identify
observable UX, messaging, SEO, accessibility, and technical issues. -
Suggest prioritized improvements with rationale and estimated effort. -
Turn approved recommendations into tasks, briefs, or implementation
instructions. - Later, support selected CMS integrations and controlled
website changes.

Do not claim a full technical audit if only public pages were inspected.
Distinguish observations, assumptions, and recommendations.

### 8.3 Marketing Strategy and Planning

-   Clarify goals, audience, positioning, and offers.
-   Create prioritized growth plans and campaign roadmaps.
-   Recommend channels based on budget, audience, business type, and
    capacity.
-   Translate strategy into tasks, owners, deadlines, and deliverables.
-   Explain the rationale and measurement plan for recommendations.

### 8.4 Content Studio

-   Content pillars and topic planning.
-   Editorial and campaign calendars.
-   Social posts, short-video concepts/scripts, emails, landing pages,
    blogs, and ad concepts.
-   Brand-aware prompts and reusable templates.
-   Repurposing across channels.
-   Approval states and asset history.
-   Later: publish or schedule through integrations after authorization.

Generated content should use approved brand voice and business facts.
Support review and editing rather than assuming every draft is ready to
publish.

### 8.5 CRM Intelligence

HubSpot is an important initial integration candidate because the
founder has hands-on experience with HubSpot administration, workflows,
and CRM engineering.

Potential features: - Review CRM structure and data quality. - Identify
missing fields, inconsistent records, lifecycle issues, and follow-up
gaps when the data supports the finding. - Explain workflows and
recommend improvements. - Design lead routing, follow-up, nurture, and
reporting processes. - Generate implementation plans and
documentation. - Later, execute approved changes through scoped API
access.

Generally **augment and connect to the customer's CRM rather than
replace it**. Prefer read-only analysis before enabling write actions.
Respect permissions and subscription entitlements.

### 8.6 Automation and Workflow Intelligence

n8n is part of the intended orchestration approach.

Potential features: - Identify repetitive tasks suitable for
automation. - Explain workflow logic in plain language. - Trigger
approved workflows and display status. - Handle retries, failures, and
useful error messages. - Maintain execution logs and troubleshooting
context. - Document workflows and required integrations. - Later, offer
reusable workflow templates.

Protect credentials and private workflow data. Use confirmation and
safeguards for consequential actions.

### 8.7 Analytics and Optimization

-   Present supported metrics in a simple business-facing view.
-   Track planned versus completed work.
-   Report content and campaign performance when platform data is
    connected.
-   Explain trends with appropriate uncertainty.
-   Link recommendations to goals and metrics.
-   Help decide what to continue, change, or stop.

Do not imply causation from correlation or fabricate missing metrics.
Label data source, date range, freshness, and gaps where useful.

### 8.8 AI Business Assistant

The assistant should use the current workspace's business profile,
permissions, connected systems, and approved documentation.

It should answer business questions, recommend next actions, help create
assets and plans, use authorized tools, request confirmation for
high-impact actions, and accurately report what it did or could not do.
It must never pretend to have accessed systems or completed work that it
did not.

## 9. Subscription and Services Model

The discussed model is a **subscription software product**, potentially
complemented by optional onboarding, implementation, or managed
services.

A possible journey: 1. Discover through content, referrals,
partnerships, or the marketing site. 2. Understand the value and choose
a plan. 3. Sign up and create a workspace. 4. Complete guided
onboarding. 5. Receive an initial assessment and prioritized plan. 6.
Use included capabilities and usage allowances. 7. Upgrade for more
capabilities, connected systems, automation, usage, or support. 8.
Optionally purchase implementation help.

Pricing, tiers, entitlements, trial length, billing provider, and
packaging are not yet settled. Do not invent approved prices or encode
rigid assumptions without a decision.

Potential packaging dimensions: - Workspaces/businesses and number of
users. - Modules and integrations. - AI usage limits or credits. -
Automation execution limits. - Data history and reporting depth. -
Support and implementation services.

Track AI usage and cost per organization/workspace to manage margins and
set sustainable limits. Make usage limits understandable and fair.

## 10. Technical Direction Discussed

These are previously discussed directions to verify against the actual
repository---not instructions to replace the current stack.

-   **Frontend:** Next.js and React were discussed as a likely
    foundation.
-   **Data/platform services:** Supabase for PostgreSQL, authentication,
    storage, row-level security, and potentially vector search.
-   **Orchestration:** n8n, initially on an Oracle Cloud free-tier VM,
    with the option to upgrade infrastructure as usage grows.
-   **AI routing:** OpenRouter was considered for multi-provider model
    access and cost management; Claude and other providers may be used
    for different task types.
-   **Hosting and business website:** Hostinger is part of the founder's
    current infrastructure.
-   **CRM integration:** HubSpot is an important candidate.
-   **Web ecosystem:** WordPress is relevant to the founder's
    implementation experience.
-   **Design/content tools:** Canva and other tools may support internal
    or customer workflows.

### Architecture principles

1.  Inspect and preserve the current implementation before changing
    frameworks or services.
2.  Separate frontend, business logic, AI orchestration, integrations,
    and persistence.
3.  Use organization/workspace-level tenancy and enforce access at
    database and API layers.
4.  Apply Supabase Row Level Security where appropriate; do not rely
    only on frontend checks.
5.  Keep secrets and integration credentials server-side.
6.  Use explicit schemas and structured outputs for important AI tasks.
7.  Track model, task type, usage, latency, errors, and estimated cost
    where feasible.
8.  Use the least expensive model that reliably handles the task;
    escalate only when needed.
9.  Make long-running automations observable and safely retryable.
10. Log useful failures without leaking sensitive data.
11. Keep external actions permissioned, auditable, and confirmable.
12. Build modularly; do not overengineer speculative features.

### AI task routing

Choose a model based on **cognitive complexity and risk**, not simply
the app or integration involved.

Previously discussed pattern: - **Small/fast model (e.g. Haiku-class):**
retrieval, extraction, classification, formatting, and routine
communication. - **Mid-tier model (e.g. Sonnet-class):** normal coding,
implementation, API work, structured analysis, and routine agent
tasks. - **High-reasoning model (e.g. Opus-class):** architecture,
difficult debugging, complex planning, and ambiguous high-impact
reasoning. - **Long-horizon/specialized model:** only when the task
genuinely benefits and the provider supports it.

Do not hard-code specific model version names. Keep routing
configurable, evaluate quality and cost, and provide fallbacks.

## 11. MVP Strategy

The first release should validate a narrow, valuable customer outcome
instead of attempting a complete business operating system at once.

Previously discussed MVP candidates: - Business profile/onboarding. -
Website intelligence or a basic website audit. - Contextual AI
assistant. - Content planning and generation. - Prioritized action
plan. - Basic task/recommendation tracking. - AI usage and cost
tracking. - Secure multi-tenant organization/workspace foundation.

HubSpot, deeper integrations, broader analytics, workflow execution,
subscription billing, and other modules should be sequenced according to
the current implementation, technical readiness, customer validation,
and commercial needs. Some may be needed earlier depending on the app's
actual state.

### Feature prioritization filter

For each feature, ask: - Does it solve a painful, common problem? - Can
the customer understand the value quickly? - Does it create a useful
result or next action? - Can it be delivered reliably with the current
stack? - Are ongoing AI and infrastructure costs sustainable? - Can
demand be validated before a broad build? - What is the smallest version
that proves value?

Prefer one complete, reliable workflow over many shallow modules.

## 12. UX Principles

-   **Clarity over complexity:** owners should not need to understand
    the technology.
-   **Outcome-led:** show the goal, recommendation, effort, and next
    action.
-   **Contextual:** use verified business information rather than
    repeatedly asking the same questions.
-   **Progressive disclosure:** show advanced settings when useful.
-   **Explainability:** explain why a recommendation was made and what
    evidence supports it.
-   **Human control:** make approvals and external side effects clear.
-   **Visible progress:** show status, next steps, completed work, and
    blockers.
-   **Trustworthy:** communicate uncertainty, limitations, usage, and
    costs honestly.
-   **Consistent:** use shared design tokens and reusable components
    across the app and brand.
-   **Accessible and responsive:** support keyboard access, readable
    contrast, and mobile use.

Avoid dashboards that only display numbers. Help the owner decide and
act.

## 13. GrowthOS and Braventa Naming Context

The original concept was called **GrowthOS**. The current brand
direction is **Braventa**, with **braventa.io** as the intended domain.

Until the founder decides otherwise: - Treat Braventa as the current
master brand. - Treat GrowthOS as the origin of the product concept and
operating methodology. - Do not assume GrowthOS must remain the
public-facing product name. - Do not rename UI labels, repositories,
database objects, packages, or deployed services just for consistency. -
If the app currently uses GrowthOS publicly, document that fact and
propose a controlled migration only when appropriate. - Record naming
and brand-architecture decisions in a decision log.

The brand should feel practical, capable, modern, trustworthy, and
focused on helping businesses grow---not like an abstract AI research
project.

## 14. Security, Privacy, and Trust

-   Enforce tenant isolation at every layer.
-   Never commit secrets to source control.
-   Use least-privilege integration scopes.
-   Scope queries to the correct organization.
-   Make connected accounts, permissions, and disconnect/revocation
    paths clear.
-   Confirm consequential external actions unless a specific safe policy
    has been approved.
-   Avoid sending sensitive customer data to AI providers unless
    necessary and permitted.
-   Keep audit trails for important actions.
-   Define retention and deletion behavior.
-   Never expose one customer's prompts, records, workflows, analytics,
    or assets to another customer.
-   Be clear about limitations and third-party dependencies.

## 15. Open Questions to Validate

These remain open rather than settled: - Which customer segment should
be the first niche? - What single high-value workflow should anchor the
first paid version? - What belongs in a free/trial experience, if any? -
What should subscription tiers and usage allowances be? - Which billing
provider and markets should be supported first? - Which integrations are
essential at launch? - How much should the product execute automatically
versus recommend and wait for approval? - What onboarding information is
necessary for useful results? - Which outcomes can be measured
reliably? - What is the simplest support and implementation model? -
What public product naming and brand architecture should be finalized?

Surface these questions when relevant, but do not block routine
implementation by repeatedly reopening settled decisions.

## 16. How Claude Code Should Work With This File

When starting work: 1. Read `CLAUDE.md` and linked project instructions.
2. Read this document and approved product, architecture, brand, and
decision documents. 3. Inspect routes, schemas, integrations, tests, and
recent changes before suggesting a rewrite. 4. Summarize what is
implemented versus planned. 5. Identify the smallest relevant task and
its dependencies. 6. Follow current code style and architecture unless
there is a concrete reason to change them. 7. Ask before major scope
changes, destructive migrations, public naming changes, new paid
infrastructure, or broad refactors. 8. Record approved decisions in the
appropriate document. 9. Verify changes with available tests, type
checks, linting, or manual checks. 10. Report what changed, what was
tested, what remains incomplete, and any risks.

### Source-of-truth hierarchy

When information conflicts, prefer: 1. Explicit, recent founder
instruction. 2. Approved current product or technical specification. 3.
Approved architecture and decision records. 4. Current verified
implementation and tests (for what exists today). 5. This planning
context. 6. Unapproved proposals, guesses, or future ideas.

If this document conflicts with the implementation, do not silently
overwrite code. Explain the conflict and recommend a controlled update
or migration.

## 17. Suggested Documentation Structure

Adapt this structure to the repository; do not create duplicates if
equivalent documents already exist.

``` text
CLAUDE.md
docs/
  product/
    product-vision.md
    product-requirements.md
    mvp-roadmap.md
    user-journeys.md
    open-questions.md
  architecture/
    system-overview.md
    data-model.md
    integrations.md
    security-and-tenancy.md
    ai-model-routing.md
  brand/
    brand-guidelines.md
    voice-and-messaging.md
    design-system.md
  decisions/
    README.md
    YYYY-MM-DD-decision-name.md
```

Keep `CLAUDE.md` concise and point to the right reference files. Avoid
copying the entire plan into every prompt or creating competing sources
of truth.

## 18. What Success Looks Like

The product is moving in the right direction when: - Owners understand
what it does and why it matters. - Onboarding builds useful, editable
business context. - The app identifies and explains relevant
priorities. - At least one end-to-end workflow produces a practical
customer result. - Recommendations lead to actions, not just AI text. -
Users know what is done, what needs approval, and what comes next. -
Integrations and AI actions are secure, observable, and permissioned. -
AI and infrastructure costs can be tracked and managed. - New modules
fit into a coherent system rather than becoming disconnected tools. -
Product decisions prioritize customer value over feature count.

------------------------------------------------------------------------

## Instruction to Claude

Use this file as strategic background for the existing project. **Do not
rebuild the app simply because this vision describes a broader future.**
First understand what is already built, map the current state to this
vision, and help the founder turn it into a realistic staged roadmap.
Preserve working decisions, distinguish facts from ideas, and make the
smallest reliable change that advances the product.

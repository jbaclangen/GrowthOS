# braventa.io website messaging

This document proposes the sitemap for the marketing site at braventa.io (D-011: marketing site on Hostinger, app at app.braventa.io) and provides copy foundations for each page, with full copy for the home page plus page titles and meta descriptions. Designers and developers building the site should use it with [`../brand/VISUAL_IDENTITY.md`](../brand/VISUAL_IDENTITY.md) for layout and type, [`../brand/VOICE_AND_MESSAGING.md`](../brand/VOICE_AND_MESSAGING.md) for voice and claim rules, and [`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md) to confirm every "Live" label before launch. Canonical lines are fixed by D-005 in [`../decisions/DECISION_LOG.md`](../decisions/DECISION_LOG.md).

**Status / last reviewed: 2026-10-11** · §0 is the current messaging (founder brief, D-035) and matches the built pages in `site/`. §2–§11 are the original 2026-10-10 copy foundations; where they differ from §0 or the built pages, §0 and the built pages win.

---

## 0. Phase 1 messaging (current, D-035)

### Positioning
- **Category label (D-005):** Business growth system. **Descriptor:** AI-assisted (never "AI-powered" as the lead claim).
- **What Braventa is:** an AI-assisted growth system that learns how a business works, helps uncover what's holding it
  back, and turns the owner's priorities into a practical plan, with drafted work the owner approves.
- **What it isn't:** a chatbot, a content generator, an audit tool, or an autonomous operator. The brief's "growth
  advisor" and "platform" wording is expressed as "growth system" to keep the category (VOICE_AND_MESSAGING §3).
- **Methodology:** the Growth Loop, nine steps in three stages — Understand (Understand · Diagnose · Prioritize), Act
  (Plan · Create · Execute), Improve (Measure · Learn · Optimize). Always shown with each step's status.

### Fixed lines
| Use | Line |
|---|---|
| Tagline (D-005) | Run your growth as one system. |
| Homepage headline (D-005) | Know what to do next. Then get it done. |
| Homepage supporting line | Braventa is an AI-assisted growth system that learns how your business works, helps uncover what's holding it back, and turns your priorities into a practical plan — with drafted work you review and approve. |
| Onboarding, one line | Braventa asks follow-up questions based on your goals and challenges, so your plan reflects your business — not a generic marketing checklist. |
| What's live (reference sentence) | `LIVE_TODAY` in `site/src/lib/site.ts` |

The D-005 one-liner ("connects your website, marketing, CRM, and content…") is not used in the hero while CRM
connections aren't live.

### Status labels
One vocabulary on the site, the pricing page and the app: **Live** (works today) · **Limited** (works today; the copy
names the gaps) · **Coming soon** (planned; not usable). A capability that depends on an external tool the owner must
connect is described as such in its copy. Badges come from `StatusBadge` in `site/src/components/ui.tsx` and
`FEATURES` in `web/src/lib/plans/tiers.ts`.

| Area | Status | Basis in code |
|---|---|---|
| Business Intelligence (profile, guided discovery) | Live | `web/src/lib/pipeline/website-intel.ts`, `web/src/lib/onboarding/*` |
| Marketing Strategy (growth score, diagnosis, one growth plan) | Live | `computeGrowthScore`, `diagnosisPrompt`, `web/src/lib/plan/priority.ts` |
| Content Studio (30-day plan, five drafts, approve/reject) | Live, gaps named (rest of plan stays as topics; no editing or publishing) | `website-intel.ts`, `setContentStatus` |
| Website Intelligence | Limited (up to 6 pages, mobile PageSpeed, crawl signals) | `web/src/lib/integrations/crawler.ts`, `google.ts` |
| CRM Intelligence, Automation, Analytics | Coming soon | nothing user-facing |
| Connect your AI assistant (MCP) — Claude Desktop and Claude Code | Live once the MCP PR merges; every plan during the trial, then any subscribed plan | MCP phase 1 (`/api/mcp`); claude.ai and ChatGPT connectors Coming soon |
| In-app AI assistant ("Ask Braventa" in the app header) | Live (D-043) once its migration is applied and the PR merges; every plan during the trial, then any subscribed plan | `/api/assistant`, `web/src/lib/assistant/*`; read-only |

**AI assistant connection copy rules:** say "connect your AI assistant" (not the "In-app AI assistant" feature in
`tiers.ts`, which is Ask Braventa, below). It fills in setup and discovery and reports status; the owner still confirms
the diagnosis and approves posts in the app; it can't publish. Keys are shown once, stored as a hash, show last use, and
can be revoked. After the trial, access pauses until the business subscribes; don't imply self-serve checkout.

**In-app assistant copy rules (D-043):** call it "Ask Braventa" or "the in-app assistant". It answers how Braventa
works and questions about the business's own report; it is read-only: it can't change the plan, confirm the
diagnosis, approve drafts, start analyses or contact anyone, and its answers can be wrong. 40 questions per business
a day. After the trial it pauses until the business subscribes. Questions go to the AI model with a summary of the
account; Braventa doesn't store the questions or answers. Don't call it a chat with your data or documents
(retrieval over documents is still Next phase, BI-8).

### Onboarding claims (verified against `web/src/app/onboarding/**`, `web/src/lib/onboarding/**`)
True today: website URL plus optional goal, service area and tools; pick pain points from nine areas or describe them
in your own words; the AI matches your words to catalog issues and shows the quote each match rests on; keep or drop
matches; choose first, second and third priority; up to four follow-up questions (two rounds of two) picked by AI from a
fixed question bank based on goal, priorities and earlier answers, each with a reason, all skippable; mark diagnosis
findings right or wrong with a note, which rebuilds the diagnosis and plan; confirm the plan; accept, dismiss or mark
actions done. Not true: a free-form chat, AI-written questions, reordering plan items (Q-027).

### Growth score (verified against `computeGrowthScore` and the report UI)
- 0–100. Braventa's AI assessment (content clarity 25%, conversion readiness 25%, online presence 15%) and Google
  PageSpeed mobile scores (performance 15%, SEO 12%, accessibility 4%, best practices 4%). Public copy says "about
  two-thirds / about a third".
- Without PageSpeed the score is the assessment alone, and the report says PageSpeed wasn't available.
- It reflects the website (up to six pages) and the owner's answers. Never say it measures overall business health or
  predicts revenue, leads or rankings.

### Operational claims
- Analysis time: say "usually a few minutes". The 3–4 minute figure is from `AI_MODE=free` runs; no paid-mode timing yet.
- No "real-time", "continuous monitoring" or "auto-updates": analyses run when the owner starts or re-runs them.
- Models: the AI page names the paid lineup and its backups (Q-035).

## 1. Conventions used in this document

- `EYEBROW` — short uppercase label above a heading (styling per [`../brand/VISUAL_IDENTITY.md`](../brand/VISUAL_IDENTITY.md)).
- `DISPLAY` — short uppercase section head in Quicksand headings (rounded geometric; marketing surfaces only).
- **Live** / **Limited** / **Coming soon** — module and feature status badges (D-035; this document's older sections say "Coming next" and "Live in part"). Every badge must match [`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md) on the day the page ships.
- `[Proof point — add when available]` — placeholder. Never replace with invented testimonials, logos, or statistics.
- `(use once {{feature}} ships)` — copy that must not be published until that feature is live.
- All CTAs that start the product link to `https://app.braventa.io/login`.

## 2. Sitemap

> **Superseded 2026-10-11:** the full page list, domains (D-031) and priorities are in [SITEMAP.md](SITEMAP.md). Pricing now shows Basic / Pro / Premium and the 14-day trial (D-030) with Coming soon labels. The home and How it works copy below still describes "five opportunities"; rewrite it to the diagnosis and growth plan (ON-7/ON-8) before publishing.

| Page | Path | Purpose | Priority |
|---|---|---|---|
| Home | `/` | Explain the category, the problem, the Growth Loop, and start an assessment | Launch |
| How it works | `/how-it-works` | Walk through the Growth Loop and what happens in an analysis | Launch |
| Product | `/product` | Module overview with honest status; anchors per module | Launch |
| For service businesses | `/service-businesses` | Audience page with vertical examples (hypotheses, not restrictions) | Launch |
| Pricing | `/pricing` | Placeholder: early access + book a call. No prices (D-012) | Launch (placeholder) |
| About | `/about` | Brand story, mission, values, who is building it | Launch |
| Contact / Book a call | `/contact` | Booking link and contact form | Launch |
| Trust and data | `/trust` | Approval-by-default, data handling, AI use | Launch (recommended) |
| Privacy policy, Terms | `/privacy`, `/terms` | Legal pages (require legal review) | Before collecting any data |
| Docs | support.braventa.io (D-031) | Help center, capabilities, developer docs, legal | Launch (minimal) |
| Changelog | `/changelog` | Release notes | Later |

Navigation: How it works · Product · For service businesses · Pricing · About — right side: `Sign in` (text link) and `Get your growth assessment` (primary button).

## 3. Home page

**Page title:** Braventa — Run your growth as one system
**Meta description (≤155 chars):** Braventa is a business growth system for service businesses. Know what to do next, then get it done — with you approving everything.

### 3.1 Hero
- `EYEBROW`: BUSINESS GROWTH SYSTEM
- **Headline (D-005):** Know what to do next. Then get it done.
- **Supporting statement:** Braventa reads your website, builds a profile of your business, and tells you the five opportunities worth your time — then plans your next 30 days and drafts the first posts for your approval.
- **Primary CTA:** Get your growth assessment
- **Secondary CTA:** See how it works
- **Microcopy under CTAs:** About 4 minutes. Nothing is published without your approval.

### 3.2 Problem section
- `DISPLAY`: TOO MANY TOOLS. NO SYSTEM.
- **Heading:** Your growth runs on disconnected pieces.
- **Body:** A website from one vendor. Social posts from another. A CRM nobody keeps up to date. An SEO report nobody acted on. Each piece does its job, but nobody owns the whole — so you end up as the project manager, deciding what matters at the end of a long day.
- **Three problem cards:**
  1. **No clear priorities.** You know marketing matters. You don't know which task is worth this week.
  2. **Content without a plan.** Posts happen when someone has a spare hour, about whatever comes to mind.
  3. **Reports that look backwards.** They tell you what happened. They don't tell you what to do next.

### 3.3 Growth Loop section
- `DISPLAY`: UNDERSTAND. ACT. IMPROVE.
- `EYEBROW`: THE BRAVENTA GROWTH LOOP
- **Heading:** One loop, from insight to action.
- **Body:** Braventa organizes growth into three stages and keeps them connected, so what you learn shapes what you do next.

| Stage | Copy | Status badge |
|---|---|---|
| **Understand** | Braventa learns your services, customers, locations, and brand voice, then scores where you stand and finds the opportunities that matter most. | Live |
| **Act** | A 30-day plan with a clear goal and content pillars, and drafted posts in your voice for you to approve. Carrying approved work into your tools is coming next. | Live in part |
| **Improve** | Measure what worked, learn from it, and adjust the plan. | Coming next |

### 3.4 Module section
- `DISPLAY`: ONE SYSTEM. EVERY STEP.
- **Heading:** Built as modules that share one picture of your business.
- **Intro:** Every module reads from the same business profile, so nothing starts from a blank page.

| Module | One-line copy | Badge |
|---|---|---|
| Business Intelligence | A structured profile of your business, built from your website. | Live |
| Marketing Strategy | A growth score, your top five opportunities, and a 30-day plan. | Live |
| Content Studio | Drafted social posts in your brand voice, ready for your approval. | Live |
| Website Intelligence | Speed, SEO basics, and conversion gaps from your own site. | Live in part |
| CRM Intelligence | Pipeline and follow-up insight, starting with HubSpot. | Coming next |
| Automation | Approved workflows that carry the plan into your tools. | Coming next |
| Analytics | What you did, what it achieved, and what to do next. | Coming next |

Design note: "Coming next" badges must be visually quieter than "Live" (outline vs filled) and never use the Volt signal color.

### 3.5 How it works (3 steps)
- `EYEBROW`: HOW IT WORKS
- **Heading:** From website to plan in one sitting.

1. **Enter your website.** Add your URL. Braventa reads your pages and checks them with Google PageSpeed.
2. **See what matters.** Get a business profile, a growth score with sub-scores, and five ranked opportunities — each with a first step.
3. **Approve the work.** Review a 30-day content plan and five drafted posts. Approve or reject each one. Nothing goes out without you.

CTA: Get your growth assessment

### 3.6 Trust and safety
- `DISPLAY`: YOU APPROVE. ALWAYS.
- **Heading:** You stay in control of everything that goes out.
- **Three points:**
  1. **Approval by default.** Every draft is marked "Needs approval". Braventa does not publish or send anything on your behalf.
  2. **Your data, kept separate.** Each organization's data is isolated from every other. Secret keys never leave our servers. AI models only receive what a task needs.
  3. **Clear about AI.** We label what is measured (Google PageSpeed) and what is assessed. Recommendations come with a reason, so you can judge them.
- **Link:** Read how we handle your data → `/trust`

### 3.7 Proof section (placeholder)
- `EYEBROW`: RESULTS
- **Heading:** [Proof section heading — add when customer results exist]
- `[Proof point — add when available]` × 3 (customer quote with name, role, business, and permission on file)
- `[Proof point — add when available]` (measured outcome, with source and date)
- **Until proof exists, use this instead:** "We're working with a small group of service businesses during early access. Want to be one of them?" + CTA: Book a call
- Rule: no fake logos, testimonials, ratings, or user counts. See [`CAMPAIGN_GUIDELINES.md` §6](CAMPAIGN_GUIDELINES.md#6-claims-and-compliance-checklist).

### 3.8 Final CTA
- `DISPLAY`: RUN YOUR GROWTH AS ONE SYSTEM.
- **Body:** Start with your website. In about four minutes you'll know what to do next.
- **Primary CTA:** Get your growth assessment
- **Secondary CTA:** Book a call

### 3.9 Footer
Tagline: Run your growth as one system. · Links: Product, How it works, Pricing, About, Contact, Trust, Privacy, Terms · © {{year}} Braventa · {{company_address}}

## 4. How it works

**Page title:** How Braventa works — the Growth Loop
**Meta description:** See how Braventa turns your website into a business profile, a growth score, five priorities, a 30-day plan, and drafted content you approve.

Copy foundations:
- `EYEBROW`: HOW IT WORKS · **Heading:** Understand. Act. Improve.
- Section per Growth Loop stage, each listing its three steps (D-004) and status.
- "What happens in an analysis" timeline using the app's step names: Reading the website → Understanding the business → Scoring growth and finding opportunities → Building the 30-day plan → Drafting your first posts. Note: about 3–4 minutes.
- "What you get" checklist: business profile; growth score (0–100) with content clarity, conversion readiness, online presence, plus Google mobile speed, SEO basics, accessibility; top 5 opportunities with impact, effort, and first step; 30-day plan (goal, audience, pillars, channels); 5 drafted posts with image ideas.
- "What Braventa doesn't do (yet)": publish, send email, connect to your CRM, run automations, report on results — with "coming next" where planned.
- CTA: Get your growth assessment.

## 5. Product

**Page title:** Product — Braventa modules
**Meta description:** Business Intelligence, Marketing Strategy, Content Studio, Website Intelligence, and what's coming next: CRM Intelligence, Automation, Analytics.

Copy foundations:
- **Heading:** Seven modules. One picture of your business.
- One section per module (D-010 names), each with: one-line description, "What it does today" (or "Planned"), "Why it matters", status badge. Use the module table in §3.4; expand with detail from [`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md).
- CRM Intelligence section: "We're building HubSpot support first. Braventa is designed to make your CRM more useful, not replace it." (No live claims.)
- Automation section: "Workflows will include approval steps, logs, and retries. You'll decide what runs." (use once Automation ships — for anything beyond this description)

## 6. For service businesses

**Page title:** Braventa for service businesses
**Meta description:** For owner-led service businesses that need a clear growth plan without a full marketing team. See what to do next and get help doing it.

Copy foundations:
- `EYEBROW`: FOR SERVICE BUSINESSES · **Heading:** Built for businesses that win work through enquiries.
- Who it's for: owner-operated, small teams, repeatable lead and follow-up processes, already using a website and some software.
- Example businesses (illustrations, not limits): home and trade services, solar and electrical contractors, construction and professional services, local businesses that depend on marketing.
- Pain → answer pairs, e.g. "You're on the tools all day → Braventa gives you a five-item shortlist and drafts the posts."
- Avoid implying vertical-specific features that don't exist.
- CTA: Get your growth assessment.

## 7. Pricing (placeholder)

**Page title:** Pricing — Braventa
**Meta description:** Braventa is in early access. Book a call to talk about your business and how Braventa can help.

Copy foundations:
- **Heading:** Pricing is coming soon.
- **Body:** Braventa is in early access while we work closely with a small group of service businesses. Book a call and we'll walk you through the product and what early access includes.
- CTA: Book a call. No prices, tiers, or entitlements until a founder decision (D-012). The pricing framework lives in product docs, not on this page.

## 8. About

**Page title:** About Braventa
**Meta description:** Braventa helps service businesses run growth as one connected system: understand the business, act on what matters, and improve.

Copy foundations:
- Brand story (from [`../brand/BRAND_POSITIONING.md` §9](../brand/BRAND_POSITIONING.md#9-brand-story)).
- Mission and vision.
- Values table (five values with one-line behaviors).
- Who's building it: `[Founder bio — add]`.
- No investor, customer, or team-size claims unless verified.

## 9. Contact / Book a call

**Page title:** Contact Braventa — book a call
**Meta description:** Book a 20-minute walkthrough of Braventa or send us a question about your business.

Copy foundations:
- **Heading:** Talk to us.
- **Body:** Book a 20-minute walkthrough, or send a message and we'll reply within {{response_time}}.
- Form fields: name, work email, business name, website (optional), message. Separate, unticked checkbox: "Send me occasional product updates and growth tips. Unsubscribe anytime." (D-014 — never pre-ticked, never required.)
- Confirmation: "Thanks, {{first_name}}. We've got your message and will reply within {{response_time}}."

## 10. Trust and data

**Page title:** Trust and data — Braventa
**Meta description:** How Braventa keeps you in control: approval before anything is published, isolated customer data, and clear labelling of AI output.

Copy foundations: approval by default (D-013); organization-level data isolation; server-side secrets; minimal data sent to AI models; monthly AI usage limits; what we store and how to request deletion (`[Confirm process — add when available]`). No certification claims (SOC 2, ISO, GDPR "compliant") unless verified by a qualified reviewer.

## 11. Docs (later)

**Page title:** Braventa docs
**Meta description:** Guides to getting started with Braventa, understanding your growth score, and approving content.

See [`COMMUNITY_GUIDELINES.md` §6](COMMUNITY_GUIDELINES.md#6-documentation-writing-guidelines) for doc structure.

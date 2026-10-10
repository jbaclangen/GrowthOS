# Braventa Brand Bible

The master reference for who Braventa is and how it shows up — in the product, on braventa.io, in email, in
docs, and in community. Read this first; it summarises every brand decision and links to the detailed
specification for each. Where this summary and a detailed document disagree, the detailed document wins
(and this one should be fixed).

Status / last reviewed: 2026-10-10 · Version 1.0 · Owner: founder.
Source of truth order: founder decisions → approved specs → architecture decisions → implementation → proposals
(see [`/CLAUDE.md`](../../CLAUDE.md)). Brand documentation is **not** legal clearance — no trademark search has
been performed (Q-014).

| Detail | Document |
|---|---|
| Positioning, audience, story, values | [`BRAND_POSITIONING.md`](BRAND_POSITIONING.md) |
| Voice, messaging hierarchy, objections, microcopy | [`VOICE_AND_MESSAGING.md`](VOICE_AND_MESSAGING.md) |
| Logo, colour, type, layout, imagery, motion, accessibility | [`VISUAL_IDENTITY.md`](VISUAL_IDENTITY.md) |
| Every asset file and its status | [`BRAND_ASSET_INVENTORY.md`](BRAND_ASSET_INVENTORY.md) |
| Tokens and components | [`design-system/`](../../design-system/DESIGN_TOKENS.md) |
| Website copy, email templates, campaigns, community | [`docs/marketing/`](../marketing/WEBSITE_MESSAGING.md) |
| What the product does today vs later | [`docs/product/MVP_SCOPE.md`](../product/MVP_SCOPE.md) |

---

## 1. Identity at a glance

| | |
|---|---|
| **Name** | Braventa (never "Braventa AI"; "GrowthOS" is the internal codename only — D-001, D-002) |
| **Domain** | braventa.io (marketing) · app.braventa.io (product) |
| **Category** | Business growth system |
| **Tagline** | Run your growth as one system. |
| **Homepage headline** | Know what to do next. Then get it done. |
| **One-liner** | Braventa connects your website, marketing, CRM, and content into one growth system that shows you what to do next — and helps you get it done. |
| **Positioning concept** (internal) | Turn disconnected business activities into one intelligent growth system. |
| **Business model** | Subscription software plus optional implementation, onboarding, and managed services. Pricing not decided (D-012). |
| **Symbol** | The Waypoint — a "B" of two forward chevrons whose path leads to a detached node: the next action. |
| **Colours** | Ink `#0B0C10` · Paper `#F4F4F1` · Cobalt `#2340F5` (action) · Volt `#D4F53C` (signal) |
| **Type** | Quicksand (headings, logo) · Comfortaa (everything else) — D-015 |

## 2. Why Braventa exists

Small and growing service businesses run on disconnected tools, manual follow-up, inconsistent marketing,
half-maintained CRMs, and reports that explain the past without saying what to do next. They pay separate
vendors for the website, content, SEO, ads, automation, and CRM — and nobody owns the whole result. AI tools
make more disconnected output, not a working process.

Braventa connects those pieces into one system that understands the business, decides what matters most,
produces the work, and — as integrations ship — executes and measures it.

- **Vision:** help businesses operate more intelligently by connecting marketing, customer relationships,
  digital presence, data, and repetitive operations into one coherent system.
- **Mission:** make sophisticated marketing systems, CRM operations, business intelligence, and automation
  accessible to businesses that can't afford large internal teams.
- **Promise:** understand what needs to happen → turn it into a plan → execute repetitive work through
  AI-assisted workflows → improve with data and feedback.

## 3. Who it's for
Owner-operated and small-to-medium **service businesses** with repeatable lead generation and follow-up, who
already use a website, CRM, email, or social, and need better systems without hiring a team of specialists.
Candidate early verticals — home and trade services, solar and electrical, construction and professional
services, marketing-dependent local businesses — are **hypotheses to validate**, not restrictions.
Detail: [`BRAND_POSITIONING.md` §5](BRAND_POSITIONING.md#5-target-audience).

## 4. What Braventa is — and isn't
Braventa is **an intelligent business growth system that connects capabilities into coordinated workflows**.
It is *not* merely an AI content generator, a social scheduler, a CRM replacement (it works *with* HubSpot and
other tools), a website builder, an automation agency, or a chatbot over business documents.

**Differentiation** is the combination: business context + strategic prioritisation + AI-assisted production +
connected tools + workflow execution + measurement + continuous improvement. Today the MVP delivers the first
three (see §8); say so honestly.

## 5. The Braventa Growth Loop
The methodology behind the product (D-004): three stages, nine steps.

| Understand | Act | Improve |
|---|---|---|
| 1 Understand the business | 4 Build the action plan | 7 Measure results |
| 2 Identify opportunities and bottlenecks | 5 Create the assets | 8 Learn from outcomes |
| 3 Set priorities and objectives | 6 Execute through connected workflows | 9 Improve strategy and workflows |

It is a methodology, not a promise of autonomy. Full treatment: [`BUSINESS_METHODOLOGY.md`](../product/BUSINESS_METHODOLOGY.md).

## 6. Personality and values

**Personality** — intelligent not pretentious · capable not intimidating · modern not trend-chasing · premium
not inaccessible · strategic not complicated · practical not generic · trustworthy not salesy · direct not cold.

**Values** (proposed): *Own the outcome* · *Context before content* · *Say what is true* · *The customer stays in
control* · *Simple on the surface, rigorous underneath*. Behaviours for each:
[`BRAND_POSITIONING.md` §10](BRAND_POSITIONING.md#10-mission-vision-values).

## 7. Voice
A knowledgeable growth and systems consultant explaining complex technology in clear business language:
**specific, calm, direct, honest about status.** Lead with the outcome, name the specific thing, explain the why,
keep the human in control. No hype words ("revolutionary", "effortless", "10x", "supercharge"), no guarantees,
no invented stats or testimonials, no excessive emoji. US English (D-016). Sentence case everywhere in the
product; short uppercase section heads only on marketing pages.

**Claim rule:** "Today Braventa…" for live features; "Coming next…" for planned ones; never imply that anything
is published or sent without approval. Full guide: [`VOICE_AND_MESSAGING.md`](VOICE_AND_MESSAGING.md).

## 8. What we can truthfully say today (MVP, 2026-10-10)
**Live:** sign up → enter a website → Braventa reads the site and Google PageSpeed → business profile (services,
customers, locations, brand voice, strengths, gaps, likely competitors) → growth score with sub-scores → top five
opportunities with a first step each → 30-day content plan → five drafted posts you approve or reject.
**Not live:** HubSpot or any CRM connection, publishing, email sending, automation execution, analytics, billing.
Always check [`MVP_SCOPE.md`](../product/MVP_SCOPE.md) before writing product claims.

## 9. Visual identity summary
- **Logo:** Waypoint symbol + lowercase Quicksand Bold wordmark. Primary (Ink + Cobalt node) on light;
  reversed (Paper + Volt node) on dark; mono black/white; app icon = Paper glyph on an Ink tile with a Volt node.
  Clear space two node diameters; minimum 20 px (lockup) / 16 px (symbol).
- **Colour:** Cobalt is the only action colour; Volt marks the single most important "next" thing and is never
  text on light; semantic green/amber/red/cobalt for status. Every text pair passes WCAG AA, enforced by the
  token build.
- **Type:** Quicksand headings, Comfortaa body (≥ 14 px; 16 px for reading).
- **Shape:** rounded geometry — 8 px controls, 12 px cards, round-capped strokes.
- **Imagery:** the graph motif (nodes, lines, dot grid, one Volt node), real product screenshots, real service
  businesses. No robots, brains, sparkle logos, or purple gradients.

Full specification: [`VISUAL_IDENTITY.md`](VISUAL_IDENTITY.md).

## 10. Product experience principles
1. Show what needs attention and what to do next — every screen ends in a clear action.
2. Keep business context one click away.
3. Explain every AI recommendation (why + first step) and show where facts came from.
4. Make status unmistakable: draft · needs approval · approved · rejected · running · failed · completed.
5. Show integration and execution status plainly; never imply a connection that doesn't exist.
6. Be transparent about usage, limits, and (later) subscription.
7. Errors say what happened and what to do next; no raw stack traces.
8. No vanity dashboards.
9. Keyboard-accessible, responsive, WCAG 2.2 AA.
10. Human approval by default (D-013).

## 11. Messaging toolkit
| Need | Where |
|---|---|
| Short / long descriptions, elevator pitch, pillars | [`VOICE_AND_MESSAGING.md` §7](VOICE_AND_MESSAGING.md#7-messaging-hierarchy) |
| Audience-specific value props | [`VOICE_AND_MESSAGING.md` §8](VOICE_AND_MESSAGING.md#8-audience-specific-value-propositions-and-voice-shifts) |
| Objection handling | [`VOICE_AND_MESSAGING.md` §9](VOICE_AND_MESSAGING.md#9-objection-handling) |
| CTAs, social bios, signatures | [`VOICE_AND_MESSAGING.md` §10–11](VOICE_AND_MESSAGING.md#10-calls-to-action) |
| Website copy | [`WEBSITE_MESSAGING.md`](../marketing/WEBSITE_MESSAGING.md) |
| Emails (transactional vs marketing, D-014) | [`EMAIL_TEMPLATES.md`](../marketing/EMAIL_TEMPLATES.md) |
| Campaigns, social posts, proposals | [`CAMPAIGN_GUIDELINES.md`](../marketing/CAMPAIGN_GUIDELINES.md) |
| Community and docs writing | [`COMMUNITY_GUIDELINES.md`](../marketing/COMMUNITY_GUIDELINES.md) |

## 12. Governance
- Brand changes are founder decisions; record them in [`DECISION_LOG.md`](../decisions/DECISION_LOG.md).
- Colour, type, and spacing values change only in `design-system/tokens.json`.
- Logo files change only by editing and re-running `design-system/scripts/build-brand-assets.mjs`.
- Unresolved items live in [`OPEN_QUESTIONS.md`](../decisions/OPEN_QUESTIONS.md).

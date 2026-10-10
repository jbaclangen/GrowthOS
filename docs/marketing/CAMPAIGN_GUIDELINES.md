# Braventa campaign guidelines

This document is the operating guide for planning and running Braventa marketing campaigns: a campaign brief template, channel rules, reusable social post templates, a sales presentation outline and proposal structure, a claims and compliance checklist, visual direction pointers, and measurement basics. Use it before writing any campaign, ad, social post, or sales deck. Voice, word lists, and claim rules come from [`../brand/VOICE_AND_MESSAGING.md`](../brand/VOICE_AND_MESSAGING.md); positioning from [`../brand/BRAND_POSITIONING.md`](../brand/BRAND_POSITIONING.md); visuals from [`../brand/VISUAL_IDENTITY.md`](../brand/VISUAL_IDENTITY.md); feature status from [`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md); binding decisions from [`../decisions/DECISION_LOG.md`](../decisions/DECISION_LOG.md).

**Status / last reviewed: 2026-10-10** · Provisional

---

## 1. Campaign brief template

Copy this block for every campaign. A campaign does not start without a completed brief.

```
CAMPAIGN NAME:
OWNER:                          DATES:
OBJECTIVE (one, measurable):    e.g. 40 completed growth assessments from LinkedIn in 30 days
AUDIENCE:                       role + business type + situation (see VOICE_AND_MESSAGING §8)
INSIGHT:                        the problem or belief we are speaking to, in their words
SINGLE-MINDED MESSAGE:          one sentence
MESSAGING PILLAR:               Know your business / Know what to do next / Get it done / Stay in control
PROOF (live features only):     which real feature backs the message
CTA:                            primary (one) + destination URL with UTM
CHANNELS:                       and why each one
ASSETS NEEDED:                  posts, images, landing page, emails
CONSENT CHECK:                  email audience = opted-in only? Y/N
CLAIMS CHECK:                   §6 checklist completed? Y/N   reviewer:
DEPENDENCIES:                   any feature that must ship first -> "(use once {{feature}} ships)"
MEASUREMENT:                    primary metric, secondary metrics, where tracked
BUDGET:                         (if paid)
```

## 2. Channel rules

| Channel | Role | Audience | Format and cadence | Rules |
|---|---|---|---|---|
| **LinkedIn** | Primary B2B channel; founder-led credibility | Owners, marketing managers, partners | Company page 2–3×/week; founder profile 2–4×/week. Text posts, documents/carousels, short video | Lead with an insight, not the product. One CTA. No engagement bait ("comment YES"). Max 3 hashtags. |
| **Facebook / Instagram** | Reach owner-operators where they already are; visual education | Owners of local service businesses | 2–3×/week. Carousels, single images, short reels | Plain language, big type, one idea per slide. Follow Meta's ad policies; no "before/after" result claims. |
| **X** | Build-in-public updates; product and tech community | Founders, builders, early adopters | 3–5×/week, threads for explainers | Concise, factual, no hype words. Never announce unreleased features as available. |
| **Email** | Nurture and retention | Opted-in contacts only (D-014) | Per [`EMAIL_TEMPLATES.md`](EMAIL_TEMPLATES.md) | Consent and unsubscribe mandatory. Transactional email never carries campaign content. |
| **Google Business Profile** | Local trust signal and contact point for Braventa itself (once eligible) | People searching for Braventa | Posts 2×/month: updates, events, offers when they exist | Factual business info only. No keyword stuffing; no incentives for reviews; never post fake reviews. |

Cross-channel: always link to braventa.io or app.braventa.io with UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`). Never put personal data in URLs.

## 3. Social post templates

Placeholders: `{{product_name}}` (Braventa), `{{hook}}`, `{{insight}}`, `{{step_1}}`..., `{{feature_name}}`, `{{cta_url}}`. Keep within platform limits; LinkedIn hook in the first 140 characters.

### 3.1 Product education
```
{{hook — a problem in the customer's words}}
e.g. "Most service businesses don't need more marketing. They need to know which marketing to do first."

Here's what {{product_name}} does with one website address:
1. Reads your site and checks it with Google PageSpeed
2. Builds a profile of your services, customers, and brand voice
3. Scores where you stand and ranks your top 5 opportunities
4. Plans 30 days of content and drafts the first 5 posts

You approve every draft. Nothing is published automatically.

Try it on your own site: {{cta_url}}
```

### 3.2 Behind the build / founder story
```
{{personal_observation}}
e.g. "I've watched owners pay five vendors for marketing and still not know what to do on Monday."

That's why we're building {{product_name}}: one system that {{what_it_does_today}}.

This week we {{shipped_or_learned}}.
What surprised us: {{honest_learning}}.
Next: {{next_item}} (planned — not live yet).

{{question_to_audience}}
```

### 3.3 Tip post
```
{{number}} {{topic}} fixes you can make this week:

1. {{tip_1}} — {{why}}
2. {{tip_2}} — {{why}}
3. {{tip_3}} — {{why}}

{{product_name}} checks for issues like these when it analyzes your website: {{cta_url}}
```
Rule: tips must stand on their own as useful advice; the product mention is one line at the end.

### 3.4 Feature announcement (only once the feature is live and verified)
```
New in {{product_name}}: {{feature_name}}.

{{one_sentence_what_it_does}}
Why it matters: {{benefit_in_business_terms}}
How to try it: {{first_step}}

{{approval_note — "As always, you approve before anything goes out."}}
{{cta_url}}
```

### 3.5 Copy bank of short display lines (for images and covers)
`KNOW WHAT TO DO NEXT.` · `ONE SYSTEM. EVERY STEP.` · `CONTEXT FIRST.` · `YOU APPROVE. ALWAYS.` · `FIVE PRIORITIES. ONE PLAN.` · `RUN YOUR GROWTH AS ONE SYSTEM.`

## 4. AI-assisted content disclosure

Braventa's own marketing may be drafted with AI assistance. Disclose where a platform or law requires it (for example, platform labels for AI-generated or realistically altered images and video). Every AI-assisted piece is reviewed and approved by a person before publishing — the same rule we apply for customers (D-013).

## 5. Sales presentation and proposal

### 5.1 Sales presentation outline (10–12 slides, ~20 minutes)
1. **Title** — Braventa · Run your growth as one system.
2. **Their situation** — what we heard: goals and pains in their words.
3. **The problem** — disconnected tools, unclear priorities, content without a plan, reports that look backwards.
4. **The Braventa Growth Loop** — Understand · Act · Improve, with live vs coming status.
5. **Live demo** — run or show their own analysis: profile, growth score, top 5 opportunities.
6. **Their 30-day plan and drafts** — show approval in action.
7. **What's live today vs coming next** — explicit two-column slide.
8. **Trust and control** — approval by default, data isolation, AI usage limits.
9. **How we'd work together** — onboarding steps; optional services only if offered.
10. **Investment** — only founder-approved pricing (D-012); otherwise "to be discussed".
11. **Proof** — `[Proof point — add when available]`; omit the slide if empty.
12. **Next step** — one clear action and date.

### 5.2 Proposal structure
1. Summary (one paragraph: their goal and our recommendation)
2. What we heard (goals, pains, constraints)
3. What Braventa found (growth score, top opportunities — attach analysis)
4. Recommended approach (steps, owners, timeline)
5. What's included today / what depends on planned features (labelled)
6. Investment (founder-approved only)
7. Assumptions and exclusions (no guaranteed outcomes)
8. Next steps and acceptance

Email cover: [`EMAIL_TEMPLATES.md` §7](EMAIL_TEMPLATES.md#7-sales-proposal-email).

## 6. Claims and compliance checklist

Complete before anything is published or sent. Any "No" blocks release.

- [ ] Every feature mentioned is **live** per [`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md), or is clearly labelled "coming next" / "planned".
- [ ] No guarantee of revenue, leads, rankings, traffic, savings, or time saved.
- [ ] No invented statistics, customer counts, testimonials, logos, ratings, or case studies. Placeholders used where proof is missing.
- [ ] Any statistic has a named source and date.
- [ ] Any testimonial is real, attributed, and has written permission on file.
- [ ] No implication that Braventa publishes, sends, or acts autonomously.
- [ ] No named-competitor comparisons or disparagement.
- [ ] Brand name is "Braventa" (not "Braventa AI", not "GrowthOS").
- [ ] Banned words checked ([`VOICE_AND_MESSAGING.md` §4](../brand/VOICE_AND_MESSAGING.md#4-word-list)).
- [ ] Email audience has recorded opt-in; unsubscribe link and postal address present (D-014).
- [ ] AI-assisted content disclosed where the platform or law requires it.
- [ ] No personal data in URLs; UTMs only.
- [ ] Images: licensed or owned; no robot/glowing-brain imagery; people shown with permission.
- [ ] No pricing unless founder-approved (D-012).
- [ ] No security or compliance certifications claimed unless verified.

## 7. Visual direction pointers

Full rules live in [`../brand/VISUAL_IDENTITY.md`](../brand/VISUAL_IDENTITY.md). For campaigns:
- Use the brand palette as defined there; Cobalt for action, Volt as a sparing signal on dark surfaces only.
- Headings in Quicksand (rounded geometric); short uppercase heads are welcome on marketing images. Body text per the visual identity doc.
- Show real product screens (with sample or permitted data) over abstract dashboards.
- Avoid robots, glowing brains, heavy gradients, stock "AI" visuals, and decorative fake dashboards.
- Status badges in creative must match product status (Live vs Coming next).

## 8. Measurement basics

| Stage | Metric | Source |
|---|---|---|
| Reach | Impressions, profile visits | Native platform analytics |
| Engagement | Clicks, CTR, saves, replies | Platform analytics, UTM sessions |
| Acquisition | Sign-ups by UTM source | App sign-ups (`auth.users`) joined to UTM capture `[Not yet implemented — add tracking]` |
| Activation | Analyses completed; analyses completed within 24h of sign-up | `ai_jobs` with status done |
| Value | Drafts approved per analysis; opportunities viewed | `content_items` status |
| Retention | Re-runs; return visits after 7/30 days | App data |
| Email | Delivery, opens (directional only), clicks, unsubscribes | Email platform (once integrated) |

Rules: pick one primary metric per campaign; report results against the brief's objective; do not publish campaign metrics as public proof without verification. Note that UTM capture and analytics are not built yet; plan tracking before launch.

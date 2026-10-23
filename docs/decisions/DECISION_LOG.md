# Decision log

Significant brand, product, and architecture decisions, newest last. Each entry says who decided,
why, and what it changes. **Status** is one of: `Founder` (explicit founder decision — level 1 in the
source-of-truth hierarchy), `Approved` (accepted spec), `Provisional` (a reasoned recommendation made
without an explicit founder decision — valid until the founder confirms or overrides it), or
`Superseded`.

To change a decision, add a new entry that references the old one and mark the old one `Superseded`.
Do not rewrite history.

| ID | Date | Decision | Status |
|---|---|---|---|
| D-001 | 2026-10-10 | Public brand is **Braventa**; GrowthOS is the internal codename | Founder |
| D-002 | 2026-10-10 | Braventa is never written "Braventa AI" by default | Founder |
| D-003 | 2026-10-10 | Rename user-facing "GrowthOS" strings in the app to Braventa | Provisional |
| D-004 | 2026-10-10 | Methodology is called **the Braventa Growth Loop** (Understand · Act · Improve) | Provisional |
| D-005 | 2026-10-10 | Core messaging lines (tagline, one-liner, positioning) | Founder (D-025) |
| D-006 | 2026-10-10 | Visual identity: Ink / Paper / Cobalt / Volt palette | Founder (D-025) |
| D-007 | 2026-10-10 | Typography: Archivo (display), Geist (UI/body), Geist Mono (labels/data) | Superseded by D-015 |
| D-008 | 2026-10-10 | Symbol: the **Waypoint** mark; wordmark in Archivo Expanded SemiBold | Superseded by D-026 |
| D-009 | 2026-10-10 | `design-system/tokens.json` is the single token source, compiled into the app's CSS | Provisional |
| D-010 | 2026-10-10 | Product module names stay descriptive (no invented sub-brands) | Provisional |
| D-011 | 2026-10-10 | Hosting: app on Vercel at app.braventa.io; marketing site at braventa.io (Hostinger) | Founder |
| D-012 | 2026-10-10 | Pricing not decided; docs carry a configurable framework only | Founder |
| D-013 | 2026-10-10 | Human approval before anything is published for a client | Founder |
| D-014 | 2026-10-10 | Marketing email requires explicit opt-in, separate from account email | Approved |
| D-015 | 2026-10-10 | Typography: **Quicksand** for headings and logo, **Comfortaa** for all other text | Founder (logo font amended by D-026) |
| D-016 | 2026-10-10 | US English spelling in product and marketing copy | Founder (D-025) |
| D-017 | 2026-10-10 | Wordmark is lowercase `braventa` in Quicksand Bold | Superseded by D-026 |
| D-018 | 2026-10-10 | Crawler reaches public sites only; clients can only approve/reject/undo content, approver set by the database | Provisional |
| D-019 | 2026-10-10 | Product vision document adopted as strategic planning context (not a spec); existing approved decisions stand | Founder |
| D-020 | 2026-10-10 | AI assistant is not in the MVP but is committed for the Next phase (resolves Q-021) | Superseded by D-043 |
| D-021 | 2026-10-10 | Guided onboarding questions (BI-12) are in the MVP (resolves Q-022) | Founder |
| D-022 | 2026-10-10 | Opportunity tracking (MS-5) and the "do this first" summary (UX-1) are in the MVP (resolves Q-023) | Founder |
| D-023 | 2026-10-10 | Withdrawn — this number was briefly used for the crawler/approval-rules decision, which keeps its original ID D-018 | Withdrawn |
| D-024 | 2026-10-10 | Paid AI lineup: Sonnet for profile, plan and drafts; Opus for opportunities and for drafts in regulated industries; analyses grounded in source data | Provisional |
| D-025 | 2026-10-10 | Founder approval of the brand system (messaging, palette, US English) | Founder |
| D-026 | 2026-10-10 | New logo: **Monolith** symbol + **Syncopate Bold** uppercase wordmark | Superseded by D-027 |
| D-027 | 2026-10-10 | Logo from the founder's reference: heavy **B** on a rounded tile with a **Violet dot**; **BRAVENTA.IO** in Quicksand Medium | Founder |
| D-028 | 2026-10-10 | AI-assisted onboarding: discovery runs alongside the website analysis; one diagnosis plan replaces the "5 opportunities"; MVP value test is a confirmed diagnosis and plan plus take-away content | Founder |

---

## D-001 — Public brand is Braventa; GrowthOS is the internal codename
**Status:** Founder (brief §1.1). **Context:** the repo, Supabase project, and MVP were built as
"GrowthOS". **Decision:** Braventa is the only public-facing name for the company and product.
"GrowthOS" survives only as (a) the repository/codename and (b) the name of the original concept in
historical documents. It must not appear in UI copy, emails, marketing, metadata, or social assets.
**Consequence:** code identifiers (folder names, the Supabase project name, env var names) are *not*
renamed — that would be churn with no customer benefit.

## D-002 — No "AI" suffix
**Status:** Founder (brief §1.1). Write "Braventa", never "Braventa AI". AI is how the product works,
not what the brand is.

## D-003 — Rename UI strings to Braventa
**Status:** Provisional. Applied in this change to page titles, the header logo, metadata, and
onboarding/login copy. Follows from D-001.

## D-004 — The Braventa Growth Loop
**Status:** Provisional. The brief's nine-step lifecycle (§2) is grouped into three stages so it can be
explained in one breath and drawn as one diagram:

| Stage | Steps |
|---|---|
| **Understand** | 1 Understand the business · 2 Identify opportunities and bottlenecks · 3 Set priorities and objectives |
| **Act** | 4 Build the action plan · 5 Create the assets · 6 Execute through connected workflows |
| **Improve** | 7 Measure results · 8 Learn from outcomes · 9 Improve the strategy and workflows |

Public name: "the Braventa Growth Loop" (or "the Growth Loop" after first mention). The loop is the
organising idea behind the product modules and the UI; it is a methodology, not a feature, and must
not be described as fully automated. In the current MVP only Understand and the first half of Act
(plan, create drafts, approve) exist — see [`docs/product/MVP_SCOPE.md`](../product/MVP_SCOPE.md).

## D-005 — Core messaging lines
**Status:** Provisional. These exact strings are canonical; other copy may vary around them but must
not contradict them. Full system in [`docs/brand/VOICE_AND_MESSAGING.md`](../brand/VOICE_AND_MESSAGING.md).

| Use | Line |
|---|---|
| Positioning concept (internal) | Turn disconnected business activities into one intelligent growth system. |
| Tagline | **Run your growth as one system.** |
| One-sentence description | Braventa connects your website, marketing, CRM, and content into one growth system that shows you what to do next — and helps you get it done. |
| Homepage headline | **Know what to do next. Then get it done.** |
| Category label | Business growth system |

Rationale: the tagline carries the brief's core idea (connected, systemic) without AI jargon; the
headline names the two customer pains the MVP genuinely addresses today (prioritisation and execution
effort) and survives as the product grows.

## D-006 — Colour palette
**Status:** Provisional. Four brand colours, each with one job:
- **Ink `#0B0C10`** — primary dark; text on light, canvas for the expressive marketing surfaces.
- **Paper `#F4F4F1`** — primary light canvas; slightly warm so long reading sessions are not clinical.
- **Cobalt `#2340F5`** — the action colour: primary buttons, links, focus, selected states.
  Inspired by United Carriers' single electric blue; 6.7:1 on white.
- **Volt `#D4F53C`** — the signal colour: the "next action" node in the logo, highlights on dark
  surfaces, sparing emphasis. Never text on light backgrounds (fails contrast), never a semantic state.

Rationale and full scales in [`docs/brand/VISUAL_IDENTITY.md`](../brand/VISUAL_IDENTITY.md). Replaces the
MVP's teal accent (`#0f766e`).

## D-007 — Typography
**Status:** Superseded by D-015 (founder decision, same day). Kept for history. **Archivo** (variable, width 100–125) for display and headings — expanded
uppercase on marketing surfaces, normal-width sentence case in the app. **Geist** for UI and body
(already in the app; neutral, highly legible). **Geist Mono** for eyebrow labels, status chips, data,
and code — the "systems" texture taken from Teamwork Graph. All three are open-licence (SIL OFL) and
served through `next/font`, so there is no licensing cost or third-party font request at runtime.

## D-008 — Waypoint symbol and wordmark
**Status:** Symbol provisional and in use; the Archivo wordmark is superseded by D-017. The symbol is a "B" drawn from a stem and two forward chevrons; the lower path
stops short of a detached node — the path leads to the next action. The wordmark is BRAVENTA in Archivo
at width 125, weight 600, +40 units tracking, converted to outlines. Sources and rules in
[`docs/brand/VISUAL_IDENTITY.md`](../brand/VISUAL_IDENTITY.md#2-logo); files in `web/public/brand/`.
**Not legal clearance** — no trademark search has been performed.

## D-009 — Token pipeline
**Status:** Provisional. `design-system/tokens.json` is the only place colour, type, spacing, radius,
shadow, and motion values are defined. `npm run tokens` (in `web/`) compiles it to
`web/src/styles/tokens.css`, which `globals.css` imports and maps into Tailwind's theme. Hand-editing the
generated CSS is not allowed.

## D-010 — Descriptive module names
**Status:** Provisional. Modules use the brief's plain names (Business Intelligence, Marketing Strategy,
Content Studio, Website Intelligence, CRM Intelligence, Automation, Analytics). No cute sub-brands —
they add learning cost for owner-operators and age badly.

## D-011 — Hosting split
**Status:** Founder (2026-10-10 infrastructure session). Marketing-site hosting superseded by D-031 (2026-10-11): braventa.io is built in this repo on Vercel; Hostinger remains registrar and DNS. App: Vercel (Hobby tier during the proof of
concept) at `app.braventa.io`. Marketing site: `braventa.io`, Hostinger, built later. The brief's
"Hostinger" line refers to the marketing site, so there is no conflict. n8n host: see
[`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) Q-006.

## D-012 — Pricing not decided
**Status:** Founder (brief §4). Tier structure and entitlements superseded by D-030 (2026-10-11); prices remain undecided. Documentation may describe a pricing *framework* with clearly labelled
assumptions; it must not publish prices or entitlements.

## D-013 — Human approval by default
**Status:** Founder (pre-existing CLAUDE.md rule, reaffirmed by brief §7). Nothing is published or sent
on a client's behalf without explicit approval, unless that client has explicitly configured an
authorised automation.

## D-014 — Consent separation for email
**Status:** Approved (brief §6.3; also a legal requirement in most markets). Transactional/account email
and marketing email are separate streams. Creating an account is not marketing consent.

## D-015 — Quicksand and Comfortaa
**Status:** Founder (2026-10-10, mid-session instruction: "use Quicksand for Header and Logo and Comfortaa
for others"). Supersedes D-007.
- **Quicksand** (variable 300–700): all headings (`h1`–`h4`, `.heading`, `.display`) and the wordmark.
- **Comfortaa** (variable 300–700): everything else — body, UI controls, labels, eyebrows, chips, emails.
- A system monospace stack remains only for code and IDs, where fixed width is functional (not a brand face).
Both are SIL OFL and served via `next/font` (no runtime third-party request, no licence cost).
**Implementation guardrails** (because Comfortaa runs wide with a small x-height): body copy never below
14px (`text-sm`); long-form reading at 16px; UI labels use weight 600; dense tables may use `tabular-nums`.
See [`VISUAL_IDENTITY.md`](../brand/VISUAL_IDENTITY.md#4-typography). Readability concern recorded as Q-012.

## D-016 — US English
**Status:** Provisional — assumes North America is the first market (see Q-002). Product UI strings were
harmonised from UK ("Analyse") to US ("Analyze") in this change. AI prompt text is not user-facing and was
left as is. Older internal docs written in UK spelling are not rewritten for spelling alone.

## D-017 — Lowercase Quicksand wordmark
**Status:** Provisional. Follows D-015. Four options were compared beside the Waypoint symbol (uppercase
600/700, lowercase 600/700). Lowercase Bold was chosen: Quicksand's round terminals echo the symbol's round
caps, lowercase stays legible at 20px nav-bar heights, and it reads approachable without losing weight.
The brand name in running text is still written "Braventa" (capital B). Uppercase Quicksand remains
available for short marketing section heads.


## D-018 — Crawler reach and client-side approval rules
**Status:** Provisional (P1 security fixes, 2026-10-10). Two policy choices made while closing the findings in
[`SECURITY_AND_PRIVACY.md`](../architecture/SECURITY_AND_PRIVACY.md):
- **Crawler reach.** Braventa only analyzes public websites: `http`/`https`, ports 80 and 443, no
  credentials in the URL, and hostnames that resolve only to public addresses (checked on every redirect
  hop, at most 5 hops). Pages are capped at 2 MB of decoded HTML and 15 s per page. Sites on non-standard
  ports or private networks get an error instead of an analysis.
- **Approval from clients.** Signed-in users (the `authenticated` role, including direct Data API calls)
  may only move `content_items` between `needs_approval`, `approved` and `rejected`, and may only insert
  items as `brief` or `draft`. `approved_by` / `approved_at` are set by the database (`auth.uid()`,
  `now()`), never by the client. Every other status — including `scheduled` and `published` — can only be
  set by server code using the secret key. Migration `20261010121043_content_approval_guard.sql`.
Revisit when multi-user organizations add roles (who may approve) or when publishing ships (D-013).
Who may approve is answered by D-046 and D-047; since 2026-10-23 the same trigger enforces it (`content.approve`,
own drafts `content.approve_own`) and records the author; the database-set approver stands.

## D-019 — Product vision adopted as planning context
**Status:** Founder (2026-10-10: founder supplied the document, instructed that the existing baseline stays
and approved the documentation updates from the assessment). The founder's
[product vision and planning context](../product/GrowthOS_Product_Vision_and_Planning_Context.md) is kept
in the repo unchanged. It ranks below current verified implementation and above unapproved ideas (its own
§16), so it informs roadmap and scope but does not override approved decisions or working code.
**Consequences:** differences are recorded in
[IMPLEMENTATION_ASSESSMENT_2026-10-10.md](../product/IMPLEMENTATION_ASSESSMENT_2026-10-10.md); the ones that
need a founder call are Q-021 – Q-024 in [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md). ROADMAP.md maps the
vision's Current / MVP / Next / Later / Exploratory labels to the existing classes. D-003 (UI rename)
remains Provisional pending explicit confirmation — the vision (§13) advises against automatic renames,
but D-003 follows from D-001 and is already applied.

## D-020 — AI assistant: Next phase, committed
**Status:** Founder (2026-10-10, answer to Q-021: "no, but we will get this done"). The grounded AI assistant
(BI-11) stays out of the MVP and moves from Future vision to **Next phase** as a committed item. It depends on
knowledge-base retrieval (BI-8) and paid models. The founder asked for a cost estimate for testing it with one
company and a model recommendation aligned with the vision's routing principles before it is built.
**Superseded by D-043** (2026-10-17): a read-only in-app assistant ships now, without retrieval.

## D-021 — Guided onboarding questions in the MVP
**Status:** Founder (2026-10-10, answer to Q-022). BI-12 becomes MVP: optional questions on `/onboarding` for
primary goal, service area, and current tools, stored on the business profile, marked Customer-provided, and fed
to the pipeline prompts. Answers are optional so the two-field start stays fast.

## D-022 — Opportunity tracking and "do this first" in the MVP
**Status:** Founder (2026-10-10, answer to Q-023). MS-5 (accept / dismiss / done per opportunity) and UX-1 (a
"do this first" summary at the top of the results page: top open opportunity, drafts awaiting approval, next
step) become MVP. Serves the vision's success criterion that recommendations lead to actions.

## D-023 — Withdrawn
**Status:** Withdrawn. PR #1 briefly renumbered the crawler/approval-rules decision to D-023 while a parallel
session recorded the brand approval as D-025. Resolved by keeping original IDs (D-018 crawler rules, D-025
brand approval); D-023 is not reused.
## D-024 — Paid AI lineup and grounded analysis
**Status:** Provisional (2026-10-10). The founder approved switching to paid models after a model comparison
and added USD 15 of OpenRouter credit; the specific lineup awaits the founder's review of real results.
- **Lineup** (`web/src/lib/ai/router.ts`): profile and 30-day plan on Claude Sonnet; growth score and
  opportunities on Claude Opus; drafts on Sonnet, escalated to Opus when the business is in a regulated
  industry (risk-based routing, vision §10). About USD 0.23 per analysis, about USD 0.32 for regulated businesses
  (measured end to end on The Benefit Link; about 5 minutes, since Opus is slow).
  Evidence: [AI_ROUTING_AND_COSTS.md §4.1](../architecture/AI_ROUTING_AND_COSTS.md).
- **Grounding rules** (`web/src/lib/pipeline/prompts.ts`): every call is told today's date; models may only
  state figures, ratings and claims present in the crawled site, website signals or PageSpeed data; crawled
  text is fenced as untrusted; regulated industries are detected in the profile and every draft carries a
  "check before approving" note. Prompted by the first real test (The Benefit Link, a Medicare broker), where
  free models invented statistics and review scores, used a past year, and presented a government
  publication as the business's own.
- **Privacy:** paid calls run under the founder's OpenRouter zero-data-retention and no-training settings.
  Free mode remains available (`AI_MODE=free`) and still allows free endpoints that may train on inputs.
Revisit after testing with real customers, or if cost per analysis must fall (Haiku was close in quality
on two of three sites).

## D-025 — Founder approval of the brand system
**Status:** Founder (2026-10-10). After the handover the founder replied "Approved": the core messaging lines (D-005),
the Ink / Paper / Cobalt / Volt palette (D-006) and US English (D-016) move from Provisional to Founder. The logo
approved at that moment (Waypoint + lowercase Quicksand) was replaced the same day by D-026. Still provisional:
D-003, D-004, D-009, D-010. Approval is a brand decision, not trademark clearance (Q-014 stays open).
(An earlier copy of this entry was numbered D-018 and was lost when a concurrent session rewrote this file; D-018
now belongs to the crawler entry.)

## D-026 — Monolith symbol and Syncopate wordmark
**Status:** Founder (2026-10-10). The founder asked for "a better professional, sharp and modern logo — advanced,
shows high tech but business imposing". Five symbol directions and five wordmark faces were rendered side by side
(Monolith, Vector, Prism, Hex Badge, Sharp Waypoint × Michroma, Archivo Expanded, Sora, Syncopate, Quicksand). The
founder chose **S1 Monolith** and **Syncopate Bold**.
- **Symbol — Monolith:** a solid, angular "B". Every bowl edge runs at 45°; two forward-pointing counters (aligned
  to the bowl vertices) are cut out; the lower corner is notched by a diamond, and a smaller diamond node sits in
  the notch with a 2.5-unit gap. It keeps the "next action" idea of the Waypoint, rebuilt sharp and heavy.
  Supersedes the Waypoint (D-008).
- **Wordmark:** BRAVENTA in Syncopate Bold, uppercase, +60 units tracking, outlined. Supersedes D-017 and amends
  D-015 for the logo only: headings stay Quicksand, other text stays Comfortaa.
- Social artwork's graph nodes became diamonds to match. App icon, favicon, Open Graph image and the in-app
  `<Logo>` were regenerated from the same geometry.

## D-027 — B-dot logo from the founder's reference
**Status:** Founder (2026-10-10). Supersedes D-026. The founder supplied a reference image ("I want something like
this"): a heavy white B on a black rounded square, a violet dot overlapping the lower-right of the B, and
"BRAVENTA.IO" in thin uppercase type below. It was rebuilt as clean vector geometry:
- **Mark:** the B is Montserrat ExtraBold (800), outlined — the closest match to the reference among Montserrat,
  Poppins and Urbanist — at 70 % of a 48-unit tile with corner radius 3.5. A dot (radius 9 % of the tile) overlaps
  the lower-right of the lower bowl. The tile is part of the mark.
- **Dot colour:** **Violet `#5B1AE6`**, as in the reference. It is a logo-only colour (`color.brand.violet`,
  `logo-node` role in both themes); Cobalt stays the UI action colour and Volt the signal colour.
- **Wordmark:** **BRAVENTA.IO** in Quicksand Medium (500), uppercase, +70 units tracking, outlined — as in the
  reference, and consistent with D-015 (Quicksand). Syncopate is no longer used.
- **Theme behaviour:** on light grounds the tile is Ink with a white B; on dark grounds the tile is Paper with an
  Ink B (`logo-tile`, `logo-letter` roles), so the mark keeps its edge. The dot stays Violet.
- The founder declined a follow-up multiple-choice question, so the reference was followed as closely as possible
  (Violet dot, ".IO" in the wordmark). Switching the dot to Cobalt, or dropping ".IO", is a one-line change in
  `tokens.json` / `build-brand-assets.mjs`. The founder confirmed both by replying "proceed" (Q-025, resolved).
- Accessibility note: the Violet dot on Ink is about 2.5:1. Logos are exempt from WCAG contrast rules, and the dot
  is not the only identifying element; it is never used to convey state.

## D-028 — AI-assisted onboarding and a single diagnosis plan
**Status:** Founder (2026-10-10, answers to the assessment of the
[AI-assisted onboarding spec](../product/Braventa_AI_Assisted_Onboarding_Pain_Point_Spec.md)).
1. **Discovery runs alongside the website analysis.** The crawl and PageSpeed start as soon as the owner enters
   the website; the owner answers discovery and follow-up questions while it runs, and the synthesis uses both.
2. **One plan.** The diagnosis plan replaces the separate "5 opportunities". Each plan item comes from the
   owner's confirmed pain points and/or website evidence; content planning and drafts become one solution within
   the plan, not the whole product.
3. **New MVP value test:** the owner confirms a diagnosis and plan they believe, and takes away usable content.
   [MVP_SCOPE.md](../product/MVP_SCOPE.md) §1 updated.
**Provisional implementation choices** (from the same assessment, not founder decisions): the pain-point and
solution catalog lives in versioned, typed code with only stable IDs stored in the database; the spec's evidence
types map onto the existing provenance classes (customer_reported → Customer-provided; public_website /
connected_system observation → Verified; ai_hypothesis → Inferred; manually_verified → Customer-provided once
confirmed); adaptive follow-ups are a bounded question flow (about 4 questions, economical model), not the
assistant (D-020); a `growth_plan_items` table backs the plan and also delivers MS-5 and UX-1 (D-022). Staging:
ON-1 – ON-8 in [PRODUCT_REQUIREMENTS.md](../product/PRODUCT_REQUIREMENTS.md).

## D-029 — How the diagnosis and plan are confirmed and ordered
**Status:** Provisional (2026-10-11, implementation of ON-7/ON-8 under D-028; awaiting founder review of real runs).
- **One call, one plan.** The Opus step returns the scores, a diagnosis (summary, 3–6 findings, up to 4 open
  questions) and a 5–7 item plan in one response; content planning uses the plan titles. Correcting the diagnosis
  does not rebuild the 30-day plan or drafts.
- **Provenance.** Each finding carries a source mapped to the provenance classes: owner → Customer-provided (shown
  "From you"), website or PageSpeed → Verified, model reasoning → Inferred, each with high/medium/low confidence.
- **Corrections.** The owner marks findings right or wrong, optionally saying what is true. Wrong findings must be
  resolved before confirming: "Update the plan with my corrections" re-runs only the diagnosis, with the corrections
  as owner-provided facts, and supersedes the earlier version.
- **Order.** Final order = the owner's priorities 1–3 first, then the calculated score
  ((impact × urgency × confidence) ÷ effort on 1–5 scales, computed in code), then the model's rank. The owner's
  answer to the urgency follow-up replaces the model's urgency. Dismissed items get no final priority. Owners can't
  reorder items yet (Q-027).
- **Tracking.** MS-5 statuses (open, accepted, dismissed, done) live on `growth_plan_items` and can be changed once
  the plan is confirmed. Owners can update only review and status columns (column grants); the pipeline writes the rest.

## D-030 — Subscription tiers and the 14-day Pro trial
**Status:** Founder (2026-10-11, in chat). Supersedes D-012 for tier structure; prices stay undecided.
- **Basic:** business intelligence, marketing audit, recommendations, AI assistance and recommendations for actions.
  Braventa recommends; the owner carries out changes manually.
- **Pro:** Basic plus a full marketing audit (website, SEO, SEM, social media, email, video), integrations with the
  owner's tools (GA4, Search Console, Tag Manager, Canva, HeyGen or Higgsfield, social accounts, WordPress), and AI
  agents (n8n workflows and/or Opus-assisted execution) that carry out recommended fixes inside the app.
- **Premium (custom):** Pro plus custom integrations such as e-commerce platforms, QuickBooks or Xero.
- **Trial:** every new organization gets 14 days of Pro, then Basic automatically.
- **Founder choices on implementation (same day):** build the trial clock and tier checks now without billing; a
  trial that ends drops to Basic, and upgrading is a "Talk to us" request until billing exists; Pro and Premium
  features not yet built are shown as "Coming soon".
- **Constraints kept:** agents never act without the owner's approval (D-013); no feature is marked live before it
  ships. Details: [PLANS_AND_TIERS.md](../product/PLANS_AND_TIERS.md). Implementation: `organizations.plan`,
  `organizations.trial_ends_at`, `upgrade_requests`, `web/src/lib/plans/`.

## D-031 — Domains and where the public sites are built
**Status:** Founder (2026-10-11, in chat). Supersedes D-011's marketing-site hosting.
- `braventa.io`: public marketing site. `app.braventa.io`: the app, registration and sign-in.
  `support.braventa.io`: documentation (how to use the app; what it can and can't do; integrations and developer
  tools; legal). `community.braventa.io`: user forum, future.
- braventa.io and support.braventa.io are built with Next.js in this repository and deployed on Vercel, sharing the
  design system. Recommended docs framework: Fumadocs (provisional). Hostinger stays registrar and DNS.
- Page lists: [SITEMAP.md](../marketing/SITEMAP.md) and [SUPPORT_SITE.md](../product/SUPPORT_SITE.md).

## D-032 — Results as an infographic with detail dialogs
**Status:** Founder (2026-10-11, in chat). The analysis report opens as a one-screen infographic summary (growth
score ring, score bars, findings by evidence type, plan progress, what you told us, profile, content plan, drafts);
each tile opens the full section in a modal dialog addressed by `?view=`. The dashboard shows the latest analyzed
business this way.

## D-033 — Marketing site build and pre-launch rules
**Status:** Founder (2026-10-11, in chat) for the four choices; implementation provisional.
- **Hidden until launch:** braventa.io is deployed with noindex (robots.txt disallow, `X-Robots-Tag`, meta robots) until
  legal pages are reviewed and copy is final; `SITE_INDEXABLE=true` switches indexing on.
- **Contact:** a form stored in Supabase `contact_requests` (insert-only for the public), no email sending yet.
- **Legal pages:** factual drafts marked as drafts (Terms placeholder; Privacy, Cookies and Sub-processors describe what
  the product actually does) until a lawyer's versions exist (Q-032).
- **About:** company story only, no founder name; drawn from the founder's agency experience and the vision of giving
  small and mid-sized businesses multiple services in one app instead of hiring a different person for each job.
- **Calls to action:** sign-up is invite-only (app.braventa.io), so the primary CTA is "Request early access" (contact
  form), not sign-up. Implementation: `site/` in this repo, shared tokens and brand assets via the generators, tier list
  imported from the app so pricing can't drift.

## D-034 — Contact notifications and CRM through HubSpot
**Status:** Founder (2026-10-11, in chat). **Amended the same day:** use the existing, otherwise unused
**Pixelmarketingdesign** portal (Hub ID 247150427) instead of a new account; never a client portal such as The
Benefit Link's. The bullet below about a separate account is superseded by this amendment.
- braventa.io contact requests go to HubSpot for notifications, CRM and branded email, using a **new Braventa HubSpot
  account** (not the Pixel Marketing Design agency portal, and never a client portal such as The Benefit Link's).
- Emails are branded: braventa.io is connected as HubSpot's email sending domain (DKIM/SPF records in Hostinger).
  **Amended 2026-10-11 (Founder):** HubSpot's sending domain needs Marketing Hub Professional, which we're not buying.
  Instead, mailboxes are on Hostinger Email (admin@, hello@, support@) and hello@braventa.io is connected to HubSpot
  over IMAP/SMTP, so replies go out through Hostinger, signed for braventa.io. No automatic receipt email for now.
  **Amended again 2026-10-11 (Founder):** the founder bought HubSpot's Starter Customer Platform (Marketing Hub Starter),
  which does allow the braventa.io sending domain. It's connected and authenticated (DKIM + merged SPF in Hostinger), so HubSpot
  marketing and follow-up email go out as braventa.io; one-to-one replies still go through Hostinger.
- Spam protection: honeypot, signed render-time token (< 3 s rejected), and a database rate limit (3 per visitor per hour
  by salted IP hash, 5 per email per day). No CAPTCHA or third-party script.
- Supabase stays the system of record; HubSpot is fed through the Forms API (portal ID + form GUID, no secret) after the
  request is stored. Setup and flow: [CONTACT_PIPELINE.md](../marketing/CONTACT_PIPELINE.md).

## D-035 — Phase 1 website messaging refinement
**Status:** Founder (2026-10-11, founder brief "Phase 1 website copy & messaging refinement"). Wording confirmed by the
founder the same day: "AI-assisted growth system" is OK; keep the shorter module names; keep "a marketing audit" in
Basic; Basic after the trial is a paid subscription.
- **Positioning:** Braventa is described as an AI-assisted business growth system that learns how the business works,
  helps uncover what's holding it back, and turns the owner's priorities into a practical plan. It is not described as
  a chatbot, a content generator, an audit tool or an autonomous operator.
- **Reconciling the brief with the brand:** the brief's "AI-assisted growth advisor/platform" is used as "AI-assisted
  growth system": "AI-assisted" is the voice guide's preferred descriptor, and "business growth system" stays the
  category label (D-005; VOICE_AND_MESSAGING §3 lists "AI-powered growth platform" as a don't). Tagline and homepage
  headline (D-005) are unchanged. The D-005 one-liner is no longer used in the homepage hero, because it says Braventa
  connects your CRM, which isn't live; it stays canonical for use once CRM connections ship.
- **Methodology:** the nine Growth Loop steps (D-004) are named Understand · Diagnose · Prioritize · Plan · Create ·
  Execute · Measure · Learn · Optimize, grouped into the three stages, each with its real status.
- **Status vocabulary:** one set of labels on the site, the pricing page and the app: **Live**, **Limited** (works, with
  the gaps named), **Coming soon**. Replaces "Live in part" and "Coming next" on the site.
- **Growth score:** public copy explains the two inputs (Google PageSpeed, about a third; Braventa's AI assessment,
  about two-thirds), what happens when PageSpeed is missing, and that it isn't a measure of the whole business or a
  prediction of revenue. *Amended 2026-10-23 (D-051 step 6):* the copy now says the score is based on the feature
  modules that have evidence for the business, named on the report; PageSpeed and the assessment keep their
  about-a-third / about-two-thirds split of what they cover, and on Pro, with Google Search Console connected, its
  data joins as a small third part (about a tenth).
- **Time claims:** no fixed analysis time on the site ("usually a few minutes"); the 3–4 minute figure comes from
  `AI_MODE=free` runs only.
- Copy: [WEBSITE_MESSAGING.md](../marketing/WEBSITE_MESSAGING.md) §0. Open items: Q-034–Q-037.

## D-036 — AI assistant connection (MCP), phase 1
**Status:** Founder (2026-10-11, in chat).
- Owners who already worked on their business in an AI assistant can let it fill in Braventa's onboarding through an
  MCP server (`/api/mcp`): website and goals, discovery, priorities, follow-up questions, and a status summary. The
  owner still confirms or corrects the diagnosis and approves posts in the app; the server can't publish or approve.
- **Phase 1 only:** personal access keys (Settings → AI assistant access), for Claude Code and Claude Desktop.
  claude.ai and ChatGPT connectors need OAuth sign-in and are phase 2 (Q-039).
- **Who:** every plan during the 14-day trial; access pauses when the trial ends and comes back once the business is on
  a plan (Basic, Pro or Premium, which the founder also calls Custom). With no billing, "on a plan" means
  `organizations.plan` was set by the Braventa team; the Plans page now also offers "Talk to us about Basic" after the
  trial. This is narrower than D-030's "the trial drops to Basic" for this one feature.
- **Privacy:** information the assistant sends is stored like form answers; the status summary returns into the owner's
  own assistant under their own account with that provider. Legal pages disclose it.
- Spec: [MCP_SERVER.md](../architecture/MCP_SERVER.md). Website copy for it: PR #19, second commit.

## D-037 — Paid models stay primary; every model must have a zero-retention endpoint
**Status:** Founder rule (2026-10-11, in chat): "compare accuracy and performance; if it's at par with paid then paid
would be just a fallback." Applied by Claude from the 2026-10-11 comparison; free can't qualify while ZDR is on.
- The OpenRouter account enforces zero data retention (ZDR). Free models (NVIDIA Nemotron) and Qwen 3.8 Flash have no
  ZDR endpoint, so OpenRouter refuses them. In the re-run, both free models failed on all three sites.
- Paid stays primary (`AI_MODE=paid`); the simple-class fallback moves from Qwen 3.8 Flash to GPT-5.6 Sol (Azure, ZDR).
- Any model added to a chain must have a ZDR endpoint. Re-testing free models would mean turning ZDR off, which sends
  owners' setup answers to providers that may keep or train on them; that is a founder decision (Q-040).
- Results: [AI_ROUTING_AND_COSTS.md §4.1](../architecture/AI_ROUTING_AND_COSTS.md#41-model-comparison-2026-10-10-re-run-2026-10-11).

## D-038 — Website audit Phase 1: robots.txt respected, deterministic checks, cited evidence
**Status:** Founder (2026-10-11, in chat): build Phase 1 of the Website Intelligence blueprint; respect robots.txt and
tell the owner about it.
- The crawler reads robots.txt (groups for `Braventa` and `*`, RFC 9309) and never fetches a disallowed URL, the home
  page included. Blocked pages are listed in the report; a blocked home page means the analysis runs on PageSpeed and
  the owner's answers only, with instructions to allow `User-agent: Braventa`.
- Up to 25 pages from the sitemap and links; every candidate recorded as scanned, excluded (reason) or failed.
- Checks are deterministic code with stable rule ids, severity, confidence and a code-computed priority label
  (Fix first / Improve next / Monitor), stored in `audit_runs` / `audit_findings`. PageSpeed runs mobile and desktop
  and keeps real-user (field) data apart from lab data.
- A diagnosis finding counts as Verified only when it cites a stored audit finding; otherwise it is stored as inferred.
- Abuse guard: at most 10 analyses or re-runs per organization per 24 hours (web and AI assistant), one at a time
  per business.
- Spec: [WEBSITE_INTELLIGENCE_GAP_REPORT.md](../product/WEBSITE_INTELLIGENCE_GAP_REPORT.md) §5 (on PR #22).

## D-039 — Prices: 1.5× over the market, every tier
**Status:** Founder (2026-10-12, in chat). Supersedes the open price question in D-012 and Q-029.
- Basic **$89**, Pro **$229**, Premium **from $599** a month; yearly = 10 months. Pro launches at $229 (no lower launch
  price). Prices cover about $1,200 a month of fixed platform and maintenance costs and carry a 1.5× premium over
  market-comparable tools as the reserve for scaling. AI credits and top-ups follow the same premium.
- Not built: there is no billing yet. Site copy shows prices only once checkout exists or with "Talk to us".
- Detail: [PRICING_PROPOSAL.md](../product/PRICING_PROPOSAL.md).

## D-040 — Card-required trial that continues on Basic (public launch)
**Status:** Founder (2026-10-12, in chat). Applies at the public launch (planned end of October 2026), not to the
private test with about 3 invited accounts.
- Sign-up collects a card for the 14-day trial; nothing is charged during it. The account continues on Basic unless
  the owner opts out before the trial ends; opting out is one click online.
- Reminder emails 5, 3 and 1 day before the trial ends. The terms are stated at sign-up, with an explicit agreement
  checkbox; counsel reviews them against auto-renewal laws (Q-032).
- Needs Stripe and transactional email, neither built yet. Detail: PRICING_PROPOSAL.md §5.

## D-041 — Pro integrations: connect during discovery, act with approval
**Status:** Founder (2026-10-12, in chat). Planned, build from the weekend of 2026-10-17. Amended by D-049 for
publishing only: an in-app scheduler runs it, not n8n. Step 1 (the "Connect your tools" discovery step) built
2026-10-18 (D-054). Meta (Facebook, Instagram), LinkedIn, Google Business Profile and HubSpot are parked until the
provider registrations are done (founder, 2026-10-18): Coming soon cards only.
- Discovery asks Pro owners (and the Pro trial) to connect their tools: Google Search Console (live), GA4, HubSpot
  (read-only for analysis), Canva, HeyGen, Higgsfield, social accounts and Google Business Profile. Read scopes first;
  write and publish scopes only when the owner enables an action.
- Pro then creates, publishes and manages content in those tools from the growth plan, each action approved by the
  owner (D-013), executed by n8n. Basic sees the connections as Pro and paused.
- Detail: [INTEGRATIONS_ROADMAP.md](../product/INTEGRATIONS_ROADMAP.md).

## D-042 — Analyses run as a chain of steps, one function invocation each
**Status:** Engineering (2026-10-17). Fixes analyses cut off by Vercel Hobby's 300 s limit.
- A full re-run for a regulated business took ~330 s in one invocation and was killed. Each job now runs as steps
  (`crawling`, `profiling`, `scoring`, `planning`, `writing`), one invocation each, state in `ai_jobs.output`,
  handed off through `POST /api/jobs/continue` (HMAC-signed; `JOB_CONTINUE_SECRET` optional). Measured steps ≤ 60 s.
- Every step is handed off, the first included, so each gets the full limit whatever the request that queued the
  job already spent. Jobs are inserted at their first step (`output.step`), so the report shows the right step at once.
- A hand-off the route doesn't accept (after retrying timeouts, 408, 429 and 5xx) fails the job at once: "The
  analysis couldn't continue. Run it again." A step still pending 60 s after its hand-off is re-sent by the report
  page's poll, at most once a minute; the claim on `ai_jobs` makes repeats harmless.
- The stale-job reaper measures from the current step's last progress, not the job's creation (10 minutes). A
  failed job keeps only its step in `ai_jobs.output`; page text, evidence and discovery answers are dropped.
- The hand-off goes to `NEXT_PUBLIC_APP_URL` (in development, the dev server's own port), never to the request's
  Host header.
- Prompts, models and outputs are unchanged. Moving orchestration to n8n or a queue stays the long-term option
  ([SYSTEM_ARCHITECTURE.md §3](../architecture/SYSTEM_ARCHITECTURE.md)). Resolves Q-004. Detail: AI_ROUTING_AND_COSTS.md
  (Reliability).
- **Amended 2026-10-17 (Engineering): in production, Supabase sends the hand-offs, not the app.** In production the
  5th self-call of a re-run failed with "handing step writing of job … failed: HTTP 508 (attempt 3)": Vercel answers
  a deployment that calls itself in a chain with 508 `INFINITE_LOOP_DETECTED` after about four calls (undocumented
  threshold), so the app must never call itself in a chain. Now, with `JOB_DISPATCH=database` (the default on
  Vercel, `VERCEL=1`), every hand-off (the first step's too) is an insert into `public.job_dispatches` (service
  client, scoped to the job's organization) and Postgres POSTs it to `/api/jobs/continue` with `pg_net` from an
  `AFTER INSERT` trigger; a `pg_cron` sweeper re-posts a step still pending a minute after its last post (4 posts at
  most), and the report page's re-send has Postgres re-post the stored row (`resend_job_dispatch`), so tokens never
  leave the database. The table holds the HMAC tokens: service role only (RLS, no policies, no client privileges),
  deleted with the job and after a day. `direct` (the default elsewhere) keeps the app POSTing to itself for local
  development, which Supabase can't reach. The route, token, claims, immediate failure of an unrecordable hand-off
  and the 10-minute reaper are unchanged. One thing does change in production: the route answers Postgres, not the
  app, so a refused hand-off no longer fails the job at once. The sweeper reads `pg_net`'s response to the last post
  and fails the job with the same "couldn't continue" message within about a minute when the post was refused (not
  202, 408, 429 or 5xx, e.g. a 401 from a key mismatch) or the 4th post failed too; the report page's re-send does
  the same. A post that never gets an answer (`pg_net`'s worker stopped) waits for the reaper, and the health checks
  fail on it. Set `JOB_DISPATCH=database` in Vercel's Production environment; without it, `database` is also the
  default for `VERCEL=1` or a production build with an https `NEXT_PUBLIC_APP_URL`, so production never falls back
  to calling itself. The `job_dispatches` migration must be applied, with the Supabase CLI so its version is
  recorded, before this app version is deployed.

## D-043 — In-app AI assistant ("Ask Braventa"), read-only
**Status:** Founder (2026-10-17, in chat). Supersedes D-020's "not in the MVP": the in-app assistant ships now, before
knowledge-base retrieval (BI-8), as a help and report assistant.
- Opened from an "Ask Braventa…" search bar in the app header (an icon on small screens; shortcut Ctrl+K, Cmd+K on a
  Mac — no single-key shortcut, WCAG 2.1.4). It answers how Braventa works (app map, live vs coming soon, plans and trial, connecting Claude and Search Console,
  troubleshooting, privacy) and about the user's own businesses and latest report (growth score, diagnosis findings,
  plan items, content plan, drafts status). Read-only: it never changes anything and points to the page instead.
- Access: the same rule as the AI assistant connection (D-036): every account during the 14-day trial, then any plan
  (Basic, Pro or Premium). Others see the bar disabled with "Choose a plan to ask" linking to `/plans`. The model call gets one 40-second
  attempt (no retry), inside the route's 60-second limit.
- Knowledge is a curated, versioned file in code (`web/src/lib/assistant/knowledge.ts`), partly generated from
  `FEATURES` and the report's sections, and published as `docs/help/APP_GUIDE.md` for support.braventa.io. A test
  fails when a page route is missing from it or the doc is out of date.
- Business data is read with the user's own client (RLS), capped at 6,000 characters and fenced as untrusted data.
- Model: worker `app_assistant` (simple → Claude Haiku 5.5) through `lib/ai/router.ts` (budget + `ai_usage`), about
  $0.001 per question in testing. One JSON response per question (no streaming), for robustness.
- Limits: 40 questions per organization per 24 hours and 5 per user per minute, counted in `assistant_usage`
  (migration `20261017020224_assistant_usage.sql`, applied 2026-10-17; without it the
  assistant answers "isn't available right now"). Each question's row is reserved before the model is called, in one
  locked database step, so parallel requests can't exceed the limits; failed questions still count.
- Privacy (review, 2026-10-17): questions and answers are **not stored**. The conversation lives in the browser tab;
  `assistant_usage` keeps only who asked and when, and `ai_usage` the tokens and cost. Keeping question text for
  product insight would need a retention period and a way to delete it first (Q-041).

## D-044 — AI assistant connection (MCP), phase 2: OAuth sign-in and service keys
**Status:** Provisional (team, PR #36, 2026-10-17). Built ahead of Q-039's default ("build after real owners use
phase 1"); the founder confirms or overrides it before it goes live. Built, not live: it goes live once migration
`20261017030000_mcp_oauth.sql` is applied and then the code is deployed.
- **Sign in with Braventa (OAuth 2.1).** Braventa runs its own authorization server, for its MCP server only (it isn't
  a way to log in to Braventa, and it isn't delegated to another provider): open dynamic client registration, PKCE
  S256, tokens bound to the MCP URL (RFC 8707), `iss` on every response (RFC 9207). claude.ai, Claude Desktop and
  Claude Code connectors and ChatGPT connect without a pasted key. Why self-hosted: each connection must be tied to one
  user, one business, one app and the MCP URL, and be listed and disconnected in Settings → Integrations.
- **Lifetimes.** Codes 10 minutes, one use. Access tokens 1 hour. Refresh tokens 30 days, rotated on every use;
  presenting a rotated one again ends the connection, except within 60 seconds while its replacement is unused
  (concurrent or retried refreshes). Scope `onboarding` only; `read` and `write` stay reserved.
- **Service keys (`brv_sk_`)** for automation (n8n, Zapier, scripts): organization-level, created and revoked by
  owners only, optional expiry (30, 90 or 365 days, or none), at most 10 active (unexpired). By design they belong to
  the business, not a person: they keep working after the owner who created them leaves, until revoked or expired.
  Only an owner can make someone an owner, so an admin can't promote themselves to create one.
- **Unchanged:** the access rule (D-036: the trial, then a plan) and approval in the app (D-013): no credential can
  confirm the diagnosis, accept plan items, approve drafts or publish.
- Resolves the OAuth half of Q-039. Spec: [MCP_SERVER.md](../architecture/MCP_SERVER.md) §3, §7 and §10; developer
  guide: [MCP_AND_API.md](../developers/MCP_AND_API.md).

## D-045 — Account types: Brand or Agency/Organization
**Status:** Founder (2026-10-18, in chat). Planned, not built.
- Basic / Pro / Premium stay the feature tiers (D-030 and D-039 unchanged). Each organization also gets an account
  type: **Brand** (one business) or **Agency/Organization** (many businesses, priced per extra brand).
- Why: renaming the tiers would supersede D-030's naming and need a fourth price; an account type needs one column and
  no copy changes. It is in line with the provisional defaults of Q-001 and Q-003.
- Changes: one planned column, `organizations.account_type`. No copy changes now.
- Open: the per-brand price. The research example (+$59 / +$149 per brand by tier) is unvalidated and not decided.
  Q-001 (owner or agency as the first buyer) stays open; the account type supports both, so ask the testers.
- Source: [SEATS_ROLES_MODULES_2026-10-17.md](../research/SEATS_ROLES_MODULES_2026-10-17.md) §4;
  [research README](../research/README.md) §2, decision 1.

## D-046 — Team seats: eight fixed roles and seat allowances
**Status:** Founder (2026-10-18, in chat). Foundation built 2026-10-23 (research README §4 step 4); seats,
invitations and the role UI are not.
- **Built:** `member_role` holds the eight roles (the old `member` value became `analyst`, the least privilege; 0
  rows in production were affected: 2 owners, nothing else); the permission matrix as pure, unit-tested code in
  `web/src/lib/team/roles.ts` (`can(role, permission)`) and as `has_permission(org, perm)` in the database, with a
  test proving the two equal; every owner-only check in the app goes through `integrations.connect` (Search Console) or
  `keys.manage_any` (service keys, disconnecting another person's app), so nothing changed for owners; the write
  actions check `analysis.run`, `profile.edit`, `diagnosis.correct` and `plan_items.update_any`; draft approval
  needs `content.approve`, and approving one's own draft `content.approve_own` (owner only), in the action and in
  the `content_items` trigger, which also records `created_by`; the MCP connection acts with the key's user's role
  (service keys keep their rule, D-044); Settings shows the user's role. Spec and open items:
  [ROLES_AND_PERMISSIONS.md](../architecture/ROLES_AND_PERMISSIONS.md).
- **Remains:** invitations (Q-010), seat limits and charging (Stripe), a role UI and audit log, client approvers
  (D-047), `keys.manage_own` on personal keys, `plan_items.update_own` (needs an assignee), RLS write policies per
  permission. Matrix cells that differ from the research (Admin and keys, client approver, Admin and integrations)
  are listed there for the founder to confirm or widen (Q-050).
- **Roles:** Owner, Admin, Marketing manager, Social media manager, Copywriter, Content creator, Analyst and Client
  approver, with fixed permissions. No custom roles in v1.
- **Approval:** no one approves their own work except the Owner, so a one-person business still works; every approval
  is recorded. The database still sets the approver (D-018); this matrix answers D-018's "who may approve".
- **Integrations:** connect and disconnect stay Owner-only, as in code today; Admins don't connect by default.
- **Seats:** 2 / 5 / 10 full seats included on Basic / Pro / Premium; an extra full seat is $29 / $39 / quoted (target
  $35). Analyst seats free up to 5 / 10 / unlimited; client approvers free up to 3 / 10 / unlimited (D-047). As with
  D-039, seat prices stay off the site until checkout exists.
- **Needs:** invitations need transactional email (Q-010); charging for seats needs Stripe.
- **Changes:** ROADMAP.md Next item 8. Team access no longer waits for agencies to prove a buying segment.
- Source: [SEATS_ROLES_MODULES_2026-10-17.md](../research/SEATS_ROLES_MODULES_2026-10-17.md) §0–§3;
  [research README](../research/README.md) §2, decision 2.

## D-047 — Client approvers on every tier
**Status:** Founder (2026-10-18, in chat). Planned, not built.
- Outside client approvers are free on Basic up to 3, Pro up to 10 and Premium unlimited (option A).
- Why: client sign-off is core to D-013. Most tools sell it on middle or upper tiers, so this is a deliberate
  difference.
- The approval link is single-use and signed, its token is stored only as a hash, it expires after 7 days, and every
  action through it is logged.
- Depends on D-045 and D-046. Approval notifications need transactional email (Q-010).
- Source: [SEATS_ROLES_MODULES_2026-10-17.md](../research/SEATS_ROLES_MODULES_2026-10-17.md) §1, §3;
  [SOCIAL_PLANNER_2026-10-17.md](../research/SOCIAL_PLANNER_2026-10-17.md) §1, §3 ("Client approval link");
  [research README](../research/README.md) §2, decision 3.

## D-048 — First CRM: HubSpot, read-only
**Status:** Founder (2026-10-18, in chat). Planned, not built. Resolves Q-011.
- HubSpot read-only comes first (the owner's own portal; unrelated to D-034's contact pipeline), over direct REST with
  per-tenant OAuth, not vendor MCP servers. It ships as an unlisted marketplace app on platform 2026.09, API version
  `2026-09` (up to 25 installs, no review). Keeps D-041's order: HubSpot is step 4.
- GoHighLevel is the alternate if the testers turn out to be agency-managed; ask them before building. Salesforce and
  Keap ingestion are deferred.
- Zero-build path for Claude users: connect Claude to both Braventa's MCP server and the vendor's official server.
- `forms` and `content` are dropped from the planned read scopes: neither is read-only.
- Build: widen the `integration_connections` provider check (Search Console only today), OAuth start and callback
  routes, a CRM snapshot table and a `tiers.ts` gate entry.
- CRM data is personal data. Before the feature launches: Privacy Policy and sub-processor updates, retention rules,
  and deletion on disconnect.
- Source: [CRM_MCP_AND_DATA_MODEL_2026-10-17.md](../research/CRM_MCP_AND_DATA_MODEL_2026-10-17.md) §A1–§A3;
  [research README](../research/README.md) §2, decision 4.

## D-049 — Social publishing: plan in Braventa, publish through a vendor
**Status:** Founder (2026-10-18, in chat). Planned, not built. Amends D-041 for publishing.
- Braventa builds the planner, calendar, approvals, revisions and audit trail. Publishing is bought from Outstand after
  a one-week spike, behind a `Publisher` interface, with Zernio and Ayrshare as fallbacks. High-volume networks move
  to direct connectors later.
- Launch networks: Facebook Pages, Instagram, Google Business Profile and LinkedIn. X is skipped. TikTok, YouTube
  Shorts, Pinterest, Threads and Bluesky come later. Google Business Profile approval must not block the launch.
- Scheduler: in-app (Supabase `pg_cron` calling a dispatch route), not n8n. This amends D-041's "executed by n8n" for
  publishing only; other D-041 actions are unchanged, and n8n can take over later.
- Publishing is a Pro feature (D-030, D-041). A variant publishes only if its approved revision is current (D-013,
  enforced in the database). Tokens encrypted (as Search Console's are today, `secret-box.ts`), minimal scopes,
  revocation; an idempotency key guards against double posts.
- Publishing stays out of the MVP (MVP_SCOPE.md §4); until it ships, copy must not claim it. Touches Q-031 (execution
  model) and Q-006 (n8n host).
- Source: [SOCIAL_PLANNER_2026-10-17.md](../research/SOCIAL_PLANNER_2026-10-17.md);
  [research README](../research/README.md) §2, decision 5.

## D-050 — Public API: read-only v1
**Status:** Founder (2026-10-18, in chat). Planned, not built. Answers Q-039.
- v1 is read-only: objects GET, search and properties over existing tables, with the same handlers exposed as MCP
  tools. Each tool declares its scope; the default is deny.
- API and MCP clients may create drafts and request approval. Approval and publishing happen only in the app;
  `content.publish` is never offered. `guard_content_item_write` doesn't bind `service_role`, so handlers must refuse
  `approved`, `scheduled` and `published` in code.
- Auth phase 1: generalize `mcp_access_keys` into `api_keys` with `scopes text[]`, storing only a hash and a short
  prefix. New `api_keys` and `api_audit_log` tables, with per-key rate limits.
- Q-039: read-only plan and draft tools, yes, as part of v1.
- Open: path versioning (`/api/v1` or date-based, such as `/api/2026-11/`).
- Source: [CRM_MCP_AND_DATA_MODEL_2026-10-17.md](../research/CRM_MCP_AND_DATA_MODEL_2026-10-17.md) §B1–§B4;
  [research README](../research/README.md) §2, decision 6.

## D-051 — Feature modules, and Search visibility as the first new one
**Status:** Founder (2026-10-18, in chat). Steps 1–5 built 2026-10-23 (team; spec in
[FEATURE_MODULES.md](../architecture/FEATURE_MODULES.md)); step 6 built 2026-10-23 (team, with a provisional
sub-score definition: the addendum below).
- A module registry (`web/src/lib/modules/registry.ts`), `organization_modules` and `module_runs` tables, and
  `module_id` on findings and plan items. **Built:** registry with the fourteen modules, their tier, display name,
  score weight and live flag (four live: business intelligence, website and technical SEO, conversion and messaging,
  content studio); migration `feature_modules` (domain `module_id`, both tables, both columns, backfill of existing
  findings by provenance and plan items by area); the pipeline records a `module_runs` row per module that ran.
- The growth score becomes a renormalized weighted mean of the enabled modules that have evidence, stored with
  `score_version` and the modules used. Scores show "based on N modules". **Built:** `lib/modules/score.ts`; the
  assessed scores are the conversion and messaging module's parts (0.65) and PageSpeed mobile the website and
  technical SEO module's (0.35), summed in the pre-module order, so with today's modules every score is unchanged
  (`score.test.ts` proves it against the old formula on every stored report, a 78,125-case grid and 20,000 random
  inputs). `SCORE_VERSION` stays 1 because the formula didn't change. The report's score tile says "Based on N
  modules" with their names; nothing else in the UI changed.
- Six-step path: steps 1–5 change no behavior. Step 6 adds the first new module, Search visibility: Search Console
  data in the diagnosis. **Built (2026-10-23):** the scoring step calls `searchConsoleSummaryForPrompt` for
  organizations whose enabled modules include Search visibility (Pro, Premium and the trial) and gives the summary
  to the diagnosis model as one fenced block with the ref `G1`, marked as third-party data; a finding that cites it
  is Verified and carries `module_id` `search_visibility`; a correction re-runs the diagnosis with the same summary.
  `module_runs` gets a `search_visibility` row whenever the module is enabled (`completed` with a summary, `partial`
  without). Not built: `audit_findings.module_id` (every audit finding is still website and technical SEO), splitting
  `prompts.ts` into module fragments and looping the evidence job over enabled modules (Search Console is synced
  outside the evidence job, so no second module collects evidence there yet), per-module report sections and a module
  switch in the app (FEATURE_MODULES.md §8).
- **Addendum, provisional (team, 2026-10-23): the Search visibility sub-score and weight.** The research §5 names
  the sub-score without a formula, so this one is proposed and reviewed after launch (D-052). Five parts from the
  latest snapshot (28 days against the 28 before): average position 0.04 (3 or better = 100, 30 or worse = 0),
  click-through rate 0.02 (5% = 100), clicks against the previous window 0.02 (unchanged = 50, doubled = 100),
  pages with impressions as a share of the crawled pages 0.01, the home page's Google index verdict 0.01. Weight
  0.10 against the Basic modules' 1.00, so about 9% of a full score; a window with fewer than 10 impressions scores
  nothing. `SCORE_VERSION` is 2; an organization without Search Console evidence gets exactly the version 1 score
  (`score.test.ts` proves it). Definition: [FEATURE_MODULES.md](../architecture/FEATURE_MODULES.md) §9.
- Module-to-tier map. Basic: business intelligence, website and technical SEO, conversion and messaging, content
  studio. Pro: search visibility, local SEO, social media, search ads, email marketing, video, CRM intelligence,
  analytics, automation. Premium: custom integrations. Module names stay descriptive (D-010).
- D-035's growth score explanation changed with step 6: the public copy says the score is based on the modules that
  have evidence for the business, named on the report, with Search Console data a small third part on Pro.
- Source: [SEATS_ROLES_MODULES_2026-10-17.md](../research/SEATS_ROLES_MODULES_2026-10-17.md) §0, §5, §6;
  [research README](../research/README.md) §2, decision 7.

## D-052 — Research before building
**Status:** Founder (2026-10-18, in chat). A working rule; nothing to build.
- Any change that adds an integration, a paid vendor, a table, a price or a public claim follows the eight steps in
  the Seats doc §7: brief, read the repo, look outside, options, decide, spec, build, review after launch. Smaller
  changes don't need it.
- Why: applied to every change, the process slows work; the threshold keeps the effort in proportion.
- Also added to CLAUDE.md's working rules. The three 2026-10-17 research docs are its first use.
- Source: [SEATS_ROLES_MODULES_2026-10-17.md](../research/SEATS_ROLES_MODULES_2026-10-17.md) §7;
  [research README](../research/README.md) §2, decision 8.

## D-053 — Provider applications under Pixel Marketing Design
**Status:** Founder (2026-10-18, in chat). Planned.
- Apply now under Pixel Marketing Design rather than wait for the US LLC, to start Meta Business Verification and the
  LinkedIn Community Management API review; both need a registered legal organization.
- Before each application, check the provider's rules for moving an app to another business. Plan to transfer the
  apps to the Braventa LLC once it's registered.
- Also start the steps that need no entity: the Google Business Profile API access request, the HubSpot developer app
  (unlisted, platform 2026.09) and a TikTok app shell.
- Why: provider reviews drive the timeline more than code does, and these steps are needed under every option.
- Open: who builds which connector when (build order in the research README §4).
- Source: [research README](../research/README.md) §3.

## D-054 — "Connect your tools": an onboarding step without a status of its own
**Status:** Provisional (team, branch `feat/connect-your-tools`, 2026-10-18). Implements step 1 of D-041
([INTEGRATIONS_ROADMAP.md](../product/INTEGRATIONS_ROADMAP.md) §2, §5).
- `/onboarding/[sessionId]/connect` sits between confirming priorities and the follow-up questions (step 4 of 5). It
  is optional: Continue with nothing connected still builds the plan. Only Google Search Console can be connected
  (Pro and the Pro trial, owner only; Basic sees it paused). GA4, Google Business Profile, HubSpot, Facebook and
  Instagram, LinkedIn, Canva and HeyGen are Coming soon cards with no connect action; suggestions come from the
  confirmed pain points and the BI-12 tools, without an AI call. Its data still isn't used in the diagnosis (D-051).
- **No new status, table or column (D-052).** `onboarding_sessions.status` stays as it is: `following_up` with no
  pending follow-up means the connect step comes next, and `/questions` forwards there. Submitting the review now only
  saves it; the step's Continue generates the follow-up round (or builds the plan when nothing is worth asking).
  `onboardingPath` is unchanged; `followUpStep` (`lib/onboarding/steps.ts`, unit-tested) decides connect or questions
  for the questions page, Continue and `braventa_get_status`. The report's resume button says Continue setup, which is
  true for both pages.
- **MCP skips the step.** `braventa_confirm_priorities` still generates the questions itself. For a session confirmed in
  the web app and continued by an assistant, `braventa_get_follow_up_questions` and `braventa_get_status` say to call
  `braventa_answer_follow_up_questions` with no answers. Connections are authorized only in Braventa.
- **Return after Google's consent screen.** The start route, callback and Settings actions return to an exact
  allowlist (`lib/integrations/return-to.ts`): `/settings` or `/onboarding/<lowercase uuid>/connect`, checked again when
  read from the sealed state cookie. Anything else returns to Settings, so there is no open redirect.
- The Search Console card is shared with Settings → Connections, which also lists the Coming soon tools.
- Open: connecting for a business that isn't the user's first membership (Q-047).

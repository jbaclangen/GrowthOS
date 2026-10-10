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
| D-020 | 2026-10-10 | AI assistant is not in the MVP but is committed for the Next phase (resolves Q-021) | Founder |
| D-021 | 2026-10-10 | Guided onboarding questions (BI-12) are in the MVP (resolves Q-022) | Founder |
| D-022 | 2026-10-10 | Opportunity tracking (MS-5) and the "do this first" summary (UX-1) are in the MVP (resolves Q-023) | Founder |
| D-023 | 2026-10-10 | Withdrawn — this number was briefly used for the crawler/approval-rules decision, which keeps its original ID D-018 | Withdrawn |
| D-024 | 2026-10-10 | Paid AI lineup: Sonnet for profile, plan and drafts; Opus for opportunities and for drafts in regulated industries; analyses grounded in source data | Provisional |
| D-025 | 2026-10-10 | Founder approval of the brand system (messaging, palette, US English) | Founder |
| D-026 | 2026-10-10 | New logo: **Monolith** symbol + **Syncopate Bold** uppercase wordmark | Superseded by D-027 |
| D-027 | 2026-10-10 | Logo from the founder's reference: heavy **B** on a rounded tile with a **Violet dot**; **BRAVENTA.IO** in Quicksand Medium | Founder |

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
**Status:** Founder (2026-10-10 infrastructure session). App: Vercel (Hobby tier during the proof of
concept) at `app.braventa.io`. Marketing site: `braventa.io`, Hostinger, built later. The brief's
"Hostinger" line refers to the marketing site, so there is no conflict. n8n host: see
[`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) Q-006.

## D-012 — Pricing not decided
**Status:** Founder (brief §4). Documentation may describe a pricing *framework* with clearly labelled
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

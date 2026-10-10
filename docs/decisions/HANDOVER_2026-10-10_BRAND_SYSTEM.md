# Handover — Braventa brand system, product blueprint, and project memory

Implementation report for the founder brief of 2026-10-10
([`FOUNDER_BRIEF_2026-10-10.md`](FOUNDER_BRIEF_2026-10-10.md)) plus the mid-session typography instruction
(Quicksand + Comfortaa, D-015). Nothing was committed to git, deployed, or published externally.

## 1. Deliverables

| # | Deliverable | Status | Where |
|---|---|---|---|
| 1 | Master Brand Bible | **Complete** | `docs/brand/BRAND_BIBLE.md` (+ `BRAND_POSITIONING.md`, `VOICE_AND_MESSAGING.md`, `VISUAL_IDENTITY.md`) |
| 2 | Product and business specification | **Complete** | `docs/product/` (overview, Growth Loop methodology, requirements, MVP scope, journeys, roadmap + pricing *framework*) |
| 3 | Claude Code project memory | **Complete** | `CLAUDE.md` (rewritten, concise), `README.md` (new), `docs/decisions/*` |
| 4 | Reusable design system | **Complete, connected to the app** | `design-system/tokens.json` → `npm run tokens` → `web/src/styles/tokens.css` → `globals.css` |
| 5 | Marketing and communication kit | **Complete** (templates; nothing sent) | `docs/marketing/` |
| 6 | Brand asset kit | **Produced — awaiting founder sign-off** | `web/public/brand/`, `web/src/app/{icon.svg,favicon.ico,apple-icon.png,opengraph-image.png}` |
| 7 | Brand application audit | **Complete; safe fixes applied** | §5 below |
| 8 | Handover report | This file | — |

## 2. Final brand decisions
Full rationale in [`DECISION_LOG.md`](DECISION_LOG.md).
- **Name:** Braventa; GrowthOS is codename only (D-001/002, founder).
- **Methodology:** the Braventa Growth Loop — Understand · Act · Improve, nine steps (D-004, provisional).
- **Messaging:** tagline "Run your growth as one system."; headline "Know what to do next. Then get it done."; category
  "Business growth system" (D-005, provisional).
- **Colour:** Ink `#0B0C10`, Paper `#F4F4F1`, Cobalt `#2340F5` (action), Volt `#D4F53C` (signal) — derived from the
  United Carriers (single cobalt, ink/white, accountable-operator tone) and Teamwork Graph (layered charcoal
  surfaces, node graph, status chips, one highlight colour) references (D-006, provisional).
- **Typography:** Quicksand headings and logo, Comfortaa everything else (D-015, **founder**). Supersedes the
  Archivo/Geist proposal (D-007).
- **Logo:** Waypoint symbol (a "B" of two forward chevrons leading to a detached node) + lowercase Quicksand Bold
  wordmark (D-008/D-017, provisional).
- **Spelling:** US English (D-016, provisional pending Q-002).

## 3. Design tokens established
24 semantic colour roles × light/dark, full Ink/Cobalt/Volt/status scales, chart palette, font families, type
scale + display size, tracking, weights, radii (4/8/12/16/pill), shadows, motion durations/easings, layout
widths. The build **enforces WCAG AA** for 18 text/background pairs per theme (lowest: dark accent on surface,
4.90:1) and `npm run tokens:check` detects stale CSS. Existing Tailwind class names (`bg-accent`, `text-muted`,
`card`, `btn-primary`, …) were kept so no page needed restyling.

## 4. Changes to the existing implementation

| File | Change |
|---|---|
| `web/src/app/globals.css` | Imports generated tokens; primitives now token-driven; added `.eyebrow`, `.heading`, `.display`, `.chip`, global focus ring, reduced-motion rule, Quicksand on `h1`–`h4` |
| `web/src/styles/tokens.css` | New, generated |
| `web/scripts/build-tokens.mjs`, `web/package.json` | Token compiler + `tokens` / `tokens:check` scripts |
| `web/src/app/layout.tsx` | Quicksand + Comfortaa via `next/font`; `<Logo>` in header; Braventa metadata with `%s · Braventa` title template |
| `web/src/components/brand/logo.tsx`, `logo-geometry.ts` | New theme-aware inline logo (geometry generated) |
| `web/src/app/{icon.svg,favicon.ico,apple-icon.png,opengraph-image.png,opengraph-image.alt.txt}` | Brand favicons and social preview (replaced the Next.js default favicon) |
| Page files (`login`, `onboarding`, `dashboard`, `analysis/[id]`) | "GrowthOS" → Braventa; US spelling; clearer empty-state and progress copy; status/metadata tags use the new `.chip` tones; removed a hard-coded `text-white dark:text-black` |
| `web/src/app/login/actions.ts` | Sign-in errors translated to plain language for the two common cases (unconfirmed email, wrong password) |
| `web/src/lib/pipeline/website-intel.ts` | Progress step labels ("Drafting your first posts") |
| `web/src/lib/integrations/{crawler,openrouter}.ts` | User-Agent and `X-Title` now identify as Braventa |

No database, auth, AI routing, or pipeline logic was changed.

## 5. Brand application audit (existing app)

| Finding | Severity | Action |
|---|---|---|
| "GrowthOS" in header, titles, onboarding/login copy, crawler UA, OpenRouter title | High | **Fixed** |
| Teal accent and Geist fonts conflicted with the new identity | High | **Fixed** via tokens and fonts |
| Mixed UK/US spelling | Medium | **Fixed** in UI strings (AI prompts unchanged — not user-facing) |
| Status shown as coloured text only | Medium | **Fixed** — chips with words + tones |
| Hard-coded colours (`text-white dark:text-black`) | Low | **Fixed** |
| `Tag` / `StatusTag` / `Field` / `ListCard` defined inside the analysis page | Low | Open — promote to `web/src/components/` when a second page needs them |
| Raw upstream error text shown on the analysis page (`job.error`) and on sign-up | Medium | Open — map to plain-language messages (VOICE §12) |
| No provenance labels beyond "Google" on PageSpeed bars | Medium | Open — MVP item in `MVP_SCOPE.md` |
| No password-reset screen (security email template links to one) | Medium | Open — MVP item |
| Supabase Auth email templates (confirmation) still default-branded | Medium | Open — needs editing in the Supabase dashboard (founder) |
| Internal header `X-GrowthOS-Secret` | Low | Left intentionally (Q-020) |

Security and correctness findings surfaced by the architecture review (SSRF exposure in the crawler, members can
write `content_items.status` directly through the Data API, budget check skipped when the org lookup fails, no
OpenRouter timeout, non-constant-time secret comparison, stuck `running` jobs, Vercel `maxDuration`) are recorded
with file references in [`SECURITY_AND_PRIVACY.md`](../architecture/SECURITY_AND_PRIVACY.md) and
[`SYSTEM_ARCHITECTURE.md`](../architecture/SYSTEM_ARCHITECTURE.md). They were **not fixed** in this change (out of
brand scope).

## 6. Validation performed
- `npx tsc --noEmit` — clean. `npm run lint` — clean. `npm run tokens:check` — up to date, all contrast pairs pass.
- Running dev server: `/login` rendered and screenshotted in light and dark; computed styles confirmed Quicksand on
  headings, Comfortaa on body, Cobalt action colour, logo node Cobalt (light) / Volt (dark); no console errors.
  Authenticated pages (dashboard, analysis) were **not** visually checked (no test account used); they compiled
  and type-check.
- Every generated logo, icon, and social banner was rendered to PNG and inspected; the social graph motif was
  repositioned after it overlapped headlines; the avatar glyph was inset for circular crops.
- All relative links and anchors across 27 Markdown files resolve.
- Docs written in parallel were cross-checked against the code and corrected where the rename made them stale.
- `npm run build` was **not** run (the founder's dev server was using the project at the time).

## 7. Assets requiring review
- Waypoint symbol and lowercase wordmark (sign-off turns "Draft" → "Ready" in the asset inventory).
- Social banners on the actual LinkedIn / X layouts.
- Comfortaa as the UI/body face on dense screens (Q-012).
- Proposed values (BRAND_POSITIONING §10) and messaging lines (D-005).

## 8. Unresolved decisions
See [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md). Most consequential (P1): first buyer — owner or agency (Q-001); first
market (Q-002); Vercel duration limit vs moving the pipeline to n8n (Q-004); when to switch to paid AI and target
cost per run (Q-005); n8n host (Q-006); which providers may receive customer data (Q-007); retention/deletion
(Q-008); billing and email providers (Q-010); trademark search (Q-014); Vercel Pro before charging (Q-019).

## 9. Requires external credentials or human action
Trademark search · Canva Brand Kit upload · Supabase Auth email template branding · social profile setup
(handles unverified) · email provider + SPF/DKIM/DMARC for braventa.io · marketing site build on Hostinger.
None of these were done; nothing was claimed as done.

## 10. Recommended next steps
1. Founder review of the logo, palette, and messaging (30 minutes with `BRAND_BIBLE.md` + `web/public/brand/`).
2. Commit this work (it sits alongside the earlier uncommitted MVP changes).
3. Fix the P1 security items (crawler SSRF guard, restrict direct `content_items` writes) before any external user.
4. Finish the MVP items in `MVP_SCOPE.md` §3 in order (copy/export approved drafts, edit drafts, regenerate one,
   edit profile, provenance labels, password reset, paid AI mode).
5. Decide Q-004 and deploy to app.braventa.io.
6. Build the braventa.io landing page from `WEBSITE_MESSAGING.md` using the same tokens.

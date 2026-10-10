# Braventa — MVP scope

This is the authoritative reference for "is this in scope right now?". It states the MVP goal, what is
live today (with file references), what belongs to the MVP but is not built yet, what is explicitly out
of scope, how the MVP will be validated with paying customers, and a checklist every future Claude
Code session must run before adding a feature. The founder's instruction is to build the smallest set
of capabilities that delivers measurable value; when in doubt, a feature is out of scope.

**Status / last reviewed: 2026-10-10.** "Live" items verified in code on `main` (`17ab57a` plus
working-tree changes). Items marked **Provisional** are recommendations awaiting founder confirmation;
record confirmation in [DECISION_LOG.md](../decisions/DECISION_LOG.md).

---

## 1. MVP goal

> A service-business owner enters their website and, in one sitting, gets an assessment they believe,
> a short list of what to fix first, and a month of on-brand content they can approve, adjust, and use
> the same day — and they come back for the next batch.

That is the smallest thing a real paying service business would value: it replaces hours of "what
should I post and what should I fix?" with a prioritised plan and usable drafts. It covers the
**Understand** stage and the **plan, create, approve** half of **Act** in the Growth Loop
([BUSINESS_METHODOLOGY.md](BUSINESS_METHODOLOGY.md)). Execution through connected tools and the
**Improve** stage come after the MVP is validated.

**Value test:** the customer leaves with something they use outside Braventa (posts copied or
exported and published, a website fix handed to their web person). If they cannot take the output
away, the MVP has not delivered value.

## 2. What is live today

All paths relative to the repository root.

| Capability | What works | Evidence |
|---|---|---|
| Sign-up, email confirmation, sign-in, sign-out | Email and password; confirmation link exchanges a code for a session | `web/src/app/login/actions.ts`, `web/src/app/login/auth-form.tsx`, `web/src/app/auth/callback/route.ts`, `web/src/app/page.tsx` |
| Route protection | Signed-out users are redirected to `/login` | `web/src/proxy.ts` |
| Organization creation | First analysis creates an organization with the user as owner | `create_organization` in `supabase/migrations/20261010000000_foundation.sql`; called from `web/src/app/analysis/actions.ts` |
| Start an analysis | Website URL plus optional business name; queues an `ai_jobs` row and runs the pipeline after the response | `web/src/app/onboarding/page.tsx`, `web/src/app/onboarding/start-form.tsx`, `startAnalysis` in `web/src/app/analysis/actions.ts` |
| Website reading | Home page plus up to 5 priority pages; homepage technical signals | `web/src/lib/integrations/crawler.ts` |
| PageSpeed | Google PageSpeed mobile scores; failure is tolerated | `web/src/lib/integrations/google.ts` |
| Business profile | AI-generated structured profile and brand voice | `runWebsiteIntel` in `web/src/lib/pipeline/website-intel.ts` |
| Growth score and five opportunities | Deterministic score from measured and assessed dimensions; ranked opportunities with evidence, first step, impact, effort | `computeGrowthScore`, `website_auditor` step in `website-intel.ts` |
| 30-day plan | Strategy (goal, audience, pillars, channels) and 20–30 dated items | `content_strategist` step in `website-intel.ts` |
| First five drafts | Drafted in brand voice with CTA, hashtags, image idea; status `needs_approval` | `content_writer` step in `website-intel.ts` |
| Progress and results page | Live step list while running; failure message; full results when done | `web/src/app/analysis/[id]/page.tsx`, `auto-refresh.tsx` |
| Approve / reject / undo | Per draft; records approver and time | `setContentStatus` in `web/src/app/analysis/actions.ts`; `web/src/app/analysis/[id]/controls.tsx` |
| Re-run analysis | Runs the whole pipeline again; page shows the latest results | `rerunAnalysis` in `web/src/app/analysis/actions.ts` |
| Dashboard | All businesses in the organization with score and latest status | `web/src/app/dashboard/page.tsx` |
| AI routing, budget, usage log | Logical workers mapped to models; free/paid modes; monthly budget check; per-call usage log | `web/src/lib/ai/router.ts`, `ai_usage`, `ai_spend_mtd` |
| Tenant isolation | RLS on every tenant table via `is_member()` | both files in `supabase/migrations/` |
| Integration health check (developer tool) | Checks Supabase, OpenRouter, n8n, PageSpeed; disabled in production | `web/src/app/api/health/integrations/route.ts` |

**Observed in real use (2026-10-10):** 2 analysis runs — 1 succeeded in 129 s with 5 drafts saved; 1
failed at the profiling step with a raw `fetch failed` error (free-model network failure). `ai_usage`
recorded only the successful run's 4 calls: failed calls and latency are not logged
([AI_ROUTING_AND_COSTS.md](../architecture/AI_ROUTING_AND_COSTS.md)). Comparison with the product vision:
[IMPLEMENTATION_ASSESSMENT_2026-10-10.md](IMPLEMENTATION_ASSESSMENT_2026-10-10.md).

**Exists in the schema or code, but is not a feature:** `campaigns`, `knowledge_chunks` and
`match_knowledge` (no embeddings written), `integrations` (no connections), `subscriptions` (no
billing), `platform_admins` (no admin UI), content states `draft`, `in_qa`, `scheduled`, `published`
(never set), the `seo_analyst`, `crm_analyst`, `campaign_planner`, `qa_reviewer`,
`marketing_assistant`, and `extractor` workers (never called), and the n8n client
(`web/src/lib/integrations/n8n.ts`, unused by the app).

## 3. In the MVP but not built yet — Provisional

Each item is the smallest addition that closes a gap in the value test. Ordered by recommended build
sequence.

| # | Item | Requirement | Why it is in the MVP | Size |
|---|---|---|---|---|
| 1 | **Copy and export approved drafts** | CS-7 | Without it the customer cannot take the value out of Braventa; approval currently leads nowhere. Copy-to-clipboard per draft plus a plain-text/CSV export of approved items. No integrations needed. | Small |
| 2 | **Edit a draft before approving** | CS-5 | Owners will not approve text they cannot adjust; rejection is the only option today. Inline edit of title and body; edit returns the item to `needs_approval`. | Small |
| 3 | **Regenerate one draft** (with an optional instruction such as "shorter" or "mention free quotes") | CS-6 | Turns a rejection into a better draft instead of a dead end. One `content_writer` call through `runWorker`. | Small |
| 4 | **Edit the business profile** | BI-5, BI-6 | The profile is inferred from the website and will be wrong in places; every downstream output inherits the errors. Edited fields are labelled "From you" and survive re-runs. Also the first real step toward the provenance model. | Medium |
| 5 | **Draft the next batch** | CS-8 | A 30-day plan with only five drafts delivers about one week of value; the next batch is the reason to return weekly (and the natural usage unit for pricing). | Small |
| 6 | **Provenance labels on the results page** | BI-6, MS-2 | Trust: mark assessed scores and profile fields as inferred, measured values with source and date. Labels only; per-field storage can follow. | Small |
| 7 | **Password reset** | PL-5 | Paying customers will lose passwords; without it, support is manual. | Small |
| 8 | **Paid AI mode for paying customers** | NFR performance | Free models take about 3–4 minutes and are rate-limited (~50 requests/day). A paying customer needs reliable runs; switching is a configuration change (`AI_MODE=paid`) plus a per-run cost estimate. | Config |
| 9 | **User-facing brand rename completion** | D-003 | Done 2026-10-10 for page titles, header logo, metadata, login/onboarding copy, crawler User-Agent, and OpenRouter title. Remaining: transactional email templates in Supabase Auth settings (configured in the Supabase dashboard, not in code). | Small |

**Considered and deferred: HubSpot read-only summary (CRM-1, CRM-2).** It is the strongest
differentiator and the founder's area of experience, but it needs a HubSpot public app, OAuth, token
storage in Vault, and data-handling decisions, and it only helps customers who use HubSpot. Recommended
as the **first Next-phase item**, built for two or three design partners who use HubSpot, rather than
as an MVP blocker. Revisit if early customers are predominantly HubSpot users (see
[OPEN_QUESTIONS.md](../decisions/OPEN_QUESTIONS.md)).

## 4. Explicitly out of scope for the MVP

Do not build these without a decision recorded in [DECISION_LOG.md](../decisions/DECISION_LOG.md).

- Publishing or scheduling to any social network, Google Business Profile, WordPress, or email tool.
- Any n8n workflow triggered by the app; trigger-based or scheduled automations.
- CRM connections of any kind (HubSpot is Next phase).
- Analytics integrations (GA4, Search Console) and performance reporting.
- Billing, Stripe, plan enforcement in the UI (pricing is undecided, D-012).
- Team invitations, roles UI, organization switching, client portals for agencies.
- Long-form content (blogs, email campaigns, video scripts), repurposing, image generation.
- Automated QA reviewer step (manual approval is the MVP quality gate).
- Knowledge-base embeddings, document upload, and a chat assistant.
- Campaign objects and campaign planning.
- Dedicated website audit report beyond the assessment.
- Admin console, white-labelling, public API, mobile apps.
- Marketing site (braventa.io) — separate project (D-011).

## 5. Success metrics for validation with paying customers

Targets are **Assumptions — to be confirmed** with the founder; they exist so validation has a pass/fail line.

| Metric | Definition | Assumed target | Measured from |
|---|---|---|---|
| Activation | Share of sign-ups who complete one analysis | 70% | `ai_jobs` (succeeded) vs users |
| Run success rate | Analyses that finish without failure | 95% (paid mode) | `ai_jobs.status` |
| Time to first value | Sign-up to results page | Under 10 minutes | auth `created_at` → `ai_jobs.finished_at` |
| Draft acceptance | Drafts approved (with or without edits) out of drafts reviewed | 60% | `content_items.status` |
| Take-away rate | Approved drafts copied or exported | 50% of approved | Requires event logging with item 1 |
| Profile correction rate | Businesses whose profile was edited | Tracked, no target (high values mean inference needs work) | Requires item 4 |
| Weekly return | Customers who generate or approve a new batch in 3 of their first 4 weeks | 40% | `content_items` activity |
| Willingness to pay | Design partners converting to a paid plan after the trial | 3 of first 10 | Manual during validation |
| Cost per analysis | AI cost per succeeded run in paid mode | Under the value-based ceiling set in the pricing framework | `ai_usage` grouped by `job_id` |
| Qualitative | "Would you be disappointed if you could no longer use Braventa?" — very disappointed | 40% | Interviews |

## 6. Before adding a feature — checklist for Claude Code sessions

Answer every question. If any answer is "no" or "unsure", stop and raise it with the founder instead
of building.

1. **Is it listed in section 2 or 3 of this file?** If it is in section 4 or not listed, it needs a
   recorded decision first.
2. **Which Growth Loop step does it serve?** Name it ([BUSINESS_METHODOLOGY.md](BUSINESS_METHODOLOGY.md)).
   If none, it probably does not belong.
3. **Does it help the MVP value test** — can the customer take more value out of Braventa because of it?
4. **Is there a requirement ID** in [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)? If not, add one
   with classification before building.
5. **Does it respect the architecture rules** in `CLAUDE.md` — Supabase as system of record, RLS with
   `organization_id` on new tables, AI only through `runWorker`, secrets server-only, admin client
   scoped to an authorised organization?
6. **Does anything get published or sent?** Then it needs an approval step (D-013) and must not ship
   before the integration is tested.
7. **Is every new data field or AI output assigned a provenance class** and labelled in the UI?
8. **Does the copy describe only what works today?** No planned capability presented as live; voice
   per [VOICE_AND_MESSAGING.md](../brand/VOICE_AND_MESSAGING.md); name is Braventa.
9. **Does it meet WCAG 2.2 AA** and use the shared UI states (section 1 of PRODUCT_REQUIREMENTS)?
10. **Is it the smallest version** that tests the idea? Prefer a copy button over an integration, a
    manual step over an automation.
11. **Will you update the docs** — this file's section 2, the status columns in
    PRODUCT_REQUIREMENTS and BUSINESS_METHODOLOGY, and [ROADMAP.md](ROADMAP.md) — in the same change?

## Related documents

- [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md) · [BUSINESS_METHODOLOGY.md](BUSINESS_METHODOLOGY.md) ·
  [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) · [USER_JOURNEYS.md](USER_JOURNEYS.md) · [ROADMAP.md](ROADMAP.md)
- [SYSTEM_ARCHITECTURE.md](../architecture/SYSTEM_ARCHITECTURE.md) · [INTEGRATIONS.md](../architecture/INTEGRATIONS.md)
- [DECISION_LOG.md](../decisions/DECISION_LOG.md) · [OPEN_QUESTIONS.md](../decisions/OPEN_QUESTIONS.md)

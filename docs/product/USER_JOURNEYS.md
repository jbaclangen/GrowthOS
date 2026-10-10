# Braventa — User journeys

This document describes how people use Braventa: the first-run journey, the returning weekly user,
the agency or consultant managing several businesses, a future HubSpot-connected journey, and the
ten-step business-model journey from the founder brief. Each journey distinguishes what works today
from what is planned, and records friction points observed in the current implementation so UX work
can target them.

**Status / last reviewed: 2026-10-10.** Current-state steps verified against the code on `main`
(`17ab57a` plus working-tree changes).

Step status keys: **Live** · **Partial** · **Planned**. Requirement IDs refer to
[PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md).

---

## 1. First run: sign-up to approved drafts

**Persona:** owner of a small service business (for example, a solar installer) with a website and
no marketing staff. **Goal:** find out what to focus on and get content they can use this week.

| # | Step | What happens | Status | Friction observed in the current implementation |
|---|---|---|---|---|
| 1 | Arrive at the app | `/` redirects to `/login` (or `/dashboard` if signed in) | Live | No public landing or explanation; the marketing site does not exist yet (D-011) |
| 2 | Sign up | Email and password (8+ characters) | Live | Sign-up and sign-in share one form with a mode toggle; easy to submit the wrong mode |
| 3 | Confirm email | "Check your email for a confirmation link" | Live | Leaves the app before any value is shown; confirmation emails can land in spam; the link lands on `/onboarding` only if the redirect URL is configured correctly |
| 4 | Enter website | `/onboarding`: website URL, optional business name, and three optional questions (main goal, service area, tools already used) | Live | Two required-feel fields stay at the top; the guided questions are optional and skippable (BI-12). Answers can be changed later on the results page |
| 4a | Discovery | `/onboarding/[id]`: "What's making it hardest for your business to grow right now?" Category toggles reveal pain points; optional free text; "Skip for now". The website is read in the background meanwhile, with its status shown | Live (ON-2, ON-4) | Ten categories can feel like a lot; the owner may not know which category fits, which is why free text exists |
| 4b | Confirm and prioritise | `/onboarding/[id]/review`: keep or drop the pain points (AI suggestions from the free text are marked and only close matches are pre-checked); choose a top three; "Continue" | Live (ON-3) | Suggestions are only as good as the owner's description; nothing is kept without the owner confirming it |
| 4c | A few more questions | `/onboarding/[id]/questions`: up to 4 short questions about the top three (two rounds of 2), each with why it is asked; choices or a short answer, "Doesn't apply", "Skip the rest and build my plan". Answers appear under "What you told us" and shape the plan | Live (ON-5) | Each round waits 2–4 s for the model to choose questions; the owner can leave at any step and resume (ON-6) |
| 5 | Wait for analysis | Progress page lists five steps, "about 3–4 minutes", refreshes every 4 s | Live | **3–4 minutes on free models** is long for a first impression; free models are rate-limited (about 50 requests a day across all users), so a run can fail when several people try at once |
| 6 | Read results | Growth score, component scores, business profile, strengths, gaps, competitors, five opportunities, 30-day plan, five drafts, full calendar | Live | Long single page with no summary of "do this first"; profile fields are not marked as inferred (BI-6); sites that render content with JavaScript yield thin crawls and weaker results |
| 7 | Correct the profile | — | Planned (BI-5) | Wrong inferences cannot be fixed; re-running repeats them |
| 8 | Review drafts | Approve, reject, or undo each of five drafts | Live | No edit (CS-5) or regenerate (CS-6), so a nearly-right draft can only be rejected |
| 9 | Use approved drafts | — | Planned (CS-7) | Approval leads nowhere: no copy button, no export, no publishing. The user must select text manually |
| 10 | Leave | — | — | No summary email or reminder; nothing prompts a return |

**Failure path:** if the run fails, the page shows the raw error plus "Free AI models are sometimes busy
or rate-limited. Try again in a minute" and a "Re-run analysis" button. The raw error text is technical;
it should be replaced with a plain-language message and next step.

**Target first-run (MVP complete):** sign up → confirm → website → results in under 90 s (paid mode) →
fix any wrong profile fields → edit or regenerate drafts → approve → copy or export → prompted to come
back for the next batch.

## 2. Returning weekly user

**Persona:** the same owner, one week later. **Goal:** get this week's content and see whether anything
has changed.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Sign in, land on `/dashboard`, see businesses with score and last analysis date | Live | Dashboard shows no next action or pending approvals |
| 2 | Open the business; see previous results | Live | |
| 3 | See what needs attention: drafts awaiting approval, next plan items | Partial | Status is visible per item; no "needs attention" summary |
| 4 | Draft the next batch from the 30-day plan | Planned (CS-8) | Today only the first five items are ever drafted; the other plan items stay "Planned" |
| 5 | Edit, approve, export | Planned (CS-5, CS-7) | Approve exists; edit and export do not |
| 6 | Re-run the assessment after website changes and see what improved | Partial (MS-9) | Re-run works but replaces the view; no comparison with the previous score; a new plan and drafts are generated each time |
| 7 | Weekly summary of what changed and what to do next | Planned (AN-4) | |

**Observation:** without "draft the next batch", there is no reason to return weekly. This is why CS-8
is recommended for the MVP ([MVP_SCOPE.md](MVP_SCOPE.md#3-in-the-mvp-but-not-built-yet--provisional)).

## 3. Agency or consultant managing several businesses

**Persona:** a freelance marketer or small agency serving five to twenty local service businesses.
**Goal:** assess and produce content for each client efficiently, keeping clients separate.

**What the data model supports today:** organizations, memberships with roles (`owner`, `admin`,
`member`), and several business profiles per organization. Platform admins can read every tenant.

**What the product does today:** a user gets one organization (created on first analysis), and
`getCurrentOrg()` in `web/src/lib/auth.ts` always uses the first membership. Within that organization the
user can analyse several websites; the dashboard lists them all.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Analyze several client websites from one account | Live | All clients sit in the agency's single organization |
| 2 | Keep clients isolated from one another | Partial | Business profiles are separate records, but all share one organization, AI budget, and member list. A client given access would see every other client |
| 3 | One organization per client, with an organization switcher | Planned (PL-6) | Requires a decision on the tenancy model for agencies (see open questions) |
| 4 | Invite colleagues or client approvers with roles | Planned (PL-6, CS-13) | RLS and roles exist; no invitation UI |
| 5 | Client approves drafts in a client view | Future vision | |
| 6 | Agency-level billing across clients | Planned (PL-7) | Pricing framework treats "businesses" as a usage dimension ([ROADMAP.md](ROADMAP.md)) |

**Observation:** the agency segment is plausible but unvalidated. Do not build agency features until
validation shows agencies, not owners, are the paying buyer.

## 4. HubSpot-connected journey — Future (Next phase), not implemented

Nothing in this journey exists today. HubSpot is the first CRM because of the founder's experience
(brief §3E); Braventa works alongside HubSpot and does not replace it.

1. Owner opens Settings → Integrations and connects HubSpot (OAuth, read-only scopes). (CRM-1)
2. Braventa syncs pipeline stages, deal counts, lead sources, and record completeness; values are
   labelled "Measured · HubSpot · synced {{date}}".
3. A CRM summary shows leads by source, stale deals, and data-quality issues. (CRM-2, CRM-3)
4. Braventa recommends follow-ups for specific stale deals and explains why. (CRM-4)
5. The growth assessment and the content plan now use CRM evidence (for example, a content pillar for
   the service with the most open deals).
6. Later: approved follow-ups become HubSpot tasks through an n8n workflow, each logged. (CRM-5, AU-3)
7. Disconnecting revokes the token and deletes stored credentials.

## 5. The business-model journey (brief §4)

| # | Step (brief §4) | Status | Current reality |
|---|---|---|---|
| 1 | Customer discovers Braventa | Planned | No marketing site, listings, or acquisition channel yet; access is by direct link |
| 2 | Signs up and creates a business profile | Live | Sign-up with email confirmation; profile created from a website URL |
| 3 | Connects supported tools or supplies business information | Partial | Supplies a website URL, name, and optionally a main goal, service area and tools in use (BI-12); no tool connections or uploads yet |
| 4 | Braventa develops an initial business intelligence profile | Live | Website-derived profile; not editable yet |
| 5 | Customer receives actionable recommendations | Live | Growth score, five opportunities with first steps, 30-day plan |
| 6 | Uses available modules and AI-assisted workflows | Partial | One pipeline; no separately usable modules |
| 7 | Reviews, approves, and executes work | Partial | Review and approve work; execution (publish, export, tasks) does not |
| 8 | System records activity and available performance information | Partial | Jobs, approvals, and AI usage recorded; no performance data |
| 9 | Continues through a subscription, subject to plan limits | Planned | No billing; plan limits not decided (D-012); only an internal AI budget (default USD 5/month per organization) |
| 10 | Buys higher-value implementation or managed services when needed | Planned | No services offered yet; framework in [ROADMAP.md](ROADMAP.md) |

## Related documents

- [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md) · [BUSINESS_METHODOLOGY.md](BUSINESS_METHODOLOGY.md) ·
  [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) · [MVP_SCOPE.md](MVP_SCOPE.md) · [ROADMAP.md](ROADMAP.md)
- [VOICE_AND_MESSAGING.md](../brand/VOICE_AND_MESSAGING.md) · [INTEGRATIONS.md](../architecture/INTEGRATIONS.md)
- [DECISION_LOG.md](../decisions/DECISION_LOG.md) · [OPEN_QUESTIONS.md](../decisions/OPEN_QUESTIONS.md)

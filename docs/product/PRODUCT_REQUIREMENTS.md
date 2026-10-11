# Braventa — Product requirements

This document states what each Braventa capability area (A–G from the founder brief §3) must do,
how it is classified (MVP, Next phase, Future vision), and how much of it is implemented today. It
defines the shared UI states every module uses, acceptance criteria for MVP items, and the
non-functional requirements that apply to all work. Use it when designing or building a feature; use
[MVP_SCOPE.md](MVP_SCOPE.md) to decide whether a feature should be built now at all.

**Status / last reviewed: 2026-10-10.** Implementation status verified against the code on `main`
(`17ab57a` plus working-tree changes).

**Classification:** **MVP** — needed for the smallest product a paying service business would value.
**Next phase** — needed to validate and retain paying customers after the MVP. **Future vision** — part
of the long-term product; not scheduled.

**Implementation status:** **Live** — works end to end in the app. **Partial** — some requirements
are met; gaps listed. **Not started** — no user-facing implementation (a database table or an unused
helper does not count).

Requirement IDs (`BI-1`, `CS-3`…) are stable; reference them in issues and commits.

---

## 1. Shared UI states

Every module uses the same vocabulary so that users can always tell drafts from approved work and
running jobs from finished ones (brief §5, app UI principles). Colour is never the only signal: each
state has a text label (WCAG 2.2 AA, 1.4.1).

### 1.1 Content and deliverable states

Backed by the `content_status` enum in `supabase/migrations/20261010061028_foundation.sql`.

| State | Label | Meaning | Allowed next states | Implemented |
|---|---|---|---|---|
| `brief` | Planned | A plan item with a topic and objective but no draft | `draft`, `needs_approval` | Yes |
| `draft` | Draft | Text exists but is not ready for review (being edited or regenerated) | `in_qa`, `needs_approval` | Enum only |
| `in_qa` | Checking | An automated quality review is running | `needs_approval`, `draft` | Enum only |
| `needs_approval` | Needs approval | Ready for a human decision | `approved`, `rejected`, `draft` | Yes |
| `approved` | Approved | A named user approved it; eligible for export or publishing | `scheduled`, `needs_approval` (undo) | Yes (records `approved_by`, `approved_at`) |
| `rejected` | Rejected | A user declined it | `draft` (regenerate or edit), `needs_approval` (undo) | Yes |
| `scheduled` | Scheduled | Queued to publish through a connected tool at a time | `published`, `approved` (unschedule) | Enum only |
| `published` | Published | Confirmed live in the destination system | — | Enum only |

### 1.2 Job and workflow states

Backed by the `job_status` enum (`ai_jobs.status`).

| State | Label | UI requirement | Implemented |
|---|---|---|---|
| `queued` | Starting | Show that work has been accepted | Yes (treated as running) |
| `running` | Running | Show the current step and expected duration; update without a manual reload; announce changes to assistive technology | Yes (step list, "about 3–4 minutes", 4-second refresh, `aria-live`) |
| `succeeded` | Completed | Show results and when they were produced | Yes |
| `failed` | Failed | Say what failed in plain language and what the user can do next; offer retry | Partial — shows the raw error message plus a generic free-model hint; retry via "Re-run analysis" |

## 2. Capability requirements

### A. Business Intelligence — MVP · Partial

Builds and maintains the structured business profile used by every other module.

| ID | Requirement | Class | Status |
|---|---|---|---|
| BI-1 | Create a business from a website URL and optional name; normalise the URL; reject invalid input with a clear message | MVP | **Live** (`web/src/app/analysis/actions.ts` `startAnalysis`) |
| BI-2 | Crawl the site (home plus up to 5 priority pages) and extract text and technical signals | MVP | **Live** (`web/src/lib/integrations/crawler.ts`) |
| BI-3 | Generate a structured profile: summary, industry, services, customers, locations, offers, unique value, brand voice, competitors, strengths, gaps | MVP | **Live** (`business_analyst` worker, `website-intel.ts`) |
| BI-4 | Display the profile | MVP | **Live** (`/analysis/[id]`) |
| BI-5 | Let the user edit and confirm profile fields; edited fields become Customer-provided and are not overwritten by re-analysis | MVP | Not started |
| BI-6 | Store and display provenance (Verified, Customer-provided, Inferred, AI-recommended) for profile fields; see [BUSINESS_METHODOLOGY.md](BUSINESS_METHODOLOGY.md#22-information-provenance-classes) | MVP (labels) / Next (per-field storage) | Partial (PageSpeed marked "Google" only) |
| BI-7 | Capture goals and constraints (`business_profiles.goals`) | Next phase | Not started |
| BI-8 | Knowledge base: store source documents, chunk, embed, and retrieve for grounding | Next phase | Partial (crawled pages stored in `knowledge_documents`; no chunking, embedding, or retrieval) |
| BI-9 | Upload documents and notes as sources | Next phase | Not started |
| BI-10 | Brand voice and messaging profile the user can edit (`brand_profiles`) | Next phase | Partial (row written per run; not shown separately or editable; a new row is inserted on every re-run) |
| BI-11 | Q&A assistant grounded in the knowledge base (`marketing_assistant` worker) | Next phase, committed (D-020) | Not started |
| BI-12 | Optional guided onboarding questions — primary goal, service area, current tools — stored on the profile (Customer-provided) and used in prompts (vision §7 step 2) | MVP (D-021) | **Live** (`web/src/components/owner-questions.tsx`, `web/src/lib/owner-inputs.ts`; stored in `business_profiles.goals`, `service_area`, `current_tools`; fed to all four pipeline prompts; editable in the "From you" panel on `/analysis/[id]`) |

**MVP acceptance criteria**
- Given a reachable website, the profile is generated and shown within one analysis run; fields the
  site does not support are shown as missing, never invented.
- Given an unreachable website, the run fails with a message naming the problem (for example, "We
  couldn't open example.com — check the address") and a retry action.
- (BI-5) A user can change any profile field, save it, and see it labelled "From you"; the next re-run
  keeps the edited value and uses it in prompts.
- A user from another organization cannot read or change the profile (RLS).

### B. Marketing Strategy — MVP · Partial

| ID | Requirement | Class | Status |
|---|---|---|---|
| MS-1 | Growth score 0–100 combining measured and assessed dimensions with a deterministic, documented formula | MVP | **Live** (`computeGrowthScore()`) |
| MS-2 | Show component scores and label which are measured (Google) and which are assessed (AI) | MVP | Partial (measured bars labelled; assessed bars not labelled as AI) |
| MS-3 | Five ranked opportunities with area, evidence ("why"), first step, impact, effort | MVP | **Live** |
| MS-4 | 30-day content strategy: goal, audience, pillars, channels | MVP | **Live** |
| MS-5 | User can mark an opportunity as accepted, dismissed, or done | MVP (D-022) | Live |
| MS-6 | User-set objectives and priorities that feed the plan | Next phase | Not started |
| MS-7 | Campaign planning (`campaigns` table) | Next phase | Not started |
| MS-8 | Action plan covering non-content work (website fixes, CRM follow-up) as tasks | Next phase | Not started |
| MS-9 | Re-assessment that compares with the previous assessment and shows change | Next phase | Not started (re-run replaces; history kept in `reports` but not shown) |

**MVP acceptance criteria**
- Every opportunity cites evidence from the crawl, PageSpeed, or profile, and gives one concrete first step.
- The growth score is reproducible from the stored component scores using the documented weights.
- When PageSpeed is unavailable, the score is computed from assessed dimensions only and the page
  says measured data was unavailable.

### C. Content Studio — MVP (subset) · Partial

| ID | Requirement | Class | Status |
|---|---|---|---|
| CS-1 | 30-day calendar of at least 20 dated items across channels that fit the business | MVP | **Live** |
| CS-2 | Draft the first batch (five items) in the business's brand voice, with CTA, hashtags, image idea | MVP | **Live** |
| CS-3 | Approve, reject, and undo each draft; record approver and time | MVP | **Live** (`setContentStatus`) |
| CS-4 | State that nothing is published until approved | MVP | **Live** (copy on `/analysis/[id]`) |
| CS-5 | Edit a draft's title and body before approval (edit returns it to `needs_approval`) | MVP | Not started |
| CS-6 | Regenerate a single draft, optionally with a short instruction; a rejected draft can be regenerated | MVP | Not started |
| CS-7 | Copy an approved draft to the clipboard and export approved drafts (CSV or plain text) | MVP | Not started |
| CS-8 | Draft further plan items on demand (next batch) | MVP (Provisional) | Not started |
| CS-9 | Automated quality check before approval (`qa_reviewer` worker): brand fit, claims, length per channel | Next phase | Not started (worker defined, never called) |
| CS-10 | Long-form formats: blog/article drafts, email campaigns, video scripts, creative briefs | Next phase | Not started (plan may include such channels; drafts are short-form) |
| CS-11 | Repurposing one asset into several channel versions | Future vision | Not started |
| CS-12 | Scheduling and publishing through connected tools | Future vision (depends on F) | Not started |
| CS-13 | Team approval workflows (reviewer roles, comments) | Future vision | Not started |

**MVP acceptance criteria**
- No content leaves `needs_approval` without an explicit user action; there is no automatic publish path.
- (CS-5) An edited draft keeps its history of who approved which version, or approval is cleared on edit.
- (CS-6) Regeneration goes through `runWorker` (budget-checked, logged in `ai_usage`) and replaces only the selected draft.
- (CS-7) Only `approved` items are exported; the export contains channel, date, title, body.
- Status is shown as text, not colour alone.

### D. Website Intelligence — MVP (inside the assessment) · Partial

| ID | Requirement | Class | Status |
|---|---|---|---|
| WI-1 | Collect technical signals: HTTPS, meta description, H1 count, contact form, phone number, schema markup, images missing alt text, social links | MVP | **Live** (stored in the report; not displayed individually) |
| WI-2 | Google PageSpeed (mobile): performance, SEO, accessibility, best practices | MVP | **Live** (three shown; best practices used in score only) |
| WI-3 | Website, SEO, and conversion opportunities within the five opportunities | MVP | **Live** |
| WI-4 | Show the measured signals as a checklist with pass/fail and why it matters | Next phase | Not started |
| WI-5 | Dedicated prioritised website improvement plan (SEO, content quality, CRO, UX) using `seo_analyst` | Next phase | Not started |
| WI-6 | Desktop PageSpeed, Search Console, and GA4 data | Next phase / Future | Not started (API client supports desktop strategy) |
| WI-7 | Page-level recommendations and rewrite suggestions | Future vision | Not started |

**MVP acceptance criteria:** the assessment is produced even if PageSpeed fails; crawl failures on
secondary pages do not fail the run.

### E. CRM Intelligence — Next phase · Not started

HubSpot is the first CRM (brief §3E). Braventa works with the CRM; it does not replace it.

| ID | Requirement | Class | Status |
|---|---|---|---|
| CRM-1 | Connect HubSpot via OAuth with read-only scopes; tokens stored in Supabase Vault (`integrations.vault_secret_id`) | Next phase | Not started (table exists; health check reports "needs a HubSpot public app") |
| CRM-2 | Lead and pipeline summary: counts by stage, stale deals, lead sources | Next phase | Not started (`crm_analyst` worker defined, unused) |
| CRM-3 | Data quality observations: missing owners, missing lifecycle stage, duplicates | Next phase | Not started |
| CRM-4 | Follow-up recommendations listing specific records | Next phase | Not started |
| CRM-5 | Create HubSpot tasks from approved recommendations | Future vision | Not started |
| CRM-6 | Workflow opportunities and recurring CRM reporting | Future vision | Not started |
| CRM-7 | Other CRMs | Future vision | Not started |

Requirements when built: minimum scopes; send only the fields a model needs (no unnecessary personal
data to models); disconnect revokes and deletes tokens; CRM data is Verified provenance with sync time.
See [INTEGRATIONS.md](../architecture/INTEGRATIONS.md).

### F. Automation — Next phase / Future vision · Not started

| ID | Requirement | Class | Status |
|---|---|---|---|
| AU-1 | Background job tracking with steps, status, errors | MVP | **Live** for the analysis job (`ai_jobs`; runs in-process via `after()`, not n8n) |
| AU-2 | Approval step before any external action | MVP (principle) | **Live** for content (no external actions exist yet) |
| AU-3 | Workflow templates executed by n8n, calling back to `/api/n8n/*` with a shared secret | Next phase | Not started (`web/src/lib/integrations/n8n.ts` has `triggerWebhook` and `verifyCallback`; no routes, no workflows in the repo) |
| AU-4 | Scheduled jobs (for example, weekly re-assessment or summary) | Next phase | Not started |
| AU-5 | Execution log visible to the user | Next phase | Not started |
| AU-6 | Error handling with retries and user-visible notifications | Next phase | Partial (one JSON retry per AI call; model fallback list; no job-level retry) |
| AU-7 | Trigger-based processes (new lead, form submission) | Future vision | Not started |
| AU-8 | Client-configured authorised automations that skip per-item approval (D-013 exception) | Future vision | Not started |

### G. Analytics and Optimization — Next phase · Not started

| ID | Requirement | Class | Status |
|---|---|---|---|
| AN-1 | Log AI model, tokens, cost per call and enforce a monthly per-organization budget | MVP (platform) | **Live** in the backend (`router.ts`, `ai_usage`, `ai_spend_mtd`; default budget USD 5) — no UI |
| AN-2 | Content production and approval status summary | Next phase | Partial (status per item on the analysis page; no summary) |
| AN-3 | AI usage and plan-limit view for the customer | Next phase | Not started |
| AN-4 | Weekly "what changed, what to do next" summary | Next phase | Not started |
| AN-5 | Workflow performance reporting | Future vision | Not started |
| AN-6 | CRM and lead insights over time | Future vision | Not started |
| AN-7 | Data-based recommendations from outcomes | Future vision | Not started |

### Onboarding and discovery — MVP (D-028) · Live

From the [AI-assisted onboarding spec](Braventa_AI_Assisted_Onboarding_Pain_Point_Spec.md). Builds on BI-12.

| ID | Requirement | Class | Stage | Status |
|---|---|---|---|---|
| ON-1 | Pain-point and solution catalog as versioned, typed data: 10 categories, stable IDs, examples, follow-up keys, solution availability (available · planned · manual · integration-dependent · unsupported) | MVP | 1 | Live |
| ON-2 | Discovery step: multi-select categories/pain points plus free text; economical model maps free text to catalog IDs, keeps the original wording, asks the owner to confirm when unsure | MVP | 1 | Live |
| ON-3 | Owner selects or reorders a top three; stored separately from AI-recommended and calculated priority | MVP | 1 | Live |
| ON-4 | Website analysis starts at the URL step and runs while the owner answers discovery questions | MVP | 1 | Live |
| ON-5 | Adaptive follow-ups: 1–3 questions per round (about 4 in total) chosen from a per-pain-point question bank by what is missing and most valuable; never repeats answered questions; skip and "not applicable" always available | MVP | 2 | Live |
| ON-6 | Onboarding progress is saved per organization and user (`onboarding_sessions`, `onboarding_responses`), so the owner can leave and resume | MVP | 2 | Live |
| ON-7 | Diagnosis synthesis with evidence type (provenance class) and confidence per finding; the owner reviews and corrects it before the plan is final | MVP | 3 | Live |
| ON-8 | One plan (`growth_plan_items`) replacing the 5 opportunities: per item the pain point(s), why, evidence, first action, effort, dependencies, success metric, capability status, and customer / AI-recommended / calculated / final priority; calculated priority = (Impact × Urgency × Confidence) / Effort computed in code. Delivers MS-5 and UX-1 | MVP | 3 | Live |

### Guidance UX (cross-cutting)

From the [product vision](GrowthOS_Product_Vision_and_Planning_Context.md) §7 and §12: the next best action
should be easy to understand.

| ID | Requirement | Class | Status |
|---|---|---|---|
| UX-1 | "Do this first" summary at the top of the results page: the top open opportunity, drafts awaiting approval, and the next step | MVP (D-022) | Live |
| UX-2 | Show where the business is in the Growth Loop (Understand · Act · Improve) | Exploratory | Not started |

### Platform (cross-cutting)

| ID | Requirement | Class | Status |
|---|---|---|---|
| PL-1 | Email and password sign-up with email confirmation; sign-in; sign-out | MVP | **Live** (`web/src/app/login/*`, `web/src/app/auth/callback/route.ts`) |
| PL-2 | Signed-out visitors redirected to login | MVP | **Live** (`web/src/proxy.ts`) |
| PL-3 | Organization created automatically on first analysis; creator is owner | MVP | **Live** (`create_organization` RPC) |
| PL-4 | Dashboard listing analysed businesses with score and latest job status | MVP | **Live** (`/dashboard`) |
| PL-5 | Password reset | MVP | Not started |
| PL-6 | Invite team members; switch between organizations | Next phase | Not started (memberships and roles exist; `getCurrentOrg` uses the first membership only) |
| PL-7 | Billing (Stripe; `subscriptions` table) | Next phase | Not started (Q-029, Q-010) |
| PL-10 | Tiers Basic / Pro / Premium with a 14-day Pro trial that drops to Basic; `/plans` with Coming soon labels and "Talk to us" (D-030) | MVP | **Live** (`web/src/lib/plans/`, `web/src/app/plans/`) |
| PL-11 | Infographic report and dashboard with detail dialogs (D-032) | MVP | **Live** (`web/src/app/analysis/[id]/infographic.tsx`) |
| PL-12 | AI assistant connection (MCP): personal access keys in Settings; tools to start onboarding, submit discovery, confirm priorities, answer follow-ups and check status; paused after the trial until on a plan (D-036) | MVP | **Live, phase 1** (`web/src/app/api/mcp/route.ts`, `web/src/lib/mcp/`, `web/src/app/settings/`); claude.ai/ChatGPT OAuth not built (Q-039) |
| PL-8 | Delete a business and its data; delete account | Next phase | Not started |
| PL-9 | Platform admin view across tenants (`platform_admins`) | Next phase | Not started (RLS bypass exists; no UI) |

## 3. Non-functional requirements

| Area | Requirement | Current state |
|---|---|---|
| **Tenant isolation** | Every tenant table has `organization_id` and RLS via `public.is_member()`. Admin-client code (`createSupabaseAdminClient()`) only runs server-side and always filters by an organization id already authorised. New tables follow the same pattern. | Met in schema and pipeline; page reads go through RLS |
| **Approval default** | Nothing is published or sent for a client without explicit approval (D-013). Approval records who and when. | Met (no publish path exists) |
| **AI budget and routing** | All AI calls go through `runWorker` / `runWorkerJson`; monthly budget checked before each call; every call logged in `ai_usage`; model choice lives only in `router.ts`. | Met. Note: in `AI_MODE=free` cost is zero, so the budget never triggers |
| **Data minimisation** | Send models only what a task needs; treat crawled and uploaded content as untrusted input (prompt injection). | Partial — site digest capped at 20,000 characters; no injection hardening beyond JSON schema validation |
| **Secrets** | Server-only (`web/src/lib/env.ts`, `server-only`); never `NEXT_PUBLIC_`. Integration tokens in Vault. | Met for current keys |
| **Accessibility** | WCAG 2.2 AA: keyboard operable, visible focus, labelled inputs, text status labels, live regions for progress, contrast per [BRAND_BIBLE.md](../brand/BRAND_BIBLE.md), target size 24×24 px minimum. | Partial — labelled form fields and `aria-live` progress exist; no audit performed |
| **Performance** | Interactive pages render in under 2 s on a typical connection (excluding AI work). An analysis run target is under 90 s in paid mode; free mode (about 3–4 minutes) is acceptable only for the proof of concept. Progress is visible throughout. | Free mode about 3–4 minutes; progress shown |
| **Reliability** | AI JSON output validated with schemas and retried once; model fallbacks configured; a failed run leaves the previous results intact. | Met for retry and fallback; partial results from a failed run (profile, report) may still be written |
| **Honesty** | UI and copy never present planned capabilities as live; AI output is labelled as such. | See BI-6, MS-2 |
| **Privacy and consent** | Account email is separate from marketing email; sign-up is not marketing consent (D-014). | No marketing email exists |
| **Responsive** | Usable at 360 px width and up. | Layout is responsive; calendar table scrolls horizontally |

## Related documents

- [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md) · [BUSINESS_METHODOLOGY.md](BUSINESS_METHODOLOGY.md) ·
  [MVP_SCOPE.md](MVP_SCOPE.md) · [USER_JOURNEYS.md](USER_JOURNEYS.md) · [ROADMAP.md](ROADMAP.md)
- [SYSTEM_ARCHITECTURE.md](../architecture/SYSTEM_ARCHITECTURE.md) · [INTEGRATIONS.md](../architecture/INTEGRATIONS.md)
- [BRAND_BIBLE.md](../brand/BRAND_BIBLE.md) · [VOICE_AND_MESSAGING.md](../brand/VOICE_AND_MESSAGING.md)
- [DECISION_LOG.md](../decisions/DECISION_LOG.md) · [OPEN_QUESTIONS.md](../decisions/OPEN_QUESTIONS.md)

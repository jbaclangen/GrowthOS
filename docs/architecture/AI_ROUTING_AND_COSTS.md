# AI routing and costs

This document explains how Braventa calls language models: the routing layer in
`web/src/lib/ai/router.ts`, task classes and workers, free vs paid mode, fallback chains, budget
enforcement, and usage logging. It then maps the founder brief's AI cost and quality principles (brief §7)
to what exists and what is missing, and sets rules for future features. Model IDs in this document and in
code are **configuration, not product commitments**; they will change as providers and prices change, and
must never appear in customer-facing copy as a promise. Related: [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md),
[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md#9-data-sent-to-model-providers),
[../decisions/OPEN_QUESTIONS.md](../decisions/OPEN_QUESTIONS.md).

**Status / last reviewed: 2026-10-10.**

---

## 1. The rule

All AI calls go through `runWorker` or `runWorkerJson`. Feature code never imports
`web/src/lib/integrations/openrouter.ts` directly and never names a model. Feature code asks for a
**worker**; the router decides the model. This is the only place that enforces the budget and writes
`ai_usage`.

## 2. Call path

```
feature code
  -> runWorkerJson(opts, validate)        // optional: JSON parse + validate + 1 retry
     -> runWorker(opts)
        1. WORKERS[worker] -> { taskClass, system prompt }
        2. budget check (admin client): organizations.monthly_ai_budget_usd vs ai_spend_mtd.cost_usd
        3. chat({ models: MODELS[AI_MODE][taskClass], messages: [system, ...messages], json, maxTokens })
              -> POST https://openrouter.ai/api/v1/chat/completions  { models: [...], usage: {include: true} }
        4. insert ai_usage { organization_id, job_id, worker, model (actual), tokens, cost_usd }
        5. return { text, model, inputTokens, outputTokens, costUsd }
```

### `runWorker(opts)`
Parameters: `organizationId` (required; must already be authorised by the caller), `worker`, `messages`,
optional `jobId` (links usage to an `ai_jobs` row), `json` (sends `response_format: {type: "json_object"}`),
`maxTokens`. Temperature is not set by the router (provider default).

### `runWorkerJson(opts, validate)`
Calls `runWorker` with `json: true`, extracts a JSON object loosely (strips code fences, takes the outermost
`{...}`), passes it to `validate` (in practice a zod `.parse`), and retries **once** on parse or validation
failure. Both attempts are logged to `ai_usage`. After two failures it throws
`"<worker> returned unusable JSON: ..."`.

## 3. Task classes and workers

| Task class | Intended for (brief §7) |
|---|---|
| `simple` | Extraction, classification, routine transforms (cheap models) |
| `standard` | Standard content and structured analysis (mid-tier) |
| `complex` | Strategy, analysis, hard reasoning (strong models) |
| `qa` | Critical review of deliverables (strongest available) |

| Worker | Task class | Used in code today |
|---|---|---|
| `business_analyst` | complex | Yes — pipeline step 2 (profile) |
| `website_auditor` | complex | Yes — pipeline step 3 (scores + diagnosis + growth plan, ON-7/ON-8); also the `diagnosis_update` job that applies the owner's corrections |
| `content_strategist` | complex | Yes — pipeline step 4 (30-day plan) |
| `content_writer` | standard | Yes — pipeline step 5 (first 5 posts) |
| `seo_analyst` | standard | No |
| `crm_analyst` | complex | No (HubSpot not built) |
| `campaign_planner` | standard | No |
| `qa_reviewer` | qa | **No** — there is no automated QA pass on drafts |
| `marketing_assistant` | standard | No (retrieval not built) |
| `extractor` | simple | Yes — classifies the owner's free-text discovery answer into catalog pain points (`web/src/lib/onboarding/classify.ts`) and picks the follow-up questions from the question bank (`web/src/lib/onboarding/next-questions.ts`; about $0.0003 and 2–4 s per round) |

Each worker contributes only a one-line system prompt; task instructions live in the feature's user message
(see `web/src/lib/pipeline/website-intel.ts`).

## 4. AI_MODE and fallback chains

`AI_MODE` is read from `process.env` at call time. Anything other than `free` (including unset) means
`paid` (changed 2026-10-12: free models fail under zero data retention, D-037). Each task class maps to an ordered list sent as OpenRouter's `models` array; **OpenRouter performs
the fallback** (tries the next model if the first errors or is unavailable). The response's `model` field
records which model actually answered, and that is what `ai_usage.model` stores.

Current configuration (check `router.ts` for the live values). Paid lineup chosen 2026-10-10 from a
side-by-side comparison (D-024, §4.1):

| Class | `free` chain | `paid` chain | Workers |
|---|---|---|---|
| simple | nemotron-3-super (free) -> nemotron-3-ultra (free) | claude-haiku-5.5 -> gpt-5.6-sol | extractor, marketing_assistant |
| standard | nemotron-3-super (free) -> nemotron-3-ultra (free) | claude-sonnet-5.5 -> gpt-5.6-sol | business_analyst, content_strategist, content_writer, seo_analyst, campaign_planner |
| complex | nemotron-3-ultra (free) -> nemotron-3-super (free) | claude-opus-5.5 -> claude-sonnet-5.5 | website_auditor, crm_analyst |
| qa | nemotron-3-ultra (free) -> nemotron-3-super (free) | claude-opus-5.5 -> claude-sonnet-5.5 | qa_reviewer |

**Zero data retention (2026-10-11).** The OpenRouter account enforces zero data retention (ZDR) in its privacy
settings, so OpenRouter only routes to endpoints that don't keep prompts. That excludes **every free model**
(the NVIDIA Nemotron endpoints fail with "ZDR violation (account settings)") and Qwen 3.8 Flash, which was the
simple-class fallback until it was replaced by GPT-5.6 Sol. Claude models are served through ZDR endpoints
(Haiku answered via Google Vertex in the check), and GPT-5.6 Sol via Azure. Result: `AI_MODE=free` doesn't work
while ZDR is on; production runs `AI_MODE=paid`. Any model added to a chain must have a ZDR endpoint.

**Risk-based escalation.** `runWorker({ highRisk: true })` moves a call up one tier (simple -> standard ->
complex). The pipeline sets it for `content_writer` when the profile marks the business as regulated
(insurance, Medicare, health, finance, legal…), so those drafts are written by Opus.

**Reliability.** `chat()` retries once (after 3 s) on dropped connections (`fetch failed`, `terminated`) and
on HTTP 408/429/5xx, including provider errors OpenRouter reports inside a 200 response. A response cut off at
`maxTokens` (`finish_reason: "length"`) is reported as "output was cut off at the token limit". Per-step
output ceilings are `MAX_TOKENS` in `web/src/lib/pipeline/prompts.ts` (profile 6000, opportunities 4000,
plan 10000, writer 12000); reasoning models count their thinking as output. If an answer is still cut off,
`runWorkerJson` retries once with a 50% higher ceiling. The OpenRouter `fetch` times out after 120 s (`CHAT_TIMEOUT_MS`).

Free mode: ~3–5½ minutes per run; OpenRouter free models are limited per API key (shared across all tenants).
Paid mode: about 2 minutes per step-chain on Sonnet; about 5 minutes for a regulated business, where Opus
writes the drafts (measured 330 s on thebenefitlink.com, including one cut-off retry since fixed).

### 4.1 Model comparison (2026-10-10, re-run 2026-10-11)

Run with `npm run eval:models -- <url>...` (`web/scripts/compare-models.mts`; outputs in `web/.eval/`,
gitignored). Same crawl, PageSpeed data and production prompts for every model; automatic checks for figures
not present in the source data, past years, regulated-industry detection and compliance notes.

| Site | Model (all four steps) | Time | Cost | Notes |
|---|---|---|---|---|
| thebenefitlink.com (Medicare broker, regulated) | Haiku 5.5 | 89 s | $0.011 | Correct facts and disclaimers; more generic opportunities; detected Medicare only |
| thebenefitlink.com | Sonnet 5.5 | 116 s | $0.186 | Detected Medicare + life, annuity, long-term care; specific compliance notes (disclaimer, TCPA) |
| thebenefitlink.com | Opus 5.5 | 164 s | $0.400 | Ranked compliance gaps as the #1 opportunity; most precise notes (TPMO disclaimer) |
| benguetlinemenelectrical.com (contractor) | Haiku 5.5 | 89 s | $0.010 | Specific, grounded; flagged unconfirmed certifications |
| benguetlinemenelectrical.com | Opus 5.5 | 198 s | $0.438 | Deepest analysis (outdated "28+ years" claim) |

Per-step cost (thebenefitlink.com): profile Sonnet $0.035 / Opus $0.086; opportunities Sonnet $0.022 / Opus
$0.067; plan Sonnet $0.076 / Opus $0.132; drafts Sonnet $0.054 / Opus $0.115. Haiku is under $0.005 per step.
After the prompt fixes (date, evidence rules, regulated-industry handling) no model invented statistics,
ratings or past years. Findings that shaped the code: the old 2,500-token profile ceiling cut off every
paid model; long drafts needed per-channel length limits; Sonnet sometimes returns `area` as a list.

**Re-run 2026-10-11, free against paid** (the founder's rule: if free models match paid, paid becomes only the
fallback). Both free models (Nemotron 3 Ultra and Super) failed on all three sites before producing anything,
because of the ZDR setting above, so free can't be compared or used without turning ZDR off. Paid results:

| Site | Sonnet 5.5 | Opus 5.5 |
|---|---|---|
| thebenefitlink.com (regulated) | 141 s, $0.227, compliance notes 5/5 | 230 s, $0.456, compliance notes 5/5 |
| benguetlinemenelectrical.com | 118 s, $0.183, compliance notes 4/5 | 207 s, $0.392, compliance notes 5/5 |
| pixelmarketingdesign.com | 111 s, $0.174, compliance notes 3/5 | 237 s, $0.397, compliance notes 4/5 |

Both models: no unsupported figures in any diagnosis or draft, no retries, and the regulated business detected
correctly (Medicare plus life, long-term care and annuities). The "stale year" flags were real dates quoted
from the sites (a 2007 founding date, a 1992–2020 copyright), not invented ones. Decision: paid stays primary.

**Chosen lineup and expected cost:** profile Sonnet, opportunities (now diagnosis and plan) Opus, plan Sonnet, drafts Sonnet (Opus when
regulated) — about **$0.23 per analysis, about $0.32 for regulated businesses** (end-to-end run on
thebenefitlink.com 2026-10-10: profile $0.041, opportunities $0.070, plan $0.071, drafts $0.142 — plus $0.167 for
a cut-off first draft attempt, which the higher ceiling now prevents). Revisit when Haiku-class quality is
re-tested on more sites, or when cost per customer matters more than depth.

## 5. Budget enforcement and usage logging

- Each organization has `monthly_ai_budget_usd` (default **5.00**, column on `organizations`).
- Before every call, `runWorker` reads that value and `ai_spend_mtd.cost_usd` (sum of `ai_usage.cost_usd`
  since the start of the calendar month, database time) with the admin client. If spend >= budget it throws
  `BudgetExceededError`; the pipeline then marks the job failed with that message. If either read fails
  (or the org row is missing) it throws before calling the model — the check fails closed.
- Every call inserts one `ai_usage` row with `latency_ms` (wall time including retries) and `status`. A
  successful call (`ok`) records OpenRouter's reported `usage.cost` (`usage: {include: true}`) and token counts; a
  call that fails after retries (`error`) records cost 0 and a one-line `error` summary (at most 200 characters,
  `summarizeError()`), then the error is rethrown unchanged. An insert failure is logged to the console and does
  not fail the call. Migration `20261010155623_ai_usage_latency_and_failures.sql`.

Known limitations:

| Limitation | Effect |
|---|---|
| Free models report cost 0 | In `AI_MODE=free` the budget never trips; the real limit is the shared daily request cap |
| Check-then-spend | The check happens before the call; a single call can overshoot, and parallel calls for the same org can all pass the check |
| Org lookup failure skips the check | `if (org && ...)` — if the organizations read errors, the call proceeds unchecked (`router.ts:65`) |
| No per-user or per-request limits | `rerunAnalysis` can be triggered repeatedly; each run is ~4–8+ calls |
| Budget is per org, orgs are free to create | A user can create more orgs via `create_organization` to get more budget |
| No user-visible usage | Nothing in the UI shows spend or remaining budget yet (brief §5 asks for transparent usage) |

## 6. Brief principles vs implementation

| Brief §7 principle | Status | Notes / gap |
|---|---|---|
| Cheap models for extraction/classification | Partial | `simple` class exists; no feature uses it yet |
| Mid-tier for standard content and structured analysis | Implemented | `content_writer` = standard |
| Strong models for strategy and critical review | Partial | `complex` used for profile, audit, plan. `qa` defined but no QA step runs |
| Deterministic code for calculations and rules | Implemented for the growth score | `computeGrowthScore` blends AI and PageSpeed scores in code; crawler signals (HTTPS, H1s, schema, alt text) are computed, not inferred |
| Reuse business knowledge; cache | **Not implemented** | Crawled pages are stored in `knowledge_documents` but re-runs re-crawl and re-prompt from scratch; no prompt or response cache; no embeddings |
| Track model, tokens, latency, failures, cost | Implemented | Per call in `ai_usage`: model, tokens, cost, `latency_ms`, `status`, `error` (2026-10-10) |
| Configurable fallbacks | Implemented (code-level) | Chains in `router.ts`; changing them requires a deploy. No per-org or per-worker override |
| Evaluate quality before moving to cheaper models | **Not implemented** | No eval set, no QA scoring, no record of which model produced which artefact beyond `ai_usage.model` |
| Minimise customer data sent to models | Partial | Inputs are bounded (20k-char site digest, 6 pages); no redaction; full profile JSON is re-sent to each later step |
| Never expose provider keys in browser code | Implemented | `OPENROUTER_API_KEY` read only via `server-only` `env.ts` |
| Keep model selection configurable | Implemented in code | Not configurable at runtime (no env or DB override) |

## 7. Rules for future features

1. Add or reuse a **worker** in `WORKERS`; pick the cheapest task class that meets quality. Never pass a
   model ID from feature code.
2. Always pass `organizationId` that the caller has authorised, and `jobId` when work belongs to an
   `ai_jobs` row.
3. Prefer `runWorkerJson` with a zod schema for anything the app parses. Never trust unvalidated model
   output to drive writes, URLs, or actions.
4. Set `maxTokens` explicitly; keep inputs bounded (truncate, summarise, or retrieve) and send only fields
   the task needs.
5. Do calculations, scoring, date maths and rule checks in code, not in prompts.
6. Treat third-party content (websites, CRM notes, uploads) as untrusted data inside prompts — see
   [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md#7-prompt-injection-posture).
7. Before moving a workload to a cheaper chain, run it against a saved sample set and compare (manual
   review is acceptable at MVP); record the result in the decision log.
8. Customer CRM data or other non-public data must not be sent to free-tier models whose providers may
   retain or train on prompts (decision needed; see open questions).
9. Planned router improvements, in priority order (per-call latency and failure logging done 2026-10-10): re-check budget atomically
   or reserve estimated cost; a runtime override for chains (env or table); cache by
   (worker, model, input hash) for idempotent steps; a `qa_reviewer` pass before `needs_approval` for
   publishable content.

**Update 2026-10-11 (ON-7, ON-8):** the diagnosis step writes more than the five opportunities did (findings with
evidence, a 5–7 item plan, open questions). End-to-end run on benguetlinemenelectrical.com: profile $0.030,
diagnosis $0.133, 30-day plan $0.065, drafts $0.050, so about **$0.28 per analysis**; one correction round (diagnosis
re-run) $0.142. Follow-up question selection and classification on Haiku add under $0.002.

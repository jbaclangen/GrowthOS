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
| `website_auditor` | complex | Yes — pipeline step 3 (scores + opportunities) |
| `content_strategist` | complex | Yes — pipeline step 4 (30-day plan) |
| `content_writer` | standard | Yes — pipeline step 5 (first 5 posts) |
| `seo_analyst` | standard | No |
| `crm_analyst` | complex | No (HubSpot not built) |
| `campaign_planner` | standard | No |
| `qa_reviewer` | qa | **No** — there is no automated QA pass on drafts |
| `marketing_assistant` | standard | No (retrieval not built) |
| `extractor` | simple | No |

Each worker contributes only a one-line system prompt; task instructions live in the feature's user message
(see `web/src/lib/pipeline/website-intel.ts`).

## 4. AI_MODE and fallback chains

`AI_MODE` is read from `process.env` at call time. Anything other than `paid` (including unset) means
`free`. Each task class maps to an ordered list sent as OpenRouter's `models` array; **OpenRouter performs
the fallback** (tries the next model if the first errors or is unavailable). The response's `model` field
records which model actually answered, and that is what `ai_usage.model` stores.

Current configuration (illustrative; check `router.ts` for the live values):

| Class | `free` chain | `paid` chain |
|---|---|---|
| simple | nemotron-3-super (free) -> nemotron-3-ultra (free) | claude-haiku-5.5 -> qwen3.8-flash |
| standard | nemotron-3-super (free) -> nemotron-3-ultra (free) | gemini-3.8-flash -> claude-haiku-5.5 |
| complex | nemotron-3-ultra (free) -> nemotron-3-super (free) | claude-sonnet-5.5 -> gpt-5.6-sol |
| qa | nemotron-3-ultra (free) -> nemotron-3-super (free) | claude-opus-5.5 -> claude-sonnet-5.5 |

Free mode: ~3–4 minutes per pipeline run (4 model calls, up to 8 with JSON retries); OpenRouter free models are limited to roughly 50 requests/day
**per API key**, i.e. shared across all tenants. Free-model output quality and availability vary; the
analysis page tells users free models may be busy. There is no app-level retry on HTTP errors beyond
OpenRouter's model fallback. The OpenRouter `fetch` times out after 120 s (`CHAT_TIMEOUT_MS` in
`openrouter.ts`); the timeout surfaces as a failed job.

## 5. Budget enforcement and usage logging

- Each organization has `monthly_ai_budget_usd` (default **5.00**, column on `organizations`).
- Before every call, `runWorker` reads that value and `ai_spend_mtd.cost_usd` (sum of `ai_usage.cost_usd`
  since the start of the calendar month, database time) with the admin client. If spend >= budget it throws
  `BudgetExceededError`; the pipeline then marks the job failed with that message. If either read fails
  (or the org row is missing) it throws before calling the model — the check fails closed.
- After every successful call it inserts one `ai_usage` row with OpenRouter's reported `usage.cost`
  (`usage: {include: true}`) and token counts. An insert failure is logged to the console and does not fail
  the call.

Known limitations:

| Limitation | Effect |
|---|---|
| Free models report cost 0 | In `AI_MODE=free` the budget never trips; the real limit is the shared daily request cap |
| Check-then-spend | The check happens before the call; a single call can overshoot, and parallel calls for the same org can all pass the check |
| Org lookup failure skips the check | `if (org && ...)` — if the organizations read errors, the call proceeds unchecked (`router.ts:65`) |
| Failed calls are not logged | HTTP errors from OpenRouter throw before the insert, so failures and their latency are invisible in `ai_usage` |
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
| Track model, tokens, latency, failures, cost | Partial | Model, tokens, cost: yes. Latency: **no**. Failures: only as `ai_jobs.error` text, not per call |
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
9. Planned router improvements, in priority order: log latency and failures per call (add `latency_ms`,
   `status`, `error` to `ai_usage`); re-check budget atomically
   or reserve estimated cost; a runtime override for chains (env or table); cache by
   (worker, model, input hash) for idempotent steps; a `qa_reviewer` pass before `needs_approval` for
   publishable content.

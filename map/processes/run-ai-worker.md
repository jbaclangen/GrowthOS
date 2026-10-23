---
type: process
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
consumes: ["[[ai-worker]]", "[[organization]]", "[[ai-usage]]"]
produces: ["[[ai-usage]]"]
---

# run-ai-worker

A feature names a logical worker; the router picks the model list for its task class and `AI_MODE`, checks the organization's monthly budget, calls OpenRouter once and logs the outcome to `ai_usage`.

## Input → Movement → Output

Input: `runWorker({ organizationId, worker, messages, jobId?, json?, maxTokens?, highRisk?, timeoutMs?, retry? })` or `runWorkerJson(opts, validate)`. Movement: task class (escalated when `highRisk`) → model list → budget read from `organizations.monthly_ai_budget_usd` and the `ai_spend_mtd` view → `chat()` with the worker's system prompt and today's date → `ai_usage` row. Output: a `ChatResult` (`web/src/lib/integrations/openrouter.ts:11-18`), or a thrown `BudgetExceededError` or provider error that was also logged.

## Why this shape

If features called OpenRouter directly, the budget, the zero-data-retention model list and the usage log would each have several homes; CLAUDE.md makes the router the only caller (`CLAUDE.md:83-84`). The budget check fails closed, so an unreadable budget never means unlimited spend (`web/src/lib/ai/router.ts:94-102`). Failed calls are logged with cost 0, so failure rates are visible per worker and model (`:130-134`).

## Steps

1. Task class from `WORKERS[worker]`; `highRisk` moves it up one tier via `ESCALATE` — `web/src/lib/ai/router.ts:40-65,90-91`; `:31-32`.
2. Model list by `AI_MODE`: paid unless exactly `free` (free models are refused under ZDR, D-037) — `:34-38`; tables `:12-29`.
3. Budget: read `monthly_ai_budget_usd` and `ai_spend_mtd.cost_usd` with the admin client; read error → throw; spend ≥ budget → `BudgetExceededError` — `:92-105`; view `supabase/migrations/20261010061028_foundation.sql:345-349`; default budget 5 — `:14`.
4. `chat({ models, messages: [system(worker, today), …], json, maxTokens, timeoutMs, retry })` — `:120-129`; system prompt `:69-74`; OpenRouter client `web/src/lib/integrations/openrouter.ts:4,42-50` (120 s default per attempt, `:6`).
5. On error: insert `ai_usage` with `status: "error"`, the first model and a 200-char summary, then rethrow — `:130-134`; `summarizeError` `:147-150`.
6. On success: insert `ai_usage` with model, tokens, cost, `status: "ok"`, `latency_ms` — `:109-118,136-143`.
7. `runWorkerJson`: two attempts with `json: true`, `parseJsonLoose`, validate; a `length` finish retries with 1.5× `maxTokens` — `:163-184`; `:153-160`.
8. Callers at this commit: `web/src/lib/pipeline/website-intel.ts:298,446,739,802`, `web/src/lib/onboarding/classify.ts:25`, `web/src/lib/onboarding/next-questions.ts:99` (all `runWorkerJson`); `web/src/app/api/assistant/route.ts:97` (`runWorker`). Only `router.ts` imports `chat` in `web/src` (`:2`); the dev script `web/scripts/compare-models.mts:9,15` calls it directly on purpose (no budget, no log); the health route imports `keyInfo` for a key check (`web/src/app/api/health/integrations/route.ts:2`).

## Human gate

None. Budget and model choice are configuration (`organizations.monthly_ai_budget_usd`, `AI_MODE`) set by the Braventa team; members can't update the budget column (`supabase/migrations/20261011042846_plan_tiers_and_trial.sql:15-18`).

## If you change this

- **Hits:** every model-calling process ([crawl-and-profile](crawl-and-profile.md), [score-and-diagnose](score-and-diagnose.md), [revise-diagnosis](revise-diagnosis.md), [plan-and-write](plan-and-write.md), [discovery-and-review](discovery-and-review.md), [follow-up-questions](follow-up-questions.md), [ask-braventa](ask-braventa.md)), [ai-usage](../objects/pipeline/ai-usage.md), `docs/architecture/AI_ROUTING_AND_COSTS.md`
- **Does not hit:** the job step machine, RLS, the MCP transport

## Surfaces

| Surface | Role |
|---|---|
| Pipeline steps, onboarding classifiers, assistant route | callers |
| `organizations`, `ai_spend_mtd` | budget read |
| `ai_usage` | log write |
| OpenRouter | provider |
| Braventa team | sets budgets and `AI_MODE` |

## See

- Objects: [ai-worker](../objects/pipeline/ai-worker.md), [ai-usage](../objects/pipeline/ai-usage.md), [organization](../objects/tenancy/organization.md)
- Source: `web/src/lib/ai/router.ts`, `web/src/lib/integrations/openrouter.ts`

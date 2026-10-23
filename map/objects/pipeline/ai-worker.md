---
type: object
cluster: pipeline
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: web/src/lib/ai/router.ts
---

# AI worker (`WORKERS` / `runWorker`)

A logical model role (system prompt plus task class) that feature code asks for by name; the router picks the model, checks the budget and logs the call.

## Why this shape

Feature code never names a model, so models change in one file and every call passes the same budget gate and ledger: `web/src/lib/ai/router.ts:5-6`, `:94-95`.

## Shape

- `TaskClass` `web/src/lib/ai/router.ts:8`; `MODELS` free and paid tables `:12-29`; `ESCALATE` one tier up for `highRisk` `:31-32`, applied at `:90-91`; `modelsFor` reads `AI_MODE` (paid unless `free`, D-037) `:34-38`.
- `WORKERS` `:40-65`, `Worker` type `:67`, `systemPrompt` adds today's date `:69-74`.
- Called today: `extractor` (`web/src/lib/onboarding/classify.ts:24-33`, `web/src/lib/onboarding/next-questions.ts:99-108`), `business_analyst` (`web/src/lib/pipeline/website-intel.ts:298-307`), `website_auditor` (`:446-470`), `content_strategist` (`:739-748`), `content_writer` (`:802-812`, `highRisk` `:808`), `app_assistant` (`web/src/app/api/assistant/route.ts:96-97`).
- Leftover, defined at `:44-49` and called nowhere in `web/src`: `seo_analyst`, `crm_analyst`, `campaign_planner`, `qa_reviewer`, `marketing_assistant` (`docs/product/MVP_SCOPE.md:83-84`; that line also lists `extractor` as never called, which the two call sites above contradict).
- `runWorker` `:78-144`: budget check of `organizations.monthly_ai_budget_usd` against `ai_spend_mtd` `:96-99`, fails closed `:100-102`, `BudgetExceededError` `:76` thrown at `:103-105`; `ai_usage` rows `:109-118` (error `:130-134`, ok `:136-142`); provider call `chat` `web/src/lib/integrations/openrouter.ts:40-45` (`BASE` `:4`).
- `runWorkerJson` `:162-184`: two attempts, 1.5× `maxTokens` after a cut-off `:174-177`. Step ceilings `MAX_TOKENS` `web/src/lib/pipeline/prompts.ts:153-155`.

Citations: `web/src/lib/ai/router.ts:8-184`, `web/src/lib/integrations/openrouter.ts:4-45`.

## Connected to

- **owns:** [ai-usage](ai-usage.md) rows (the only writer, `:109-118`).
- **owned-by:** nothing; a module.
- **joins:** [organization](../tenancy/organization.md) `monthly_ai_budget_usd` (`supabase/migrations/20261010061028_foundation.sql:14`, read at `:97`); [ai-job](ai-job.md) through `jobId` on the usage row (`:112`).
- **looks-like-but-is-not:** [ai-job](ai-job.md) worker names (`website_evidence` …, `web/src/lib/pipeline/steps.ts:11`), which are pipelines; `ai_jobs.task_class`, which callers set to `complex` without consulting `WORKERS` (`web/src/lib/onboarding/start.ts:44`).

## If you change this

- **Hits:** the six call sites above; `ai_usage.worker` values (`foundation.sql:243`) and anything grouping on them; the assistant's deadline path (`route.ts:97` passes `timeoutMs` and `retry`); `docs/architecture/AI_ROUTING_AND_COSTS.md`.
- **Does not hit:** the prompts in `web/src/lib/pipeline/prompts.ts` (callers build messages themselves); `ai_jobs` rows (the router never writes them).

## Surfaces

| Surface | Role |
|---|---|
| Pipeline steps → [crawl-and-profile](../../processes/crawl-and-profile.md), [score-and-diagnose](../../processes/score-and-diagnose.md), [plan-and-write](../../processes/plan-and-write.md) | calls |
| Discovery → [discovery-and-review](../../processes/discovery-and-review.md), [follow-up-questions](../../processes/follow-up-questions.md) | calls (`extractor`) |
| `POST /api/assistant` → [ask-braventa](../../processes/ask-braventa.md) | calls (`app_assistant`) |
| [run-ai-worker](../../processes/run-ai-worker.md) | the call itself |
| `AI_MODE` (environment) | configures |

## See

- Source: `web/src/lib/ai/router.ts`
- As built: `docs/architecture/AI_ROUTING_AND_COSTS.md`

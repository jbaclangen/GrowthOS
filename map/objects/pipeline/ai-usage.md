---
type: object
cluster: pipeline
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
entity: supabase/migrations/20261010061028_foundation.sql
---

# AI usage ledger (`ai_usage` + `ai_spend_mtd`)

One row per model call, and the month-to-date view the budget check reads.

## Why this shape

Budget enforcement needs a per-organization spend that is cheap to read before every call, so the ledger is append-only and the view sums it: `supabase/migrations/20261010061028_foundation.sql:344-349`, `web/src/lib/ai/router.ts:94-105`.

## Shape

- Table `supabase/migrations/20261010061028_foundation.sql:239-250`: `job_id` set null on delete `:242`, `worker`, `model`, `input_tokens`, `output_tokens`, `cost_usd`; index by organization and time `:250`; job index `supabase/migrations/20261010061126_advisor_fixes.sql:24`.
- Added `latency_ms`, `status` (`ok` | `error`), `error` ≤ 500 chars: `supabase/migrations/20261010155623_ai_usage_latency_and_failures.sql:3-10` (failed calls cost 0, `:2`).
- RLS "members read" only; the server writes: `foundation.sql:311-321`.
- View `ai_spend_mtd`, `security_invoker`, grouped by organization since the start of the month: `foundation.sql:345-349`.
- Writer: `router.ts:109-118` (error row `:130-134`, success row `:136-142`; `summarizeError` `:146-150`). Reader: the budget check `:98`, `:103`.
- No app page shows it; the only read in `web/src` is the budget check.

Citations: `supabase/migrations/20261010061028_foundation.sql:239-250`, `:315-321`, `:345-349`, `supabase/migrations/20261010155623_ai_usage_latency_and_failures.sql:3-10`, `web/src/lib/ai/router.ts:96-142`.

## Connected to

- **owns:** nothing.
- **owned-by:** [organization](../tenancy/organization.md); [ai-job](ai-job.md) optionally (`job_id` nullable, `:242`).
- **joins:** [ai-worker](ai-worker.md) (`worker` and `model` columns, `router.ts:113`, `:137`).
- **looks-like-but-is-not:** `assistant_usage` (per-question limits for Ask Braventa, `supabase/migrations/20261017020224_assistant_usage.sql`), which counts questions, not spend; `mcp_tool_calls`, which logs MCP calls.

## If you change this

- **Hits:** the insert in `router.ts:109-118`; the view `foundation.sql:345-349` (sums `cost_usd` and tokens); the budget comparison `router.ts:103`; `docs/product/MVP_SCOPE.md:59`; `docs/architecture/AI_ROUTING_AND_COSTS.md`.
- **Does not hit:** `ai_jobs` rows (`job_id` is a nullable reference, `:242`); `organizations.monthly_ai_budget_usd` (the other side of the comparison, `foundation.sql:14`).

## Surfaces

| Surface | Role |
|---|---|
| `runWorker` → [run-ai-worker](../../processes/run-ai-worker.md) | writes; reads the view |
| Supabase dashboard (human) | reads |
| App pages | none |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/AI_ROUTING_AND_COSTS.md`

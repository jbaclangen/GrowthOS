---
type: object
cluster: access
universe: live
status: verified
verified: 2026-11-14
commit: 1917f9a
entity: supabase/migrations/20261017020224_assistant_usage.sql
---

# Assistant question (`assistant_usage`)

One row per "Ask Braventa" question, reserved before the model runs: the counter for 40 questions per organization per day and 5 per user per minute. It holds no question or answer text.

## Why this shape

The row is reserved under a per-organization advisory lock by `reserve_assistant_question`, so parallel requests can't all pass the count, and a request that fails later still counts (`supabase/migrations/20261017020224_assistant_usage.sql:5-7,33-63`). Without the table the route fails closed (`web/src/lib/assistant/handler.ts:60-67`; health check `web/src/app/api/health/integrations/route.ts:36-41`). Tokens and cost go to `ai_usage` instead (`…assistant_usage.sql:3`).

## Shape

- Columns: `organization_id`, `user_id`, `status` `pending | answered | failed`, `created_at`, `finished_at` — `supabase/migrations/20261017020224_assistant_usage.sql:13-20`
- RLS "own usage read"; client writes revoked — `supabase/migrations/20261017020224_assistant_usage.sql:24-28`
- Function `reserve_assistant_question(org, user, per_org_per_day, per_user_per_minute)` → `usage_id | null` plus counts; service role only — `supabase/migrations/20261017020224_assistant_usage.sql:33-65`
- Limits `ASSISTANT_LIMITS` 40 / 5 — `web/src/lib/assistant/access.ts:20-23`; user-facing reasons `:28-42`
- The organization counted is the business the user is working on (D-062) — `web/src/app/api/assistant/route.ts:64-66`
- Reserve: `admin.rpc("reserve_assistant_question")` — `web/src/app/api/assistant/route.ts:67-80`; settle `answered | failed` — `:81-88`, `handler.ts:77-84`

Citations: `supabase/migrations/20261017020224_assistant_usage.sql:13-65`, `web/src/app/api/assistant/route.ts:64-88`

## Connected to

- **owns:** nothing
- **owned-by:** [organization](../tenancy/organization.md), a user ([membership](../tenancy/membership.md))
- **joins:** [ai-usage](../pipeline/ai-usage.md) (worker `app_assistant`), [plan-tier](../tenancy/plan-tier.md) via `assistantAccess` (`web/src/lib/assistant/access.ts:12-15`)
- **looks-like-but-is-not:** [mcp-tool-call](mcp-tool-call.md) (MCP, per key or grant, 30/min); [ai-usage](../pipeline/ai-usage.md) (spend, not permission)

## If you change this

- **Hits:** [ask-braventa](../../processes/ask-braventa.md), `web/src/lib/assistant/assistant.test.ts` (reads the migration, `web/src/lib/assistant/assistant.test.ts:77`), the limits text in [assistant-knowledge](assistant-knowledge.md), `docs/architecture/DATA_MODEL.md`
- **Does not hit:** the MCP server, the pipeline, Settings

## Surfaces

| Surface | Role |
|---|---|
| `POST /api/assistant` (service client) | writes (reserve, settle) |
| `GET /api/health/integrations` | reads (presence) |
| Signed-in user (RLS) | may read own rows; no page shows them at this commit |

## See

- Source: `supabase/migrations/20261017020224_assistant_usage.sql`, `web/src/app/api/assistant/route.ts`
- As built: `docs/architecture/DATA_MODEL.md`

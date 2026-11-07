---
type: process
universe: live
status: verified
verified: 2026-11-08
commit: 00d230f
consumes: ["[[membership]]", "[[organization]]", "[[plan-tier]]", "[[assistant-knowledge]]", "[[business-profile]]", "[[report]]", "[[growth-score]]", "[[module-registry]]", "[[diagnosis]]", "[[content-calendar]]", "[[integration-connection]]"]
produces: ["[[assistant-usage]]", "[[ai-usage]]"]
---

# ask-braventa

A signed-in user asks the in-app assistant a question; Braventa reserves a usage row, builds a read-only context from the guide and the user's own data, calls the `app_assistant` worker once and returns one answer.

## Input → Movement → Output

Input: `POST /api/assistant` with `{ question, history? }` from the header widget (`web/src/components/assistant.tsx`). Movement: same-origin and JSON checks, then `handleAssistantRequest`: user → organization → plan gate → parse → reserve → limits → context → model → settle. Output: `{ answer, remainingToday }` or `{ error }` with a status that says what to do, a settled `assistant_usage` row and an `ai_usage` row.

## Why this shape

The model is never called without a reservation, so limits hold under parallel requests and a crash still counts (`web/src/lib/assistant/handler.ts:60-75`). The assistant is read-only by prompt and has no tools, so it can't change the plan or approve drafts (`web/src/lib/ai/router.ts:56-58`); business data is marked untrusted inside the prompt (`web/src/lib/assistant/prompt.ts:164-165`). No question or answer text is stored (`supabase/migrations/20261017020224_assistant_usage.sql:2-3`).

## Steps

1. Same-origin: `Origin` host must equal `Host` → 403; JSON content type → 415; body ≤ 64 KB → 413 — `web/src/app/api/assistant/route.ts:35-51`.
2. User from the session (a lookup failure is not "signed out"), then that user's first organization through `firstOrganization`, filtered by the user's id because RLS also returns co-members' memberships (a failed read is a lookup failure, not "no business") — `:56-65`; `handler.ts:41-53`; `web/src/lib/memberships.ts:3-6,25-39`.
3. Plan gate `assistantAccess` (`hasSubscription`: trial or any plan) → 403 — `handler.ts:54-55`; `web/src/lib/assistant/access.ts:12-15`. No role check: `assistant.use` is in the matrix but not enforced yet — `docs/architecture/ROLES_AND_PERMISSIONS.md:73`.
4. Reserve via `reserve_assistant_question` (service client; 40/org/day, 5/user/min) — `route.ts:66-79`; `handler.ts:60-75`; `access.ts:20-23`. Over a limit → 429 with the reason; no row → 503.
5. Context `loadBusinessSummary` through the user's client (profiles, jobs, sessions, Search Console connection, key count, latest report, diagnosis, calendar) — `route.ts:88`; `web/src/lib/assistant/context.ts:32-67,99-122`. From the report's `data`: the modules the score used (`modulesUsed` over `score_modules`, named by `moduleLabel`) and Search visibility's sub-score from `module_scores` only when that module counted — `context.ts:152-159,177,180`; [growth-score](../objects/report/growth-score.md).
6. Messages: system = guide (`knowledgeForPrompt`) + data rule + business summary (score, "Growth score based on" modules, Search visibility line — `prompt.ts:129-130,137`), then trimmed history and the question — `prompt.ts:166-173`.
7. `runWorker({ worker: "app_assistant", maxTokens: 2000, timeoutMs: 40_000, retry: false })` → [run-ai-worker](run-ai-worker.md) — `route.ts:17-20,89-90`.
8. Budget exceeded → settle `failed`, 429; other failure → 502; empty answer → 502 — `handler.ts:86-100`.
9. Settle `answered`; a `length` finish appends the cut-off note — `handler.ts:101-106`; `route.ts:80-87`.

## Human gate

None. The assistant only answers; every change it describes is done by the user in the app (`router.ts:58`).

## If you change this

- **Hits:** [assistant-usage](../objects/access/assistant-usage.md), [assistant-knowledge](../objects/access/assistant-knowledge.md), [ai-usage](../objects/pipeline/ai-usage.md), [growth-score](../objects/report/growth-score.md) and [module-registry](../objects/modules/module-registry.md) (their consumer rows cite the summary's score lines), `web/src/lib/assistant/assistant.test.ts`, `docs/help/APP_GUIDE.md`
- **Does not hit:** the MCP server, the pipeline, Settings

## Surfaces

| Surface | Role |
|---|---|
| Signed-in user (header "Ask Braventa") | asks |
| `POST /api/assistant` | runs the flow |
| `reserve_assistant_question`, `assistant_usage` | limit and record |
| OpenRouter via `runWorker` | answers |

## See

- Objects: [assistant-usage](../objects/access/assistant-usage.md), [assistant-knowledge](../objects/access/assistant-knowledge.md), [ai-worker](../objects/pipeline/ai-worker.md)
- Source: `web/src/app/api/assistant/route.ts`, `web/src/lib/assistant/handler.ts`, `web/src/lib/memberships.ts` (`firstOrganization`)

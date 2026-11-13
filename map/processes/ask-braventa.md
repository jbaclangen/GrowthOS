---
type: process
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
consumes: ["[[membership]]", "[[organization]]", "[[plan-tier]]", "[[assistant-knowledge]]", "[[business-profile]]", "[[report]]", "[[growth-score]]", "[[module-registry]]", "[[diagnosis]]", "[[content-calendar]]", "[[integration-connection]]"]
produces: ["[[assistant-usage]]", "[[ai-usage]]"]
---

# ask-braventa

A signed-in user asks the in-app assistant a question; Braventa reserves a usage row, builds a read-only context from the guide and the user's own data, calls the `app_assistant` worker once and returns one answer.

## Input → Movement → Output

Input: `POST /api/assistant` with `{ question, history? }` from the header widget (`web/src/components/assistant.tsx`), which is keyed by business, so switching business starts a new conversation (`web/src/app/layout.tsx:75-77`). Movement: same-origin and JSON checks, then `handleAssistantRequest`: user → organization → plan gate → parse → reserve → limits → context → model → settle. Output: `{ answer, remainingToday }` or `{ error }` with a status that says what to do, a settled `assistant_usage` row and an `ai_usage` row.

## Why this shape

The model is never called without a reservation, so limits hold under parallel requests and a crash still counts (`web/src/lib/assistant/handler.ts:60-75`). The assistant is read-only by prompt and has no tools, so it can't change the plan or approve drafts (`web/src/lib/ai/router.ts:56-58`); business data is marked untrusted inside the prompt (`web/src/lib/assistant/prompt.ts:184-185`). No question or answer text is stored (`supabase/migrations/20261017020224_assistant_usage.sql:2-3`).

## Steps

1. Same-origin: `Origin` host must equal `Host` → 403; JSON content type → 415; body ≤ 64 KB → 413; unparseable JSON → 400 — `web/src/app/api/assistant/route.ts:38-52`.
2. User from the session (a lookup failure is not "signed out"), then the business that user is working on through `currentOrganization`, given the chosen business from the `brv_business` cookie (else the oldest membership; D-062, [switch-business](switch-business.md)), filtered by the user's id because RLS also returns co-members' memberships (a failed read is a lookup failure, not "no business") — `route.ts:58-66`; `handler.ts:41-53`; `web/src/lib/memberships.ts:3-10,30-35`.
3. Plan gate `assistantAccess` (`hasSubscription`: trial or any plan) → 403 — `handler.ts:54-55`; `web/src/lib/assistant/access.ts:12-15`. No role check: `assistant.use` is in the matrix but not enforced yet — `docs/architecture/ROLES_AND_PERMISSIONS.md:77`.
4. Reserve via `reserve_assistant_question` (service client; 40/org/day, 5/user/min) — `route.ts:67-80`; `handler.ts:60-75`; `access.ts:20-23`. Over a limit → 429 with the reason; no row → 503.
5. Context `loadBusinessSummary` through the user's client (profiles, jobs, sessions, the Search Console, Google Analytics 4 and HubSpot connection rows, the user's key count, then the latest report, diagnosis and calendar) — `route.ts:89`; `web/src/lib/assistant/context.ts:39-70,105-129`. From the report's `data`: the modules the score used (`modulesUsed` over `score_modules`, named by `moduleLabel`) and the Search visibility and Analytics sub-scores from `module_scores` only when that module counted — `context.ts:158-165,183,186-187`; [growth-score](../objects/report/growth-score.md).
6. Messages: system = guide (`knowledgeForPrompt`) + data rule + business summary (one line per connection — `prompt.ts:133-135`; the analyzed websites, never called businesses — `:138-143`; score, "Growth score based on" modules, Search visibility and Analytics lines — `:150-151,158-159`), then trimmed history and the question — `prompt.ts:188-195`.
7. `runWorker({ worker: "app_assistant", maxTokens: 2000, timeoutMs: 40_000, retry: false })` → [run-ai-worker](run-ai-worker.md) — `route.ts:18,21,90-91`.
8. Budget exceeded → settle `failed`, 429; other failure → 502; empty answer → 502 — `handler.ts:86-100`.
9. Settle `answered`; a `length` finish appends the cut-off note — `handler.ts:101-106`; `route.ts:81-88`.

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
- Source: `web/src/app/api/assistant/route.ts`, `web/src/lib/assistant/handler.ts`, `web/src/lib/memberships.ts` (`currentOrganization`)

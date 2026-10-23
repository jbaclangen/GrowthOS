---
type: object
cluster: access
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: web/src/lib/assistant/knowledge.ts
---

# Assistant knowledge base (`knowledge.ts` → `docs/help/APP_GUIDE.md`)

The one text that tells "Ask Braventa" how the app works; the help article `docs/help/APP_GUIDE.md` is generated from it.

## Why this shape

The assistant must never describe a feature the code doesn't have, so the knowledge base is a TypeScript module that imports live facts (`FEATURES`, `TIERS`, `VIEWS`, the tool catalog, `ASSISTANT_LIMITS`) instead of a prose doc that drifts (`web/src/lib/assistant/knowledge.ts:1-16`). The markdown guide is a build output, and a unit test fails when it or the route list is stale (`:7-10`; `web/src/lib/assistant/assistant.test.ts:316-318`).

## Shape

- `KNOWLEDGE_VERSION` (`"2026-10-23"`) — `web/src/lib/assistant/knowledge.ts:13`
- `APP_ROUTES`: every `page.tsx` route with title, purpose, how to get there — `:19-27`
- `knowledgeSections()` — `:165-262`; `knowledgeForPrompt()` joins them for the system message — `:265-269`, used in `web/src/lib/assistant/prompt.ts:160-161`
- `renderGuide()` writes the GENERATED header, version and sections — `:271-284`
- Scripts `help:doc`, `help:doc:check` — `web/package.json:15-16` → `web/scripts/build-help-doc.mts` (target `:8`, check `:11-22`, write `:24-26`)
- Test: guide equals `renderGuide()` — `web/src/lib/assistant/assistant.test.ts:316-318`; imports `:8`
- "Coming soon" tools come from `tool-catalog.ts` `status: "coming_soon"` — `knowledge.ts:15-17`; `web/src/lib/integrations/tool-catalog.ts:24`

Citations: `web/src/lib/assistant/knowledge.ts:7-27,265-284`, `web/scripts/build-help-doc.mts:6-26`

## Connected to

- **owns:** `docs/help/APP_GUIDE.md` (generated)
- **owned-by:** nothing
- **joins:** [plan-tier](../tenancy/plan-tier.md) (`FEATURES`, `TIERS`, `TRIAL_DAYS`), [connect-step](../onboarding/connect-step.md) (tool catalog), [assistant-usage](assistant-usage.md) (limits text), [member-role](../tenancy/member-role.md) (the "Roles" section `knowledge.ts:232-236` is prose, not imported from `web/src/lib/team/roles.ts`), [ai-worker](../pipeline/ai-worker.md) (`app_assistant` system prompt, `web/src/lib/ai/router.ts:52-64`)
- **looks-like-but-is-not:** [knowledge-document](../pipeline/knowledge-document.md) (crawled customer pages); `map/` itself (for editors, not users)

## If you change this

- **Hits:** [ask-braventa](../../processes/ask-braventa.md); `docs/help/APP_GUIDE.md` (run `npm run help:doc` in `web/` or the test fails)
- **Does not hit:** the model table, the limits, the MCP server

## Surfaces

| Surface | Role |
|---|---|
| `POST /api/assistant` (via `buildAssistantMessages`) | reads |
| `npm run help:doc` / `help:doc:check` | writes / verifies the doc |
| `vitest` (`assistant.test.ts`) | verifies |
| Editor | edits `knowledge.ts`, regenerates |

## See

- Source: `web/src/lib/assistant/knowledge.ts`, `web/scripts/build-help-doc.mts`
- As built: `docs/help/APP_GUIDE.md`

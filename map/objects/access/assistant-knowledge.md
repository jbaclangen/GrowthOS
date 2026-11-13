---
type: object
cluster: access
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
entity: web/src/lib/assistant/knowledge.ts
---

# Assistant knowledge base (`knowledge.ts` → `docs/help/APP_GUIDE.md`)

The one text that tells "Ask Braventa" how the app works; the help article `docs/help/APP_GUIDE.md` is generated from it.

## Why this shape

The assistant must never describe a feature the code doesn't have, so the knowledge base is a TypeScript module that imports live facts (`FEATURES`, `TIERS`, `TRIAL_DAYS`, `BUSINESS_LIMITS`, `VIEWS`, the tool catalog, `ASSISTANT_LIMITS`) instead of a prose doc that drifts (`web/src/lib/assistant/knowledge.ts:1-18`). The markdown guide is a build output, and a unit test fails when it or the route list is stale (`:8-11`; `web/src/lib/assistant/assistant.test.ts:299-306,443-446`).

## Shape

- `KNOWLEDGE_VERSION` (`"2026-11-14"`) — `web/src/lib/assistant/knowledge.ts:14`
- `APP_ROUTES`: every `page.tsx` route with title, purpose, how to get there — `web/src/lib/assistant/knowledge.ts:20-128`
- `knowledgeSections()` — `web/src/lib/assistant/knowledge.ts:174-286`; `knowledgeForPrompt()` joins them for the system message — `:288-293`, used in `web/src/lib/assistant/prompt.ts:189`
- Growth-score paragraph (weights, what the tile and Scores section say) — `knowledge.ts:159`, prose, not imported from `web/src/lib/modules/score.ts`
- Several-businesses paragraph — `knowledge.ts:248`, its numbers from `BUSINESS_LIMITS` (`web/src/lib/plans/business-limit.ts:12`)
- `renderGuide()` writes the GENERATED header, version and sections — `knowledge.ts:295-308`
- Scripts `help:doc`, `help:doc:check` — `web/package.json:15-16` → `web/scripts/build-help-doc.mts` (target `:8`, check `:11-22`, write `:24-26`)
- Test: guide equals `renderGuide()` — `web/src/lib/assistant/assistant.test.ts:443-446`; every page route is in `APP_ROUTES` — `:299-306`; imports `:10`
- "Coming soon" tools come from `tool-catalog.ts` `status: "coming_soon"` — `knowledge.ts:16-18`; `web/src/lib/integrations/tool-catalog.ts:26` (Search Console, Google Analytics 4 and HubSpot are the `live` entries, `:38-40`, `:46-48`, `:69-71`)

Citations: `web/src/lib/assistant/knowledge.ts:8-28,288-308`, `web/scripts/build-help-doc.mts:6-26`

## Connected to

- **owns:** `docs/help/APP_GUIDE.md` (generated)
- **owned-by:** nothing
- **joins:** [plan-tier](../tenancy/plan-tier.md) (`FEATURES`, `TIERS`, `TRIAL_DAYS`), [account-trial](../tenancy/account-trial.md) (`BUSINESS_LIMITS`), [connect-step](../onboarding/connect-step.md) (tool catalog), [assistant-usage](assistant-usage.md) (limits text), [member-role](../tenancy/member-role.md) (the "Roles" section `knowledge.ts:251-255` is prose, not imported from `web/src/lib/team/roles.ts`), [growth-score](../report/growth-score.md) (`knowledge.ts:159` restates the weights and the blend wording in prose; the score tile and Scores section take that wording from `scoreBlend`, `web/src/lib/modules/score.ts:201-215`), [ai-worker](../pipeline/ai-worker.md) (`app_assistant` system prompt, `web/src/lib/ai/router.ts:52-64`)
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

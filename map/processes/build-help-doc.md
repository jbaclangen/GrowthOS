---
type: process
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
consumes: ["[[assistant-knowledge]]", "[[app-routes]]"]
produces: ["[[assistant-knowledge]]"]
---

# build-help-doc

Regenerate `docs/help/APP_GUIDE.md` from the assistant's knowledge base whenever that base or the app's page routes
change, and let a check and a test refuse a stale copy.

## Input → Movement → Output

`web/src/lib/assistant/knowledge.ts` is the source; `docs/help/APP_GUIDE.md` is generated from it and a test fails
when they differ or when a page route under `web/src/app` is missing from `APP_ROUTES`
(`web/src/lib/assistant/knowledge.ts:8-11`). `npm run help:doc` calls `renderGuide()` and writes the file
(`web/scripts/build-help-doc.mts:6-9,24-25`). `--check` compares and exits 1 instead (`web/scripts/build-help-doc.mts:11-21`).

## Why this shape

If the guide were hand-written, the in-app assistant and the help article could describe two different products; if
pages could be added without touching `APP_ROUTES`, the assistant would not know they exist. Generation from one
file plus the route test keeps "never describe a planned feature as live" (`web/src/lib/assistant/knowledge.ts:11`)
checkable.

## Steps

1. Edit `web/src/lib/assistant/knowledge.ts` (`APP_ROUTES` `web/src/lib/assistant/knowledge.ts:28`; `knowledgeSections()` `:174`; `renderGuide()` `:296`).
   Parts come straight from code (`FEATURES`, `VIEWS`, provenance labels, `web/src/lib/assistant/knowledge.ts:10`), so a change there moves the guide too.
2. In `web/`, run `npm run help:doc` (`web/package.json:15`): `web/scripts/build-help-doc.mts:8-9,24-25` writes
   `docs/help/APP_GUIDE.md`, whose first line marks it generated (`docs/help/APP_GUIDE.md:1`).
3. Run `npm run help:doc:check` (`web/package.json:16`; `web/scripts/build-help-doc.mts:11-21`) or `npm test`:
   `web/src/lib/assistant/assistant.test.ts:443-446` asserts the file equals `renderGuide()`.
4. The same test walks every `page.tsx` under `web/src/app` and fails when a route is missing from `APP_ROUTES` or an
   `APP_ROUTES` entry no longer exists (`web/src/lib/assistant/assistant.test.ts:283-294,299-307`).
5. Commit `knowledge.ts` and `docs/help/APP_GUIDE.md` together.

Must run after: any edit to `knowledge.ts`; adding, moving or removing a page under `web/src/app`; a change to any
value the file imports (`web/src/lib/assistant/knowledge.ts:1-6`: tiers and trial days, the business limits,
provenance labels, the report `VIEWS`, the tool catalog, the assistant limits).

## Human gate

None: a CI-style check (`help:doc:check`, the unit test). The rule the content must keep, true-to-code copy, is
reviewed by whoever edits `knowledge.ts` (`CLAUDE.md:37-39`).

## If you change this

- **Hits:** [assistant-knowledge](../objects/access/assistant-knowledge.md) (source and output), [app-routes](../objects/config/app-routes.md) (the route test), `docs/help/APP_GUIDE.md`, [ask-braventa](ask-braventa.md) (answers from the same sections).
- **Does not hit:** the database, tokens, the marketing site.

## Surfaces

| Surface | Role |
|---|---|
| Developer in `web/` | runs `help:doc`, commits both files |
| `web/scripts/build-help-doc.mts` | renders and checks |
| `web/src/lib/assistant/assistant.test.ts:283-307,443-446` | refuses drift |
| `POST /api/assistant` (`web/src/app/api/assistant/route.ts:36`) | answers users from the same sections (`knowledgeForPrompt()`, `web/src/lib/assistant/knowledge.ts:289`) |

## See

- Objects: [assistant-knowledge](../objects/access/assistant-knowledge.md), [app-routes](../objects/config/app-routes.md), [generators](../objects/config/generators.md)
- Source: `web/scripts/build-help-doc.mts`

---
type: process
universe: live
status: verified
verified: 2026-11-08
commit: 1d58a87
consumes: ["[[integration-connection]]", "[[organization]]", "[[plan-tier]]", "[[business-profile]]", "[[module-registry]]", "[[member-role]]"]
produces: ["[[search-console-snapshot]]", "[[report]]", "[[growth-score]]", "[[module-run]]"]
---

# sync-search-console

Braventa fetches one Search Console snapshot for an organization, keeps the last twelve, and the latest one flows into the scoring step and the report.

## Input → Movement → Output

Input: an active connection with a readable refresh token, triggered by the OAuth callback, Settings "Refresh" or a property choice; the pipeline itself only reads. Movement: `syncSearchConsole` re-checks plan access, applies the 10-minute guard, mints an access token, picks or validates the property, fetches, inserts, prunes and updates the connection. Output: a new `search_console_snapshots` row and connection status; later, `summarizeSnapshot` of the latest row reaches the diagnosis prompt, the score and `reports.data.search_console`; when it scored, `reports.data.module_scores.search_visibility` feeds the report's Search visibility bar and Ask Braventa's summary.

## Why this shape

The pipeline never calls Google: it reads the latest stored row, so a slow or failing Google API can't stall an analysis (`web/src/lib/pipeline/website-intel.ts:432-438`). The plan gate runs on every sync, so a trial that ended pauses the connection instead of fetching for Basic (`web/src/lib/integrations/search-console.ts:391-396`). The guard protects Google's quota (`:397-399`).

## Steps

1. Load the connection; `revoked` or no token → `not-connected` — `web/src/lib/integrations/search-console.ts:379-387`.
2. Plan gate `searchConsoleAccess`; not allowed → set `paused` — `:391-396`; `web/src/lib/integrations/search-console-access.ts:12-15`.
3. 10-minute guard on `last_attempted_at` unless `skipGuard` (`REFRESH_INTERVAL_MS`) — `:18,397-400`.
4. Decrypt the refresh token (unreadable → `error`, reconnect) and mint an access token — `:404-412`.
5. List verified properties; keep the selected one or `pickProperty` from the business website; none → `needs-property` — `:413-422`.
6. `fetchSnapshot` (28-day ranges, top 25 queries and pages, devices, sitemaps, URL Inspection) — `:423`, `:324-330`.
7. Insert the snapshot, prune to `KEEP_SNAPSHOTS`, mark the connection `active` with `last_synced_at` — `:424-444`, `:452-466`; errors → `describeError` → status + `last_error` — `:445-449`.
8. Callers: callback (`skipGuard`) `web/src/app/api/integrations/google/callback/route.ts:115` (only when the Search Console scope was granted); Settings refresh (any member, no permission) `web/src/app/settings/connections-actions.ts:33-38`; choose property (a first choice skips the guard) `:40-50`, needs `integrations.connect` (owner only) `:42`; `selectProperty` `search-console.ts:470-486`.
9. Into scoring: `searchConsoleEvidence` only when `search_visibility` is enabled → `searchConsoleSummaryForPrompt` (active connection, plan access, latest snapshot) → `summarizeSnapshot` — `web/src/lib/pipeline/website-intel.ts:436-438,639-640`; `search-console.ts:503-511,254`; the prompt cites it as `G1` — `web/src/lib/pipeline/prompts.ts:152`, `web/src/lib/modules/registry.ts:283`.
10. Score parts from the summary (`searchVisibilityEvidence`; none with `little_data`) — `web/src/lib/modules/score.ts:77-94`; the module counts only with parts — `score.ts:171-178`; the report records property, period and `fetched_at` — `website-intel.ts:678-680`, and `score_modules`/`module_scores` — `:668-669`; the diagnosis-update step reads the same evidence without recomputing the score — `:595-598`.
11. Shown when `search_visibility` counted: the score tile and Scores section add "your search data" to the blend (`scoreBlend`) and a Search visibility bar from `module_scores.search_visibility` — `web/src/app/analysis/[id]/infographic.tsx:169-171,185`, `report-sections.tsx:55-56,78`, `score.ts:205-215`; Ask Braventa's summary gets `searchVisibility` — `web/src/lib/assistant/context.ts:180`, `prompt.ts:137`.
12. Disconnect Google: revoke at Google, then for both products delete every snapshot and blank the row to `revoked` — `web/src/lib/integrations/google-connection.ts:83-113`; action `connections-actions.ts:79-89`, needs `integrations.connect` `:82`; matrix row `web/src/lib/team/roles.ts:86`.

## Human gate

None inside the sync. The owner chooses a property when `pickProperty` finds no match (`needs-property`, step 5) and decides to disconnect.

## If you change this

- **Hits:** [search-console-snapshot](../objects/integrations/search-console-snapshot.md), [score-and-diagnose](score-and-diagnose.md), [revise-diagnosis](revise-diagnosis.md), `/search` (`web/src/app/search/page.tsx:38-44`), the report's Search visibility bar and Ask Braventa (step 11), copy that says the data feeds the diagnosis and score (`web/src/components/connections/search-console-card.tsx:162-165`, `web/src/lib/assistant/knowledge.ts:158`, site pages), `docs/architecture/FEATURE_MODULES.md` §9
- **Does not hit:** [connect-search-console](connect-search-console.md) before its step 9, [sync-google-analytics](sync-google-analytics.md) (its own row, guard and property; only the callback and the disconnect are shared), the content steps, MCP

## Surfaces

| Surface | Role |
|---|---|
| `syncSearchConsole` (callback, Settings actions) | writes snapshot + connection |
| scoring / diagnosis_update steps | read the latest snapshot |
| `/search`, Settings card, connect step | read the latest snapshot |
| report score tile, Scores section, Ask Braventa | read `reports.data.module_scores.search_visibility` when it counted |
| Google Search Console API | source |

## See

- Objects: [search-console-snapshot](../objects/integrations/search-console-snapshot.md), [integration-connection](../objects/integrations/integration-connection.md), [growth-score](../objects/report/growth-score.md), [report](../objects/report/report.md), [member-role](../objects/tenancy/member-role.md)
- Source: `web/src/lib/integrations/search-console.ts`

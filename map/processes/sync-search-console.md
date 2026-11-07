---
type: process
universe: live
status: verified
verified: 2026-11-08
commit: 00d230f
consumes: ["[[integration-connection]]", "[[organization]]", "[[plan-tier]]", "[[business-profile]]", "[[module-registry]]", "[[member-role]]"]
produces: ["[[search-console-snapshot]]", "[[report]]", "[[growth-score]]", "[[module-run]]"]
---

# sync-search-console

Braventa fetches one Search Console snapshot for an organization, keeps the last twelve, and the latest one flows into the scoring step and the report.

## Input → Movement → Output

Input: an active connection with a readable refresh token, triggered by the OAuth callback, Settings "Refresh" or a property choice; the pipeline itself only reads. Movement: `syncSearchConsole` re-checks plan access, applies the 10-minute guard, mints an access token, picks or validates the property, fetches, inserts, prunes and updates the connection. Output: a new `search_console_snapshots` row and connection status; later, `summarizeSnapshot` of the latest row reaches the diagnosis prompt, the score and `reports.data.search_console`; when it scored, `reports.data.module_scores.search_visibility` feeds the report's Search visibility bar and Ask Braventa's summary.

## Why this shape

The pipeline never calls Google: it reads the latest stored row, so a slow or failing Google API can't stall an analysis (`web/src/lib/pipeline/website-intel.ts:430-436`). The plan gate runs on every sync, so a trial that ended pauses the connection instead of fetching for Basic (`web/src/lib/integrations/search-console.ts:430-435`). The guard protects Google's quota (`:436-438`).

## Steps

1. Load the connection; `revoked` or no token → `not-connected` — `web/src/lib/integrations/search-console.ts:418-426`.
2. Plan gate `searchConsoleAccess`; not allowed → set `paused` — `:430-435`; `web/src/lib/integrations/search-console-access.ts:12-15`.
3. 10-minute guard on `last_attempted_at` unless `skipGuard` (`REFRESH_INTERVAL_MS`) — `:18,436-439`.
4. Decrypt the refresh token (unreadable → `error`, reconnect) and mint an access token — `:443-451`.
5. List verified properties; keep the selected one or `pickProperty` from the business website; none → `needs-property` — `:452-461`.
6. `fetchSnapshot` (28-day ranges, top 25 queries and pages, devices, sitemaps, URL Inspection) — `:462`, `:324-330`.
7. Insert the snapshot, prune to `KEEP_SNAPSHOTS`, mark the connection `active` with `last_synced_at` — `:463-483`, `:491-505`; errors → `describeError` → status + `last_error` — `:484-488`.
8. Callers: callback (`skipGuard`) `web/src/app/api/integrations/google/callback/route.ts:115`; Settings refresh (any member, no permission) `web/src/app/settings/connections-actions.ts:31-36`; choose property (a first choice skips the guard) `:38-48`, needs `integrations.connect` (owner only) `:40`; `selectProperty` `search-console.ts:509-525`.
9. Into scoring: `searchConsoleEvidence` only when `search_visibility` is enabled → `searchConsoleSummaryForPrompt` (active connection, plan access, latest snapshot) → `summarizeSnapshot` — `web/src/lib/pipeline/website-intel.ts:434-436,626-628`; `search-console.ts:575-583,254`; the prompt cites it as `G1` — `web/src/lib/pipeline/prompts.ts:149`, `web/src/lib/modules/registry.ts:280`.
10. Score parts from the summary (`searchVisibilityEvidence`; none with `little_data`) — `web/src/lib/modules/score.ts:75-92`; the module counts only with parts — `score.ts:134-139`; the report records property, period and `fetched_at` — `website-intel.ts:665-667`, and `score_modules`/`module_scores` — `:655-656`; the diagnosis-update step reads the same evidence without recomputing the score — `:584-586`.
11. Shown when `search_visibility` counted: the score tile and Scores section add "your search data" to the blend (`scoreBlend`) and a Search visibility bar from `module_scores.search_visibility` — `web/src/app/analysis/[id]/infographic.tsx:169-171,183`, `report-sections.tsx:55-56,77`, `score.ts:165-174`; Ask Braventa's summary gets `searchVisibility` — `web/src/lib/assistant/context.ts:180`, `prompt.ts:137`.
12. Disconnect: revoke at Google, delete every snapshot, blank the row to `revoked` — `search-console.ts:528-558`; action `connections-actions.ts:50-59`, needs `integrations.connect` `:52`; matrix row `web/src/lib/team/roles.ts:86`.

## Human gate

None inside the sync. The owner chooses a property when `pickProperty` finds no match (`needs-property`, step 5) and decides to disconnect.

## If you change this

- **Hits:** [search-console-snapshot](../objects/integrations/search-console-snapshot.md), [score-and-diagnose](score-and-diagnose.md), [revise-diagnosis](revise-diagnosis.md), `/search` (`web/src/app/search/page.tsx:38-44`), the report's Search visibility bar and Ask Braventa (step 11), copy that says the data feeds the diagnosis and score (`web/src/components/connections/search-console-card.tsx:162-164`, `web/src/lib/assistant/knowledge.ts:158`, site pages), `docs/architecture/FEATURE_MODULES.md` §9
- **Does not hit:** [connect-search-console](connect-search-console.md) before its step 9, the content steps, MCP

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

---
type: object
cluster: integrations
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
entity: supabase/migrations/20261011161133_search_console.sql
---

# Search Console snapshot (`search_console_snapshots`)

One row per fetch of Search Console data for an organization (28-day totals, top queries and pages, device split); the latest row is what `/search`, the diagnosis and the growth score read.

## Why this shape

Google's data lags and is quota-limited, so Braventa stores a fetch instead of querying live: a fetch runs at most every `REFRESH_INTERVAL_MS` (10 minutes, `web/src/lib/integrations/search-console.ts:18,397-399`), only `KEEP_SNAPSHOTS` (12) rows survive pruning (`:20,452-466`), and the composite FK ties each row to a connection of the same organization (`supabase/migrations/20261011161133_search_console.sql:61-63`).

## Shape

- Columns: `connection_id`, `property`, `date_range_start/end`, `dimensions[]`, `rows` jsonb, `totals` jsonb, `fetched_at` — `supabase/migrations/20261011161133_search_console.sql:49-64`
- RLS "members read", select-only grant — `supabase/migrations/20261011161133_search_console.sql:68-72`
- Insert: `syncSearchConsole` `web/src/lib/integrations/search-console.ts:424-434`
- Delete: Google account changed `web/src/lib/integrations/google-connection.ts:61-64`, disconnect `:87` (`clearConnection`), prune `search-console.ts:452-466`; removing the business deletes them with the organization (`on delete cascade`, `supabase/migrations/20261011161133_search_console.sql:51`)
- Read: `latestSnapshot` `search-console.ts:488-497`; `/search` `web/src/app/search/page.tsx:38-44`; card `web/src/components/connections/search-console-card.tsx:66-72`
- Into the model and score: `summarizeSnapshot` `search-console.ts:254` ← `searchConsoleSummaryForPrompt` `:503-511` ← `searchConsoleEvidence` `web/src/lib/pipeline/website-intel.ts:436-438` (only when `search_visibility` is enabled); score parts `searchVisibilityEvidence` `web/src/lib/modules/score.ts:77-95`; the report records which snapshot was used `web/src/lib/pipeline/website-intel.ts:678-680`
- Downstream, not the row: the module's sub-score `reports.data.module_scores.search_visibility` shows as a Search visibility bar when it counted, on the score tile `web/src/app/analysis/[id]/infographic.tsx:171,185` and Scores section `web/src/app/analysis/[id]/report-sections.tsx:56,78`, and in Ask Braventa's summary `web/src/lib/assistant/context.ts:186`, `web/src/lib/assistant/prompt.ts:158`
- Prompt ref `G1` `web/src/lib/modules/registry.ts:283`; findings citing it map to `search_visibility` `:291-295`

Citations: `supabase/migrations/20261011161133_search_console.sql:47-72`, `web/src/lib/integrations/search-console.ts:368-466`

## Connected to

- **owns:** nothing
- **owned-by:** [integration-connection](integration-connection.md), [organization](../tenancy/organization.md)
- **joins:** [report](../report/report.md) (`reports.data.search_console`), [growth-score](../report/growth-score.md), [diagnosis-finding](../report/diagnosis-finding.md) (ref `G1`), [module-run](../modules/module-run.md)
- **looks-like-but-is-not:** [audit-run](../pipeline/audit-run.md) (Braventa's own crawl, not Google's data); [analytics-snapshot](analytics-snapshot.md) (GA4 data from the same Google connection, the Analytics module)

## If you change this

- **Hits:** [sync-search-console](../../processes/sync-search-console.md), [score-and-diagnose](../../processes/score-and-diagnose.md), [revise-diagnosis](../../processes/revise-diagnosis.md), `docs/architecture/FEATURE_MODULES.md` §9
- **Does not hit:** [connect-search-console](../../processes/connect-search-console.md) up to `saveGoogleConnection`, the MCP and OAuth tables

## Surfaces

| Surface | Role |
|---|---|
| `syncSearchConsole` (callback, Settings refresh, property choice) | writes |
| `/search`, Settings card, connect step | reads |
| scoring and diagnosis_update steps | reads (latest row) |
| report score tile, Scores section, Ask Braventa summary | read `module_scores.search_visibility`, not the row |
| `disconnectGoogle` (from `disconnectGoogleAction`, owner only through `integrations.connect`, `web/src/app/settings/connections-actions.ts:84`) | deletes |

## See

- Source: `supabase/migrations/20261011161133_search_console.sql`, `web/src/lib/integrations/search-console.ts`
- As built: `docs/architecture/FEATURE_MODULES.md` (§9 Search visibility)

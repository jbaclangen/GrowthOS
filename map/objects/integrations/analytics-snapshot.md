---
type: object
cluster: integrations
universe: live
status: verified
verified: 2026-11-08
commit: 1d58a87
entity: supabase/migrations/20261107224123_google_analytics.sql
---

# Google Analytics snapshot (`analytics_snapshots`)

One row per fetch of Google Analytics 4 data for an organization (28-day totals against the 28 before, top channels, landing pages, devices, recorded key events); the latest row is what the Settings card, the diagnosis and the growth score (the Analytics module) read.

The migration that creates the table was applied to the Supabase project on 2026-11-08 (version `20261107224123`).

## Why this shape

Same reasons and same rules as [search-console-snapshot](search-console-snapshot.md): the migration says so (`supabase/migrations/20261107224123_google_analytics.sql:11`): Google's data lags and is quota-limited, so Braventa stores a fetch instead of querying live. A fetch runs at most every `REFRESH_INTERVAL_MS` (10 minutes, `web/src/lib/integrations/google-analytics.ts:19,405-407`), only `KEEP_SNAPSHOTS` (12) rows survive pruning (`:21,464-478`), and the composite FK ties each row to a connection of the same organization (`20261107224123_google_analytics.sql:34-35`). The window ends two days back so the data has settled (`google-analytics.ts:23-24,85-92`).

## Shape

- Columns: `connection_id`, `property` (`properties/<digits>`), `date_range_start/end`, `rows` jsonb, `totals` jsonb, `fetched_at` — `supabase/migrations/20261107224123_google_analytics.sql:23-36`; indexes `:37-38`
- RLS "members read", select-only grant — `:40-44`
- Shapes: `AnalyticsTotals`, `AnalyticsRows`, `AnalyticsSnapshot` — `web/src/lib/integrations/google-analytics.ts:38-57`; built by `fetchSnapshot` (Data API `batchRunReports`, Admin API property details and key events, both optional) `:315-362`
- Insert: `syncAnalytics` `web/src/lib/integrations/google-analytics.ts:438-447`
- Delete: Google account changed `web/src/lib/integrations/google-connection.ts:58-61`, disconnect `:83` (`clearConnection`, table from `SNAPSHOT_TABLES` `:16-19`), another property chosen `google-analytics.ts:497-499`, prune `:464-478`
- Read: `latestAnalyticsSnapshot` `google-analytics.ts:509-518`; the Settings and connect-step card `web/src/components/connections/analytics-card.tsx:62-68`
- Into the model and score: `summarizeAnalytics` `google-analytics.ts:237-264` (`new_property` for a property created inside the window, `:203-207`) ← `analyticsSummaryForPrompt` (active connection, Pro access, latest row) `:519-527` ← `analyticsModuleEvidence` `web/src/lib/pipeline/website-intel.ts:442-444` (only when `analytics` is enabled); score parts `analyticsEvidence` `web/src/lib/modules/score.ts:99-129`; the report records which snapshot was used `web/src/lib/pipeline/website-intel.ts:682-684`
- Prompt ref `G2` `web/src/lib/modules/registry.ts:285`, fenced block `web/src/lib/pipeline/prompts.ts:312-320`, citable `:153`; findings citing it map to `analytics` `registry.ts:294`; the finding's basis line names Google Analytics 4 `web/src/app/analysis/[id]/plan-section.tsx:89`
- Downstream, not the row: the module's sub-score `reports.data.module_scores.analytics` is stored, and the blend wording names "your website analytics" when it counted (`score.ts:209`), but no report bar and no Ask Braventa line show it at this commit (`web/src/app/analysis/[id]/infographic.tsx:171`, `web/src/app/analysis/[id]/report-sections.tsx:56`, `web/src/lib/assistant/context.ts:180` read only `search_visibility`)

Citations: `supabase/migrations/20261107224123_google_analytics.sql:1-46`, `web/src/lib/integrations/google-analytics.ts:19-26,237-264,385-531`

## Connected to

- **owns:** nothing
- **owned-by:** [integration-connection](integration-connection.md) (provider `google_analytics`), [organization](../tenancy/organization.md)
- **joins:** [report](../report/report.md) (`reports.data.google_analytics`), [growth-score](../report/growth-score.md), [diagnosis-finding](../report/diagnosis-finding.md) (ref `G2`), [module-run](../modules/module-run.md)
- **looks-like-but-is-not:** [search-console-snapshot](search-console-snapshot.md) (search data from the same Google connection, the Search visibility module); [audit-run](../pipeline/audit-run.md) (Braventa's own crawl)

## If you change this

- **Hits:** [sync-google-analytics](../../processes/sync-google-analytics.md), [score-and-diagnose](../../processes/score-and-diagnose.md), [revise-diagnosis](../../processes/revise-diagnosis.md), `web/src/lib/integrations/google-analytics.test.ts`, `docs/architecture/FEATURE_MODULES.md` §10
- **Does not hit:** [connect-search-console](../../processes/connect-search-console.md) up to `saveGoogleConnection`, the MCP and OAuth tables

## Surfaces

| Surface | Role |
|---|---|
| `syncAnalytics` (callback, Settings refresh, property choice) | writes |
| Settings → Connections and connect-step card (`analytics-card.tsx`) | reads |
| scoring and diagnosis_update steps | read (latest row) |
| `disconnectGoogle` (from `disconnectGoogleAction`, owner only through `integrations.connect`, `web/src/app/settings/connections-actions.ts:82`) | deletes |

## See

- Source: `supabase/migrations/20261107224123_google_analytics.sql`, `web/src/lib/integrations/google-analytics.ts`
- As built: `docs/architecture/FEATURE_MODULES.md` (§10 Analytics)

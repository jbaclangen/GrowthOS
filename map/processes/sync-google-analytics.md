---
type: process
universe: live
status: verified
verified: 2026-11-08
commit: 1d58a87
consumes: ["[[integration-connection]]", "[[organization]]", "[[plan-tier]]", "[[business-profile]]", "[[module-registry]]", "[[member-role]]"]
produces: ["[[analytics-snapshot]]", "[[report]]", "[[growth-score]]", "[[module-run]]"]
---

# sync-google-analytics

Braventa fetches one Google Analytics 4 snapshot for an organization, keeps the last twelve, and the latest one flows into the scoring step and the report as the Analytics module.

## Input → Movement → Output

Input: an active `google_analytics` connection with a readable refresh token, triggered by the OAuth callback, Settings "Refresh Google Analytics data" or a property choice; the pipeline itself only reads. Movement: `syncAnalytics` re-checks plan access, applies the 10-minute guard, mints an access token, lists the account's GA4 properties, keeps the chosen one or matches one to the website through its web streams, fetches, inserts, prunes and updates the connection. Output: a new `analytics_snapshots` row and connection status; later, `summarizeAnalytics` of the latest row reaches the diagnosis prompt (ref `G2`), the score and `reports.data.google_analytics`.

## Why this shape

The pipeline never calls Google: it reads the latest stored row, so a slow or failing Google API can't stall an analysis (`web/src/lib/pipeline/website-intel.ts:440-444`). The plan gate runs on every sync, so a trial that ended pauses the connection instead of fetching for Basic (`web/src/lib/integrations/google-analytics.ts:399-404`). The guard protects Google's quota (`:405-407`). A property is picked without asking only when exactly one property has a web stream for the analyzed website's host; two or none ask the owner (`:188-195`).

## Steps

1. Load the connection; `revoked` or no token → `not-connected` — `web/src/lib/integrations/google-analytics.ts:387-395`.
2. Plan gate `googleAnalyticsAccess`; not allowed → set `paused` — `:399-404`; `web/src/lib/integrations/google-analytics-access.ts:12-15` (feature `google_analytics`, `web/src/lib/plans/tiers.ts:67`).
3. 10-minute guard on `last_attempted_at` unless `skipGuard` (`REFRESH_INTERVAL_MS`) — `:19,405-408`.
4. Decrypt the refresh token (unreadable → `error`, reconnect Google) and mint an access token — `:412-420`.
5. List properties (Admin API account summaries, with display names kept in `property_labels`) — `:421-423`, `:285-295`; keep the selected one or `pickProperty` over `streamsFor` (web streams of up to 25 properties) — `:424-427`, `:190-195`, `:302-305`; none → `needs-property` — `:428-434`.
6. `fetchSnapshot` (last 28 days ending 2 days ago against the 28 before: totals, top channels, landing pages, devices, recorded key events; property details and key events set up, both optional) — `:435`, `:315-362`, `:85-92`.
7. Insert the snapshot, prune to `KEEP_SNAPSHOTS`, mark the connection `active` with `last_synced_at` — `:436-456`, `:464-478`; errors → `describeError` → status + `last_error` — `:457-461`, `:210-233`.
8. Callers: callback (`skipGuard`, only when the Analytics scope was granted) `web/src/app/api/integrations/google/callback/route.ts:116`; Settings refresh (any member, no permission) `web/src/app/settings/connections-actions.ts:60-65`; choose property (always skips the guard) `:67-77`, needs `integrations.connect` (owner only) `:69`; `selectProperty` (another property deletes the old snapshots) `google-analytics.ts:484-507`.
9. Into scoring: `analyticsModuleEvidence` only when `analytics` is enabled → `analyticsSummaryForPrompt` (active connection, plan access, latest snapshot) → `summarizeAnalytics` — `web/src/lib/pipeline/website-intel.ts:442-444,640`; `google-analytics.ts:523-531,237-264`; the prompt fences it as `<google_analytics>` with ref `G2` — `web/src/lib/pipeline/prompts.ts:312-320,153`, `web/src/lib/modules/registry.ts:285`.
10. Score parts from the summary (`analyticsEvidence`; none for a property created inside the window) — `web/src/lib/modules/score.ts:111-129`; the module counts only with parts — `score.ts:171-178`; the report records property, period, `fetched_at` and `new_property` — `website-intel.ts:682-684`; a `module_runs` row `analytics` — `:730-747`; the diagnosis-update step reads the same evidence without recomputing the score — `:595-598`.
11. Shown when `analytics` counted: the blend wording adds "your website analytics" (`score.ts:209`); a finding citing `G2` names Google Analytics 4 on its basis line — `web/src/app/analysis/[id]/plan-section.tsx:89`. The Settings card shows the latest snapshot's totals and channels — `web/src/components/connections/analytics-card.tsx:62-68,234-250`.
12. Disconnect Google: shared with Search Console — [connect-search-console](connect-search-console.md) step 11.

## Human gate

None inside the sync. The owner chooses a property when no single property matches the website (`needs-property`, step 5) and decides to disconnect.

## If you change this

- **Hits:** [analytics-snapshot](../objects/integrations/analytics-snapshot.md), [score-and-diagnose](score-and-diagnose.md), [revise-diagnosis](revise-diagnosis.md), `web/src/lib/integrations/google-analytics.test.ts`, copy that says the data feeds the diagnosis and score (`web/src/components/connections/analytics-card.tsx:171-174`, `web/src/lib/integrations/tool-catalog.ts`, `web/src/lib/assistant/knowledge.ts`, site pages), `docs/architecture/FEATURE_MODULES.md` §10
- **Does not hit:** [sync-search-console](sync-search-console.md) (its own row, guard and property), [connect-search-console](connect-search-console.md) before its step 9, the content steps, MCP

## Surfaces

| Surface | Role |
|---|---|
| `syncAnalytics` (callback, Settings actions) | writes snapshot + connection |
| scoring / diagnosis_update steps | read the latest snapshot |
| Settings card, connect step (`analytics-card.tsx`) | read the latest snapshot |
| Google Analytics Admin API and Data API | source |

## See

- Objects: [analytics-snapshot](../objects/integrations/analytics-snapshot.md), [integration-connection](../objects/integrations/integration-connection.md), [growth-score](../objects/report/growth-score.md), [report](../objects/report/report.md), [member-role](../objects/tenancy/member-role.md)
- Source: `web/src/lib/integrations/google-analytics.ts`

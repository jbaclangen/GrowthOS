# Feature modules

**Status:** built 2026-10-23 (D-051 steps 1–6; the spec step of D-052). Describes the code as it is. The first new
module, Search visibility (D-051 step 6), is live: §9 is its spec. The second, Analytics (Google Analytics 4,
D-058), is live since 2026-11-08: §10 is its spec. What is still open is listed in §8. §11 proposes the third, CRM
intelligence (HubSpot counts, D-060): **proposed, not built**, waiting for the founder's decision.

Braventa's analysis is made of feature modules: capability areas that each collect evidence, produce findings and
plan items, and may carry a sub-score. The growth plan is the core that combines them, not a module. Research:
[SEATS_ROLES_MODULES_2026-10-17.md](../research/SEATS_ROLES_MODULES_2026-10-17.md) §0, §5, §6; decision: D-051.

## 1. Registry

`web/src/lib/modules/registry.ts` is the one list of modules (pure logic, unit-tested in `registry.test.ts`). Each
module has:

| Field | Meaning | Source of truth |
|---|---|---|
| `id` | Stable identifier, also the database domain `module_id` | Registry; `migration.test.ts` checks the SQL domain lists the same ids |
| `label`, `summary` | Descriptive display name (D-010, Q-036) and one line of what it covers | Registry |
| `tier` | The lowest tier that includes it | D-051's module-to-tier map (§2) |
| `featureId` | The plans-page feature it is gated with, when one exists | `FEATURES` in `web/src/lib/plans/tiers.ts`; the test checks the feature's `minTier` equals `tier`, and that a live module's feature is live |
| `live` | The code does it today | Only the modules in the current pipeline (the four Basic ones, Search visibility and Analytics); set in the PR that ships a module |
| `scoreWeight` | Its weight in the growth score: the sum of its parts' weights with full evidence; null when not scored | `score.ts` builds the parts; `score.test.ts` checks the sum |
| `subScore` | What its sub-score measures; null for an output module | Research §5 |
| `findingCategories`, `planAreas` | The `audit_findings.category` and `growth_plan_items.area` values it owns | Used by `moduleForArea` and the backfill |

## 2. Modules, tiers and status

| Lowest tier | Module | Live | Scored |
|---|---|---|---|
| Basic | Business intelligence (`business_intel`) | Yes: profile, owner inputs, discovery | No (produces context) |
| Basic | Website and technical SEO (`website_seo`) | Yes: crawl, checks, PageSpeed | 0.35: PageSpeed mobile performance 0.15, SEO 0.12, accessibility 0.04, best practices 0.04 |
| Basic | Conversion and messaging (`conversion`) | Yes: the assessed scores and the diagnosis | 0.65: content clarity 0.25, conversion readiness 0.25, online presence 0.15 |
| Basic | Content studio (`content_studio`) | Yes: 30-day plan, drafts | No (an output) |
| Pro | Search visibility (`search_visibility`) | Yes: the latest Google Search Console snapshot in the diagnosis and the score (§9) | 0.10: average position 0.04, click-through rate 0.02, clicks against the previous 28 days 0.02, pages with impressions 0.01, home page indexed 0.01 |
| Pro | Analytics (`analytics`) | Yes: the latest Google Analytics 4 snapshot in the diagnosis and the score (§10) | 0.10: data flowing 0.03, key events 0.03, engagement rate 0.02, sessions against the previous 28 days 0.02 |
| Pro | Local SEO, Social media, Search ads, Email marketing, Video, CRM intelligence, Automation | No | Later, each with its own sub-score (Automation isn't scored). CRM intelligence is proposed in §11 (not built) |
| Premium | Custom integrations | No | Per contract |

"Online presence" is assessed from the website (social links, schema, listings) and stays with Conversion and
messaging until the Social media module is live; moving it changes scores and bumps `SCORE_VERSION`.

## 3. Which modules an organization has

`enabledModuleIds(tier, overrides)` (registry) returns the live modules the organization's tier includes, minus any
row in `organization_modules` with `enabled = false`. An override can't switch on a module that isn't live or that the
tier doesn't include. Nothing writes overrides yet and there is no UI, so today every organization has the four Basic
modules, and Pro, Premium and trial organizations Search visibility and Analytics as well. Overrides affect the
growth score and whether the Search Console and Google Analytics 4 summaries reach the diagnosis, and nothing else: the analysis steps still run, because no
module can be switched off from the app. The pipeline reads the tier and the overrides with the admin client, scoped
to the job's organization (`enabledModules` in `web/src/lib/modules/server.ts`), before the diagnosis model call.

## 4. Growth score

`computeGrowthScore(evidence, enabled)` in `web/src/lib/modules/score.ts` is a renormalized weighted mean over the
parts of every enabled module that has evidence. A module's weight is the sum of its parts' weights; its sub-score
(`subScore`) is the weighted mean of its own parts. The parts are summed in the order the pre-module formula summed
them (assessed scores, then PageSpeed, then Search Console, then Google Analytics 4), so for an organization without
Search Console or GA4 evidence the result is bit-for-bit the score Braventa produced before modules existed. When
PageSpeed didn't respond, Website and technical SEO has no scored evidence and the remaining weights are
renormalized, as before; the same when Search visibility (§9) or Analytics (§10) has nothing to score.

- **Proof:** `score.test.ts` compares the new computation with the old formula (copied verbatim) on every growth_plan
  report stored on 2026-10-23, on a grid of 78,125 boundary-value combinations and on 20,000 seeded random inputs,
  with the Basic module set and with the Pro set (Search visibility enabled, no summary).
- **Storage:** `reports.data` gets `score_version` (`SCORE_VERSION`: 1 until 2026-10-23, 2 since Search visibility
  can join the sum, 3 since Analytics can, 2026-11-08), `score_modules` (the modules whose evidence was used, in
  evidence order), `module_scores` (their sub-scores), `search_console` (the snapshot the diagnosis and score used:
  property, window, fetch time, `little_data`; or null) and `google_analytics` (the same for the GA4 snapshot:
  property, window, fetch time, `new_property`; or null). `growth_score` and `business_profiles.growth_score` are unchanged in meaning. Reports from
  before 2026-10-23 have no list; `modulesUsed` derives it from whether they stored PageSpeed scores, which is how
  their score was computed.
- **Version rule:** bump `SCORE_VERSION` when a part, a weight or the module a part belongs to changes, so a report
  scored under one version isn't compared with one under another (an upgrade isn't an improvement).
- **UI:** the report's score tile (`web/src/app/analysis/[id]/infographic.tsx`) says "Based on N modules" with their
  names, and both it and the Scores section (`report-sections.tsx`) describe the blend from the modules used
  (`scoreBlend` in `score.ts`: "measured site quality", "assessed marketing readiness", "your search data", "your
  website analytics"), with a Search visibility bar when that module counted (Analytics has no bar yet: its
  sub-score is stored but not shown); a finding's basis line names Google Search Console when it cites `G1` and
  Google Analytics 4 when it cites `G2`. The public explanation of the
  score (D-035, amended 2026-10-23) says the score is based on the modules with evidence, named on the report.

## 5. Data

Migration `20261023063253_feature_modules.sql`; details in [DATA_MODEL.md](DATA_MODEL.md).

| Object | Purpose | Written by | Read by | RLS |
|---|---|---|---|---|
| Domain `module_id` | Limits every module column to the registry's ids | Migration | — | — |
| `organization_modules` | Per-organization overrides: `enabled`, `config` | Nobody yet (server only; who may change them comes with roles, D-046) | Scoring step; diagnosis update (`reviseDiagnosis`: whether Search Console evidence goes into the corrected diagnosis) | Members read via `is_member`; no client writes |
| `module_runs` | One row per module that ran in a job: `status` (`completed`/`partial`), `sub_score`, `audit_run_id`, `report_id`, `rules_version`, `details` | Pipeline (`recordModuleRuns`, best effort: a failed write is logged, the analysis continues) | Nothing yet (a record) | Members read; no client writes; same-organization composite FKs to `ai_jobs` and `audit_runs` |
| `diagnosis_findings.module_id` | The module a finding belongs to | Pipeline (`moduleForFinding`): verified citing `G2` → `analytics`, verified citing `G1` → `search_visibility`, other verified → `website_seo`, customer_provided → `business_intel`, inferred → null | Report page (`select *`), unused so far | Not granted to clients |
| `growth_plan_items.module_id` | The module a plan item belongs to | Pipeline (`moduleForArea`): the first comma-separated `area`, matched case-insensitively; `operations`, unknown and empty → null | Not selected yet | Not granted to clients |

The backfill applied the same two rules to existing rows: 62 of 78 findings and 80 of 89 plan items got a module;
the rest are inferred findings and "operations" items.

## 6. Pipeline

Each module's run is recorded in the step where it finishes (`web/src/lib/pipeline/website-intel.ts`):

| Step | Module runs recorded |
|---|---|
| `profiling` (end of the evidence phase) | `business_intel` (completed); `website_seo` (completed, or partial without PageSpeed; `sub_score` from the PageSpeed parts; `audit_run_id`; `rules_version` = `AUDIT_VERSION`) |
| `scoring` | `conversion` (`sub_score` from the assessed scores; `report_id`; `details` holds the score version, the modules used and the enabled set); `search_visibility` when the organization's enabled modules include it (completed with the sub-score when a Search Console summary was used, `sub_score` null on an empty window; partial without a summary; `details` holds the property, window and `little_data`); `analytics` the same way with the GA4 summary (`details` holds the property, window and `new_property`) |
| `writing` | `content_studio` (`report_id`, calendar and draft count) |
| `diagnosis_update` | None: a correction re-runs the diagnosis, not the analysis. It reads the Search Console and GA4 summaries again (the latest snapshots) so corrected diagnoses keep those findings; it doesn't rescore |

For a plan job (`website_plan`) the first two rows belong to the evidence job that ran them. `job_id` is a
same-organization composite foreign key, so a run can't be paired with another organization's job.

## 7. Adding a module

1. Add the registry entry (`live: false` until the PR that ships it), with its `featureId` so the plans page agrees.
2. A migration that replaces the `module_id` domain's constraint with the new list (`migration.test.ts` enforces it).
3. An evidence builder in `score.ts` if it is scored, with its weight in the registry, and a `SCORE_VERSION` bump,
   since existing scores change once its parts join the sum. Update the public score explanation (D-035) and the
   assistant's knowledge base (`npm run help:doc`).
4. Findings and plan items it produces carry its id (`moduleForFinding`, `moduleForArea`, `findingCategories`,
   `planAreas`).
5. Record its run with `recordModuleRuns` in the step where it finishes.
6. Set `live: true`, update the feature's status in `tiers.ts`, and the docs: this file, DATA_MODEL.md, MVP_SCOPE.md,
   PLANS_AND_TIERS.md and the decision log.

## 8. Not built yet

- `audit_findings.module_id`: every audit finding is Website and technical SEO today, so the column would be constant.
- Splitting `prompts.ts` into module fragments and looping the evidence job over enabled modules (research sketch
  steps 4 and 5). Search visibility didn't need them: its evidence is synced outside the evidence job and enters the
  diagnosis prompt as one block in the scoring step (§9). They come with the first module that collects evidence in
  the evidence job.
- A way to switch modules on or off in the app, and who may do it (roles, D-046).
- The report page's one section per module, and "Coming soon" cards for modules that aren't live.
- Search visibility beyond the first cut (§9): keyword and search-intent analysis, Search Console data in the plan
  and writer prompts, a sync during the analysis (today the snapshot is whatever the last sync stored), and a review
  of the provisional sub-score once a few Pro organizations have scores (D-052 step 8).
- Analytics beyond the first cut (§10): a report bar and Ask Braventa summary for its sub-score, Tag Manager checks,
  GA4 data in the plan and writer prompts, a sync during the analysis, and a review of the provisional weights once
  testers have data (Q-062).

## 9. Search visibility

**Status:** built 2026-10-23 (D-051 step 6). The sub-score definition is provisional (addendum to D-051 in the
decision log): the research §5 names the module and its sub-score ("Search visibility": real search demand) but
gives no formula, so this one is proposed here and reviewed after launch (D-052, step 8).

**Evidence.** The organization's latest `search_console_snapshots` row, summarized by `summarizeSnapshot`
(`web/src/lib/integrations/search-console.ts`): the last 28 days of final Search Console data for the connected
property against the 28 days before: clicks, impressions, click-through rate, average position, the change in clicks
and impressions, the top 10 queries and pages, the device split, sitemaps, Google's index verdict for the home page
and `pages_with_impressions` (how many page rows Google returned, up to 25). `searchConsoleSummaryForPrompt(db,
organizationId)` returns it, or null when the connection isn't active, the organization has no Pro access or there is
no snapshot. The scoring step calls it only when `search_visibility` is among the organization's enabled modules
(Pro, Premium or the trial, not switched off), so a Basic plan or an override keeps the data out of the prompt and
the score. Nothing is fetched from Google during an analysis: the snapshot is whatever the last sync stored.

**In the diagnosis.** The summary goes to the diagnosis model as one fenced block, `<search_console>`, with the ref
`G1`, labelled as data measured by Google for that property and window and marked as third-party data (queries and
URLs are untrusted input, like crawled text). The model may give a finding the source `search_console`; it is stored
as Verified only when it cites `G1` (`citableRefs`, `toFindings`), the rule website and PageSpeed findings follow.
Without a summary the prompt is byte-for-byte what it was before this module. A correction (`diagnosis_update`)
re-runs the diagnosis with the latest summary too, so Search Console findings survive corrections; it doesn't rescore.

**Sub-score (0–100).** `searchVisibilityEvidence(summary, crawledPages)` in `score.ts`. No parts (nothing scored; the
other modules' weights renormalize) when there is no summary or the window has fewer than 10 impressions
(`little_data`): an empty window means a new site or a property connected recently, not a poor one. Absolute clicks
and impressions aren't scored, since a service business has no size-free baseline for them; the model reads them in
the prompt. The parts, each 0–100:

| Part | Weight | Value |
|---|---|---|
| `position` | 0.04 | Average position: 3 or better = 100, 30 or worse = 0, linear between |
| `ctr` | 0.02 | Click-through rate: 5% or more = 100, 0% = 0, linear |
| `trend` | 0.02 | Clicks against the previous 28 days: unchanged = 50, halved = 25, none = 0, doubled or more = 100; omitted when the previous window had no clicks |
| `pages_served` | 0.01 | Pages with impressions as a share of the pages Braventa crawled, capped at 100; omitted when no page was crawled |
| `home_indexed` | 0.01 | Google's index verdict for the home page: PASS = 100, anything else = 0; omitted when URL Inspection wasn't available |

The module's weight is 0.10 (registry `scoreWeight`) against 0.65 for conversion and messaging and 0.35 for website
and technical SEO, so with full evidence Search Console carries about 9% of the growth score and the two Basic
modules keep their 65/35 split of the rest. Modest on purpose: 28 days of one property is a thin signal, and Search
Console omits anonymized and rare queries.

**Score version 2.** `SCORE_VERSION` is 2 from this change. An organization without Search Console evidence (Basic,
nothing connected, no snapshot, an empty window or the module switched off) gets exactly the score version 1 gave:
the parts are summed in the same order and the new module adds none, which `score.test.ts` proves on the stored
reports, the 78,125-case grid and the 20,000 random inputs with the Pro module set. With evidence the score can move
by about a tenth, so a report scored under version 2 isn't compared with one under version 1.

**Records.** `module_runs` gets a `search_visibility` row from the scoring step whenever the module is enabled:
`completed` with the sub-score when a summary was used (`sub_score` null and `details.little_data` true for an empty
window), `partial` with no sub-score when there is no summary, and no row when the organization can't use the
module. `reports.data.search_console` keeps the property, window, fetch time and `little_data` of the summary used,
or null. Findings that cite `G1` carry `module_id` `search_visibility` (`moduleForFinding`); plan items keep the area
rule (there is no "search" area; `seo` stays with website and technical SEO). The report's score tile counts the
module ("Based on 3 modules"), the tile and the Scores section show its sub-score (`reports.data.module_scores`) and
name your search data in the blend, Ask Braventa's business summary gets the modules and the sub-score, and a
finding's basis line names Google Search Console next to the checks it cites.

**Not in this change (§8).** Keyword and search-intent analysis, a report section for the module, a module switch in
the app, and Search Console data in the plan and writer prompts.

## 10. Analytics

**Status:** built 2026-11-08 (founder decisions 2026-11-08, D-058). The sub-score definition and its weights are
provisional, like Search visibility's: the research §5 names the module and its sub-score ("Measurement readiness")
but gives no formula, so this one is proposed here and reviewed once testers have data (D-052 step 8, Q-062).

**Evidence.** The organization's latest `analytics_snapshots` row, summarized by `summarizeAnalytics`
(`web/src/lib/integrations/google-analytics.ts`): the last 28 days of Google Analytics 4 data for the connected
property, ending two days ago so the data has settled, against the 28 days before: sessions, users, views,
engagement rate, key events, the change in sessions and key events, the top 10 key events, channels and landing
pages, the device split, how many key events are set up in the property (`key_events_configured`, null when the
Admin API didn't answer) and `new_property` (the property was created within the last 28 days).
`analyticsSummaryForPrompt(db, organizationId)` returns it, or null when the connection isn't active, the
organization has no Pro access or there is no snapshot. The scoring step and the diagnosis update call it only when
`analytics` is among the organization's enabled modules (Pro, Premium or the trial, not switched off). Nothing is
fetched from Google during an analysis: the snapshot is whatever the last sync stored. GA4 comes through the same
Google connection as Search Console (one consent screen, D-058).

**In the diagnosis.** The summary goes to the diagnosis model as one fenced block, `<google_analytics>`, with the ref
`G2` (`ANALYTICS_REF` in the registry), labelled as data measured by Google for that property and window, with the
caveat that GA4 undercounts, and marked as third-party data (channel names, page paths and event names come from the
website's own tracking and are untrusted input). The prompt adds a note when the property is new or has no key events
set up. The model may give a finding the source `analytics`; it is stored as Verified only when it cites `G2`
(`citableRefs`, `toFindings`; `PROVENANCE` in `web/src/lib/plan/priority.ts`). Without a summary the prompt is
byte-for-byte what it was before this module. A correction (`diagnosis_update`) re-runs the diagnosis with the latest
summary too; it doesn't rescore.

**Sub-score (0–100).** `analyticsEvidence(summary)` in `score.ts`. It scores whether measurement works and is set up
to count inquiries, not how much traffic the business gets: there is no size-free baseline for traffic volume, and
the model reads the numbers in the prompt. No parts (nothing scored; the other modules' weights renormalize) when
there is no summary or the property was created within the last 28 days (`new_property`): a new property is new, not
poor. The parts, each 0–100:

| Part | Weight | Value |
|---|---|---|
| `data_flowing` | 0.03 | Any session in the 28 days = 100, none = 0 (an older property that records nothing isn't measuring the website) |
| `key_events` | 0.03 | Key events recorded in the window = 100; set up but none recorded = 50; none set up = 0; omitted when none were recorded and Google didn't say how many are set up |
| `engagement` | 0.02 | Engagement rate: 60% or more = 100, 0% = 0, linear; only with 10 or more sessions |
| `trend` | 0.02 | Sessions against the previous 28 days: unchanged = 50, none = 0, doubled or more = 100; only with 10 or more sessions, omitted when the previous window had no sessions |

The module's weight is 0.10 (registry `scoreWeight`), the same as Search visibility's: with full evidence from both,
the two Pro modules together carry about a sixth of the growth score (0.20 of 1.20) and Analytics alone about a
twelfth; with GA4 evidence and no Search Console evidence, about a tenth (0.10 of 1.10).

**Score version 3.** `SCORE_VERSION` is 3 from this change. An organization without GA4 evidence (Basic, nothing
connected, no snapshot, a new property or the module switched off) gets exactly the score version 2 gave: the parts
are summed after Search visibility's and the new module adds none, which `score.test.ts` checks, and the stored-report,
grid and random-input proofs run with the Pro module set, which now includes Analytics. With evidence the score can
move, so a report scored under version 3 isn't compared with one under version 2.

**Records.** `module_runs` gets an `analytics` row from the scoring step whenever the module is enabled: `completed`
when a summary was used (`sub_score` null for a new property), `partial` with no sub-score when there is no summary,
and no row when the organization can't use the module; `details` holds the score version, whether there was a
snapshot, the property, window and `new_property`. `reports.data.google_analytics` keeps the property, window, fetch
time and `new_property` of the summary used, or null. Findings that cite `G2` carry `module_id` `analytics`
(`moduleForFinding`, checked before `G1`); plan items keep the area rule (there is no analytics area). The score tile
counts the module and the blend names "your website analytics"; a finding's basis line names Google Analytics 4.

**Not in this change (§8).** A report bar and an Ask Braventa summary for the Analytics sub-score (it is stored in
`reports.data.module_scores` but not shown), Tag Manager checks (still Coming soon), GA4 data in the plan and writer
prompts, a sync during the analysis, and a module switch in the app.

## 11. CRM intelligence (proposed)

**Status: proposed 2026-11-08, not built.** Everything in this section describes the change to build once the founder
approves it (D-060, Proposed; it answers Q-063 and Q-064). Until then nothing reads the HubSpot counts: they show on
the HubSpot card only, and the CRM intelligence module stays `live: false`. The research steps of D-052 are folded in
below (repo, outside sources, options); the decision is the founder's.

**What exists today.** The HubSpot connection (D-048, D-059) stores one `hubspot_snapshots` row per sync, on connect
and on Refresh HubSpot counts (at most every 10 minutes; nothing runs in the background). `metrics` is `HubSpotMetrics`
version 1 (`web/src/lib/integrations/hubspot-metrics.ts`): counts, sums and the portal's own stage and source labels,
never records. The registry already has the module: `crm`, "CRM intelligence", Pro, sub-score "Lead follow-up",
`planAreas` `["crm"]`, `featureId` null, `scoreWeight` null, `live: false`. The `module_id` domain has listed `crm`
since the feature-modules migration (`20261023063253_feature_modules.sql`), and `moduleForArea` already gives plan
items with the area `crm` the module id `crm`.

### 11.1 Which counts feed the diagnosis, and which are scored

Recommendation: the diagnosis gets every count except money; the score gets two follow-up measures. Lead volume,
outcomes and setup hygiene stay out of the score, because their "good" value depends on the business's size and on
how it uses HubSpot, which counts alone can't show.

| `HubSpotMetrics` field | In the diagnosis | Scored | Why |
|---|---|---|---|
| `contacts.newCurrent`, `contacts.newNotContacted` | Yes | **Yes**: `follow_up` | The share of new contacts with a logged sales activity is the most direct lead follow-up measure Braventa stores. It is the module's sub-score ("Lead follow-up", research §5) |
| `deals.open.count`, `deals.staleOpen`, `deals.truncated` | Yes | **Yes**: `deals_moving` | The share of open deals changed in the last 30 days shows whether opportunities are being worked |
| `contacts.newPrevious` (with `newCurrent`: the trend) | Yes | No | Lead volume, not follow-up. Imports inflate it, and the Search visibility and Analytics modules already score demand trends, so a third trend would count demand three times |
| `contacts.total`, `companies.total` | Yes | No | Size: a service business has no size-free baseline for them |
| `contacts.byLifecycle` (including "No lifecycle stage") | Yes | No | Forms, imports and workflows set lifecycle stages differently in each portal; it describes setup, not follow-up |
| `contacts.newBySource` | Yes | No | Where new contacts come from: context for the plan, with no better or worse value |
| `contacts.unassigned` | Yes | No | In a one-person business every contact is unassigned unless the owner assigns themselves. Braventa doesn't read HubSpot users (no owners scope), so it can't tell a team from a solo owner |
| `deals.createdCurrent`, `deals.createdPrevious`, `deals.wonCurrent.count`, `deals.lostCurrent` | Yes | No | Volume, which depends on size |
| `deals.won90`, `deals.lost90`, `deals.winRate90` | Yes | No | An outcome that depends on when a business creates a deal (some log only jobs they're about to win), with small samples in a small business. Published win-rate benchmarks are measured on B2B sales teams, with definitions that differ (new business or the whole pipeline) |
| `deals.byStage` (count per pipeline and stage, stages with deals only) | Yes | No | Shows where deals pile up; labels are the portal's own |
| `deals.open.amount`, `deals.wonCurrent.amount`, `deals.byStage[].amount`, `currency` | **No** | No | Data minimization: the diagnosis judges follow-up, not revenue. Leaving money out keeps deal values out of findings that every member of the business can read, and out of what the AI providers receive. The HubSpot card still shows them |
| `deals.read`, `notes`, `version` | `truncated` and `notes` only, as caveats | No | Bookkeeping. A summary refuses a `version` it doesn't know |

### 11.2 Evidence and freshness

`crmSummaryForPrompt(db, organizationId)` (in `hubspot.ts`, mirroring `analyticsSummaryForPrompt`) returns
`summarizeHubSpot(snapshot)`, or null when the connection isn't `active`, `hubspotAccess` refuses (Basic after the
trial), there is no snapshot, the snapshot's `metrics.version` isn't 1, or the latest snapshot was fetched more than 7
days before the analysis (`CRM_MAX_AGE_DAYS`). The scoring step and the diagnosis update call it only when `crm` is
among the organization's enabled modules.

**Refresh at analysis time (recommended).** Unlike Search Console and GA4 data, HubSpot follow-up counts change daily,
and nothing syncs them in the background. So the scoring step first calls `syncHubSpot` for the organization (best
effort, under its 10-minute guard and the Pro gate), with an overall time limit of 60 seconds; when it fails or runs
out of time, the step goes on with the latest snapshot under the 7-day rule. A typical sync is about 25 searches spaced
250 ms apart plus one deal page per 100 deals, well inside the step's 300 s alongside the model call; the build PR
measures it. At most 10 analyses a day per organization means at most 10 extra syncs a day, far below HubSpot's limits
(5 searches a second, 110 requests per 10 seconds per portal). On a first analysis the connect step has usually just
synced, and the guard skips a second sync when the first ran less than 10 minutes earlier. The diagnosis update
doesn't refresh: it re-runs the diagnosis with the latest snapshot, like Search Console and GA4, and doesn't rescore.

Without the refresh (option B), the 7-day rule alone would leave most re-runs without CRM evidence unless the owner
had just refreshed the card.

### 11.3 In the diagnosis

The summary goes to the diagnosis model as one fenced block, `<hubspot_crm>`, with the ref `H1` (`CRM_REF` in the
registry, next to `SEARCH_CONSOLE_REF` and `ANALYTICS_REF`). It is labelled as counts read from the owner's HubSpot
portal at the fetch time, for the 28 days up to that day against the 28 before (90 days for the win rate), and marked
as third-party data. Its caveats, stated in the prompt:

- "Logged follow-up" means a call, one-to-one email, meeting, chat or manually logged message recorded in HubSpot
  (HubSpot's "Last contacted" property). Follow-up done outside HubSpot isn't counted, so a gap is phrased as "no
  logged follow-up in HubSpot", never as a fact about what the business did.
- New contacts include imports and contacts added by hand.
- An open deal counts as untouched when none of its properties changed in 30 days; any change, including one made by a
  workflow, resets that clock.
- Stage, pipeline and source names are the portal's own configuration text: untrusted input, like crawled text and GA4
  event names. They can, rarely, contain a name someone typed into a label.
- When `deals.truncated` is true, the deal figures cover only the most recently changed 5,000 deals.

The model may give a finding the source `crm` (added to the source enum in `prompts.ts` and to `PROVENANCE` in
`web/src/lib/plan/priority.ts` as `verified`); it is stored as Verified only when it cites `H1`. The instruction line:
use the HubSpot counts to say whether new contacts get a logged follow-up, whether open deals are moving and where
deals pile up; counts describe the past window, never a promise; no deal values (they aren't provided). Without a
summary the prompt is byte-for-byte what it is today. The summary goes only to the diagnosis model, which never uses
the backup model (sub-processors page), through OpenRouter with zero data retention (D-037), in line with Q-007's
default.

### 11.4 Sub-score: Lead follow-up (0–100)

`crmEvidence(summary)` in `score.ts`. The parts, each 0–100, each with its own minimum so one record can't move a part
by more than 20 points:

| Part | Weight | Value | Only when |
|---|---|---|---|
| `follow_up` | 0.04 | Share of the new contacts in the 28 days with a logged sales activity, `(newCurrent − newNotContacted) / newCurrent` (clamped to 0–1): 90% or more = 100, 0% = 0, linear | `newCurrent` is 5 or more |
| `deals_moving` | 0.02 | Share of open deals changed in the last 30 days, `(open.count − staleOpen) / open.count`: 90% or more = 100, 0% = 0, linear | `open.count` is 5 or more and `deals.truncated` is false (a truncated list holds the most recently changed deals, which would hide stale ones) |

No parts (nothing scored; the other modules' weights renormalize) when there is no summary or neither part qualifies:
a portal with few new contacts and few open deals is small or new, not poor.

**Why these thresholds** (sources in §11.9):

- *Scoring follow-up at all.* A response audit of 2,241 US companies' web leads (HBR, 2011) found that only about a
  third answered within an hour and about a quarter took more than a day, and that companies answering within an hour
  were several times more likely to qualify the lead. Leads go cold within hours, so a new contact with no logged
  follow-up after up to four weeks is the clearest lead follow-up gap the counts can show. (Figures as reported by
  secondary summaries; the original is paywalled and wasn't checked.)
- *Full marks at 90%, not 100%.* The snapshot counts contacts created today and yesterday, who may not be contacted
  yet: with leads spread evenly, that is about 4 to 7% of a 28-day window. And not every new contact is a lead
  (suppliers, colleagues, newsletter sign-ups), which counts can't tell apart. 90% leaves room for both, so a business
  that follows up every real lead gets full marks; below it, each unanswered contact costs the same.
- *30 days for a deal.* `STALE_DEAL_DAYS` is already 30 in code and on the card. CRM practice has no single default:
  Pipedrive lets each stage set its own "rotting" days, and vendor guides for Salesforce pipelines most often flag 30
  days without activity, with 14 days for active stages (vendor blogs, unverified). HubSpot's "Last modified date"
  changes on any property update, including automated ones, so this measure undercounts stalled deals; 30 days with no
  change of any kind is a conservative, unambiguous stall. Full marks at 90% because a few deals legitimately wait on
  the client.
- *A minimum of 5.* Search visibility and Analytics need 10 impressions or sessions; a small service business can have
  fewer than 10 new contacts or open deals in a month, so 5 keeps the part usable while capping one record's effect
  at 20 points.

**Weight 0.06** (follow-up 0.04, deals 0.02): smaller than Search visibility's and Analytics' 0.10 because both
measures depend on how diligently the business logs its work in HubSpot, and the owner can't correct a score (a
correction re-runs the diagnosis, not the score). With full evidence from all three Pro modules, CRM intelligence
carries about 5% of the growth score (0.06 of 1.26); with CRM evidence and no Search Console or GA4 evidence, about
6% (0.06 of 1.06). The weights are provisional and reviewed once testers have scores (D-052 step 8), with the Search
visibility and Analytics weights (Q-062).

Option B, not recommended: put the counts in the diagnosis and score nothing until testers' data is in. It carries no
score risk, but the module's sub-score would stay empty, and the score wouldn't reflect the gap the diagnosis names.

### 11.5 Tier gating

Pro, Premium and the trial, like Search visibility and Analytics. The registry entry gets `featureId: "hubspot"` (the
`hubspot` feature in `web/src/lib/plans/tiers.ts` is Pro and live, which `registry.test.ts` requires), so
`enabledModuleIds` includes `crm` for those tiers and leaves it out on Basic. On Basic after the trial the connection
is paused (`hubspotAccess`), `crmSummaryForPrompt` returns null and no `crm` module run is recorded. An
`organization_modules` override with `enabled = false` keeps the counts out of the prompt and the score, as for the
other Pro modules.

### 11.6 Module id, migration and score version

- **Module id:** `crm`, the existing id. No new id: the brief for this spec asked for one, but the registry and the
  domain have had `crm` since D-051.
- **Migration: none.** The domain already lists `crm` (`migration.test.ts` keeps it equal to the registry);
  `module_runs`, `diagnosis_findings.module_id` and `growth_plan_items.module_id` already accept it; a finding's
  source isn't stored (only its provenance, whose check doesn't change); the new behavior on an uninstalled portal
  (§11.7) needs no schema.
- **Registry:** `live: true`, `featureId: "hubspot"`, `scoreWeight: 0.06`, a summary that names HubSpot and lead
  follow-up, and `CRM_REF = "H1"`. `moduleForFinding`: a verified finding that cites `H1` belongs to `crm`, checked
  before `G2` and `G1`, so a finding that compares GA4 key events with new HubSpot contacts (inquiries reaching the
  CRM) belongs to CRM intelligence.
- **`SCORE_VERSION` 4.** The parts are summed after Analytics', so an organization without CRM evidence (Basic, not
  connected, no snapshot, a snapshot older than 7 days, neither part qualifying, or the module switched off) gets
  exactly the version 3 score. `score.test.ts` checks it, and the stored-report, grid and random-input proofs run with
  the Pro module set, which then includes `crm`. With evidence a score can move, so a version 4 report isn't compared
  with a version 3 one.

### 11.7 Uninstall detection (Q-064)

Today, when an owner uninstalls Braventa's app in HubSpot, Braventa finds out only on the next refresh (HubSpot refuses
the refresh token with `invalid_grant`; the card then says access ended and asks to reconnect) and keeps the stored
counts until the owner disconnects. HubSpot's Developer Terms §4 ask for deletion when a customer stops.

HubSpot's way to learn about uninstalls is the webhooks journal: an app subscribes to `APP_LIFECYCLE_EVENT` (event type
`4-1916193` for an uninstall, `4-1909196` for an install) with a client-credentials token holding the
`developer.webhooks_journal.*` scopes, then reads the journal. It is pull-based (Braventa fetches journal files; HubSpot
doesn't push them) and keeps 3 days of events. Building it means a scheduled poller (a `pg_cron` job calling a new
route at least daily), a stored journal offset (a new table or column: D-052), the app's config and scopes changed and
uploaded again with the HubSpot CLI, and processing of each event.

**Recommendation: ship use-time detection with the module; build the journal poller later.**

- *With the module:* the refresh at analysis time (§11.2) mints a token before any CRM data reaches a diagnosis, so an
  uninstalled portal's counts never feed one: the refresh fails, the connection leaves `active`, and
  `crmSummaryForPrompt` returns null. In the same change, when the token is refused with `invalid_grant` (on any
  refresh, from the card or an analysis), `syncHubSpot` deletes the organization's snapshots and the stored token, and
  leaves the connection in `error` with the existing "access ended" message. This is the deletion `disconnectHubSpot`
  does, without the uninstall call HubSpot has already made. No new table, route or scheduler.
- *Later, before the app passes 25 installs or applies for a marketplace listing:* the journal poller, so deletion
  doesn't wait for the next refresh or analysis. At about 3 testers, what it would close is small: counts kept after
  an uninstall, visible only to members on the card, until the next refresh, analysis or disconnect.

### 11.8 Records, UI and the rest of the change

- **Records.** `module_runs` gets a `crm` row from the scoring step whenever the module is enabled: `completed` when a
  summary was used (`sub_score` null when neither part qualified), `partial` with no sub-score when there is no
  summary, and no row when the organization can't use the module. `details` holds the score version, whether there was
  a snapshot, its fetch time, its window, whether the analysis refreshed it, and `truncated`. `reports.data.hubspot`
  keeps the fetch time, window and `truncated` of the summary used, or null; no counts are copied into the report.
- **UI and copy.** The score tile counts the module; `scoreBlend` gets "your lead follow-up" (long form: "your lead
  follow-up (HubSpot)"); `SCORE_SOURCES` gets "the latest HubSpot counts: logged follow-up of new contacts and open
  deals changed in the last 30 days"; a finding's basis line names HubSpot when it cites `H1`. No report bar in the
  first cut (like Analytics: the sub-score is stored in `reports.data.module_scores` but not shown). The build PR also
  changes the `hubspot` feature's detail and the Pro summary in `tiers.ts`, the HubSpot card, Ask Braventa's knowledge
  base (`npm run help:doc`), the public score explanation (D-035), MVP_SCOPE.md (CRM data in the diagnosis is Next
  phase today), PLANS_AND_TIERS.md, HUBSPOT_SETUP.md (fetches also happen at analysis time), this file and
  DATA_MODEL.md.
- **Before customers' CRM counts reach the diagnosis:** the privacy policy, the sub-processors page (the OpenRouter
  row lists what the AI providers receive: add a summary of the HubSpot counts for the diagnosis), the DPA and the MSA
  (both say the counts aren't used in the diagnosis) describe the new use. These pages are drafts pending counsel
  (Q-032), the same path as GA4 (Q-060).

### 11.9 Not in this change, and sources

**Not in this change.** CRM data in the plan and writer prompts; a report bar and an Ask Braventa summary for the
sub-score; the journal poller (§11.7); CRMs other than HubSpot (D-048); any CRM write. Candidates for a
`HubSpotMetrics` version 2, each a code change to the sync and a new decision on what is stored: new contacts not
contacted, created between 28 and 2 days ago (removes the recency allowance); new contacts excluding imports; a deal's
"Last activity date" instead of its last modified date for staleness (it counts only logged sales activity, not
automated edits).

**Sources (checked 2026-11-08).**

| Fact | Source | Note |
|---|---|---|
| Response audit of 2,241 US companies' web leads: about a third answered within an hour, about a quarter took more than a day; answering within an hour made qualifying several times more likely | Oldroyd, McElheran and Elkington, "The Short Life of Online Sales Leads", Harvard Business Review, March 2011 ([hbr.org](https://hbr.org/2011/03/the-short-life-of-online-sales-leads); record at [BYU ScholarsArchive](https://scholarsarchive.byu.edu/facpub/9711)) | Paywalled; figures from secondary summaries ([CustomerThink](https://customerthink.com/how-to-improve-sales-response-times-with-content/)), unverified against the original |
| "Last contacted": the latest logged chat, call, non-forwarded one-to-one email, meeting, or manually entered LinkedIn, SMS or WhatsApp message; set by HubSpot; form submissions and marketing email don't set it | [HubSpot's default contact properties](https://knowledge.hubspot.com/properties/hubspots-default-contact-properties) | Official |
| A deal's "Last modified date" changes on any property update, from any source, including workflows and the API | [HubSpot's default deal properties](https://knowledge.hubspot.com/deals/hubspots-default-deal-properties) | Official |
| Pipedrive's rotting threshold is set per stage, in days; any update to the deal resets it | [Pipedrive: the Rotting feature](https://support.pipedrive.com/en/article/the-rotting-feature) | Official; no default number |
| Salesforce stalled-deal practice: 30 days without activity is the most cited flag, 14 days for active stages, or thresholds scaled to the sales cycle | [Coefficient](https://coefficient.io/use-cases/salesforce-stale-opportunity-alerts-no-fields), [Outreach](https://www.outreach.ai/resources/blog/sales-pipeline-ageing) | Vendor blogs, unverified |
| Win-rate benchmarks are measured on B2B sales teams, with new-business and whole-pipeline definitions | [Ebsta × Pavilion 2025 GTM Benchmarks](https://benchmarks.ebsta.com/2025-gtm-benchmarks) | Used only to explain why the win rate isn't scored |
| Webhooks journal: `APP_LIFECYCLE_EVENT` subscriptions (`4-1909196` install, `4-1916193` uninstall), client-credentials token with `developer.webhooks_journal.*` scopes, pull-based, 3 days of history | [Webhooks journal (2026-09)](https://developers.hubspot.com/docs/api-reference/latest/webhooks-journal/guide), [Webhooks journal subscriptions](https://developers.hubspot.com/docs/api-reference/latest/webhooks-journal/subscriptions/guide) | Official |
| Store data only as long as needed; delete data and tokens when a customer stops | [HubSpot Developer Terms](https://legal.hubspot.com/hs-developer-terms) §4 | Official, already relied on (HUBSPOT_SETUP.md §2) |

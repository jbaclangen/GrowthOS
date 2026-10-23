# Feature modules

**Status:** built 2026-10-23 (D-051 steps 1–6; the spec step of D-052). Describes the code as it is. The first new
module, Search visibility (D-051 step 6), is live: §9 is its spec, and what is still open is listed in §8.

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
| `live` | The code does it today | Only the four modules in the current pipeline; set in the PR that ships a module |
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
| Pro | Local SEO, Social media, Search ads, Email marketing, Video, CRM intelligence, Analytics, Automation | No | Later, each with its own sub-score (Automation isn't scored) |
| Premium | Custom integrations | No | Per contract |

"Online presence" is assessed from the website (social links, schema, listings) and stays with Conversion and
messaging until the Social media module is live; moving it changes scores and bumps `SCORE_VERSION`.

## 3. Which modules an organization has

`enabledModuleIds(tier, overrides)` (registry) returns the live modules the organization's tier includes, minus any
row in `organization_modules` with `enabled = false`. An override can't switch on a module that isn't live or that the
tier doesn't include. Nothing writes overrides yet and there is no UI, so today every organization has the four Basic
modules, and Pro, Premium and trial organizations Search visibility as well. Overrides affect the growth score and
whether the Search Console summary reaches the diagnosis, and nothing else: the analysis steps still run, because no
module can be switched off from the app. The pipeline reads the tier and the overrides with the admin client, scoped
to the job's organization (`enabledModules` in `web/src/lib/modules/server.ts`), before the diagnosis model call.

## 4. Growth score

`computeGrowthScore(evidence, enabled)` in `web/src/lib/modules/score.ts` is a renormalized weighted mean over the
parts of every enabled module that has evidence. A module's weight is the sum of its parts' weights; its sub-score
(`subScore`) is the weighted mean of its own parts. The parts are summed in the order the pre-module formula summed
them (assessed scores, then PageSpeed, then Search Console), so for an organization without Search Console evidence
the result is bit-for-bit the score Braventa produced before modules existed. When PageSpeed didn't respond, Website
and technical SEO has no scored evidence and the remaining weights are renormalized, as before; the same when Search
visibility has nothing to score (§9).

- **Proof:** `score.test.ts` compares the new computation with the old formula (copied verbatim) on every growth_plan
  report stored on 2026-10-23, on a grid of 78,125 boundary-value combinations and on 20,000 seeded random inputs,
  with the Basic module set and with the Pro set (Search visibility enabled, no summary).
- **Storage:** `reports.data` gets `score_version` (`SCORE_VERSION`: 1 until 2026-10-23, 2 since Search visibility
  can join the sum), `score_modules` (the modules whose evidence was used, in evidence order), `module_scores` (their
  sub-scores) and `search_console` (the snapshot the diagnosis and score used: property, window, fetch time,
  `little_data`; or null). `growth_score` and `business_profiles.growth_score` are unchanged in meaning. Reports from
  before 2026-10-23 have no list; `modulesUsed` derives it from whether they stored PageSpeed scores, which is how
  their score was computed.
- **Version rule:** bump `SCORE_VERSION` when a part, a weight or the module a part belongs to changes, so a report
  scored under one version isn't compared with one under another (an upgrade isn't an improvement).
- **UI:** the report's score tile (`web/src/app/analysis/[id]/infographic.tsx`) says "Based on N modules" with their
  names, and a finding's basis line names Google Search Console when it cites `G1`. The public explanation of the
  score (D-035, amended 2026-10-23) says the score is based on the modules with evidence, named on the report.

## 5. Data

Migration `20261023063253_feature_modules.sql`; details in [DATA_MODEL.md](DATA_MODEL.md).

| Object | Purpose | Written by | Read by | RLS |
|---|---|---|---|---|
| Domain `module_id` | Limits every module column to the registry's ids | Migration | — | — |
| `organization_modules` | Per-organization overrides: `enabled`, `config` | Nobody yet (server only; who may change them comes with roles, D-046) | Scoring step | Members read via `is_member`; no client writes |
| `module_runs` | One row per module that ran in a job: `status` (`completed`/`partial`), `sub_score`, `audit_run_id`, `report_id`, `rules_version`, `details` | Pipeline (`recordModuleRuns`, best effort: a failed write is logged, the analysis continues) | Nothing yet (a record) | Members read; no client writes; same-organization composite FKs to `ai_jobs` and `audit_runs` |
| `diagnosis_findings.module_id` | The module a finding belongs to | Pipeline (`moduleForFinding`): verified citing `G1` → `search_visibility`, other verified → `website_seo`, customer_provided → `business_intel`, inferred → null | Report page (`select *`), unused so far | Not granted to clients |
| `growth_plan_items.module_id` | The module a plan item belongs to | Pipeline (`moduleForArea`): the first comma-separated `area`, matched case-insensitively; `operations`, unknown and empty → null | Not selected yet | Not granted to clients |

The backfill applied the same two rules to existing rows: 62 of 78 findings and 80 of 89 plan items got a module;
the rest are inferred findings and "operations" items.

## 6. Pipeline

Each module's run is recorded in the step where it finishes (`web/src/lib/pipeline/website-intel.ts`):

| Step | Module runs recorded |
|---|---|
| `profiling` (end of the evidence phase) | `business_intel` (completed); `website_seo` (completed, or partial without PageSpeed; `sub_score` from the PageSpeed parts; `audit_run_id`; `rules_version` = `AUDIT_VERSION`) |
| `scoring` | `conversion` (`sub_score` from the assessed scores; `report_id`; `details` holds the score version, the modules used and the enabled set); `search_visibility` when the organization's enabled modules include it (completed with the sub-score when a Search Console summary was used, `sub_score` null on an empty window; partial without a summary; `details` holds the property, window and `little_data`) |
| `writing` | `content_studio` (`report_id`, calendar and draft count) |
| `diagnosis_update` | None: a correction re-runs the diagnosis, not the analysis. It reads the Search Console summary again (the latest snapshot) so corrected diagnoses keep their Search Console findings; it doesn't rescore |

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
module ("Based on 3 modules") and a finding's basis line names Google Search Console next to the checks it cites.

**Not in this change (§8).** Keyword and search-intent analysis, a report section for the module, a module switch in
the app, and Search Console data in the plan and writer prompts.

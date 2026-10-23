---
type: process
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
consumes: ["[[ai-job]]", "[[business-profile]]", "[[ai-worker]]"]
produces: ["[[audit-run]]", "[[audit-finding]]", "[[knowledge-document]]", "[[business-profile]]", "[[brand-profile]]", "[[module-run]]", "[[ai-usage]]", "[[ai-job]]"]
---

# Crawl and profile (`website_evidence`: `crawling` → `profiling`)

Reads the website and PageSpeed, stores the audit, then has a model turn the page digest into the business profile.

## Input → Movement → Output

A `website_evidence` job (or the first two steps of `website_intel`) starts with a website URL. `crawlStep` crawls up to 25 pages respecting robots.txt, runs PageSpeed mobile and desktop and the deterministic checks, writes `audit_runs`, `audit_findings` and `knowledge_documents`, and hands evidence plus a page digest to `profileStep`, which runs the `business_analyst` worker and writes `business_profiles`, `brand_profiles` and two `module_runs`. The evidence job ends `succeeded` with `output.step = evidence_done` and tries to start the plan.

## Why this shape

The crawl and PageSpeed together approach the invocation limit, so the profile model call is a separate step; combining them was what got cut off (D-042). The evidence lives in the job output so the plan job can start later without re-crawling. Audit storage is best effort: a failed write is logged and the analysis goes on.

## Steps

1. Sequence `["crawling", "profiling"]` — `web/src/lib/pipeline/steps.ts:18`.
2. `crawlStep` → `runAudit` — `web/src/lib/pipeline/website-intel.ts:255-257`.
3. `runAudit` inserts `audit_runs` (`status: running`, `AUDIT_VERSION`) — `web/src/lib/pipeline/website-intel.ts:111-127`; `AUDIT_VERSION` at `web/src/lib/audit/checks.ts:13`.
4. `crawlSite` and `pageSpeedReport` in parallel — `web/src/lib/pipeline/website-intel.ts:129-132`; crawl limits (`MAX_PAGES = 25`, robots first) — `web/src/lib/integrations/crawler.ts:86`, `:408-416`; PageSpeed mobile + desktop — `web/src/lib/integrations/google.ts:145`.
5. Crawl error → `audit_runs` failed, throw — `web/src/lib/pipeline/website-intel.ts:133-147`; else `runChecks` — `:150`, `web/src/lib/audit/checks.ts:911`.
6. Update `audit_runs` (`completed`/`partial`), insert `audit_findings` — `web/src/lib/pipeline/website-intel.ts:159-182`.
7. Upsert crawled pages into `knowledge_documents` by content hash — `web/src/lib/pipeline/website-intel.ts:260-273`.
8. Artifacts `evidence` and `digest` go into the job output — `web/src/lib/pipeline/website-intel.ts:275-289`.
9. `profileStep` requires both artifacts, runs `business_analyst` — `web/src/lib/pipeline/website-intel.ts:293-307`.
10. Update `business_profiles` (incl. `intelligence`) — `web/src/lib/pipeline/website-intel.ts:309-322`; insert `brand_profiles` — `:324-329`.
11. `recordModuleRuns` for `business_intel` and `website_seo` — `web/src/lib/pipeline/website-intel.ts:333-353`; writer at `web/src/lib/modules/server.ts:36-40`.
12. Evidence job ends `{step: 'evidence_done', evidence}`; `website_intel` drops the digest and continues — `web/src/lib/pipeline/website-intel.ts:356-357`; then `startPlanIfReady` — `:945-951`, `web/src/lib/onboarding/orchestrate.ts:11`.

## Human gate

None. The owner sees only the "reading your website" line during discovery.

## If you change this

- **Hits:** `scoreStep` (reads `evidence` from the evidence job's output), `reviseDiagnosis` (rebuilds audit context from `audit_runs`/`audit_findings`), the `website_seo` sub-score, the report's technical checks section, `knowledge_documents` uniqueness.
- **Does not hit:** `knowledge_chunks` / `match_knowledge` (never written here); the Search Console evidence (read in scoring, not here).

## Surfaces

| Surface | Role |
|---|---|
| `crawling` step | Crawl + PageSpeed + checks, audit tables |
| `profiling` step | `business_analyst` → profile, brand, module runs |
| `ai_jobs.output.evidence` | Hand-off to the plan job |

## See

- Objects: [ai-job](../objects/pipeline/ai-job.md), [audit-run](../objects/pipeline/audit-run.md), [audit-finding](../objects/pipeline/audit-finding.md), [knowledge-document](../objects/pipeline/knowledge-document.md), [business-profile](../objects/onboarding/business-profile.md), [brand-profile](../objects/onboarding/brand-profile.md), [module-run](../objects/modules/module-run.md), [ai-worker](../objects/pipeline/ai-worker.md)
- Processes: [job-step-machine](job-step-machine.md), [score-and-diagnose](score-and-diagnose.md), [run-ai-worker](run-ai-worker.md)
- Source: `web/src/lib/pipeline/website-intel.ts`, `web/src/lib/integrations/crawler.ts`, `web/src/lib/audit/checks.ts`

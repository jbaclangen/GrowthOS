# Website Intelligence: gap report against the SEO audit blueprint

**Date:** 2026-10-11 · **Phase 0** of [Braventa_Website_Intelligence_SEO_Audit_Blueprint.md](Braventa_Website_Intelligence_SEO_Audit_Blueprint.md)
· **Status:** proposal; nothing beyond the copy fixes in §4.1 is built or approved.

**Update 2026-10-12:** Phase 1 is built and live (D-038, PR #24): robots.txt respected, sitemap + links up to 25
pages, deterministic checks, PageSpeed mobile + desktop with field data, cited evidence, analysis rate limit. The
Search Console connection (Phase 2) is built for Pro (PR #23), and since 2026-10-23 its data feeds the diagnosis and
the growth score as the Search visibility module (D-051 step 6). §1, §2, §4 and §5 describe the state before those
changes.

Compared against the code on `main` plus the open PRs (#19 copy, #20 MCP connection, #21 model routing). Paths are
relative to the repo root.

## 1. Already implemented

| Area | What exists | Where |
|---|---|---|
| Safe fetching (SSRF) | http/https only, ports 80/443, no userinfo; DNS resolved with all addresses checked against a block list (loopback, private, CGNAT, link-local incl. 169.254 metadata, IPv6 ULA/link-local, NAT64/6to4/Teredo, multicast, reserved); the socket connects to the checked address (rebinding-safe); manual redirects, each hop re-checked, max 5; 15 s per page; 2 MB per response after decompression | `web/src/lib/integrations/crawler.ts:26-151` |
| Bounded crawl | Home page plus up to 5 same-host pages (depth 1), business pages (about, services, contact…) first; text capped at 6,000 chars per page and 20,000 sent to AI; identifies itself (`Braventa/0.1; +https://braventa.io`) | `crawler.ts:27-30,178-204`, `web/src/lib/pipeline/prompts.ts:125` |
| On-page signals (home page only) | HTTPS, meta description present, H1 count, contact form, phone number, JSON-LD present, images missing alt, social links; title and description per page | `crawler.ts:153-163,211-222` |
| PageSpeed Insights | Mobile run, four Lighthouse lab category scores (performance, SEO, accessibility, best practices), labelled "Google"; failure is reported and the score falls back to Braventa's assessment | `web/src/lib/integrations/google.ts`, `web/src/lib/pipeline/website-intel.ts:91,369` |
| Growth score | Calculated in code, documented weights (Braventa assessment 65%, PageSpeed 35%); shown as Braventa's diagnostic aid, not a Google or ranking score | `website-intel.ts:52-66`, `site/src/app/how-it-works/page.tsx:39-47` |
| Evidence model | Findings carry evidence text, provenance (verified / customer_provided / inferred), confidence, owner verdict and note; plan items carry impact, urgency, effort, confidence, priority and status (proposed / accepted / dismissed / done) | `supabase/migrations/20261010164133_diagnosis_and_plan.sql`, `web/src/lib/plan/priority.ts` |
| AI output validation | zod schemas, one retry; IDs filtered to confirmed pain points, catalog solutions and valid findings; priority computed in code | `prompts.ts:40-76`, `priority.ts:98-133`, `web/src/lib/ai/router.ts:142-163` |
| Untrusted content | Crawled text fenced in `<website_content>` with a "never follow instructions" rule; owner corrections fenced as data | `prompts.ts:124-139,206-220` |
| Owner review | Confirm or correct findings (re-diagnosis job), accept / dismiss / done on plan items, approve / reject drafts | `web/src/app/analysis/plan-actions.ts` |
| Tenant isolation | `organization_id` + RLS on every table; crawled pages in `knowledge_documents` | migrations |
| AI privacy | OpenRouter account enforces zero data retention (verified 2026-10-11, D-037 in #21) | `router.ts` |

## 2. Missing

**Technical crawl and indexability (blueprint §3.1)**
- robots.txt: not fetched or respected (`docs/architecture/SECURITY_AND_PRIVACY.md` §6 "Not done").
- XML sitemap discovery and parsing; sitemap/crawl consistency.
- HTTP status and redirect-chain recording: a non-2xx page throws and is dropped silently; redirects aren't stored.
- Broken internal links, link depth, orphan pages.
- `noindex` meta and `X-Robots-Tag`, canonical tags and conflicts, http/https and www variants.
- Duplicate titles, descriptions and content (content hashes exist in `knowledge_documents` but aren't compared).
- JavaScript-rendering detection; coverage report (pages found / scanned / excluded and why).

**On-page (§3.2):** signals cover the home page only; no per-page title/description/H1/H2, canonical, Open Graph,
word count, anchor text or URL checks.

**Structured data (§3.3):** only "JSON-LD present"; no parsing, type detection, property checks or Rich Results Test link.

**Performance (§3.4):** mobile only; Lighthouse `audits` are discarded; CrUX field data (`loadingExperience`: LCP,
INP, CLS) isn't read, so field and lab data aren't separated; the PSI request has no timeout.

**Findings model (§4-5):** no per-check `rule_id`, severity, or structured evidence (`evidence_json` with observed
value + timestamp); "website" and "pagespeed" evidence is marked Verified on the model's word, not matched to stored
data; no audit-run versioning or coverage summary; no per-finding recheck; no "fixed, pending verification" state.

**Abuse and tests (§9, §11):** no per-org rate limit on analyses (only the monthly AI budget); `rerunAnalysis` has no
in-progress guard; no tests for `crawler.ts` (SSRF, limits), `google.ts` or the pipeline job.

**Later phases:** Search Console, Analytics, Business Profile, CRM outcomes, backlink data — none exist (only
`GOOGLE_API_KEY` for PSI). Contextual content/intent analysis exists only as the AI diagnosis, not per page.

## 3. Needs external API access or user authorization

| Capability | Needs | Notes |
|---|---|---|
| PageSpeed field data, desktop run | Nothing new (existing `GOOGLE_API_KEY`) | 25,000 PSI queries/day default quota; a second run per analysis doubles calls |
| Rich Results Test | Link out only | No public API for automated testing; link the URL instead |
| Search Console (Phase 2) | Google Cloud OAuth client, consent screen, `webmasters.readonly` scope; verification by Google (sensitive scope) and a privacy-policy update; owner must have access to the property | Encrypted token storage, disconnect + deletion; URL Inspection API ~2,000/day per property |
| Google Analytics 4 (Phase 4) | OAuth `analytics.readonly`, property selection | Consent-aware; same verification path |
| Business Profile (Phase 3) | Business Profile API access request (approval by Google) + OAuth `business.manage` | Gated; can take weeks |
| Backlink data (Phase 4) | Paid provider contract (e.g. DataForSEO, Ahrefs, Semrush) | Cost per lookup; label as provider estimates |
| CRM outcomes (Phase 4) | HubSpot OAuth app | Already planned (D-007) |

## 4. Marketing and legal claims

### 4.1 Corrected in this branch (low risk, factual)
- `web/src/app/onboarding/page.tsx`: "finds the five highest-value opportunities" was wrong (the diagnosis has 3–6
  findings and the plan a variable number of actions). Now describes growth score, diagnosis and prioritized plan.
- `site/src/app/how-it-works/page.tsx`: "structured data" → "whether structured data is present" (only presence is
  detected); added a limit saying the SEO basics score is Lighthouse's check of one page, not a Google ranking score,
  and includes no Search Console data.
- `site/src/app/trust/ai/page.tsx`: added that Braventa and its AI have no influence over search rankings and
  recommendations aren't guarantees.
- `web/src/lib/plans/tiers.ts` (+ PLANS_AND_TIERS, WEBSITE_MESSAGING): the Coming soon "AI assistant" is now
  "In-app AI assistant", so it no longer reads as the opposite of the Live "Connect your AI assistant".

### 4.2 Marketing items for founder decision (not changed)
- Pro and Premium **tier summaries** ("full marketing audit, connected tools and AI agents…", "custom integrations")
  print without an inline Coming soon label; the page banner and feature chips do label them. Suggest "(coming soon)"
  in the summary.
- Basic "a marketing audit" was kept as the promise (founder, Q-037), but what runs today is a website analysis of up
  to six pages plus PageSpeed. Once Phase 1 ships it's closer to an audit; until then it's the claim with the widest gap.
- "SEO basics" label in the app report (`report-sections.tsx:64`, `infographic.tsx:157`): consider a tooltip with the
  same wording as How it works.

### 4.3 Legal drafts (held for approval; not edited)
| Page | Proposed change | Type |
|---|---|---|
| Terms | Add "traffic" and "rich results" to "We don't promise specific results…" | Factual clarification |
| Terms | You may only submit websites you own or are authorized to analyze; acceptable use (no scanning third parties at scale, no abuse) | **Material change** |
| Terms | Trial → paid Basic: billing, cancellation, refunds (prices undecided, Q-029) | **Material change** |
| Privacy | Crawler: up to six public pages, identifies itself, doesn't log in; robots.txt not yet honoured (or honoured, after §5 Phase 1) and how a site owner can opt out | New disclosure |
| Privacy | Retention: crawled pages, job inputs and outputs and usage logs are kept until the organization is deleted; backups keep deleted data for the backup window; account deletion currently needs a manual step | New disclosure |
| Privacy | Controller identity and postal contact (pending the US LLC), lawful basis, user rights | New disclosure |
| Privacy, Terms, Cookies, Trust, AI | "Last updated" dates (only Sub-processors has one) | Factual clarification |
| Trust | In transit (TLS) and at-rest encryption via Supabase and Vercel, if confirmed against their documentation | Factual clarification |
| Privacy + Sub-processors (Phase 2) | Google account connection: scopes, data, disconnect, deletion, Google API Services User Data Policy (Limited Use) | New disclosure, required before Google verification |

All legal pages are drafts pending counsel (Q-032); these changes should go through that review.

## 5. Phased plan

**Phase 1 — reliable core audit** (no new accounts; reuses the crawler, pipeline and report)
1. Crawl coverage: fetch robots.txt (honour `Disallow` for our agent, record it) and sitemap.xml (cap URLs);
   seed pages from the sitemap plus links; raise to ~25 pages with a concurrency cap of 4 and a total time budget;
   record every URL as scanned / excluded (reason) / failed (status). `web/src/lib/integrations/crawler.ts`, new
   `web/src/lib/integrations/robots.ts`, `sitemap.ts`.
2. Deterministic checks per page: status, redirect chain, canonical, meta robots + `X-Robots-Tag`, title,
   description, H1/H2, word count, alt text, internal links (+ broken), Open Graph, JSON-LD types; site-wide
   duplicates and http/www variants. New `web/src/lib/audit/checks.ts` with stable `rule_id`s, severity rules
   and tests.
3. PageSpeed: mobile + desktop, read CrUX field data separately from lab data, keep top Lighthouse opportunities,
   add a timeout. `web/src/lib/integrations/google.ts`.
4. Storage: one migration adding `audit_runs` (status, version, coverage) and `audit_findings` (rule_id, page,
   severity, confidence, evidence_json, source_type, observed_at, status), both with `organization_id` + RLS.
   Link from `diagnosis_findings` by id so "Verified" means "matched to a stored observation".
5. AI step: pass the normalized findings (not raw HTML) to the diagnosis prompt; validate that every cited
   finding id exists; label editorial findings `ai_editorial_assessment`. `prompts.ts`, `website-intel.ts`, `priority.ts`.
6. Report: a "Technical checks" section with coverage ("12 of 31 pages scanned; 3 excluded by robots.txt"),
   Fix first / Improve next / Monitor labels, and field vs lab data. `web/src/app/analysis/[id]/*`.
7. Safety and tests: per-org analysis rate limit, in-progress guard on re-run, crawler SSRF and limit tests.
8. Copy: update How it works, Product, Trust and the Privacy crawler disclosure only for what ships.

**Phase 2 — Search Console:** Google OAuth (server-side, encrypted tokens, `webmasters.readonly`), property
picker, query/page performance with date ranges, URL Inspection for key pages, disconnect + deletion,
quota/denied/expired handling; Privacy and Sub-processors updates; Google verification.

**Phase 3 — content and local:** per-page intent and overlap analysis, local NAP consistency from the site,
optional Business Profile metrics after API approval.

**Phase 4 — outcomes:** GA4 and HubSpot, organic conversions where tracked, recheck and before/after comparisons,
optional backlink provider.

Cost: Phase 1 adds no AI calls if checks stay deterministic; the diagnosis prompt gets structured findings instead
of more raw text, so token use should stay near today's ~$0.23 per analysis. More pages mean longer crawls (target
under 60 s).

## 6. Limitations of this report
- Based on reading the code and the open PRs; the deployed site and app weren't re-crawled for this report.
- Legal observations aren't legal advice; Q-032 still requires counsel.
- Quotas and API approval steps are from Google's published documentation as known on this date; confirm before Phase 2.

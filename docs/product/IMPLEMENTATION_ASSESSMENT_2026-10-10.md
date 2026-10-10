# Implementation assessment vs the product vision — 2026-10-10

Compares the code on 2026-10-10 with
[GrowthOS_Product_Vision_and_Planning_Context.md](GrowthOS_Product_Vision_and_Planning_Context.md) (the
"vision"). A point-in-time snapshot: for current status use [MVP_SCOPE.md](MVP_SCOPE.md) and
[PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md). Read-only review; no code was changed.

**Evidence.** `tsc`, `eslint` and `npm run tokens:check` pass. `/api/health/integrations`: Supabase,
OpenRouter (free tier), n8n and PageSpeed reachable. Real usage: 2 analysis runs — 1 succeeded in 129 s
(5 drafts saved), 1 failed at the profiling step with a raw `fetch failed` error; `ai_usage` holds only
the successful run's 4 calls.

**Verdict.** The vision is largely absorbed already (via the founder brief and the product, architecture
and decision docs), and the code matches those docs. The MVP is the single complete workflow the vision
asks for. The gaps are trust and take-away, not missing modules. No rewrite is warranted.

## 1. Implemented and working
- Sign-up with email confirmation, organization creation, RLS tenant isolation on every table.
- Website-intel pipeline: SSRF-hardened crawl → PageSpeed → AI profile → deterministic growth score + 5
  opportunities → 30-day plan → 5 drafts.
- Approve / reject / undo, with a database guard on content status and approver (D-018).
- AI router: logical workers, free/paid mode, monthly budget check, per-call usage log.
- Braventa UI naming, token pipeline, Quicksand/Comfortaa typography.

## 2. Aligned with the vision
| Vision | Repository |
|---|---|
| 9-step loop (§6) | D-004 Growth Loop groups the same 9 steps into Understand · Act · Improve |
| Stack (§10) | Next.js, Supabase, OpenRouter, n8n as discussed |
| Architecture principles 1–6, 11–12 | Layer separation, RLS, server-only secrets, schema-validated AI output, approval by default, no speculative build |
| Naming (§13) | D-001: Braventa public, GrowthOS internal |
| CRM read-only first (§8.5) | HubSpot read-only planned as the first Next item |
| No invented pricing (§9) | D-012 framework only |

## 3. Conflicts
1. **AI inferences shown as facts (live).** Vision §8.1/8.2. Profile, strengths/gaps and assessed scores
   carry no "AI estimate" label; only PageSpeed bars say "Google". Planned as BI-6/MS-2.
2. **MVP candidate list.** Vision §11 lists a contextual assistant and basic recommendation tracking;
   MVP_SCOPE §4 excludes the assistant and ROADMAP puts tracking (MS-5) in Next. Founder decision (Q-021, Q-023).
3. **Onboarding is URL-only.** Vision §7 step 2 asks guided questions (goals, challenges, service area,
   tools). BI-7 is Next. Founder decision (Q-022).
4. **Model IDs in code.** Vision §10 says keep routing configurable; IDs are centralised in `router.ts`
   but need a code change (Q-024).
5. **AI telemetry incomplete.** Vision principle 7 (latency, errors): failed calls and latency are not logged.
6. **Execution in-process, not n8n.** Accepted MVP trade-off; no `maxDuration` set (Q-004).
7. **UI rename done provisionally.** Vision §13 says don't rename automatically; D-003 applied the rename
   while Provisional. Follows from D-001 (Founder); needs confirmation.
8. **Status vocabulary.** Vision uses Current/MVP/Next/Later/Exploratory; docs use Live + MVP/Next/Future
   vision. Mapping added to ROADMAP.md.

## 4. Missing capabilities by phase
| Phase | Items |
|---|---|
| MVP, not built | Provenance labels (BI-6, MS-2) · copy/export (CS-7) · edit and regenerate drafts (CS-5/6) · edit profile (BI-5) · next batch (CS-8) · password reset (PL-5) · plain-language failure messages |
| MVP or Next — founder call | Opportunity tracking (MS-5) · guided onboarding questions (BI-12) · "do this first" summary (UX-1) |
| Next | Paid AI mode + Vercel deploy · per-call failure/latency logging · billing · HubSpot read-only · usage view · n8n workflows · knowledge-base retrieval · assistant |
| Later / Exploratory | Publishing/scheduling · CRM write actions · GA4/Search Console · Improve stage · campaigns · Canva/video automation · agency features |

## 5. Risks outside the vision
- All work since commit `17ab57a` was uncommitted (addressed in the same change as this document).
- Migrations `…0001` and `…0002` may not be applied remotely (Q-018); `…0002` is the approval guard.
- Local development writes to the production Supabase project (Q-009).
- Free models: ~50 requests/day and intermittent failures.

## 6. Recommended next steps
1. Verify migrations `…0001`/`…0002` on the remote project.
2. Trust: provenance labels and plain-language failure + retry.
3. Take-away: copy/export, then edit and regenerate.
4. Correctable context: profile edit; decide on guided questions.
5. Readiness: failure/latency logging, `maxDuration`, Vercel test, paid mode before the first paying user.

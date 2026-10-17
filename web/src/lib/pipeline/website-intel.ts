import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runWorkerJson } from "@/lib/ai/router";
import { crawlSite, type SiteAudit } from "@/lib/integrations/crawler";
import { pageSpeedReport, type PageSpeedReport } from "@/lib/integrations/google";
import {
  AUDIT_VERSION,
  coverageLine,
  promptFindings,
  runChecks,
  summarizeCoverage,
  type AuditFinding,
  type CoverageSummary,
} from "@/lib/audit/checks";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { fromProfileRow, type OwnerInputs } from "@/lib/owner-inputs";
import { startPlanIfReady } from "@/lib/onboarding/orchestrate";
import { dispatchStep } from "./dispatch";
import { advanceState, canClaim, firstStep, nextStep, readState, type JobState, type RunStep } from "./steps";
import { answerLabel, getQuestion } from "@/lib/onboarding/followups";
import { orderPlan, toFindings, toPlanItems, type DiscoveryFacts } from "@/lib/plan/priority";
import {
  MAX_TOKENS,
  citableRefs,
  contentSchema,
  diagnosisPrompt,
  diagnosisSchema,
  planPrompt,
  planSchema,
  profilePrompt,
  profileSchema,
  siteDigest,
  writerPrompt,
  type AuditContext,
  type BusinessIntel,
  type Corrections,
  type Diagnosis,
  type DiscoveryContext,
  type PageSpeedScores,
  type Plan,
  type Signals,
} from "./prompts";

export type { BusinessIntel } from "./prompts";

// The analysis runs in two phases (D-028):
// - evidence (worker "website_evidence"): crawl + PageSpeed → business profile. Starts at the URL step.
// - plan (worker "website_plan"): growth score + diagnosis + growth plan (ON-7, ON-8) → 30-day plan → first
//   drafts. Starts when the evidence is in and the owner has finished or skipped discovery (see startPlanIfReady).
// "website_intel" (re-run) does both in one job, reusing the latest confirmed discovery answers.
// "diagnosis_update" re-runs only the diagnosis with the owner's corrections, reusing the stored evidence.
// Each job runs as a chain of steps, one function invocation per step (crawling, profiling, scoring, planning,
// writing; see ./steps.ts), so no invocation runs into the hosting time limit. What a later step needs is stored in
// ai_jobs.output. Runs server-side against ai_jobs rows; every write is scoped to the job's organization.

export const STEPS = [
  { key: "crawling", label: "Reading the website" },
  { key: "profiling", label: "Understanding the business" },
  { key: "scoring", label: "Diagnosing and building your growth plan" },
  { key: "planning", label: "Building the 30-day plan" },
  { key: "writing", label: "Drafting your first posts" },
  { key: "done", label: "Done" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"] | "evidence_done";

// Growth score: deterministic blend of measured (PageSpeed) and assessed (AI) dimensions.
export function computeGrowthScore(
  psi: { performance: number; seo: number; accessibility: number; bestPractices: number } | null,
  ai: { content_clarity: number; conversion_readiness: number; online_presence: number },
) {
  const parts: [number, number][] = [
    [ai.content_clarity, 0.25],
    [ai.conversion_readiness, 0.25],
    [ai.online_presence, 0.15],
  ];
  if (psi) {
    parts.push([psi.performance, 0.15], [psi.seo, 0.12], [psi.accessibility, 0.04], [psi.bestPractices, 0.04]);
  }
  const weight = parts.reduce((s, [, w]) => s + w, 0);
  return Math.round(parts.reduce((s, [v, w]) => s + v * w, 0) / weight);
}

// What the plan phase needs from the evidence phase; stored in the evidence job's output.
type Evidence = {
  // Home page signals; null when robots.txt doesn't let Braventa read the site.
  signals: Signals | null;
  // Mobile Lighthouse scores: the growth score uses these, as before, so scores stay comparable.
  psi: PageSpeedScores | null;
  psiError: string | null;
  pages: { url: string; title: string }[];
  // The deterministic audit (Website Intelligence Phase 1). Missing on evidence from before it existed.
  audit?: AuditContext & { runId: string | null };
};

// Findings passed to the diagnosis, highest priority first (keeps the prompt about the same size as before).
const MAX_PROMPT_FINDINGS = 40;

// Strips what only the checks need (every internal link of every page) before the coverage is stored.
function storableCoverage(audit: SiteAudit, summary: CoverageSummary) {
  return { ...audit, summary, pages: audit.pages.map(({ internalLinks, ...p }) => ({ ...p, internalLinkCount: internalLinks.length })) };
}

function compactPageSpeed(report: PageSpeedReport) {
  return { mobile: report.mobile, desktop: report.desktop, errors: report.errors };
}

// Runs the crawl, PageSpeed (mobile + desktop) and the deterministic checks, and stores them as one audit run.
// Storage of the audit is best effort: a failed write is logged and the analysis continues without it.
async function runAudit(ctx: Ctx) {
  const { db, org } = ctx;
  const { data: run, error: runError } = await db
    .from("audit_runs")
    .insert({
      organization_id: org,
      business_profile_id: ctx.businessProfileId,
      job_id: ctx.jobId,
      website_url: ctx.websiteUrl.slice(0, 2048),
      status: "running",
      audit_version: AUDIT_VERSION,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (runError) console.error(`audit run insert failed for job ${ctx.jobId}`, runError);
  const runId: string | null = run?.id ?? null;

  const [crawlResult, psi] = await Promise.all([
    crawlSite(ctx.websiteUrl).catch((e: Error) => ({ error: e })),
    pageSpeedReport(ctx.websiteUrl),
  ]);
  if ("error" in crawlResult) {
    if (runId) {
      await db
        .from("audit_runs")
        .update({
          status: "failed",
          error_summary: crawlResult.error.message.slice(0, 2000),
          pagespeed: compactPageSpeed(psi),
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId)
        .eq("organization_id", org);
    }
    throw crawlResult.error;
  }

  const crawl = crawlResult;
  const findings = runChecks({ audit: crawl.audit, psi });
  const summary = summarizeCoverage(crawl.audit);
  const partial =
    crawl.audit.homeBlocked ||
    !psi.mobile ||
    !psi.desktop ||
    summary.failed > 0 ||
    Boolean(summary.excludedByReason["time limit"]);

  if (runId) {
    const errors = [psi.errors.mobile && `PageSpeed mobile: ${psi.errors.mobile}`, psi.errors.desktop && `PageSpeed desktop: ${psi.errors.desktop}`]
      .filter(Boolean)
      .join("; ");
    const [{ error: upErr }, { error: fErr }] = await Promise.all([
      db
        .from("audit_runs")
        .update({
          status: partial ? "partial" : "completed",
          pages_discovered: summary.discovered,
          pages_scanned: summary.scanned,
          coverage: storableCoverage(crawl.audit, summary),
          pagespeed: compactPageSpeed(psi),
          error_summary: errors ? errors.slice(0, 2000) : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId)
        .eq("organization_id", org),
      findings.length
        ? db.from("audit_findings").insert(findings.map((f) => toFindingRow(f, org, runId)))
        : Promise.resolve({ error: null }),
    ]);
    if (upErr || fErr) console.error(`saving audit run ${runId} failed`, upErr ?? fErr);
  }

  return { crawl, psi, findings, summary, runId };
}

function toFindingRow(f: AuditFinding, org: string, runId: string) {
  return {
    organization_id: org,
    audit_run_id: runId,
    ref: f.ref,
    page_url: f.page_url?.slice(0, 2048) ?? null,
    rule_id: f.rule_id,
    category: f.category,
    severity: f.severity,
    confidence: f.confidence,
    priority_label: f.priority_label,
    summary: f.summary.slice(0, 1000),
    observed: f.observed,
    recommendation: f.recommendation.slice(0, 1000),
    source_type: f.source_type,
    observed_at: f.observed_at,
  };
}

// Rebuilds the diagnosis context from a stored audit run (owner corrections re-run only the diagnosis).
async function loadAuditContext(db: SupabaseClient, org: string, runId: string | undefined): Promise<Evidence["audit"]> {
  if (!runId) return undefined;
  const [{ data: run }, { data: rows }] = await Promise.all([
    db.from("audit_runs").select("id, coverage, pagespeed").eq("id", runId).eq("organization_id", org).maybeSingle(),
    db
      .from("audit_findings")
      .select("ref, rule_id, category, severity, confidence, priority_label, page_url, summary, observed, recommendation, source_type, observed_at")
      .eq("audit_run_id", runId)
      .eq("organization_id", org),
  ]);
  if (!run) return undefined;
  const coverage = run.coverage as { summary?: CoverageSummary; homeBlocked?: boolean };
  const findings = ((rows ?? []) as AuditFinding[]).sort((a, b) => Number(a.ref.slice(1)) - Number(b.ref.slice(1)));
  const pagespeed = run.pagespeed as Partial<PageSpeedReport> | null;
  return {
    runId: run.id,
    coverage: coverage.summary ? coverageLine(coverage.summary) : "unknown",
    homeBlocked: Boolean(coverage.homeBlocked),
    findings: promptFindings(findings, MAX_PROMPT_FINDINGS),
    desktop: pagespeed?.desktop?.scores ?? null,
  };
}

type Ctx = {
  db: SupabaseClient;
  jobId: string;
  org: string;
  businessProfileId: string;
  websiteUrl: string;
  owner: OwnerInputs | null;
};

type JobInput = {
  businessProfileId: string;
  websiteUrl: string;
  sessionId?: string;
  evidenceJobId?: string;
  // diagnosis_update: the diagnosis the owner corrected.
  diagnosisId?: string;
};

// A step either hands artifacts to the next step (stored in ai_jobs.output) or, as the last step, returns the
// job's final output.
type StepResult = { artifacts: Record<string, unknown> } | { final: Record<string, unknown> };

const MISSING_ANALYSIS = "The website analysis is missing. Re-run the analysis.";

// Step "crawling": crawl + PageSpeed + checks. Hands on the evidence and the page digest for the profile.
async function crawlStep(ctx: Ctx): Promise<StepResult> {
  const { db, org } = ctx;
  const { crawl, psi: psiReport, findings, summary, runId } = await runAudit(ctx);
  const psi = psiReport.mobile?.scores ?? null;

  // Keep the crawled pages as the business's knowledge base.
  if (crawl.pages.length) {
    await db.from("knowledge_documents").upsert(
      crawl.pages.map((p) => ({
        organization_id: org,
        source_type: "website_page",
        source_url: p.url,
        title: p.title,
        content: p.text,
        content_hash: createHash("sha256").update(p.text).digest("hex"),
      })),
      { onConflict: "organization_id,content_hash", ignoreDuplicates: true },
    );
  }

  const evidence: Evidence = {
    signals: crawl.signals,
    psi,
    psiError: psiReport.errors.mobile,
    pages: crawl.pages.map((p) => ({ url: p.url, title: p.title })),
    audit: {
      runId,
      coverage: coverageLine(summary),
      homeBlocked: crawl.audit.homeBlocked,
      findings: promptFindings(findings, MAX_PROMPT_FINDINGS),
      desktop: psiReport.desktop?.scores ?? null,
    },
  };
  // The digest is the (fenced, capped) page text the profile prompt reads; it is dropped once the profile is done.
  return { artifacts: { evidence, digest: siteDigest(crawl) } };
}

// Step "profiling": the business profile from the page digest.
async function profileStep(ctx: Ctx, state: JobState, worker: string): Promise<StepResult> {
  const { db, org } = ctx;
  const evidence = state.evidence as Evidence | undefined;
  if (typeof state.digest !== "string" || !evidence) throw new Error(MISSING_ANALYSIS);

  const intel = await runWorkerJson(
    {
      organizationId: org,
      jobId: ctx.jobId,
      worker: "business_analyst",
      maxTokens: MAX_TOKENS.profile,
      messages: [{ role: "user", content: profilePrompt(state.digest, ctx.owner) }],
    },
    (v) => profileSchema.parse(v),
  );

  await db
    .from("business_profiles")
    .update({
      company_name: intel.company_name,
      industry: intel.industry,
      services: intel.services,
      target_customers: intel.target_customers,
      locations: intel.locations,
      competitors: intel.likely_competitors,
      offers: intel.offers,
      intelligence: intel,
    })
    .eq("id", ctx.businessProfileId)
    .eq("organization_id", org);

  await db.from("brand_profiles").insert({
    organization_id: org,
    business_profile_id: ctx.businessProfileId,
    voice: intel.brand_voice.tone,
    tone_rules: intel.brand_voice.traits,
  });

  // The evidence job ends here; the plan job reads its evidence from this output, as before.
  if (worker === "website_evidence") return { final: { step: "evidence_done", evidence } };
  return { artifacts: { digest: undefined } };
}

// The profile the evidence step stored on the business (the diagnosis, plan and drafts all read it).
async function loadIntel(ctx: Ctx): Promise<BusinessIntel> {
  const { data: profile } = await ctx.db
    .from("business_profiles")
    .select("intelligence")
    .eq("id", ctx.businessProfileId)
    .eq("organization_id", ctx.org)
    .single();
  const intel = profileSchema.safeParse(profile?.intelligence);
  if (!intel.success) throw new Error(MISSING_ANALYSIS);
  return intel.data;
}

// Confirmed discovery answers for this business: a specific completed session, or the latest one.
export async function loadDiscovery(
  db: SupabaseClient,
  org: string,
  businessProfileId: string,
  sessionId?: string,
): Promise<DiscoveryContext | null> {
  let query = db
    .from("onboarding_sessions")
    .select("id, status")
    .eq("organization_id", org)
    .eq("business_profile_id", businessProfileId);
  query = sessionId ? query.eq("id", sessionId) : query.eq("status", "completed");
  const { data: session } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!session || session.status !== "completed") return null;

  const [{ data: rows }, { data: followUps }] = await Promise.all([
    db
      .from("onboarding_responses")
      .select("kind, pain_point_id, source, confirmed, original_text, customer_priority")
      .eq("organization_id", org)
      .eq("session_id", session.id),
    db
      .from("onboarding_follow_ups")
      .select("pain_point_id, question_key, answer, created_at")
      .eq("organization_id", org)
      .eq("session_id", session.id)
      .eq("status", "answered")
      .order("created_at"),
  ]);

  return {
    painPoints: (rows ?? [])
      .filter((r) => r.kind === "pain_point" && r.confirmed && r.pain_point_id)
      .map((r) => ({
        id: r.pain_point_id as string,
        priority: r.customer_priority,
        ownerWords: r.source === "ai_suggested" ? r.original_text : null,
      })),
    statements: (rows ?? []).filter((r) => r.kind === "statement" && r.original_text).map((r) => r.original_text as string),
    followUps: (followUps ?? []).flatMap((f) => {
      const question = getQuestion(f.pain_point_id, f.question_key);
      if (!question || !f.answer) return [];
      return [
        {
          painPointId: f.pain_point_id,
          question: question.text,
          answer: answerLabel(f.pain_point_id, f.question_key, f.answer),
          key: f.question_key,
          value: f.answer,
        },
      ];
    }),
  };
}

// ON-7/ON-8: one call on the strongest tier returns the scores, the diagnosis and the plan.
function diagnose(
  ctx: Ctx,
  evidence: Evidence,
  intel: BusinessIntel,
  discovery: DiscoveryContext | null,
  corrections: Corrections | null,
) {
  return runWorkerJson(
    {
      organizationId: ctx.org,
      jobId: ctx.jobId,
      worker: "website_auditor",
      maxTokens: MAX_TOKENS.diagnosis,
      messages: [
        {
          role: "user",
          content: diagnosisPrompt({
            intel,
            signals: evidence.signals,
            psi: evidence.psi,
            pageUrls: evidence.pages.map((p) => p.url),
            owner: ctx.owner,
            discovery,
            corrections,
            audit: evidence.audit ?? null,
          }),
        },
      ],
    },
    (v) => diagnosisSchema.parse(v),
  );
}

function discoveryFacts(discovery: DiscoveryContext | null): DiscoveryFacts {
  return {
    priorityOf: new Map((discovery?.painPoints ?? []).map((p) => [p.id, p.priority])),
    urgencyOf: new Map(
      (discovery?.followUps ?? []).filter((f) => f.key === "urgency").map((f) => [f.painPointId, f.value]),
    ),
  };
}

// Saves a diagnosis with its findings and plan items. Every row is scoped to the job's organization.
async function storeDiagnosis(
  ctx: Ctx,
  raw: Diagnosis,
  discovery: DiscoveryContext | null,
  opts: { reportId: string | null; evidence: Evidence; revises?: { id: string; version: number } },
) {
  const { db, org } = ctx;
  const facts = discoveryFacts(discovery);
  // Only refs that exist in this run count as citations; uncited website/PageSpeed findings become inferred.
  const findings = toFindings(raw.findings, facts, citableRefs({ ...opts.evidence, audit: opts.evidence.audit ?? null }));
  const items = orderPlan(toPlanItems(raw.plan, findings, facts));

  const { data: diagnosis, error } = await db
    .from("diagnoses")
    .insert({
      organization_id: org,
      business_profile_id: ctx.businessProfileId,
      report_id: opts.reportId,
      job_id: ctx.jobId,
      revises_id: opts.revises?.id ?? null,
      version: (opts.revises?.version ?? 0) + 1,
      summary: raw.summary.slice(0, 1500),
      missing_info: raw.missing_info.slice(0, 4),
    })
    .select("id")
    .single();
  if (error || !diagnosis) throw new Error(`saving the diagnosis failed: ${error?.message}`);

  const scoped = { organization_id: org, diagnosis_id: diagnosis.id };
  const [{ error: fErr }, { error: iErr }] = await Promise.all([
    db.from("diagnosis_findings").insert(findings.map((f) => ({ ...scoped, ...f }))),
    db.from("growth_plan_items").insert(
      items.map(({ title, area, pain_point_ids, finding_positions, why, evidence, first_action, dependencies, success_metric, solution_ids, manual_alternative, impact, urgency, urgency_from_owner, effort, confidence, customer_priority, ai_priority, calculated_priority }) => ({
        ...scoped,
        title, area, pain_point_ids, finding_positions, why, evidence, first_action, dependencies, success_metric,
        solution_ids, manual_alternative, impact, urgency, urgency_from_owner, effort, confidence,
        customer_priority, ai_priority, calculated_priority,
      })),
    ),
  ]);
  if (fErr || iErr) throw new Error(`saving the plan failed: ${(fErr ?? iErr)?.message}`);
  return { diagnosisId: diagnosis.id, items };
}

// The owner corrected the diagnosis: re-run only the diagnosis step with their corrections, reusing the
// stored website evidence. The 30-day plan and drafts are kept.
async function reviseDiagnosis(ctx: Ctx, diagnosisId: string) {
  const { db, org } = ctx;
  const { data: previous } = await db
    .from("diagnoses")
    .select("id, version, status, report_id, business_profile_id")
    .eq("id", diagnosisId)
    .eq("organization_id", org)
    .single();
  if (!previous || previous.business_profile_id !== ctx.businessProfileId) throw new Error("The diagnosis wasn't found.");

  const [{ data: report }, { data: profile }, { data: findings }] = await Promise.all([
    db.from("reports").select("data").eq("id", previous.report_id ?? "").eq("organization_id", org).maybeSingle(),
    db.from("business_profiles").select("intelligence").eq("id", ctx.businessProfileId).eq("organization_id", org).single(),
    db
      .from("diagnosis_findings")
      .select("statement, owner_verdict, owner_note, position")
      .eq("diagnosis_id", previous.id)
      .eq("organization_id", org)
      .order("position"),
  ]);
  const data = report?.data as
    | (Evidence & { pagespeed?: PageSpeedScores | null; pagespeed_error?: string | null; audit_run_id?: string })
    | undefined;
  const intel = profileSchema.safeParse(profile?.intelligence);
  // signals is null (not missing) when robots.txt blocked the site.
  if (!data || !("signals" in data) || !intel.success) throw new Error("The website analysis is missing. Re-run the analysis.");
  const evidence: Evidence = {
    signals: data.signals ?? null,
    psi: data.pagespeed ?? null,
    psiError: data.pagespeed_error ?? null,
    pages: data.pages ?? [],
    audit: await loadAuditContext(db, org, data.audit_run_id),
  };

  const corrections: Corrections = {
    confirmed: (findings ?? []).filter((f) => f.owner_verdict === "confirmed").map((f) => f.statement),
    wrong: (findings ?? [])
      .filter((f) => f.owner_verdict === "rejected" || f.owner_note)
      .map((f) => ({ statement: f.statement, note: f.owner_note })),
  };
  const discovery = await loadDiscovery(db, org, ctx.businessProfileId);

  const raw = await diagnose(ctx, evidence, intel.data, discovery, corrections);
  const { diagnosisId: revisedId } = await storeDiagnosis(ctx, raw, discovery, {
    reportId: previous.report_id,
    evidence,
    revises: { id: previous.id, version: previous.version },
  });
  await db.from("diagnoses").update({ status: "superseded" }).eq("id", previous.id).eq("organization_id", org);
  return revisedId;
}

async function reviseStep(ctx: Ctx, input: JobInput): Promise<StepResult> {
  if (!input.diagnosisId) throw new Error("No diagnosis to update.");
  const diagnosisId = await reviseDiagnosis(ctx, input.diagnosisId);
  return { final: { step: "done", diagnosis_id: diagnosisId } };
}

// Step "scoring": growth score + diagnosis + growth plan (ON-7, ON-8), and the report.
async function scoreStep(ctx: Ctx, state: JobState, input: JobInput, worker: string): Promise<StepResult> {
  const { db, org } = ctx;
  let evidence = state.evidence as Evidence | undefined;
  if (worker === "website_plan") {
    const { data: evidenceJob } = await db
      .from("ai_jobs")
      .select("output")
      .eq("id", input.evidenceJobId ?? "")
      .eq("organization_id", org)
      .maybeSingle();
    evidence = (evidenceJob?.output as { evidence?: Evidence } | null)?.evidence;
  }
  if (!evidence) throw new Error(MISSING_ANALYSIS);
  const intel = await loadIntel(ctx);
  // A plan job uses its own onboarding session; a re-run (no session) uses the latest completed one.
  const discovery = await loadDiscovery(db, org, ctx.businessProfileId, input.sessionId);

  const raw = await diagnose(ctx, evidence, intel, discovery, null);
  const growthScore = computeGrowthScore(evidence.psi, raw.scores);

  await db
    .from("business_profiles")
    .update({ growth_score: growthScore, analyzed_at: new Date().toISOString() })
    .eq("id", ctx.businessProfileId)
    .eq("organization_id", org);

  const { data: report } = await db
    .from("reports")
    .insert({
      organization_id: org,
      report_type: "growth_plan",
      title: `Growth assessment — ${intel.company_name}`,
      summary: intel.summary,
      data: {
        business_profile_id: ctx.businessProfileId,
        growth_score: growthScore,
        scores: raw.scores,
        pagespeed: evidence.psi,
        pagespeed_error: evidence.psiError,
        signals: evidence.signals,
        pages: evidence.pages,
        audit_run_id: evidence.audit?.runId ?? null,
        discovery_priorities: [...(discovery?.painPoints ?? [])]
          .filter((p) => p.priority)
          .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
          .map((p) => p.id),
      },
    })
    .select("id")
    .single();

  const { items: planItems } = await storeDiagnosis(ctx, raw, discovery, { reportId: report?.id ?? null, evidence });

  return {
    artifacts: {
      evidence: undefined,
      report_id: report?.id ?? null,
      growth_score: growthScore,
      plan_titles: planItems.map((i) => i.title),
      discovery,
    },
  };
}

// Posts go out at ~9am Philippines time on their planned day; day 1 is the plan's start date.
function dayDate(start: Date, day: number) {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + day - 1);
  d.setUTCHours(1, 0, 0, 0);
  return d.toISOString();
}

// Step "planning": the 30-day plan and its calendar items.
async function planStep(ctx: Ctx, state: JobState): Promise<StepResult> {
  const { db, org, jobId, owner } = ctx;
  const intel = await loadIntel(ctx);
  const discovery = (state.discovery ?? null) as DiscoveryContext | null;
  const planTitles = Array.isArray(state.plan_titles) ? (state.plan_titles as string[]) : [];

  const plan = await runWorkerJson(
    {
      organizationId: org,
      jobId,
      worker: "content_strategist",
      maxTokens: MAX_TOKENS.plan,
      messages: [{ role: "user", content: planPrompt({ intel, planTitles, owner, discovery }) }],
    },
    (v) => planSchema.parse(v),
  );

  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  const startsOn = start.toISOString().slice(0, 10);

  const { data: calendar, error: calError } = await db
    .from("content_calendars")
    .insert({
      organization_id: org,
      title: `30-day plan — ${intel.company_name}`,
      strategy: { ...plan.strategy, business_profile_id: ctx.businessProfileId },
      starts_on: startsOn,
      days: 30,
    })
    .select("id")
    .single();
  if (calError || !calendar) throw new Error(`calendar insert failed: ${calError?.message}`);

  const { error: itemsError } = await db.from("content_items").insert(
    plan.days.map((d) => ({
      organization_id: org,
      calendar_id: calendar.id,
      channel: d.channel,
      content_type: d.format,
      scheduled_for: dayDate(start, d.day),
      title: d.topic,
      brief: `${d.pillar} — ${d.objective}`,
      status: "brief" as const,
    })),
  );
  if (itemsError) throw new Error(`content insert failed: ${itemsError.message}`);

  // First content batch: the first 5 planned posts, drafted by the next step and sent for human approval.
  const firstBatch = plan.days.slice().sort((a, b) => a.day - b.day).slice(0, 5);
  return { artifacts: { calendar_id: calendar.id, first_batch: firstBatch, starts_at: start.toISOString() } };
}

// Step "writing": drafts the first batch of posts (status needs_approval, D-013).
async function writeStep(ctx: Ctx, state: JobState): Promise<StepResult> {
  const { db, org, jobId, owner } = ctx;
  const calendarId = typeof state.calendar_id === "string" ? state.calendar_id : null;
  const firstBatch = Array.isArray(state.first_batch) ? (state.first_batch as Plan["days"]) : null;
  const start = typeof state.starts_at === "string" ? new Date(state.starts_at) : null;
  if (!calendarId || !firstBatch || !start) throw new Error(MISSING_ANALYSIS);
  const intel = await loadIntel(ctx);

  const { data: items, error: itemsError } = await db
    .from("content_items")
    .select("id, scheduled_for")
    .eq("calendar_id", calendarId)
    .eq("organization_id", org);
  if (itemsError || !items) throw new Error(`content lookup failed: ${itemsError?.message}`);

  const written = await runWorkerJson(
    {
      organizationId: org,
      jobId,
      worker: "content_writer",
      maxTokens: MAX_TOKENS.writer,
      highRisk: intel.regulated.is_regulated,
      messages: [{ role: "user", content: writerPrompt({ intel, posts: firstBatch, owner }) }],
    },
    (v) => contentSchema.parse(v),
  );

  for (const w of written.items) {
    // Postgres returns "+00:00" timestamps, so compare instants, not strings.
    const wanted = new Date(dayDate(start, w.day)).getTime();
    const target = items.find((i) => new Date(i.scheduled_for).getTime() === wanted);
    if (!target) continue;
    const hashtags = w.hashtags.length ? `\n\n${w.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}` : "";
    await db
      .from("content_items")
      .update({
        title: w.title,
        body: `${w.body}${w.cta ? `\n\n${w.cta}` : ""}${hashtags}`,
        qa_notes: {
          image_prompt: w.image_prompt,
          compliance_note: w.compliance_note,
          regulated_area: intel.regulated.is_regulated ? intel.regulated.area : null,
        },
        status: "needs_approval",
      })
      .eq("id", target.id)
      .eq("organization_id", org);
  }

  return {
    final: { step: "done", report_id: state.report_id ?? null, calendar_id: calendarId, growth_score: state.growth_score ?? null },
  };
}

function runStep(ctx: Ctx, state: JobState, input: JobInput, worker: string): Promise<StepResult> {
  switch (state.step) {
    case "crawling":
      return crawlStep(ctx);
    case "profiling":
      return profileStep(ctx, state, worker);
    case "scoring":
      return worker === "diagnosis_update" ? reviseStep(ctx, input) : scoreStep(ctx, state, input, worker);
    case "planning":
      return planStep(ctx, state);
    case "writing":
      return writeStep(ctx, state);
  }
}

// Runs the job's current step (when it is pending and, if given, is `expectedStep`), then hands the next step to a
// new function invocation (/api/jobs/continue). Each step fits well inside one invocation's time limit; see
// lib/pipeline/steps.ts. Never throws: failures are recorded on the job row. Safe to call more than once for the
// same step: only the call that claims the step runs it.
export async function runAnalysisJob(jobId: string, expectedStep?: string): Promise<void> {
  const db = createSupabaseAdminClient();
  const { data: job, error: jobError } = await db.from("ai_jobs").select("*").eq("id", jobId).single();
  if (jobError || !job) {
    console.error(`ai_job ${jobId} not found`, jobError);
    return;
  }
  if (job.status !== "queued" && job.status !== "running") return;
  const org: string = job.organization_id;
  const worker: string = job.worker;
  const input = job.input as JobInput;
  const state = readState(worker, job.output, job.created_at);
  if (!canClaim(state, expectedStep)) return;

  // Claim the step: only one invocation moves it from pending to running.
  const claim = randomUUID();
  const claimedAt = new Date().toISOString();
  const running: JobState = { ...state, step_state: "running", step_started_at: claimedAt, claim };
  let claimQuery = db
    .from("ai_jobs")
    .update({ status: "running", output: running, ...(job.started_at ? {} : { started_at: claimedAt }) })
    .eq("id", jobId)
    .eq("organization_id", org)
    .in("status", ["queued", "running"]);
  claimQuery =
    job.output === null
      ? claimQuery.is("output", null)
      : claimQuery.eq("output->>step", state.step).eq("output->>step_state", "pending");
  const { data: claimed, error: claimError } = await claimQuery.select("id");
  if (claimError) console.error(`claiming step ${state.step} of job ${jobId} failed`, claimError);
  if (!claimed?.length) return;

  // Writes that only the invocation holding this claim may make (the reaper may have failed the job meanwhile).
  const owned = (values: Record<string, unknown>) =>
    db
      .from("ai_jobs")
      .update(values)
      .eq("id", jobId)
      .eq("organization_id", org)
      .eq("status", "running")
      .eq("output->>claim", claim)
      .select("id");

  const { data: ownerRow } = await db
    .from("business_profiles")
    .select("goals, service_area, current_tools")
    .eq("id", input.businessProfileId)
    .eq("organization_id", org)
    .single();
  const ctx: Ctx = {
    db,
    jobId,
    org,
    businessProfileId: input.businessProfileId,
    websiteUrl: input.websiteUrl,
    // Guided onboarding answers (Customer-provided). Read fresh each run so edits apply to re-runs.
    owner: ownerRow ? fromProfileRow(ownerRow) : null,
  };

  const started = Date.now();
  let result: StepResult;
  try {
    result = await runStep(ctx, running, input, worker);
    if ("artifacts" in result && !nextStep(worker, state.step)) throw new Error(`No step follows ${state.step}.`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`analysis job ${jobId} (${worker}) failed at ${state.step}`, e);
    await db
      .from("ai_jobs")
      .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("organization_id", org);
    return;
  }
  console.info(`analysis job ${jobId} (${worker}) step ${state.step} took ${Date.now() - started} ms`);

  if ("final" in result) {
    const { data: done } = await owned({ status: "succeeded", finished_at: new Date().toISOString(), output: result.final });
    if (!done?.length) return;
    // Evidence is in: if the owner already finished discovery, the plan can start now, in its own invocation.
    if (worker === "website_evidence" && input.sessionId) {
      try {
        const planJobId = await startPlanIfReady(input.sessionId);
        if (planJobId) await dispatchStep(planJobId, firstStep("website_plan"));
      } catch (e) {
        console.error(`starting the plan after evidence job ${jobId} failed`, e);
      }
    }
    return;
  }

  const next = nextStep(worker, state.step) as RunStep;
  const { data: advanced } = await owned({ output: advanceState(running, result.artifacts, next) });
  if (advanced?.length) await dispatchStep(jobId, next);
}

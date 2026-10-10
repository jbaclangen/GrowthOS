import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runWorkerJson } from "@/lib/ai/router";
import { crawlSite, type CrawlResult } from "@/lib/integrations/crawler";
import { pageSpeed } from "@/lib/integrations/google";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { fromProfileRow, type OwnerInputs } from "@/lib/owner-inputs";
import { startPlanIfReady } from "@/lib/onboarding/orchestrate";
import { answerLabel, getQuestion } from "@/lib/onboarding/followups";
import {
  MAX_TOKENS,
  contentSchema,
  opportunitiesPrompt,
  opportunitiesSchema,
  planPrompt,
  planSchema,
  profilePrompt,
  profileSchema,
  siteDigest,
  writerPrompt,
  type BusinessIntel,
  type DiscoveryContext,
  type PageSpeedScores,
} from "./prompts";

export type { BusinessIntel } from "./prompts";

// The analysis runs in two phases (D-028):
// - evidence (worker "website_evidence"): crawl + PageSpeed → business profile. Starts at the URL step.
// - plan (worker "website_plan"): opportunities + growth score → 30-day plan → first drafts. Starts when the
//   evidence is in and the owner has finished or skipped discovery (see startPlanIfReady).
// "website_intel" (re-run) does both in one job, reusing the latest confirmed discovery answers.
// Runs server-side against ai_jobs rows; every write is scoped to the job's organization.

export const STEPS = [
  { key: "crawling", label: "Reading the website" },
  { key: "profiling", label: "Understanding the business" },
  { key: "scoring", label: "Scoring growth and finding opportunities" },
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
  signals: CrawlResult["signals"];
  psi: PageSpeedScores | null;
  psiError: string | null;
  pages: { url: string; title: string }[];
};

type Ctx = {
  db: SupabaseClient;
  jobId: string;
  org: string;
  businessProfileId: string;
  websiteUrl: string;
  owner: OwnerInputs | null;
  setStep: (step: StepKey) => PromiseLike<unknown>;
};

async function gatherEvidence(ctx: Ctx): Promise<{ evidence: Evidence; intel: BusinessIntel }> {
  const { db, org } = ctx;
  await ctx.setStep("crawling");
  const [crawl, psiResult] = await Promise.all([
    crawlSite(ctx.websiteUrl),
    pageSpeed(ctx.websiteUrl, "mobile").catch((e: Error) => ({ error: e.message })),
  ]);
  const psi = "scores" in psiResult ? psiResult.scores : null;

  // Keep the crawled pages as the business's knowledge base.
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

  await ctx.setStep("profiling");
  const intel = await runWorkerJson(
    {
      organizationId: org,
      jobId: ctx.jobId,
      worker: "business_analyst",
      maxTokens: MAX_TOKENS.profile,
      messages: [{ role: "user", content: profilePrompt(siteDigest(crawl), ctx.owner) }],
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

  return {
    intel,
    evidence: {
      signals: crawl.signals,
      psi,
      psiError: "error" in psiResult ? psiResult.error : null,
      pages: crawl.pages.map((p) => ({ url: p.url, title: p.title })),
    },
  };
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
      return [{ painPointId: f.pain_point_id, question: question.text, answer: answerLabel(f.pain_point_id, f.question_key, f.answer) }];
    }),
  };
}

async function buildPlan(ctx: Ctx, evidence: Evidence, intel: BusinessIntel, discovery: DiscoveryContext | null) {
  const { db, org, jobId, owner } = ctx;

  await ctx.setStep("scoring");
  const opp = await runWorkerJson(
    {
      organizationId: org,
      jobId,
      worker: "website_auditor",
      maxTokens: MAX_TOKENS.opportunities,
      messages: [
        {
          role: "user",
          content: opportunitiesPrompt({
            intel,
            signals: evidence.signals,
            psi: evidence.psi,
            pageUrls: evidence.pages.map((p) => p.url),
            owner,
            discovery,
          }),
        },
      ],
    },
    (v) => opportunitiesSchema.parse(v),
  );
  const growthScore = computeGrowthScore(evidence.psi, opp.scores);

  // Only link opportunities to pain points the owner actually confirmed.
  const confirmed = new Set(discovery?.painPoints.map((p) => p.id) ?? []);
  const opportunities = opp.opportunities
    .slice(0, 5)
    .map((o) => ({ ...o, pain_point_ids: o.pain_point_ids.filter((id) => confirmed.has(id)) }));

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
        scores: opp.scores,
        pagespeed: evidence.psi,
        pagespeed_error: evidence.psiError,
        signals: evidence.signals,
        opportunities,
        pages: evidence.pages,
        discovery_priorities: [...(discovery?.painPoints ?? [])]
          .filter((p) => p.priority)
          .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
          .map((p) => p.id),
      },
    })
    .select("id")
    .single();

  await ctx.setStep("planning");
  const plan = await runWorkerJson(
    {
      organizationId: org,
      jobId,
      worker: "content_strategist",
      maxTokens: MAX_TOKENS.plan,
      messages: [
        {
          role: "user",
          content: planPrompt({ intel, opportunityTitles: opportunities.map((o) => o.title), owner, discovery }),
        },
      ],
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

  const dayDate = (day: number) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + day - 1);
    d.setUTCHours(1, 0, 0, 0); // ~9am Philippines time
    return d.toISOString();
  };

  const { data: items, error: itemsError } = await db
    .from("content_items")
    .insert(
      plan.days.map((d) => ({
        organization_id: org,
        calendar_id: calendar.id,
        channel: d.channel,
        content_type: d.format,
        scheduled_for: dayDate(d.day),
        title: d.topic,
        brief: `${d.pillar} — ${d.objective}`,
        status: "brief" as const,
      })),
    )
    .select("id, scheduled_for, channel, title, brief");
  if (itemsError || !items) throw new Error(`content insert failed: ${itemsError?.message}`);

  // First content batch: the first 5 planned posts, sent for human approval.
  await ctx.setStep("writing");
  const firstBatch = plan.days.slice().sort((a, b) => a.day - b.day).slice(0, 5);
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
    const wanted = new Date(dayDate(w.day)).getTime();
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

  return { reportId: report?.id ?? null, calendarId: calendar.id, growthScore };
}

type JobInput = { businessProfileId: string; websiteUrl: string; sessionId?: string; evidenceJobId?: string };

// Runs one analysis job of any phase. Never throws: failures are recorded on the job row.
export async function runAnalysisJob(jobId: string): Promise<void> {
  const db = createSupabaseAdminClient();
  const { data: job, error: jobError } = await db.from("ai_jobs").select("*").eq("id", jobId).single();
  if (jobError || !job) {
    console.error(`ai_job ${jobId} not found`, jobError);
    return;
  }
  const org: string = job.organization_id;
  const input = job.input as JobInput;

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
    setStep: (step) => db.from("ai_jobs").update({ output: { step } }).eq("id", jobId).eq("organization_id", org),
  };

  await db.from("ai_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", jobId);
  const finish = (output: Record<string, unknown>) =>
    db
      .from("ai_jobs")
      .update({ status: "succeeded", finished_at: new Date().toISOString(), output })
      .eq("id", jobId)
      .eq("organization_id", org);

  try {
    if (job.worker === "website_evidence") {
      const { evidence } = await gatherEvidence(ctx);
      await finish({ step: "evidence_done", evidence });
    } else if (job.worker === "website_plan") {
      const [{ data: evidenceJob }, { data: profile }] = await Promise.all([
        db.from("ai_jobs").select("output").eq("id", input.evidenceJobId ?? "").eq("organization_id", org).maybeSingle(),
        db.from("business_profiles").select("intelligence").eq("id", input.businessProfileId).eq("organization_id", org).single(),
      ]);
      const evidence = (evidenceJob?.output as { evidence?: Evidence } | null)?.evidence;
      const intel = profileSchema.safeParse(profile?.intelligence);
      if (!evidence || !intel.success) throw new Error("The website analysis is missing. Re-run the analysis.");
      const discovery = await loadDiscovery(db, org, input.businessProfileId, input.sessionId);
      const result = await buildPlan(ctx, evidence, intel.data, discovery);
      await finish({ step: "done", report_id: result.reportId, calendar_id: result.calendarId, growth_score: result.growthScore });
    } else {
      const { evidence, intel } = await gatherEvidence(ctx);
      const discovery = await loadDiscovery(db, org, input.businessProfileId);
      const result = await buildPlan(ctx, evidence, intel, discovery);
      await finish({ step: "done", report_id: result.reportId, calendar_id: result.calendarId, growth_score: result.growthScore });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`analysis job ${jobId} (${job.worker}) failed`, e);
    await db
      .from("ai_jobs")
      .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
      .eq("id", jobId);
    return;
  }

  // Evidence is in: if the owner already finished discovery, the plan can start now.
  if (job.worker === "website_evidence" && input.sessionId) {
    try {
      const planJobId = await startPlanIfReady(input.sessionId);
      if (planJobId) await runAnalysisJob(planJobId);
    } catch (e) {
      console.error(`starting the plan after evidence job ${jobId} failed`, e);
    }
  }
}

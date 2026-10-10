import "server-only";
import { createHash } from "node:crypto";
import { runWorkerJson } from "@/lib/ai/router";
import { crawlSite } from "@/lib/integrations/crawler";
import { pageSpeed } from "@/lib/integrations/google";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
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
} from "./prompts";

export type { BusinessIntel } from "./prompts";

// The MVP demo flow:
// website → business profile → growth score + 5 opportunities → 30-day plan → first content batch.
// Runs server-side against an ai_jobs row; every write is scoped to the job's organization.

export const STEPS = [
  { key: "crawling", label: "Reading the website" },
  { key: "profiling", label: "Understanding the business" },
  { key: "scoring", label: "Scoring growth and finding opportunities" },
  { key: "planning", label: "Building the 30-day plan" },
  { key: "writing", label: "Drafting your first posts" },
  { key: "done", label: "Done" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

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

export async function runWebsiteIntel(jobId: string) {
  const db = createSupabaseAdminClient();
  const { data: job, error: jobError } = await db.from("ai_jobs").select("*").eq("id", jobId).single();
  if (jobError || !job) throw new Error(`ai_job ${jobId} not found`);

  const org: string = job.organization_id;
  const { businessProfileId, websiteUrl } = job.input as { businessProfileId: string; websiteUrl: string };

  const setStep = (step: StepKey, extra: Record<string, unknown> = {}) =>
    db.from("ai_jobs").update({ output: { step, ...extra } }).eq("id", jobId).eq("organization_id", org);

  await db.from("ai_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", jobId);

  try {
    // 1. Crawl + PageSpeed in parallel (PageSpeed is slow and optional).
    await setStep("crawling");
    const [crawl, psiResult] = await Promise.all([
      crawlSite(websiteUrl),
      pageSpeed(websiteUrl, "mobile").catch((e: Error) => ({ error: e.message })),
    ]);
    const psi = "scores" in psiResult ? psiResult.scores : null;
    const digest = siteDigest(crawl);

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

    // 2. Business Intelligence Profile.
    await setStep("profiling");
    const intel = await runWorkerJson(
      {
        organizationId: org,
        jobId,
        worker: "business_analyst",
        maxTokens: MAX_TOKENS.profile,
        messages: [
          {
            role: "user",
            content: profilePrompt(digest),
          },
        ],
      },
      (v) => profileSchema.parse(v),
    );

    // 3. Growth score + opportunities.
    await setStep("scoring");
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
              signals: crawl.signals,
              psi,
              pageUrls: crawl.pages.map((p) => p.url),
            }),
          },
        ],
      },
      (v) => opportunitiesSchema.parse(v),
    );
    const growthScore = computeGrowthScore(psi, opp.scores);

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
        growth_score: growthScore,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", businessProfileId)
      .eq("organization_id", org);

    await db.from("brand_profiles").insert({
      organization_id: org,
      business_profile_id: businessProfileId,
      voice: intel.brand_voice.tone,
      tone_rules: intel.brand_voice.traits,
    });

    const { data: auditReport } = await db
      .from("reports")
      .insert({
        organization_id: org,
        report_type: "growth_plan",
        title: `Growth assessment — ${intel.company_name}`,
        summary: intel.summary,
        data: {
          business_profile_id: businessProfileId,
          growth_score: growthScore,
          scores: opp.scores,
          pagespeed: psi,
          pagespeed_error: "error" in psiResult ? psiResult.error : null,
          signals: crawl.signals,
          opportunities: opp.opportunities.slice(0, 5),
          pages: crawl.pages.map((p) => ({ url: p.url, title: p.title })),
        },
      })
      .select("id")
      .single();

    // 4. 30-day plan.
    await setStep("planning");
    const plan = await runWorkerJson(
      {
        organizationId: org,
        jobId,
        worker: "content_strategist",
        maxTokens: MAX_TOKENS.plan,
        messages: [
          {
            role: "user",
            content: planPrompt({
              intel,
              opportunityTitles: opp.opportunities.slice(0, 5).map((o) => o.title),
            }),
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
        strategy: { ...plan.strategy, business_profile_id: businessProfileId },
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

    // 5. First content batch: the first 5 planned posts, sent for human approval.
    await setStep("writing");
    const firstBatch = plan.days.slice().sort((a, b) => a.day - b.day).slice(0, 5);
    const written = await runWorkerJson(
      {
        organizationId: org,
        jobId,
        worker: "content_writer",
        maxTokens: MAX_TOKENS.writer,
        highRisk: intel.regulated.is_regulated,
        messages: [
          {
            role: "user",
            content: writerPrompt({ intel, posts: firstBatch }),
          },
        ],
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

    await db
      .from("ai_jobs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        output: { step: "done", report_id: auditReport?.id, calendar_id: calendar.id, growth_score: growthScore },
      })
      .eq("id", jobId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`website-intel job ${jobId} failed`, e);
    await db
      .from("ai_jobs")
      .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
      .eq("id", jobId);
  }
}

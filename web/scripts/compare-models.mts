// Model comparison for the website-intel pipeline (dev tool; spends OpenRouter credit).
// Runs the four pipeline steps with one model per lineup, on the same crawl and PageSpeed data,
// using the production prompts. Writes full outputs and automatic checks to web/.eval/<timestamp>/.
//
//   npm run eval:models -- https://example.com https://another.com
//   EVAL_MODELS=anthropic/claude-haiku-5.5,anthropic/claude-sonnet-5.5 npm run eval:models -- example.com
//   EVAL_OWNER='{"goal":"More leads and inquiries","serviceArea":"Dallas","tools":["HubSpot"]}' npm run eval:models -- example.com
//
// Calls OpenRouter directly (not runWorker) so nothing is written to the database or any org budget.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { crawlSite } from "@/lib/integrations/crawler";
import { pageSpeed } from "@/lib/integrations/google";
import { chat } from "@/lib/integrations/openrouter";
import { parseJsonLoose, systemPrompt, type Worker } from "@/lib/ai/router";
import type { OwnerInputs } from "@/lib/owner-inputs";
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
} from "@/lib/pipeline/prompts";

const MODELS = (process.env.EVAL_MODELS ??
  "anthropic/claude-haiku-5.5,anthropic/claude-sonnet-5.5,anthropic/claude-opus-5.5").split(",");
const sites = process.argv.slice(2);
// Optional guided-onboarding answers (BI-12) to test how they steer the output. Never written anywhere.
const OWNER: OwnerInputs | null = process.env.EVAL_OWNER ? JSON.parse(process.env.EVAL_OWNER) : null;
if (!sites.length) {
  console.error("Usage: npm run eval:models -- <url> [url...]");
  process.exit(1);
}

const outDir = join(".eval", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(outDir, { recursive: true });

type Step = { worker: Worker; ms: number; costUsd: number; inputTokens: number; outputTokens: number; attempts: number };

async function step<T>(model: string, worker: Worker, prompt: string, maxTokens: number, parse: (v: unknown) => T) {
  const t0 = Date.now();
  let cost = 0, inTok = 0, outTok = 0, lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = await chat({
      models: [model],
      messages: [{ role: "system", content: systemPrompt(worker) }, { role: "user", content: prompt }],
      json: true,
      maxTokens,
    });
    cost += r.costUsd; inTok += r.inputTokens; outTok += r.outputTokens;
    try {
      const value = parse(parseJsonLoose(r.text));
      const meta: Step = { worker, ms: Date.now() - t0, costUsd: cost, inputTokens: inTok, outputTokens: outTok, attempts: attempt };
      return { value, meta };
    } catch (e) {
      lastError = r.finishReason === "length" ? new Error("output was cut off at the token limit") : e;
    }
  }
  throw new Error(`${worker} on ${model}: unusable JSON (${lastError instanceof Error ? lastError.message : lastError})`);
}

// Figures that look like facts: percentages, star ratings, letter grades, "x out of y", money, durations.
const FIGURE = /\b\d+(?:\.\d+)?\s?%|\b\d(?:\.\d)?\s?(?:★|stars?\b)|\b[A-F][+-]\s+rating|\bA\+|\$\s?\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?\s?(?:s|ms|seconds)\b|\b\d+\s+out of\s+\d+/gi;

function unsupportedFigures(text: string, evidence: string) {
  const hits = new Set<string>();
  for (const m of text.match(FIGURE) ?? []) {
    const core = m.replace(/\s+/g, "").replace(/stars?$/i, "").replace("★", "");
    if (!evidence.replace(/\s+/g, "").includes(core)) hits.add(m.trim());
  }
  return [...hits];
}

function staleYears(text: string, currentYear: number) {
  return [...new Set((text.match(/\b20\d\d\b/g) ?? []).filter((y) => Number(y) < currentYear))];
}

const summary: string[] = [];
const currentYear = new Date().getUTCFullYear();

for (const site of sites) {
  console.log(`\n=== ${site}: crawling + PageSpeed`);
  const [crawl, psiResult] = await Promise.all([
    crawlSite(site),
    pageSpeed(site, "mobile").catch((e: Error) => ({ error: e.message })),
  ]);
  const psi = "scores" in psiResult ? psiResult.scores : null;
  const digest = siteDigest(crawl);
  const evidence = `${digest}\n${JSON.stringify(crawl.signals)}\n${JSON.stringify(psi)}`;
  const host = new URL(crawl.pages[0].url).hostname.replace(/^www\./, "");

  for (const model of MODELS) {
    const label = `${host} · ${model}`;
    console.log(`--- ${label}`);
    try {
      const p = await step(model, "business_analyst", profilePrompt(digest, OWNER), MAX_TOKENS.profile, (v) => profileSchema.parse(v));
      const o = await step(model, "website_auditor",
        opportunitiesPrompt({ intel: p.value, signals: crawl.signals, psi, pageUrls: crawl.pages.map((x) => x.url), owner: OWNER }),
        MAX_TOKENS.opportunities, (v) => opportunitiesSchema.parse(v));
      const pl = await step(model, "content_strategist",
        planPrompt({ intel: p.value, opportunityTitles: o.value.opportunities.slice(0, 5).map((x) => x.title), owner: OWNER }),
        MAX_TOKENS.plan, (v) => planSchema.parse(v));
      const firstBatch = pl.value.days.slice().sort((a, b) => a.day - b.day).slice(0, 5);
      const w = await step(model, "content_writer", writerPrompt({ intel: p.value, posts: firstBatch, owner: OWNER }), MAX_TOKENS.writer,
        (v) => contentSchema.parse(v));

      const steps = [p.meta, o.meta, pl.meta, w.meta];
      const oppText = o.value.opportunities.map((x) => `${x.title}. ${x.why} ${x.action}`).join("\n");
      const draftText = w.value.items.map((x) => `${x.title}\n${x.body}\n${x.cta}`).join("\n");
      const planText = pl.value.days.map((d) => d.topic).join("\n");
      const checks = {
        regulated: p.value.regulated,
        unsupported_figures_in_opportunities: unsupportedFigures(oppText, evidence),
        unsupported_figures_in_drafts: unsupportedFigures(draftText, evidence),
        stale_years: staleYears(`${oppText}\n${planText}\n${draftText}`, currentYear),
        drafts_with_compliance_note: w.value.items.filter((x) => x.compliance_note.trim()).length,
        plan_days: pl.value.days.length,
        drafts: w.value.items.length,
      };
      const totals = {
        seconds: Math.round(steps.reduce((s, x) => s + x.ms, 0) / 1000),
        cost_usd: Number(steps.reduce((s, x) => s + x.costUsd, 0).toFixed(4)),
        retries: steps.reduce((s, x) => s + x.attempts - 1, 0),
      };
      writeFileSync(join(outDir, `${host}__${model.replace(/\//g, "_")}.json`),
        JSON.stringify({ site, model, owner: OWNER, totals, checks, steps, profile: p.value, opportunities: o.value, plan: pl.value, drafts: w.value }, null, 2));
      const line = `${label}: ${totals.seconds}s, $${totals.cost_usd}, retries ${totals.retries}, ` +
        `unsupported figures opp/drafts ${checks.unsupported_figures_in_opportunities.length}/${checks.unsupported_figures_in_drafts.length}, ` +
        `stale years ${checks.stale_years.length}, regulated ${checks.regulated.is_regulated ? checks.regulated.area : "no"}, ` +
        `compliance notes ${checks.drafts_with_compliance_note}/${checks.drafts}`;
      console.log(line);
      summary.push(line);
    } catch (e) {
      const line = `${label}: FAILED — ${e instanceof Error ? e.message.slice(0, 200) : e}`;
      console.log(line);
      summary.push(line);
    }
  }
}

writeFileSync(join(outDir, "SUMMARY.txt"), summary.join("\n") + "\n");
console.log(`\nResults in web/${outDir}`);

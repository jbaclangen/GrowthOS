import { isModuleId, type ModuleId } from "./registry";

// The growth score over feature modules (D-051): a renormalized weighted mean of the parts of every enabled module
// that has evidence. Pure logic (no I/O), unit-tested in score.test.ts.
//
// A module's weight in the score is the sum of its parts' weights (registry scoreWeight), and its sub-score is the
// weighted mean of its parts. The total is summed over the parts in the order the pre-module blend summed them, so
// for an organization whose only scored evidence is the Basic modules' it is bit-for-bit the score
// computeGrowthScore produced before modules existed: content clarity 0.25, conversion readiness 0.25 and online
// presence 0.15 (Braventa's assessment, the conversion and messaging module), then PageSpeed mobile performance
// 0.15, SEO 0.12, accessibility 0.04 and best practices 0.04 (website and technical SEO). When PageSpeed is missing
// its module has no evidence and the remaining weights are renormalized, as before. Search visibility (Google Search
// Console, Pro; FEATURE_MODULES.md §9) adds its parts after those, so without its evidence the sum is unchanged.
// score.test.ts proves the equivalence against the old formula.

// Bump when a part, a weight or the module a part belongs to changes, so a report scored under one version isn't
// compared with one scored under another (an upgrade isn't an improvement). 1 = the Basic blend above, unchanged
// since 2026-10-10 (reports from before modules carry no version and are version 1); 2 = Search visibility's parts
// join the sum when the organization has Search Console evidence (2026-10-23, D-051 step 6).
export const SCORE_VERSION = 2;

export type AssessedScores = { content_clarity: number; conversion_readiness: number; online_presence: number };
export type PageSpeedScores = { performance: number; seo: number; accessibility: number; bestPractices: number };

export type ScorePart = { key: string; value: number; weight: number };
export type ModuleEvidence = { moduleId: ModuleId; parts: ScorePart[] };

// Braventa's assessed scores from the diagnosis: the conversion and messaging module's evidence.
export function conversionEvidence(ai: AssessedScores): ModuleEvidence {
  return {
    moduleId: "conversion",
    parts: [
      { key: "content_clarity", value: ai.content_clarity, weight: 0.25 },
      { key: "conversion_readiness", value: ai.conversion_readiness, weight: 0.25 },
      { key: "online_presence", value: ai.online_presence, weight: 0.15 },
    ],
  };
}

// PageSpeed mobile scores: the website and technical SEO module's scored evidence. No parts when PageSpeed didn't
// respond (the module ran, but has nothing to score).
export function websiteSeoEvidence(psi: PageSpeedScores | null): ModuleEvidence {
  return {
    moduleId: "website_seo",
    parts: psi
      ? [
          { key: "performance", value: psi.performance, weight: 0.15 },
          { key: "seo", value: psi.seo, weight: 0.12 },
          { key: "accessibility", value: psi.accessibility, weight: 0.04 },
          { key: "best_practices", value: psi.bestPractices, weight: 0.04 },
        ]
      : [],
  };
}

// What the search visibility module scores: the measures of summarizeSnapshot (lib/integrations/search-console.ts),
// the last 28 days of final Search Console data for the connected property against the 28 days before. The prompt
// summary satisfies this type; the score needs only these fields.
export type SearchVisibilityMeasures = {
  totals: { ctr_percent: number; average_position: number; clicks_change_percent: number | null };
  // Fewer than 10 impressions in the window: a new site or a property connected recently, not a poor one.
  little_data: boolean;
  // Pages Google served at least once in the window (the page rows it returned, up to 25).
  pages_with_impressions: number;
  home_page_index: { verdict: string | null } | null;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const pct = (fraction: number) => Math.round(100 * clamp01(fraction));

// Google Search Console: the search visibility module's scored evidence (D-051 step 6; the parts and weights are
// FEATURE_MODULES.md §9, provisional). No parts without a summary or with too little data (the module is enabled
// but has nothing to score, and the other modules' weights renormalize). Absolute clicks and impressions aren't
// scored, since a service business has no size-free baseline for them; the model reads them in the prompt.
export function searchVisibilityEvidence(gsc: SearchVisibilityMeasures | null, crawledPages: number): ModuleEvidence {
  const parts: ScorePart[] = [];
  if (gsc && !gsc.little_data) {
    const { average_position: position, ctr_percent: ctr, clicks_change_percent: change } = gsc.totals;
    // Average position: 3 or better = 100, 30 or worse = 0.
    if (position > 0) parts.push({ key: "position", value: pct((30 - position) / 27), weight: 0.04 });
    // Click-through rate: 5% or more = 100.
    parts.push({ key: "ctr", value: pct(ctr / 5), weight: 0.02 });
    // Clicks against the previous 28 days: unchanged = 50, none = 0, doubled or more = 100. No part without a
    // previous window to compare with.
    if (change !== null) parts.push({ key: "trend", value: pct((100 + change) / 200), weight: 0.02 });
    // The share of the crawled pages that Google served in search, capped at 100 (both counts stop at 25).
    if (crawledPages > 0) parts.push({ key: "pages_served", value: pct(gsc.pages_with_impressions / crawledPages), weight: 0.01 });
    // Google's index verdict for the home page, when URL Inspection answered.
    const verdict = gsc.home_page_index?.verdict;
    if (verdict) parts.push({ key: "home_indexed", value: verdict === "PASS" ? 100 : 0, weight: 0.01 });
  }
  return { moduleId: "search_visibility", parts };
}

// Today's evidence as modules, in the order the parts are summed (see the note above about equivalence). Search
// Console is optional: null (or omitted) for an organization without it, which leaves the sum as it was.
export function scoreEvidence(input: {
  psi: PageSpeedScores | null;
  ai: AssessedScores;
  searchConsole?: SearchVisibilityMeasures | null;
  crawledPages?: number;
}): ModuleEvidence[] {
  return [
    conversionEvidence(input.ai),
    websiteSeoEvidence(input.psi),
    searchVisibilityEvidence(input.searchConsole ?? null, input.crawledPages ?? 0),
  ];
}

// Weighted mean of the parts, rounded; null without parts. The reduce order and operations are those of the
// pre-module computeGrowthScore, on purpose.
function weightedMean(parts: ScorePart[]): number | null {
  if (parts.length === 0) return null;
  const weight = parts.reduce((s, p) => s + p.weight, 0);
  return Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / weight);
}

// A module's own 0–100 score, for module_runs.sub_score and the report; null when it has nothing scored.
export function subScore(parts: ScorePart[]): number | null {
  return weightedMean(parts);
}

export type GrowthScore = {
  score: number;
  version: number;
  // The modules whose evidence the score used, in evidence order: what "based on N modules" counts.
  modules: ModuleId[];
  moduleScores: Partial<Record<ModuleId, number>>;
};

// The growth score from the enabled modules that have evidence; null when none has any (the caller fails the
// analysis: there is nothing to score).
export function computeGrowthScore(evidence: ModuleEvidence[], enabled: ReadonlySet<ModuleId>): GrowthScore | null {
  const used = evidence.filter((m) => enabled.has(m.moduleId) && m.parts.length > 0);
  const score = weightedMean(used.flatMap((m) => m.parts));
  if (score === null) return null;
  const moduleScores: Partial<Record<ModuleId, number>> = {};
  for (const m of used) moduleScores[m.moduleId] = subScore(m.parts)!;
  return { score, version: SCORE_VERSION, modules: used.map((m) => m.moduleId), moduleScores };
}

// The modules a stored report's score is based on. Reports from before modules have no list; their score used the
// assessed scores and, when PageSpeed responded, its scores, so the list is derived from what they stored.
export function modulesUsed(stored: { score_modules?: unknown; pagespeed?: unknown }): ModuleId[] {
  if (Array.isArray(stored.score_modules)) return stored.score_modules.filter(isModuleId);
  return stored.pagespeed ? ["conversion", "website_seo"] : ["conversion"];
}

import { isModuleId, type ModuleId } from "./registry";

// The growth score over feature modules (D-051): a renormalized weighted mean of the parts of every enabled module
// that has evidence. Pure logic (no I/O), unit-tested in score.test.ts.
//
// A module's weight in the score is the sum of its parts' weights (registry scoreWeight), and its sub-score is the
// weighted mean of its parts. The total is summed over the parts in the order the pre-module blend summed them, so
// with today's modules enabled it is bit-for-bit the score computeGrowthScore produced before modules existed:
// content clarity 0.25, conversion readiness 0.25 and online presence 0.15 (Braventa's assessment, the conversion
// and messaging module), then PageSpeed mobile performance 0.15, SEO 0.12, accessibility 0.04 and best practices
// 0.04 (website and technical SEO). When PageSpeed is missing its module has no evidence and the remaining
// weights are renormalized, as before. score.test.ts proves the equivalence against the old formula.

// Bump when a part, a weight or the module a part belongs to changes, so a report scored under one version isn't
// compared with one scored under another (an upgrade isn't an improvement). 1 = the blend above, unchanged since
// 2026-10-10; reports from before modules carry no version and are version 1.
export const SCORE_VERSION = 1;

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

// Today's evidence as modules, in the order the parts are summed (see the note above about equivalence).
export function scoreEvidence(input: { psi: PageSpeedScores | null; ai: AssessedScores }): ModuleEvidence[] {
  return [conversionEvidence(input.ai), websiteSeoEvidence(input.psi)];
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

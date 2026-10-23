import { describe, expect, it } from "vitest";
import { MODULES, enabledModuleIds, type ModuleId } from "./registry";
import {
  SCORE_VERSION,
  computeGrowthScore,
  conversionEvidence,
  modulesUsed,
  scoreEvidence,
  searchVisibilityEvidence,
  subScore,
  websiteSeoEvidence,
  type AssessedScores,
  type PageSpeedScores,
  type SearchVisibilityMeasures,
} from "./score";

// The growth score before modules (web/src/lib/pipeline/website-intel.ts computeGrowthScore until D-051 step 3),
// copied verbatim. The module-based score must give the same number for every input when the organization has no
// Search Console evidence, whatever its tier: existing reports keep their scores, and a re-run scores as before
// (score version 2 changes the score only for an organization with Search Console evidence, FEATURE_MODULES.md §9).
function legacyGrowthScore(psi: PageSpeedScores | null, ai: AssessedScores) {
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

const TODAY = enabledModuleIds("basic");
// Pro (and the trial) has Search visibility enabled; without a Search Console summary it contributes nothing.
const PRO = enabledModuleIds("pro");
const score = (psi: PageSpeedScores | null, ai: AssessedScores) => computeGrowthScore(scoreEvidence({ psi, ai }), TODAY);
const scorePro = (psi: PageSpeedScores | null, ai: AssessedScores) => computeGrowthScore(scoreEvidence({ psi, ai, searchConsole: null }), PRO);

// A full Search Console summary, as summarizeSnapshot shapes it: average position 14.3, 2.5% click-through rate,
// clicks up 20% on the previous 28 days, 4 pages served, home page indexed. Parts: position 58, ctr 50, trend 60,
// pages_served 40 (of 10 crawled), home_indexed 100 → sub-score (2.32 + 1 + 1.2 + 0.4 + 1) / 0.1 = 59.2 → 59.
const GSC: SearchVisibilityMeasures = {
  totals: { ctr_percent: 2.5, average_position: 14.3, clicks_change_percent: 20 },
  little_data: false,
  pages_with_impressions: 4,
  home_page_index: { verdict: "PASS" },
};
// A window with fewer than 10 impressions: a new site or a property connected days ago.
const EMPTY_WINDOW: SearchVisibilityMeasures = {
  totals: { ctr_percent: 0, average_position: 0, clicks_change_percent: null },
  little_data: true,
  pages_with_impressions: 0,
  home_page_index: null,
};

// Every growth_plan report stored in the project on 2026-10-23 (reports.data: growth_score, scores, pagespeed),
// numbers only. The stored score is what the owner saw.
const STORED: { growth_score: number; scores: AssessedScores; pagespeed: PageSpeedScores | null }[] = [
  { growth_score: 49, scores: { content_clarity: 48, online_presence: 56, conversion_readiness: 42 }, pagespeed: { seo: 92, performance: 0, accessibility: 81, bestPractices: 96 } },
  { growth_score: 61, scores: { content_clarity: 60, online_presence: 65, conversion_readiness: 55 }, pagespeed: { seo: 92, performance: 40, accessibility: 91, bestPractices: 54 } },
  { growth_score: 64, scores: { content_clarity: 66, online_presence: 55, conversion_readiness: 64 }, pagespeed: { seo: 92, performance: 45, accessibility: 91, bestPractices: 54 } },
  { growth_score: 61, scores: { content_clarity: 64, online_presence: 63, conversion_readiness: 50 }, pagespeed: { seo: 92, performance: 43, accessibility: 91, bestPractices: 54 } },
  { growth_score: 62, scores: { content_clarity: 68, online_presence: 62, conversion_readiness: 52 }, pagespeed: { seo: 85, performance: 39, accessibility: 92, bestPractices: 73 } },
  { growth_score: 45, scores: { content_clarity: 55, online_presence: 30, conversion_readiness: 35 }, pagespeed: { seo: 92, performance: 0, accessibility: 81, bestPractices: 96 } },
  { growth_score: 55, scores: { content_clarity: 58, online_presence: 60, conversion_readiness: 50 }, pagespeed: null },
  { growth_score: 55, scores: { content_clarity: 57, online_presence: 52, conversion_readiness: 54 }, pagespeed: null },
  { growth_score: 50, scores: { content_clarity: 52, online_presence: 56, conversion_readiness: 44 }, pagespeed: null },
  { growth_score: 50, scores: { content_clarity: 48, online_presence: 55, conversion_readiness: 50 }, pagespeed: null },
  { growth_score: 39, scores: { content_clarity: 38, online_presence: 30, conversion_readiness: 28 }, pagespeed: { seo: 92, performance: 0, accessibility: 81, bestPractices: 96 } },
  { growth_score: 56, scores: { content_clarity: 60, online_presence: 58, conversion_readiness: 52 }, pagespeed: null },
  { growth_score: 52, scores: { content_clarity: 55, online_presence: 60, conversion_readiness: 45 }, pagespeed: null },
  { growth_score: 59, scores: { content_clarity: 60, online_presence: 64, conversion_readiness: 55 }, pagespeed: null },
  { growth_score: 52, scores: { content_clarity: 54, online_presence: 56, conversion_readiness: 48 }, pagespeed: null },
  { growth_score: 68, scores: { content_clarity: 58, online_presence: 55, conversion_readiness: 40 }, pagespeed: { seo: 100, performance: 99, accessibility: 100, bestPractices: 100 } },
];

// Deterministic pseudo-random inputs (mulberry32), so a failure is reproducible.
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("computeGrowthScore over modules", () => {
  it("gives every stored report the score the owner already has, on Basic and on Pro without Search Console", () => {
    for (const r of STORED) {
      expect(legacyGrowthScore(r.pagespeed, r.scores)).toBe(r.growth_score);
      expect(score(r.pagespeed, r.scores)?.score).toBe(r.growth_score);
      expect(scorePro(r.pagespeed, r.scores)?.score).toBe(r.growth_score);
    }
  });

  it("equals the pre-module blend on a grid of every combination of boundary values, with and without PageSpeed", () => {
    const values = [0, 33, 50, 67, 100];
    let cases = 0;
    for (const cc of values)
      for (const cr of values)
        for (const op of values) {
          const ai = { content_clarity: cc, conversion_readiness: cr, online_presence: op };
          expect(score(null, ai)?.score).toBe(legacyGrowthScore(null, ai));
          expect(scorePro(null, ai)?.score).toBe(legacyGrowthScore(null, ai));
          for (const perf of values)
            for (const seo of values)
              for (const a11y of values)
                for (const bp of values) {
                  const psi = { performance: perf, seo, accessibility: a11y, bestPractices: bp };
                  expect(score(psi, ai)?.score).toBe(legacyGrowthScore(psi, ai));
                  expect(scorePro(psi, ai)?.score).toBe(legacyGrowthScore(psi, ai));
                  cases++;
                }
        }
    expect(cases).toBe(values.length ** 7);
  });

  it("equals the pre-module blend on 20,000 random inputs", () => {
    const next = prng(20261023);
    const v = () => Math.floor(next() * 101);
    for (let i = 0; i < 20_000; i++) {
      const ai = { content_clarity: v(), conversion_readiness: v(), online_presence: v() };
      const psi = i % 4 === 0 ? null : { performance: v(), seo: v(), accessibility: v(), bestPractices: v() };
      expect(score(psi, ai)?.score).toBe(legacyGrowthScore(psi, ai));
      expect(scorePro(psi, ai)?.score).toBe(legacyGrowthScore(psi, ai));
    }
  });

  it("is unchanged without Search Console evidence: an empty window, no summary, or a Basic organization that has one", () => {
    const ai = { content_clarity: 60, conversion_readiness: 40, online_presence: 50 };
    const psi = { performance: 90, seo: 100, accessibility: 80, bestPractices: 70 };
    const legacy = legacyGrowthScore(psi, ai);
    for (const searchConsole of [null, undefined, EMPTY_WINDOW]) {
      const result = computeGrowthScore(scoreEvidence({ psi, ai, searchConsole, crawledPages: 10 }), PRO)!;
      expect(result.score).toBe(legacy);
      expect(result.modules).toEqual(["conversion", "website_seo"]);
    }
    // Basic doesn't include the module: a summary (a paused connection's data is kept) changes nothing.
    expect(computeGrowthScore(scoreEvidence({ psi, ai, searchConsole: GSC, crawledPages: 10 }), TODAY)).toMatchObject({
      score: legacy,
      modules: ["conversion", "website_seo"],
    });
  });

  it("blends Search Console evidence as a modest third module on Pro, after the Basic parts", () => {
    const ai = { content_clarity: 60, conversion_readiness: 40, online_presence: 50 };
    const psi = { performance: 90, seo: 100, accessibility: 80, bestPractices: 70 };
    const basic = 60 * 0.25 + 40 * 0.25 + 50 * 0.15 + 90 * 0.15 + 100 * 0.12 + 80 * 0.04 + 70 * 0.04;
    const search = 58 * 0.04 + 50 * 0.02 + 60 * 0.02 + 40 * 0.01 + 100 * 0.01;
    const result = computeGrowthScore(scoreEvidence({ psi, ai, searchConsole: GSC, crawledPages: 10 }), PRO)!;
    expect(result).toEqual({
      score: Math.round((basic + search) / 1.1),
      version: 2,
      modules: ["conversion", "website_seo", "search_visibility"],
      moduleScores: { conversion: 50, website_seo: Math.round((90 * 0.15 + 100 * 0.12 + 80 * 0.04 + 70 * 0.04) / 0.35), search_visibility: 59 },
    });
    // Without PageSpeed the two remaining modules renormalize, as before.
    expect(computeGrowthScore(scoreEvidence({ psi: null, ai, searchConsole: GSC, crawledPages: 10 }), PRO)).toMatchObject({
      score: Math.round((60 * 0.25 + 40 * 0.25 + 50 * 0.15 + search) / 0.75),
      modules: ["conversion", "search_visibility"],
    });
  });

  it("uses only the assessed dimensions when PageSpeed is unavailable (the website module has no evidence)", () => {
    // (60*.25 + 40*.25 + 50*.15) / .65
    const ai = { content_clarity: 60, conversion_readiness: 40, online_presence: 50 };
    expect(score(null, ai)).toEqual({ score: 50, version: SCORE_VERSION, modules: ["conversion"], moduleScores: { conversion: 50 } });
  });

  it("blends measured PageSpeed scores with the documented weights and records both modules", () => {
    const ai = { content_clarity: 60, conversion_readiness: 40, online_presence: 50 };
    const psi = { performance: 90, seo: 100, accessibility: 80, bestPractices: 70 };
    const expected = Math.round(60 * 0.25 + 40 * 0.25 + 50 * 0.15 + 90 * 0.15 + 100 * 0.12 + 80 * 0.04 + 70 * 0.04);
    const result = score(psi, ai)!;
    expect(result.score).toBe(expected);
    expect(result.modules).toEqual(["conversion", "website_seo"]);
    expect(result.moduleScores).toEqual({
      conversion: 50,
      website_seo: Math.round((90 * 0.15 + 100 * 0.12 + 80 * 0.04 + 70 * 0.04) / 0.35),
    });
  });

  it("leaves a module out when the organization switched it off, renormalizing the rest", () => {
    const ai = { content_clarity: 60, conversion_readiness: 40, online_presence: 50 };
    const psi = { performance: 90, seo: 100, accessibility: 80, bestPractices: 70 };
    const enabled = enabledModuleIds("basic", [{ module_id: "website_seo", enabled: false }]);
    expect(computeGrowthScore(scoreEvidence({ psi, ai }), enabled)).toMatchObject({ score: 50, modules: ["conversion"] });
    expect(computeGrowthScore(scoreEvidence({ psi, ai }), new Set<ModuleId>())).toBeNull();
  });

  it("gives each scored module the weight the registry declares", () => {
    const full = scoreEvidence({
      psi: { performance: 1, seo: 1, accessibility: 1, bestPractices: 1 },
      ai: { content_clarity: 1, conversion_readiness: 1, online_presence: 1 },
      searchConsole: GSC,
      crawledPages: 10,
    });
    for (const m of MODULES) {
      const evidence = full.find((e) => e.moduleId === m.id);
      if (m.scoreWeight === null) expect(evidence, m.id).toBeUndefined();
      else expect(evidence!.parts.reduce((s, p) => s + p.weight, 0), m.id).toBeCloseTo(m.scoreWeight, 10);
    }
  });
});

describe("subScore", () => {
  it("is the module's own weighted mean, or null without evidence", () => {
    expect(subScore(conversionEvidence({ content_clarity: 60, conversion_readiness: 40, online_presence: 50 }).parts)).toBe(50);
    expect(subScore(websiteSeoEvidence({ performance: 100, seo: 100, accessibility: 0, bestPractices: 0 }).parts)).toBe(77);
    expect(subScore(websiteSeoEvidence(null).parts)).toBeNull();
  });
});

describe("searchVisibilityEvidence (FEATURE_MODULES.md §9)", () => {
  const parts = (gsc: SearchVisibilityMeasures | null, crawled = 10) =>
    Object.fromEntries(searchVisibilityEvidence(gsc, crawled).parts.map((p) => [p.key, p.value]));

  it("scores position, click-through rate, trend, pages served and the home page's index verdict", () => {
    expect(parts(GSC)).toEqual({ position: 58, ctr: 50, trend: 60, pages_served: 40, home_indexed: 100 });
    expect(subScore(searchVisibilityEvidence(GSC, 10).parts)).toBe(59);
    expect(searchVisibilityEvidence(GSC, 10).parts.map((p) => p.weight)).toEqual([0.04, 0.02, 0.02, 0.01, 0.01]);
  });

  it("has nothing to score without a summary or on an empty window", () => {
    expect(searchVisibilityEvidence(null, 10)).toEqual({ moduleId: "search_visibility", parts: [] });
    expect(searchVisibilityEvidence(EMPTY_WINDOW, 10).parts).toEqual([]);
    expect(subScore(searchVisibilityEvidence(EMPTY_WINDOW, 10).parts)).toBeNull();
    // Little data with numbers in it still scores nothing: 9 impressions say nothing about visibility.
    expect(searchVisibilityEvidence({ ...GSC, little_data: true }, 10).parts).toEqual([]);
  });

  it("leaves out a part whose measure is missing, and renormalizes the sub-score over the rest", () => {
    const thin: SearchVisibilityMeasures = {
      totals: { ctr_percent: 2.5, average_position: 14.3, clicks_change_percent: null },
      little_data: false,
      pages_with_impressions: 3,
      home_page_index: null,
    };
    expect(parts(thin, 0)).toEqual({ position: 58, ctr: 50 });
    expect(subScore(searchVisibilityEvidence(thin, 0).parts)).toBe(Math.round((58 * 0.04 + 50 * 0.02) / 0.06));
    expect(parts({ ...thin, home_page_index: { verdict: null } }, 0)).toEqual({ position: 58, ctr: 50 });
    expect(parts({ ...thin, home_page_index: { verdict: "NEUTRAL" } }, 12)).toEqual({ position: 58, ctr: 50, pages_served: 25, home_indexed: 0 });
  });

  it("clamps every part to 0–100 at the documented ends", () => {
    const at = (over: Partial<SearchVisibilityMeasures["totals"]>, extra: Partial<SearchVisibilityMeasures> = {}) =>
      parts({ ...GSC, ...extra, totals: { ...GSC.totals, ...over } });
    expect(at({ average_position: 1 }).position).toBe(100);
    expect(at({ average_position: 3 }).position).toBe(100);
    expect(at({ average_position: 30 }).position).toBe(0);
    expect(at({ average_position: 48.5 }).position).toBe(0);
    expect(at({ ctr_percent: 5 }).ctr).toBe(100);
    expect(at({ ctr_percent: 12.5 }).ctr).toBe(100);
    expect(at({ ctr_percent: 0 }).ctr).toBe(0);
    expect(at({ clicks_change_percent: 0 }).trend).toBe(50);
    expect(at({ clicks_change_percent: -50 }).trend).toBe(25);
    expect(at({ clicks_change_percent: -100 }).trend).toBe(0);
    expect(at({ clicks_change_percent: 100 }).trend).toBe(100);
    expect(at({ clicks_change_percent: 340 }).trend).toBe(100);
    expect(at({}, { pages_with_impressions: 25 }).pages_served).toBe(100);
    expect(at({}, { pages_with_impressions: 0 }).pages_served).toBe(0);
  });
});

describe("modulesUsed", () => {
  it("reads the stored list, dropping ids it doesn't know", () => {
    expect(modulesUsed({ score_modules: ["conversion", "website_seo"], pagespeed: null })).toEqual(["conversion", "website_seo"]);
    expect(modulesUsed({ score_modules: ["conversion", "seo"], pagespeed: {} })).toEqual(["conversion"]);
  });

  it("derives the list for reports from before modules from whether PageSpeed responded", () => {
    expect(modulesUsed({ pagespeed: { performance: 1, seo: 1, accessibility: 1, bestPractices: 1 } })).toEqual(["conversion", "website_seo"]);
    expect(modulesUsed({ pagespeed: null })).toEqual(["conversion"]);
    expect(modulesUsed({})).toEqual(["conversion"]);
  });
});

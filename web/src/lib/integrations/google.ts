import "server-only";
import { env } from "@/lib/env";

export type PageSpeedStrategy = "mobile" | "desktop";

// PageSpeed runs Lighthouse on Google's side, and the time varies from run to run: thebenefitlink.com's mobile run
// took 86 s once and over 120 s another time on 2026-10-17 (desktop: 41 s). The crawl and PageSpeed run in their own
// `crawling` step, one function invocation (300 s on Vercel Hobby, D-042), alongside a crawl capped at 45 s, so 180 s
// still leaves about two minutes for the writes after it. Past this, the report says PageSpeed timed out and the score
// uses Braventa's assessment alone.
const PSI_TIMEOUT_MS = 180_000;
const MAX_OPPORTUNITIES = 5;

// Real-user Core Web Vitals from the Chrome UX Report (CrUX), as PageSpeed Insights returns them in
// `loadingExperience`. Missing when Google doesn't have enough real-user data for the page or site.
export type FieldMetric = { percentile: number; category: string };
export type FieldData = {
  // FAST | AVERAGE | SLOW, Google's overall assessment of the metrics below.
  overall: string | null;
  // true when Google only had data for the whole site (origin), not this page.
  originFallback: boolean;
  lcpMs: FieldMetric | null;
  inpMs: FieldMetric | null;
  // CLS as a decimal (CrUX reports it ×100).
  cls: FieldMetric | null;
};

export type PageSpeedRun = {
  strategy: PageSpeedStrategy;
  scores: { performance: number; seo: number; accessibility: number; bestPractices: number };
  field: FieldData | null;
  // Simulated (Lighthouse lab) measurements on Google's test device.
  lab: { lcpMs: number | null; cls: number | null; tbtMs: number | null; fcpMs: number | null };
  // Top Lighthouse opportunities by estimated savings.
  opportunities: { id: string; title: string; savingsMs: number | null; displayValue: string | null }[];
  // Set when Lighthouse couldn't measure performance (its score then reads 0, as the growth score always did).
  labError: string | null;
  fetchedAt: string;
};

type Audit = {
  title: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
  details?: { type?: string; overallSavingsMs?: number };
  metricSavings?: Record<string, number>;
};

type CruxMetric = { percentile?: number; category?: string };
type LoadingExperience = {
  overall_category?: string;
  origin_fallback?: boolean;
  metrics?: Record<string, CruxMetric>;
};

function fieldData(le: LoadingExperience | undefined): FieldData | null {
  const m = le?.metrics;
  if (!m || !Object.keys(m).length) return null;
  const metric = (key: string, scale = 1): FieldMetric | null => {
    const v = m[key];
    return v && typeof v.percentile === "number" ? { percentile: v.percentile / scale, category: v.category ?? "" } : null;
  };
  return {
    overall: le?.overall_category ?? null,
    originFallback: Boolean(le?.origin_fallback),
    lcpMs: metric("LARGEST_CONTENTFUL_PAINT_MS"),
    inpMs: metric("INTERACTION_TO_NEXT_PAINT"),
    cls: metric("CUMULATIVE_LAYOUT_SHIFT_SCORE", 100),
  };
}

// The Lighthouse audits worth acting on: failing or average audits with an estimated time saving, largest first.
export function topOpportunities(audits: Record<string, Audit>, max = MAX_OPPORTUNITIES): PageSpeedRun["opportunities"] {
  return Object.entries(audits)
    .map(([id, a]) => {
      const savings = a.details?.overallSavingsMs ?? Math.max(a.metricSavings?.LCP ?? 0, a.metricSavings?.FCP ?? 0);
      return { id, title: a.title, savingsMs: savings > 0 ? Math.round(savings) : null, displayValue: a.displayValue ?? null, score: a.score };
    })
    .filter((a) => a.score !== null && a.score < 0.9 && (a.savingsMs ?? 0) >= 100)
    .sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0))
    .slice(0, max)
    .map(({ id, title, savingsMs, displayValue }) => ({ id, title, savingsMs, displayValue }));
}

// Lighthouse scores (0-100) plus the raw audits and CrUX field data. Times out after 180 s.
export async function pageSpeed(url: string, strategy: PageSpeedStrategy = "mobile") {
  const params = new URLSearchParams({ url, strategy, key: env().GOOGLE_API_KEY });
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) params.append("category", c);

  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
    signal: AbortSignal.timeout(PSI_TIMEOUT_MS),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PageSpeed ${res.status}: ${data.error?.message ?? "unknown error"}`);

  const cats = data.lighthouseResult.categories;
  const score = (k: string) => Math.round((cats[k]?.score ?? 0) * 100);
  return {
    scores: {
      performance: score("performance"),
      seo: score("seo"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
    },
    audits: data.lighthouseResult.audits as Record<string, Audit>,
    loadingExperience: data.loadingExperience as LoadingExperience | undefined,
    // Lighthouse reports a page it couldn't measure with a runtime error or a null performance score.
    labError:
      (data.lighthouseResult.runtimeError?.message as string | undefined) ??
      (cats.performance?.score == null ? "Lighthouse couldn't measure performance for this page." : null),
  };
}

async function run(url: string, strategy: PageSpeedStrategy): Promise<PageSpeedRun> {
  const r = await pageSpeed(url, strategy);
  // Milliseconds rounded to whole numbers; CLS (unitless) to three decimals.
  const num = (id: string, decimals = 0) => {
    const v = r.audits[id]?.numericValue;
    return typeof v === "number" ? Number(v.toFixed(decimals)) : null;
  };
  return {
    strategy,
    scores: r.scores,
    field: fieldData(r.loadingExperience),
    lab: {
      lcpMs: num("largest-contentful-paint"),
      cls: num("cumulative-layout-shift", 3),
      tbtMs: num("total-blocking-time"),
      fcpMs: num("first-contentful-paint"),
    },
    opportunities: topOpportunities(r.audits),
    labError: r.labError ? String(r.labError).slice(0, 300) : null,
    fetchedAt: new Date().toISOString(),
  };
}

export type PageSpeedReport = {
  mobile: PageSpeedRun | null;
  desktop: PageSpeedRun | null;
  errors: { mobile: string | null; desktop: string | null };
};

// Mobile and desktop in parallel. Either may fail on its own; the error is kept instead of thrown.
export async function pageSpeedReport(url: string): Promise<PageSpeedReport> {
  const [mobile, desktop] = await Promise.allSettled([run(url, "mobile"), run(url, "desktop")]);
  const message = (r: PromiseSettledResult<unknown>) =>
    r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)).slice(0, 300) : null;
  return {
    mobile: mobile.status === "fulfilled" ? mobile.value : null,
    desktop: desktop.status === "fulfilled" ? desktop.value : null,
    errors: { mobile: message(mobile), desktop: message(desktop) },
  };
}

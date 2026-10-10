import "server-only";
import { env } from "@/lib/env";

export type PageSpeedStrategy = "mobile" | "desktop";

// Lighthouse scores (0-100) plus the raw audits, for the Website Audit feature.
export async function pageSpeed(url: string, strategy: PageSpeedStrategy = "mobile") {
  const params = new URLSearchParams({ url, strategy, key: env().GOOGLE_API_KEY });
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) params.append("category", c);

  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`);
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
    audits: data.lighthouseResult.audits as Record<string, { title: string; score: number | null; displayValue?: string }>,
  };
}

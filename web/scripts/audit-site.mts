// Website audit dry run (dev tool): crawls a site with the production crawler (robots.txt respected), runs
// PageSpeed mobile + desktop and the deterministic checks, and prints coverage, timing and findings.
// No AI calls and no database writes. Uses GOOGLE_API_KEY from .env.local for PageSpeed.
//
//   npm run audit:site -- example.com another.com
//   AUDIT_JSON=1 npm run audit:site -- example.com     (full findings as JSON)

import { crawlSite } from "@/lib/integrations/crawler";
import { pageSpeedReport, type PageSpeedRun } from "@/lib/integrations/google";
import { PRIORITY_LABEL_TEXT, coverageLine, runChecks, summarizeCoverage } from "@/lib/audit/checks";

const sites = process.argv.slice(2);
if (!sites.length) {
  console.error("Usage: npm run audit:site -- <url> [url...]");
  process.exit(1);
}

function psiLine(run: PageSpeedRun | null, error: string | null) {
  if (!run) return `unavailable (${error ?? "unknown error"})`;
  const s = run.scores;
  const field = run.field
    ? `field ${run.field.overall ?? "?"}${run.field.originFallback ? " (whole site)" : ""}: LCP ${run.field.lcpMs?.percentile ?? "–"} ms, INP ${run.field.inpMs?.percentile ?? "–"} ms, CLS ${run.field.cls?.percentile ?? "–"}`
    : "no field data";
  return `${run.labError ? `[lab error: ${run.labError}] ` : ""}perf ${s.performance}, SEO ${s.seo}, a11y ${s.accessibility}, best practices ${s.bestPractices}; lab LCP ${run.lab.lcpMs ?? "–"} ms; ${field}`;
}

for (const site of sites) {
  console.log(`\n=== ${site}`);
  const started = Date.now();
  const [crawl, psi] = await Promise.all([
    crawlSite(site).catch((e: Error) => ({ error: e })),
    (async () => {
      const t = Date.now();
      const r = await pageSpeedReport(site.startsWith("http") ? site : `https://${site}`);
      return { ...r, ms: Date.now() - t };
    })(),
  ]);
  if ("error" in crawl) {
    console.log(`Crawl failed: ${crawl.error.message}`);
    continue;
  }
  const { audit } = crawl;
  const summary = summarizeCoverage(audit);
  console.log(`Final URL: ${audit.finalUrl}`);
  console.log(`robots.txt: ${audit.robots.status} (${audit.robots.httpStatus ?? "no answer"}), rules for ${audit.robots.appliesTo ?? "nobody"}; sitemaps listed: ${audit.robots.sitemaps.length}`);
  console.log(`Sitemap: ${audit.sitemap.found ? `${audit.sitemap.urls.length} URLs${audit.sitemap.capped ? " (capped)" : ""}` : "not found"} from ${audit.sitemap.files.map((f) => `${f.url} [${f.status ?? f.error}]`).join(", ") || "none"}`);
  console.log(`Coverage: ${coverageLine(summary)}${audit.homeBlocked ? " — HOME PAGE BLOCKED BY ROBOTS.TXT" : ""}`);
  console.log(`Crawl time: ${(audit.durationMs / 1000).toFixed(1)} s; PageSpeed (parallel): ${(psi.ms / 1000).toFixed(1)} s; total ${((Date.now() - started) / 1000).toFixed(1)} s`);
  console.log(`Link checks: ${audit.linkChecks.map((l) => `${l.url} ${l.status ?? l.error}`).join("; ") || "none"}`);
  console.log(`Variants: ${audit.variants.map((v) => `${v.url} → ${v.finalUrl ?? v.error} ${v.status ?? ""}`).join("; ")}`);
  // Page-limit exclusions are summarized in the coverage line; list the rest.
  for (const e of audit.entries.filter((x) => x.state !== "scanned" && x.reason !== "page limit")) {
    console.log(`  ${e.state}: ${e.url} ${e.status ?? ""} ${e.reason ?? ""}`);
  }
  console.log(`PageSpeed mobile: ${psiLine(psi.mobile, psi.errors.mobile)}`);
  console.log(`PageSpeed desktop: ${psiLine(psi.desktop, psi.errors.desktop)}`);
  if (psi.mobile?.opportunities.length) {
    console.log(`Top opportunities (mobile): ${psi.mobile.opportunities.map((o) => `${o.title} (${o.savingsMs} ms)`).join("; ")}`);
  }

  const findings = runChecks({ audit, psi });
  console.log(`\nFindings (${findings.length}):`);
  for (const f of findings) {
    console.log(`  ${f.ref.padEnd(4)} ${PRIORITY_LABEL_TEXT[f.priority_label].padEnd(13)} ${f.severity}/${f.confidence} ${f.rule_id}: ${f.summary}`);
  }
  if (process.env.AUDIT_JSON) console.log(JSON.stringify(findings, null, 2));
}

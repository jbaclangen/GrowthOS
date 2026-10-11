import { describe, expect, it } from "vitest";
import type { PageAudit, SiteAudit } from "@/lib/integrations/crawler";
import type { PageSpeedReport, PageSpeedRun } from "@/lib/integrations/google";
import {
  coverageLine,
  pageImportance,
  priorityLabel,
  promptFindings,
  richResultsTestUrl,
  runChecks,
  summarizeCoverage,
  type AuditFinding,
} from "./checks";

const HOME = "https://a.test/";

function page(path: string, over: Partial<PageAudit> = {}): PageAudit {
  const url = new URL(path, HOME).toString();
  return {
    url,
    requestedUrl: url,
    source: path === "/" ? "home" : "link",
    status: 200,
    redirects: [],
    xRobotsTag: "",
    title: `Title for ${path}`,
    description: `Description for ${path}`,
    canonicals: [url],
    metaRobots: "",
    h1Count: 1,
    h2Count: 2,
    wordCount: 400,
    images: { total: 2, missingAlt: 0, emptyAlt: 0 },
    openGraph: { title: true, description: true, image: true },
    jsonLd: { blocks: 1, invalid: 0, errors: [], types: ["LocalBusiness"] },
    microdataTypes: [],
    internalLinks: [],
    scriptCount: 2,
    contentHash: `hash-${path}`,
    hasForm: false,
    hasPhone: true,
    ...over,
  };
}

function site(pages: PageAudit[], over: Partial<SiteAudit> = {}): SiteAudit {
  return {
    startUrl: HOME,
    finalUrl: HOME,
    homeBlocked: false,
    robots: { url: "https://a.test/robots.txt", status: "found", httpStatus: 200, appliesTo: "*", sitemaps: [] },
    sitemap: { files: [{ url: "https://a.test/sitemap.xml", status: 200, kind: "urlset" }], urls: [], found: true, capped: false },
    entries: pages.map((p) => ({ url: p.url, state: "scanned" as const, status: 200, finalUrl: p.url, redirects: p.redirects })),
    pages,
    linkChecks: [],
    variants: [
      { url: "http://a.test/", finalUrl: HOME, status: 200 },
      { url: "https://www.a.test/", finalUrl: HOME, status: 200 },
    ],
    durationMs: 1000,
    limits: { maxPages: 25, timeBudgetMs: 45000, maxLinkChecks: 10 },
    ...over,
  };
}

const rules = (findings: AuditFinding[]) => findings.map((f) => f.rule_id);
const find = (findings: AuditFinding[], rule: string) => findings.filter((f) => f.rule_id === rule);

describe("priority labels", () => {
  it("weighs severity, confidence and page importance", () => {
    expect(priorityLabel("high", "high", "other")).toBe("fix_first");
    expect(priorityLabel("high", "medium", "home")).toBe("fix_first");
    expect(priorityLabel("high", "medium", "other")).toBe("improve_next");
    expect(priorityLabel("high", "low", "home")).toBe("improve_next");
    expect(priorityLabel("medium", "high", "home")).toBe("improve_next");
    expect(priorityLabel("medium", "low", "other")).toBe("monitor");
    expect(priorityLabel("low", "high", "home")).toBe("monitor");
  });

  it("treats home, key business pages and site-wide findings as more important", () => {
    expect(pageImportance("https://a.test/", HOME)).toBe("home");
    expect(pageImportance("https://a.test/about-us/", HOME)).toBe("key");
    expect(pageImportance("https://a.test/services/roofing", HOME)).toBe("key");
    expect(pageImportance("https://a.test/electrical-services/", HOME)).toBe("key");
    expect(pageImportance("https://a.test/blog/what-to-know-about-roofs", HOME)).toBe("other");
    expect(pageImportance(null, HOME)).toBe("site");
  });
});

describe("runChecks", () => {
  it("returns nothing for a clean site and orders refs by priority", () => {
    expect(runChecks({ audit: site([page("/"), page("/services/")]), psi: null })).toEqual([]);
    const out = runChecks({ audit: site([page("/", { title: "" }), page("/blog/x", { h1Count: 3 })]), psi: null });
    expect(out.map((f) => f.ref)).toEqual(["T1", "T2"]);
    expect(out[0].rule_id).toBe("title_missing");
    expect(out[0].priority_label).toBe("fix_first");
    expect(out[1].priority_label).toBe("monitor");
  });

  it("flags HTTP errors, fetch errors and redirect chains", () => {
    const audit = site([page("/")]);
    audit.entries.push(
      { url: "https://a.test/services/", state: "failed", status: 404 },
      { url: "https://a.test/blog/old", state: "failed", status: 500 },
      { url: "https://a.test/members", state: "failed", status: 403 },
      { url: "https://a.test/slow", state: "failed", reason: "timeout" },
      { url: "https://a.test/r", state: "scanned", status: 200, finalUrl: "https://a.test/r3", redirects: [{ url: "https://a.test/r", status: 301 }, { url: "https://a.test/r2", status: 302 }] },
    );
    const out = runChecks({ audit, psi: null });
    const http = find(out, "http_error");
    expect(http.map((f) => [f.page_url, f.severity])).toEqual(
      expect.arrayContaining([
        ["https://a.test/services/", "high"],
        ["https://a.test/blog/old", "medium"],
        ["https://a.test/members", "low"],
      ]),
    );
    expect(find(out, "fetch_error")[0]).toMatchObject({ severity: "low", confidence: "low", priority_label: "monitor" });
    expect(find(out, "redirect_chain")[0].observed.chain).toEqual(["https://a.test/r (301)", "https://a.test/r2 (302)", "https://a.test/r3"]);
  });

  it("flags noindex from meta robots and X-Robots-Tag, softer on utility pages", () => {
    const out = runChecks({
      audit: site([page("/"), page("/services/", { metaRobots: "noindex" }), page("/thank-you", { xRobotsTag: "noindex" }), page("/blog/a", { xRobotsTag: "googlebot: none" })]),
      psi: null,
    });
    const noindex = find(out, "noindex");
    expect(noindex.map((f) => [new URL(f.page_url!).pathname, f.severity])).toEqual(
      expect.arrayContaining([["/services/", "high"], ["/thank-you", "low"], ["/blog/a", "medium"]]),
    );
  });

  it("checks canonicals: missing, conflicting and pointing elsewhere", () => {
    const out = runChecks({
      audit: site([
        page("/"),
        page("/services/", { canonicals: [] }),
        page("/about/", { canonicals: ["https://a.test/x", "https://a.test/y"] }),
        page("/contact/", { canonicals: ["https://a.test/"] }),
        page("/pricing/", { canonicals: ["http://www.a.test/pricing"] }),
      ]),
      psi: null,
    });
    expect(find(out, "canonical_missing")[0].page_url).toBe("https://a.test/services/");
    expect(find(out, "canonical_conflict")).toHaveLength(1);
    const elsewhere = find(out, "canonical_elsewhere");
    expect(elsewhere.map((f) => f.confidence).sort()).toEqual(["high", "medium"]);
  });

  it("finds missing and duplicate titles and descriptions; title length is low-severity guidance", () => {
    const out = runChecks({
      audit: site([
        page("/", { description: "" }),
        page("/services/", { title: "Same title" }),
        page("/about/", { title: "Same title", description: "Description for /services/" }),
        page("/contact/", { title: "x".repeat(90) }),
      ]),
      psi: null,
    });
    expect(find(out, "meta_description_missing")[0]).toMatchObject({ page_url: HOME, severity: "medium" });
    expect(find(out, "title_duplicate")[0].observed.pages).toHaveLength(2);
    expect(find(out, "meta_description_duplicate")).toHaveLength(1);
    expect(find(out, "title_length")[0]).toMatchObject({ severity: "low", priority_label: "monitor" });
  });

  it("rolls ordinary pages into one site-wide finding", () => {
    const blog = Array.from({ length: 4 }, (_, i) => page(`/blog/post-${i}`, { description: "" }));
    const out = runChecks({ audit: site([page("/"), ...blog]), psi: null });
    const missing = find(out, "meta_description_missing");
    expect(missing).toHaveLength(1);
    expect(missing[0].page_url).toBeNull();
    expect(missing[0].observed.count).toBe(4);
  });

  it("checks H1s, thin content, possible JavaScript rendering and alt text", () => {
    const out = runChecks({
      audit: site([
        page("/", { h1Count: 0, images: { total: 10, missingAlt: 6, emptyAlt: 2 } }),
        page("/services/", { wordCount: 80 }),
        page("/contact/", { wordCount: 60 }),
        page("/app", { wordCount: 12, scriptCount: 8 }),
        page("/about/", { h1Count: 2 }),
      ]),
      psi: null,
    });
    expect(find(out, "h1_missing")[0]).toMatchObject({ page_url: HOME, severity: "medium" });
    expect(find(out, "h1_multiple")).toHaveLength(1);
    const thin = find(out, "thin_content");
    expect(thin.find((f) => f.page_url?.endsWith("/services/"))?.severity).toBe("medium");
    expect(thin.find((f) => f.page_url?.endsWith("/contact/"))?.severity).toBe("low");
    expect(find(out, "js_rendering_possible")[0]).toMatchObject({ confidence: "low" });
    expect(thin.some((f) => f.page_url?.endsWith("/app"))).toBe(false);
    expect(find(out, "images_missing_alt")[0]).toMatchObject({ severity: "medium", observed: { missing_alt: 6, decorative_empty_alt: 2, images: 10 } });
  });

  it("finds broken internal links from crawl failures and link checks", () => {
    const audit = site([page("/", { internalLinks: ["https://a.test/gone", "https://a.test/old/"] }), page("/blog/a", { internalLinks: ["https://a.test/old"] })]);
    audit.entries.push({ url: "https://a.test/gone", state: "failed", status: 404 });
    audit.linkChecks.push({ url: "https://a.test/old", status: 410 }, { url: "https://a.test/fine", status: 200 });
    const out = runChecks({ audit, psi: null });
    const broken = find(out, "broken_internal_link");
    expect(broken).toHaveLength(2);
    expect(broken.every((f) => f.severity === "high")).toBe(true); // linked from the home page
    expect(broken.find((f) => f.page_url?.includes("old"))?.observed.linked_from).toEqual([HOME, "https://a.test/blog/a"]);
  });

  it("finds duplicate content by hash", () => {
    const out = runChecks({ audit: site([page("/"), page("/a", { contentHash: "same" }), page("/b", { contentHash: "same" })]), psi: null });
    expect(find(out, "duplicate_content")[0].observed.pages).toEqual(["https://a.test/a", "https://a.test/b"]);
  });

  it("labels Open Graph as not a ranking factor", () => {
    const out = runChecks({ audit: site([page("/", { openGraph: { title: false, description: false, image: false } })]), psi: null });
    expect(find(out, "open_graph_missing")[0].summary).toContain("Not a search ranking factor");
  });

  it("checks structured data validity and presence, linking the Rich Results Test", () => {
    const invalid = runChecks({ audit: site([page("/", { jsonLd: { blocks: 2, invalid: 1, errors: ["Unexpected token"], types: [] } })]), psi: null });
    const f = find(invalid, "structured_data_invalid")[0];
    expect(f.observed.rich_results_test).toBe(richResultsTestUrl(HOME));
    expect(f.recommendation).toContain("doesn't guarantee");
    const none = runChecks({ audit: site([page("/", { jsonLd: { blocks: 0, invalid: 0, errors: [], types: [] } })]), psi: null });
    expect(find(none, "structured_data_missing")[0].severity).toBe("low");
    const microdata = runChecks({ audit: site([page("/", { jsonLd: { blocks: 0, invalid: 0, errors: [], types: [] }, microdataTypes: ["LocalBusiness"] })]), psi: null });
    expect(rules(microdata)).not.toContain("structured_data_missing");
  });

  it("checks https, the http variant and the www variant", () => {
    const http = runChecks({ audit: site([page("/")], { finalUrl: "http://a.test/", variants: [] }), psi: null });
    expect(find(http, "https_missing")[0].severity).toBe("high");
    const variants = runChecks({
      audit: site([page("/")], {
        variants: [
          { url: "http://a.test/", finalUrl: "http://a.test/", status: 200 },
          { url: "https://www.a.test/", finalUrl: "https://www.a.test/", status: 200 },
        ],
      }),
      psi: null,
    });
    expect(rules(variants)).toEqual(expect.arrayContaining(["http_not_redirected", "host_variant_not_redirected"]));
  });

  it("reports robots.txt and sitemap presence and blocked pages", () => {
    const audit = site([page("/")], {
      robots: { url: "https://a.test/robots.txt", status: "missing", httpStatus: 404, appliesTo: null, sitemaps: [] },
      sitemap: { files: [{ url: "https://a.test/sitemap.xml", status: 404, kind: null }], urls: [], found: false, capped: false },
    });
    audit.entries.push({ url: "https://a.test/private", state: "excluded", reason: "robots.txt" });
    const out = runChecks({ audit, psi: null });
    expect(rules(out)).toEqual(expect.arrayContaining(["robots_txt_missing", "sitemap_missing", "robots_blocked_pages"]));
    expect(find(out, "robots_blocked_pages")[0].observed.pages).toEqual(["https://a.test/private"]);
  });

  it("flags sitemap URLs that fail or redirect", () => {
    const audit = site([page("/")], {
      sitemap: { files: [], urls: ["https://a.test/a", "https://a.test/b"], found: true, capped: false },
    });
    audit.entries.push(
      { url: "https://a.test/a", state: "failed", status: 404 },
      { url: "https://a.test/b", state: "scanned", status: 200, finalUrl: "https://a.test/b/", redirects: [{ url: "https://a.test/b", status: 301 }] },
    );
    expect(find(runChecks({ audit, psi: null }), "sitemap_url_errors")[0].severity).toBe("medium");
  });

  it("when robots.txt blocks the home page, reports only that (and PageSpeed)", () => {
    const blocked = site([], {
      homeBlocked: true,
      entries: [{ url: HOME, state: "excluded", reason: "robots.txt" }],
      sitemap: { files: [], urls: [], found: false, capped: false },
    });
    const all = runChecks({ audit: blocked, psi: null });
    expect(rules(all)).toEqual(["robots_blocks_home"]);
    expect(all[0].severity).toBe("high"); // the * group blocks search engines too
    expect(all[0].recommendation).toContain("User-agent: Braventa");
    const own = runChecks({ audit: { ...blocked, robots: { ...blocked.robots, appliesTo: "braventa" } }, psi: null });
    expect(own[0]).toMatchObject({ severity: "low", priority_label: "monitor" });
    const down = runChecks({ audit: { ...blocked, robots: { ...blocked.robots, status: "unreachable", httpStatus: 503 } }, psi: null });
    expect(down[0].rule_id).toBe("robots_txt_unreachable");
  });
});

describe("performance checks", () => {
  const run = (over: Partial<PageSpeedRun> = {}): PageSpeedRun => ({
    strategy: "mobile",
    scores: { performance: 40, seo: 90, accessibility: 90, bestPractices: 90 },
    field: null,
    lab: { lcpMs: 5000, cls: 0.1, tbtMs: 300, fcpMs: 2000 },
    opportunities: [{ id: "render-blocking", title: "Render-blocking requests", savingsMs: 1800, displayValue: null }],
    labError: null,
    fetchedAt: "2026-10-11T00:00:00Z",
    ...over,
  });
  const report = (mobile: PageSpeedRun | null, desktop: PageSpeedRun | null = null): PageSpeedReport => ({
    mobile,
    desktop,
    errors: { mobile: mobile ? null : "timeout", desktop: desktop ? null : "timeout" },
  });

  it("separates field data from lab data", () => {
    const field = { overall: "SLOW", originFallback: true, lcpMs: { percentile: 4200, category: "SLOW" }, inpMs: { percentile: 250, category: "AVERAGE" }, cls: { percentile: 0.02, category: "FAST" } };
    const out = runChecks({ audit: site([page("/")]), psi: report(run({ field })) });
    expect(find(out, "cwv_lcp_field")[0]).toMatchObject({ severity: "high", source_type: "core_web_vitals_field_data", priority_label: "fix_first" });
    expect(find(out, "cwv_inp_field")[0].severity).toBe("medium");
    expect(find(out, "cwv_cls_field")).toHaveLength(0);
    expect(find(out, "cwv_lcp_field")[0].observed.scope).toBe("whole site");
    expect(find(out, "lab_performance")[0]).toMatchObject({ source_type: "pagespeed_lab", severity: "medium", confidence: "medium" });
    expect(find(out, "lab_opportunities")[0].severity).toBe("medium");
  });

  it("uses desktop field data when mobile has none, and skips runs Lighthouse couldn't measure", () => {
    const field = { overall: "AVERAGE", originFallback: false, lcpMs: { percentile: 3000, category: "AVERAGE" }, inpMs: null, cls: null };
    const out = runChecks({ audit: site([page("/")]), psi: report(run({ labError: "NO_LCP", opportunities: [] }), run({ strategy: "desktop", field })) });
    expect(find(out, "cwv_lcp_field")[0].observed.strategy).toBe("desktop");
    expect(find(out, "lab_performance")).toHaveLength(0);
  });

  it("adds nothing when PageSpeed failed", () => {
    expect(runChecks({ audit: site([page("/")]), psi: report(null) })).toEqual([]);
  });
});

describe("coverage", () => {
  it("summarizes scanned, excluded (with reasons) and failed URLs", () => {
    const audit = site([page("/"), page("/a")]);
    audit.entries.push(
      { url: "https://a.test/p1", state: "excluded", reason: "robots.txt" },
      { url: "https://a.test/p2", state: "excluded", reason: "robots.txt" },
      { url: "https://a.test/p3", state: "excluded", reason: "page limit" },
      { url: "https://a.test/p4", state: "failed", status: 500 },
    );
    const s = summarizeCoverage(audit);
    expect(s).toMatchObject({ discovered: 6, scanned: 2, excluded: 3, failed: 1 });
    expect(s.robotsExcluded).toEqual(["https://a.test/p1", "https://a.test/p2"]);
    expect(coverageLine(s)).toBe("2 of 6 pages scanned; 2 excluded by robots.txt; 1 not scanned (page limit); 1 failed");
  });
});

describe("promptFindings", () => {
  it("lists refs with label, severity and a capped observed value", () => {
    const out = runChecks({ audit: site([page("/", { title: "" }), page("/blog/x", { h1Count: 3 })]), psi: null });
    const text = promptFindings(out, 1);
    expect(text.split("\n")).toHaveLength(1);
    expect(text).toMatch(/^T1 \[Fix first; high severity; high confidence; crawler_observation\] \/: /);
  });
});

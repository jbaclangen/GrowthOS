import type { CoverageEntry, PageAudit, SiteAudit } from "@/lib/integrations/crawler";
import type { PageSpeedReport, PageSpeedRun } from "@/lib/integrations/google";

// Deterministic website checks (Website Intelligence Phase 1). Pure functions, no AI and no I/O: they read what the
// crawler and PageSpeed measured and turn it into findings with a stable rule_id, a severity, a confidence and a
// priority label. Every finding keeps the observed value and where it came from, so the report (and the AI step)
// can point at a measurement instead of an opinion.
//
// Limits stated in the report: a public crawl isn't Google's index (a 200 response doesn't mean "indexed"), the
// Lighthouse SEO score isn't a ranking score, and valid structured data doesn't guarantee rich results.

// Bump when rules change in a way that makes runs incomparable.
export const AUDIT_VERSION = 1;

export type Category = "indexability" | "technical" | "on_page" | "structured_data" | "performance";
export type Severity = "high" | "medium" | "low";
export type Confidence = "high" | "medium" | "low";
export type SourceType = "crawler_observation" | "pagespeed_lab" | "core_web_vitals_field_data";
export type PriorityLabel = "fix_first" | "improve_next" | "monitor";

export const PRIORITY_LABEL_TEXT: Record<PriorityLabel, string> = {
  fix_first: "Fix first",
  improve_next: "Improve next",
  monitor: "Monitor",
};
export const SOURCE_LABEL: Record<SourceType, string> = {
  crawler_observation: "Braventa's crawler",
  pagespeed_lab: "PageSpeed lab test",
  core_web_vitals_field_data: "Real-user data (Chrome UX Report)",
};

export type AuditFinding = {
  // Short id for this run ("T1", "T2", …) in priority order; the AI cites these.
  ref: string;
  rule_id: string;
  category: Category;
  severity: Severity;
  confidence: Confidence;
  priority_label: PriorityLabel;
  page_url: string | null; // null = site-wide
  summary: string;
  observed: Record<string, unknown>;
  recommendation: string;
  source_type: SourceType;
  observed_at: string;
};

type Draft = Omit<AuditFinding, "ref" | "priority_label" | "observed_at"> & { importance?: Importance };

// ---------------------------------------------------------------------------------------------------------------
// Priority labels
//
// score = severity weight × confidence weight × page weight
//   severity:   high 3, medium 2, low 1
//   confidence: high 1, medium 0.75, low 0.5
//   page:       home page 1.5; key business pages (services, contact, about, pricing, booking…) 1.25;
//               site-wide findings 1.25; other pages 1.0
// Fix first:    severity high and score ≥ 3 (a high-severity issue with high confidence anywhere, or medium
//               confidence on the home page or a key page)
// Improve next: score ≥ 1.5 and severity isn't low (e.g. a medium issue on the home page)
// Monitor:      everything else (low-severity guidance, low-confidence observations)
// It is a decision aid with no claim to precision; the owner's own priorities still come first in the plan.
// ---------------------------------------------------------------------------------------------------------------

export type Importance = "home" | "key" | "site" | "other";
const SEVERITY_WEIGHT: Record<Severity, number> = { high: 3, medium: 2, low: 1 };
const CONFIDENCE_WEIGHT: Record<Confidence, number> = { high: 1, medium: 0.75, low: 0.5 };
const PAGE_WEIGHT: Record<Importance, number> = { home: 1.5, key: 1.25, site: 1.25, other: 1 };
// Key business pages: a path segment that starts with one of these words ("/about-us", "/services/roofing",
// "/contact") or ends in "-services" ("/electrical-services"). Blog slugs that merely contain "about" don't count.
const KEY_SEGMENT =
  /^(about|services?|contact|pricing|prices|book|booking|quote|appointments?|estimates?|products?|solutions|what-we-do|locations?|areas?-we-serve|service-areas?)(-|$)|-services?$/i;
const isKeyPath = (pathname: string) => pathname.split("/").filter(Boolean).some((s) => KEY_SEGMENT.test(s));
const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const LABEL_ORDER: Record<PriorityLabel, number> = { fix_first: 0, improve_next: 1, monitor: 2 };

const trimSlash = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

export function pageImportance(pageUrl: string | null, homeUrl: string): Importance {
  if (!pageUrl) return "site";
  try {
    const u = new URL(pageUrl);
    const home = new URL(homeUrl);
    if (trimSlash(u.pathname) === trimSlash(home.pathname) || u.pathname === "/") return "home";
    return isKeyPath(u.pathname) ? "key" : "other";
  } catch {
    return "other";
  }
}

export function priorityScore(severity: Severity, confidence: Confidence, importance: Importance) {
  return SEVERITY_WEIGHT[severity] * CONFIDENCE_WEIGHT[confidence] * PAGE_WEIGHT[importance];
}

export function priorityLabel(severity: Severity, confidence: Confidence, importance: Importance): PriorityLabel {
  const score = priorityScore(severity, confidence, importance);
  if (severity === "high" && score >= 3) return "fix_first";
  if (score >= 1.5 && severity !== "low") return "improve_next";
  return "monitor";
}

export function richResultsTestUrl(url: string) {
  return `https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------------------------------------------

export type CoverageSummary = {
  discovered: number;
  scanned: number;
  excluded: number;
  failed: number;
  robotsExcluded: string[];
  excludedByReason: Record<string, number>;
  homeBlocked: boolean;
};

export function summarizeCoverage(audit: Pick<SiteAudit, "entries" | "homeBlocked">): CoverageSummary {
  const by = (s: CoverageEntry["state"]) => audit.entries.filter((e) => e.state === s);
  const excluded = by("excluded");
  const excludedByReason: Record<string, number> = {};
  for (const e of excluded) excludedByReason[e.reason ?? "other"] = (excludedByReason[e.reason ?? "other"] ?? 0) + 1;
  return {
    discovered: audit.entries.length,
    scanned: by("scanned").length,
    excluded: excluded.length,
    failed: by("failed").length,
    robotsExcluded: excluded.filter((e) => e.reason === "robots.txt").map((e) => e.url),
    excludedByReason,
    homeBlocked: audit.homeBlocked,
  };
}

const REASON_TEXT: Record<string, string> = {
  "robots.txt": "excluded by robots.txt",
  "page limit": "not scanned (page limit)",
  "time limit": "not scanned (time limit)",
  "not an HTML page": "not web pages",
  "redirects to another site": "redirect to another site",
  "redirects to a page already scanned": "redirect to pages already scanned",
};

// "12 of 31 pages scanned; 3 excluded by robots.txt; 1 failed"
export function coverageLine(c: CoverageSummary) {
  const parts = [`${c.scanned} of ${c.discovered} ${c.discovered === 1 ? "page" : "pages"} scanned`];
  for (const [reason, n] of Object.entries(c.excludedByReason).sort((a, b) => b[1] - a[1])) {
    parts.push(`${n} ${REASON_TEXT[reason] ?? `excluded (${reason})`}`);
  }
  if (c.failed) parts.push(`${c.failed} failed`);
  return parts.join("; ");
}

// ---------------------------------------------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------------------------------------------

const MAX_LISTED = 10;
const THIN_WORDS = 150;
// Pages that are often deliberately kept out of search or short by design.
const UTILITY_PAGE = /thank|privacy|terms|cookie|legal|login|log-in|sign-?in|account|cart|checkout|admin|search|404/i;
const CONTACT_PAGE = /contact/i;

const pathOf = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return url;
  }
};
const listed = (urls: string[]) => urls.slice(0, MAX_LISTED);
const isBroken = (status: number | null | undefined) => status === 404 || status === 410 || (status ?? 0) >= 500;
const comparable = (url: string) => {
  try {
    const u = new URL(url);
    u.hash = "";
    return `${u.protocol}//${u.hostname.toLowerCase()}${trimSlash(u.pathname)}${u.search}`;
  } catch {
    return url;
  }
};
const keyOf = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase().replace(/^www\./, "")}${trimSlash(u.pathname)}`;
  } catch {
    return url;
  }
};

type Ctx = { audit: SiteAudit; homeUrl: string; drafts: Draft[] };

// Per-page rules: report the home page and key pages one by one, and roll other pages into one site-wide finding,
// so twenty blog posts without a meta description become one line, not twenty.
function perPage(
  ctx: Ctx,
  pages: PageAudit[],
  make: (p: PageAudit, importance: Importance) => Omit<Draft, "page_url"> | null,
  aggregate: (pages: { page: PageAudit; draft: Omit<Draft, "page_url"> }[]) => Omit<Draft, "page_url">,
) {
  const rest: { page: PageAudit; draft: Omit<Draft, "page_url"> }[] = [];
  for (const p of pages) {
    const importance = pageImportance(p.url, ctx.homeUrl);
    const draft = make(p, importance);
    if (!draft) continue;
    if (importance === "home" || importance === "key") ctx.drafts.push({ ...draft, page_url: p.url, importance });
    else rest.push({ page: p, draft });
  }
  if (rest.length === 1) ctx.drafts.push({ ...rest[0].draft, page_url: rest[0].page.url, importance: "other" });
  else if (rest.length > 1) ctx.drafts.push({ ...aggregate(rest), page_url: null, importance: "site" });
}

function robotsRules(ctx: Ctx) {
  const { audit } = ctx;
  const { robots } = audit;
  const crawler = "crawler_observation" as const;
  if (audit.homeBlocked) {
    const unreachable = robots.status === "unreachable";
    const ownGroup = robots.appliesTo === "braventa";
    ctx.drafts.push({
      rule_id: unreachable ? "robots_txt_unreachable" : "robots_blocks_home",
      category: "indexability",
      severity: unreachable ? "medium" : ownGroup ? "low" : "high",
      confidence: unreachable ? "medium" : "high",
      page_url: null,
      summary: unreachable
        ? "robots.txt couldn't be read (no answer or a server error), so Braventa didn't read the site. Crawlers that follow the robots.txt standard, including search engines, may treat the whole site as blocked while this lasts."
        : ownGroup
          ? "The site's robots.txt doesn't allow Braventa to read it, so this analysis uses PageSpeed and your answers only."
          : "The site's robots.txt blocks the home page for all crawlers that follow it, which can include search engines. Braventa respected it and didn't read the site.",
      observed: { robots_url: robots.url, robots_status: robots.status, http_status: robots.httpStatus, applies_to: robots.appliesTo },
      recommendation: unreachable
        ? "Ask your web host why /robots.txt doesn't load. It should return the file, or a 404 if you don't have one."
        : "If you want Braventa to analyze your pages, add this group to robots.txt: \"User-agent: Braventa\" then \"Allow: /\". Check that search engines aren't blocked from pages you want found.",
      source_type: crawler,
    });
    return;
  }
  if (robots.status === "missing") {
    ctx.drafts.push({
      rule_id: "robots_txt_missing",
      category: "indexability",
      severity: "low",
      confidence: "high",
      page_url: null,
      summary: "The site has no robots.txt file.",
      observed: { robots_url: robots.url, http_status: robots.httpStatus },
      recommendation: "Optional: add a robots.txt file with a Sitemap line pointing to your XML sitemap. Without one, crawlers may read every page.",
      source_type: crawler,
    });
  }
  const blocked = audit.entries.filter((e) => e.state === "excluded" && e.reason === "robots.txt");
  if (blocked.length) {
    ctx.drafts.push({
      rule_id: "robots_blocked_pages",
      category: "indexability",
      severity: "low",
      confidence: "high",
      page_url: null,
      summary: `robots.txt blocks ${blocked.length} ${blocked.length === 1 ? "page" : "pages"} Braventa found, so they weren't read.`,
      observed: { count: blocked.length, pages: listed(blocked.map((e) => e.url)), applies_to: robots.appliesTo },
      recommendation: "That's expected for private or admin pages. If any of these should appear in search results, allow them in robots.txt.",
      source_type: crawler,
    });
  }
}

function sitemapRules(ctx: Ctx) {
  const { audit } = ctx;
  if (audit.homeBlocked) return;
  if (!audit.sitemap.found) {
    ctx.drafts.push({
      rule_id: "sitemap_missing",
      category: "indexability",
      severity: "low",
      confidence: "medium",
      page_url: null,
      summary: "No XML sitemap was found (checked robots.txt and /sitemap.xml).",
      observed: { tried: audit.sitemap.files.map((f) => ({ url: f.url, status: f.status, error: f.error })) },
      recommendation: "Create an XML sitemap (most website builders can make one), list it in robots.txt and submit it in Google Search Console.",
      source_type: "crawler_observation",
    });
    return;
  }
  const inSitemap = new Set(audit.sitemap.urls.map(keyOf));
  const fromSitemap = audit.entries.filter((e) => inSitemap.has(keyOf(e.url)));
  const failing = fromSitemap.filter((e) => e.state === "failed");
  const redirected = fromSitemap.filter((e) => e.state !== "failed" && (e.redirects?.length ?? 0) > 0);
  if (failing.length || redirected.length) {
    ctx.drafts.push({
      rule_id: "sitemap_url_errors",
      category: "indexability",
      severity: failing.length ? "medium" : "low",
      confidence: "high",
      page_url: null,
      summary: `${failing.length ? `${failing.length} sitemap ${failing.length === 1 ? "URL fails" : "URLs fail"} to load` : ""}${failing.length && redirected.length ? " and " : ""}${redirected.length ? `${redirected.length} sitemap ${redirected.length === 1 ? "URL redirects" : "URLs redirect"}` : ""}.`,
      observed: {
        failing: listed(failing.map((e) => `${e.url} (${e.status ?? e.reason ?? "error"})`)),
        redirected: listed(redirected.map((e) => `${e.url} → ${e.finalUrl}`)),
      },
      recommendation: "List only the final, working address of each page in the sitemap.",
      source_type: "crawler_observation",
    });
  }
}

function statusRules(ctx: Ctx) {
  const crawler = "crawler_observation" as const;
  for (const e of ctx.audit.entries) {
    if (e.state !== "failed") continue;
    const importance = pageImportance(e.url, ctx.homeUrl);
    if (e.status) {
      const access = e.status === 401 || e.status === 403 || e.status === 429;
      ctx.drafts.push({
        rule_id: "http_error",
        category: "indexability",
        severity: access ? "low" : importance === "home" || importance === "key" ? "high" : "medium",
        confidence: access ? "medium" : "high",
        page_url: e.url,
        importance,
        summary: `${pathOf(e.url)} returned HTTP ${e.status}.`,
        observed: { status: e.status, final_url: e.finalUrl ?? e.url },
        recommendation: access
          ? "Check that this page loads for visitors. If it does, the server may be blocking automated tools, which can also affect search engines."
          : "Fix the page or redirect it to the right one, and update links that point to it.",
        source_type: crawler,
      });
    } else {
      ctx.drafts.push({
        rule_id: "fetch_error",
        category: "technical",
        severity: "low",
        confidence: "low",
        page_url: e.url,
        importance,
        summary: `${pathOf(e.url)} couldn't be loaded.`,
        observed: { error: e.reason ?? "unknown error" },
        recommendation: "Open the page in a browser. If it's slow or doesn't load, ask your web host to check it.",
        source_type: crawler,
      });
    }
  }
  for (const e of ctx.audit.entries) {
    const hops = e.redirects?.length ?? 0;
    if (hops < 2) continue;
    ctx.drafts.push({
      rule_id: "redirect_chain",
      category: "technical",
      severity: hops >= 3 ? "medium" : "low",
      confidence: "high",
      page_url: e.url,
      summary: `${pathOf(e.url)} goes through ${hops} redirects before it loads.`,
      observed: { chain: [...(e.redirects ?? []).map((r) => `${r.url} (${r.status})`), e.finalUrl ?? ""] },
      recommendation: "Make it a single redirect to the final address, and link straight to the final address.",
      source_type: crawler,
    });
  }
}

function indexabilityRules(ctx: Ctx, pages: PageAudit[]) {
  const crawler = "crawler_observation" as const;
  for (const p of pages) {
    const directives = `${p.metaRobots}, ${p.xRobotsTag}`.toLowerCase();
    if (!/\bnoindex\b|\bnone\b/.test(directives)) continue;
    const importance = pageImportance(p.url, ctx.homeUrl);
    const utility = UTILITY_PAGE.test(new URL(p.url).pathname);
    ctx.drafts.push({
      rule_id: "noindex",
      category: "indexability",
      severity: utility ? "low" : importance === "home" || importance === "key" ? "high" : "medium",
      confidence: "high",
      page_url: p.url,
      importance,
      summary: `${pathOf(p.url)} asks search engines not to index it.`,
      observed: { meta_robots: p.metaRobots || null, x_robots_tag: p.xRobotsTag || null },
      recommendation: "If this page should appear in search results, remove the noindex directive (the robots meta tag or the X-Robots-Tag header).",
      source_type: crawler,
    });
  }

  for (const p of pages) {
    if (p.canonicals.length > 1) {
      ctx.drafts.push({
        rule_id: "canonical_conflict",
        category: "indexability",
        severity: "medium",
        confidence: "high",
        page_url: p.url,
        summary: `${pathOf(p.url)} declares ${p.canonicals.length} different canonical URLs.`,
        observed: { canonicals: p.canonicals },
        recommendation: "Keep one canonical tag per page, pointing to the page's preferred address.",
        source_type: crawler,
      });
    } else if (p.canonicals.length === 1 && comparable(p.canonicals[0]) !== comparable(p.url)) {
      const sameKey = keyOf(p.canonicals[0]) === keyOf(p.url);
      ctx.drafts.push({
        rule_id: "canonical_elsewhere",
        category: "indexability",
        severity: "medium",
        confidence: sameKey ? "high" : "medium",
        page_url: p.url,
        summary: sameKey
          ? `${pathOf(p.url)} names a different version of itself (http/https or www) as canonical.`
          : `${pathOf(p.url)} names another page as its canonical, so search engines may show that page instead.`,
        observed: { canonical: p.canonicals[0], page: p.url },
        recommendation: sameKey
          ? "Point the canonical tag at the exact address the site uses (same https and www choice)."
          : "If this page should rank on its own, point its canonical tag at itself. If it's a duplicate on purpose, this is fine.",
        source_type: crawler,
      });
    }
  }

  perPage(
    ctx,
    pages,
    (p) =>
      p.canonicals.length === 0
        ? {
            rule_id: "canonical_missing",
            category: "indexability",
            severity: "low",
            confidence: "high",
            summary: `${pathOf(p.url)} has no canonical tag.`,
            observed: { canonical: null },
            recommendation: "Add a canonical link tag pointing to the page's preferred address. It helps search engines choose the right URL when a page is reachable at several.",
            source_type: crawler,
          }
        : null,
    (rest) => ({
      rule_id: "canonical_missing",
      category: "indexability",
      severity: "low",
      confidence: "high",
      summary: `${rest.length} pages have no canonical tag.`,
      observed: { count: rest.length, pages: listed(rest.map((r) => r.page.url)) },
      recommendation: "Add a canonical link tag to each page, pointing to its preferred address.",
      source_type: crawler,
    }),
  );
}

function technicalRules(ctx: Ctx, pages: PageAudit[]) {
  const { audit } = ctx;
  const crawler = "crawler_observation" as const;
  const home = new URL(audit.finalUrl);
  if (home.protocol === "http:") {
    ctx.drafts.push({
      rule_id: "https_missing",
      category: "technical",
      severity: "high",
      confidence: "high",
      page_url: audit.finalUrl,
      summary: "The site loads over http:// instead of a secure https:// connection.",
      observed: { final_url: audit.finalUrl },
      recommendation: "Install an SSL certificate (most hosts include one free) and redirect every http:// address to https://.",
      source_type: crawler,
    });
  }
  for (const v of audit.variants) {
    if (!v.finalUrl || !v.status || v.status < 200 || v.status >= 300) continue;
    const from = new URL(v.url);
    const to = new URL(v.finalUrl);
    if (from.protocol === "http:" && home.protocol === "https:" && to.protocol === "http:") {
      ctx.drafts.push({
        rule_id: "http_not_redirected",
        category: "technical",
        severity: "medium",
        confidence: "high",
        page_url: null,
        summary: `${v.url} loads without redirecting to the secure https:// version.`,
        observed: { requested: v.url, final_url: v.finalUrl, status: v.status },
        recommendation: "Redirect every http:// address to its https:// version with a single permanent (301) redirect.",
        source_type: crawler,
      });
    } else if (from.protocol === home.protocol && from.hostname !== home.hostname && to.hostname === from.hostname) {
      ctx.drafts.push({
        rule_id: "host_variant_not_redirected",
        category: "technical",
        severity: "medium",
        confidence: "high",
        page_url: null,
        summary: `Both ${home.hostname} and ${from.hostname} load without redirecting to one version.`,
        observed: { requested: v.url, final_url: v.finalUrl, status: v.status, site: audit.finalUrl },
        recommendation: "Pick one version (with or without www) and permanently redirect the other to it.",
        source_type: crawler,
      });
    }
  }

  // Broken internal links: targets that failed in the crawl or in the link check.
  const statusByKey = new Map<string, number | null>();
  for (const e of audit.entries) if (e.state === "failed" && e.status) statusByKey.set(keyOf(e.url), e.status);
  for (const l of audit.linkChecks) statusByKey.set(keyOf(l.url), l.status);
  const brokenTargets = new Map<string, { url: string; status: number; from: string[] }>();
  for (const p of pages) {
    for (const link of p.internalLinks) {
      const key = keyOf(link);
      const status = statusByKey.get(key);
      if (!isBroken(status)) continue;
      const cur = brokenTargets.get(key) ?? { url: link, status: status!, from: [] };
      if (!cur.from.includes(p.url)) cur.from.push(p.url);
      brokenTargets.set(key, cur);
    }
  }
  for (const t of brokenTargets.values()) {
    const fromHome = t.from.some((f) => pageImportance(f, ctx.homeUrl) === "home");
    ctx.drafts.push({
      rule_id: "broken_internal_link",
      category: "technical",
      severity: fromHome ? "high" : "medium",
      confidence: "high",
      page_url: t.url,
      importance: fromHome ? "home" : "site",
      summary: `Links to ${pathOf(t.url)} are broken (HTTP ${t.status}) on ${t.from.length} ${t.from.length === 1 ? "page" : "pages"}.`,
      observed: { status: t.status, linked_from: listed(t.from) },
      recommendation: "Update or remove these links, or redirect the old address to the right page.",
      source_type: crawler,
    });
  }

  // Duplicate content: identical extracted text on different pages.
  const byHash = new Map<string, PageAudit[]>();
  for (const p of pages) {
    if (p.wordCount < 30) continue;
    byHash.set(p.contentHash, [...(byHash.get(p.contentHash) ?? []), p]);
  }
  for (const group of byHash.values()) {
    if (group.length < 2) continue;
    ctx.drafts.push({
      rule_id: "duplicate_content",
      category: "technical",
      severity: "medium",
      confidence: "high",
      page_url: null,
      summary: `${group.length} pages have identical text.`,
      observed: { pages: listed(group.map((p) => p.url)), words: group[0].wordCount },
      recommendation: "Give each page its own content, or point duplicates to the main page with a canonical tag or a redirect.",
      source_type: crawler,
    });
  }
}

function onPageRules(ctx: Ctx, pages: PageAudit[]) {
  const crawler = "crawler_observation" as const;
  const indexable = pages.filter((p) => !/\bnoindex\b|\bnone\b/i.test(`${p.metaRobots}, ${p.xRobotsTag}`));

  perPage(
    ctx,
    pages,
    (p, importance) =>
      p.title
        ? null
        : {
            rule_id: "title_missing",
            category: "on_page",
            severity: importance === "home" ? "high" : "medium",
            confidence: "high",
            summary: `${pathOf(p.url)} has no title tag.`,
            observed: { title: null },
            recommendation: "Add a title that says what the page offers and who it's for, e.g. the service and the area you serve.",
            source_type: crawler,
          },
    (rest) => ({
      rule_id: "title_missing",
      category: "on_page",
      severity: "medium",
      confidence: "high",
      summary: `${rest.length} pages have no title tag.`,
      observed: { count: rest.length, pages: listed(rest.map((r) => r.page.url)) },
      recommendation: "Add a title to each page that says what's on it.",
      source_type: crawler,
    }),
  );

  const groups = (pick: (p: PageAudit) => string) => {
    const m = new Map<string, PageAudit[]>();
    for (const p of indexable) {
      const v = pick(p).trim().toLowerCase();
      if (v) m.set(v, [...(m.get(v) ?? []), p]);
    }
    return [...m.entries()].filter(([, g]) => g.length > 1);
  };
  for (const [, g] of groups((p) => p.title)) {
    ctx.drafts.push({
      rule_id: "title_duplicate",
      category: "on_page",
      severity: "medium",
      confidence: "high",
      page_url: null,
      summary: `${g.length} pages share the title "${g[0].title.slice(0, 80)}".`,
      observed: { title: g[0].title, pages: listed(g.map((p) => p.url)) },
      recommendation: "Give each page its own title that describes that page.",
      source_type: crawler,
    });
  }
  for (const [, g] of groups((p) => p.description)) {
    ctx.drafts.push({
      rule_id: "meta_description_duplicate",
      category: "on_page",
      severity: "low",
      confidence: "high",
      page_url: null,
      summary: `${g.length} pages share the same meta description.`,
      observed: { description: g[0].description.slice(0, 200), pages: listed(g.map((p) => p.url)) },
      recommendation: "Write a short, specific description for each important page; search engines may use it as the snippet.",
      source_type: crawler,
    });
  }

  // Title length is guidance only: search results cut titles by pixel width, not a fixed character count.
  const oddTitles = pages.filter((p) => p.title && (p.title.length < 10 || p.title.length > 70));
  if (oddTitles.length) {
    ctx.drafts.push({
      rule_id: "title_length",
      category: "on_page",
      severity: "low",
      confidence: "medium",
      page_url: oddTitles.length === 1 ? oddTitles[0].url : null,
      summary:
        oddTitles.length === 1
          ? `The title of ${pathOf(oddTitles[0].url)} is ${oddTitles[0].title.length} characters, so it may be cut off or say too little in search results.`
          : `${oddTitles.length} page titles are very short or long (under 10 or over 70 characters).`,
      observed: { titles: listed(oddTitles.map((p) => `${pathOf(p.url)}: ${p.title.length} characters`)) },
      recommendation: "Guidance, not a rule: keep the most important words at the start of the title so they show even when it's shortened.",
      source_type: crawler,
    });
  }

  perPage(
    ctx,
    indexable,
    (p, importance) =>
      p.description
        ? null
        : {
            rule_id: "meta_description_missing",
            category: "on_page",
            severity: importance === "home" ? "medium" : "low",
            confidence: "high",
            summary: `${pathOf(p.url)} has no meta description.`,
            observed: { description: null },
            recommendation: "Add a one- or two-sentence description of the page. Search engines may use it as the snippet under your title.",
            source_type: crawler,
          },
    (rest) => ({
      rule_id: "meta_description_missing",
      category: "on_page",
      severity: "low",
      confidence: "high",
      summary: `${rest.length} pages have no meta description.`,
      observed: { count: rest.length, pages: listed(rest.map((r) => r.page.url)) },
      recommendation: "Add a short description to your most important pages first.",
      source_type: crawler,
    }),
  );

  perPage(
    ctx,
    pages,
    (p, importance) =>
      p.h1Count === 0
        ? {
            rule_id: "h1_missing",
            category: "on_page",
            severity: importance === "other" ? "low" : "medium",
            confidence: "high",
            summary: `${pathOf(p.url)} has no main heading (H1).`,
            observed: { h1_count: 0, h2_count: p.h2Count },
            recommendation: "Add one main heading that says what the page is about.",
            source_type: crawler,
          }
        : null,
    (rest) => ({
      rule_id: "h1_missing",
      category: "on_page",
      severity: "low",
      confidence: "high",
      summary: `${rest.length} pages have no main heading (H1).`,
      observed: { count: rest.length, pages: listed(rest.map((r) => r.page.url)) },
      recommendation: "Add one main heading to each page that says what it's about.",
      source_type: crawler,
    }),
  );

  perPage(
    ctx,
    pages,
    (p) =>
      p.h1Count > 1
        ? {
            rule_id: "h1_multiple",
            category: "on_page",
            severity: "low",
            confidence: "high",
            summary: `${pathOf(p.url)} has ${p.h1Count} main headings (H1).`,
            observed: { h1_count: p.h1Count },
            recommendation: "Usually one H1 per page is clearest; make the others H2 subheadings.",
            source_type: crawler,
          }
        : null,
    (rest) => ({
      rule_id: "h1_multiple",
      category: "on_page",
      severity: "low",
      confidence: "high",
      summary: `${rest.length} pages have more than one main heading (H1).`,
      observed: { pages: listed(rest.map((r) => `${pathOf(r.page.url)}: ${r.page.h1Count}`)) },
      recommendation: "Usually one H1 per page is clearest; make the others H2 subheadings.",
      source_type: crawler,
    }),
  );

  // Very little text plus scripts suggests the content is drawn by JavaScript; otherwise it's thin content.
  const jsRendered = (p: PageAudit) => p.wordCount < 50 && p.scriptCount >= 3;
  for (const p of indexable.filter(jsRendered)) {
    ctx.drafts.push({
      rule_id: "js_rendering_possible",
      category: "technical",
      severity: "low",
      confidence: "low",
      page_url: p.url,
      summary: `${pathOf(p.url)} has almost no text in its HTML (${p.wordCount} words); its content may load with JavaScript.`,
      observed: { words: p.wordCount, scripts: p.scriptCount },
      recommendation: "Check that the main text is in the page's HTML. Search engines can run JavaScript, but plain HTML is read more reliably.",
      source_type: crawler,
    });
  }
  perPage(
    ctx,
    indexable.filter((p) => !jsRendered(p)),
    (p, importance) =>
      p.wordCount < THIN_WORDS && !UTILITY_PAGE.test(new URL(p.url).pathname)
        ? {
            rule_id: "thin_content",
            category: "on_page",
            severity: importance !== "other" && !CONTACT_PAGE.test(p.url) ? "medium" : "low",
            confidence: "medium",
            summary: `${pathOf(p.url)} has little text (${p.wordCount} words).`,
            observed: { words: p.wordCount },
            recommendation: "Add useful detail: what the service includes, who it's for, the area you serve and how to get started.",
            source_type: crawler,
          }
        : null,
    (rest) => ({
      rule_id: "thin_content",
      category: "on_page",
      severity: "low",
      confidence: "medium",
      summary: `${rest.length} pages have little text (under ${THIN_WORDS} words).`,
      observed: { pages: listed(rest.map((r) => `${pathOf(r.page.url)}: ${r.page.wordCount} words`)) },
      recommendation: "Expand the pages that matter most to customers, or combine very short pages.",
      source_type: crawler,
    }),
  );

  perPage(
    ctx,
    pages,
    (p, importance) =>
      p.images.missingAlt > 0
        ? {
            rule_id: "images_missing_alt",
            category: "on_page",
            severity: p.images.missingAlt >= 5 && importance !== "other" ? "medium" : "low",
            confidence: "high",
            summary: `${p.images.missingAlt} of ${p.images.total} images on ${pathOf(p.url)} have no alt text.`,
            observed: { missing_alt: p.images.missingAlt, decorative_empty_alt: p.images.emptyAlt, images: p.images.total },
            recommendation: "Add short alt text describing each meaningful image. Use an empty alt (alt=\"\") only for decorative images.",
            source_type: crawler,
          }
        : null,
    (rest) => ({
      rule_id: "images_missing_alt",
      category: "on_page",
      severity: "low",
      confidence: "high",
      summary: `${rest.reduce((s, r) => s + r.page.images.missingAlt, 0)} images on ${rest.length} pages have no alt text.`,
      observed: { pages: listed(rest.map((r) => `${pathOf(r.page.url)}: ${r.page.images.missingAlt} of ${r.page.images.total}`)) },
      recommendation: "Add short alt text describing each meaningful image. Use an empty alt (alt=\"\") only for decorative images.",
      source_type: crawler,
    }),
  );

  const home = pages.find((p) => p.source === "home");
  if (home && !home.openGraph.title && !home.openGraph.image) {
    ctx.drafts.push({
      rule_id: "open_graph_missing",
      category: "on_page",
      severity: "low",
      confidence: "high",
      page_url: home.url,
      summary: "The home page has no Open Graph tags, so shared links may show a plain preview. (Not a search ranking factor.)",
      observed: home.openGraph,
      recommendation: "Add og:title, og:description and og:image so links to your site show a clear preview on social media and in messages.",
      source_type: crawler,
    });
  }
}

function structuredDataRules(ctx: Ctx, pages: PageAudit[]) {
  const crawler = "crawler_observation" as const;
  for (const p of pages) {
    if (!p.jsonLd.invalid) continue;
    ctx.drafts.push({
      rule_id: "structured_data_invalid",
      category: "structured_data",
      severity: "medium",
      confidence: "high",
      page_url: p.url,
      summary: `${p.jsonLd.invalid} of ${p.jsonLd.blocks} structured data (JSON-LD) blocks on ${pathOf(p.url)} can't be parsed.`,
      observed: { errors: p.jsonLd.errors, rich_results_test: richResultsTestUrl(p.url) },
      recommendation: "Fix the JSON-LD syntax, then check the page in Google's Rich Results Test. Valid markup can make a page eligible for some rich results; it doesn't guarantee them.",
      source_type: crawler,
    });
  }
  const anyMarkup = pages.some((p) => p.jsonLd.types.length || p.microdataTypes.length);
  if (pages.length && !anyMarkup) {
    ctx.drafts.push({
      rule_id: "structured_data_missing",
      category: "structured_data",
      severity: "low",
      confidence: "high",
      page_url: null,
      summary: `None of the ${pages.length} pages scanned has structured data.`,
      observed: { pages_scanned: pages.length },
      recommendation: "Consider LocalBusiness or Organization markup (JSON-LD) with your name, address, phone and hours, matching what the page shows. Test it with Google's Rich Results Test.",
      source_type: crawler,
    });
  }
}

const CRUX_SEVERITY: Record<string, Severity | null> = { SLOW: "high", AVERAGE: "medium", FAST: null };
const CWV = [
  { key: "lcpMs" as const, name: "Largest Contentful Paint (loading)", unit: (v: number) => `${(v / 1000).toFixed(1)} s` },
  { key: "inpMs" as const, name: "Interaction to Next Paint (responsiveness)", unit: (v: number) => `${Math.round(v)} ms` },
  { key: "cls" as const, name: "Cumulative Layout Shift (visual stability)", unit: (v: number) => v.toFixed(2) },
];

function performanceRules(ctx: Ctx, psi: PageSpeedReport | null) {
  if (!psi) return;
  const tested = ctx.audit.finalUrl;
  // Field data: the real-user experience. Prefer mobile; fall back to desktop when mobile has none.
  const fieldRun: PageSpeedRun | null = psi.mobile?.field ? psi.mobile : psi.desktop?.field ? psi.desktop : null;
  if (fieldRun?.field) {
    for (const m of CWV) {
      const metric = fieldRun.field[m.key];
      const severity = metric ? CRUX_SEVERITY[metric.category] : null;
      if (!metric || !severity) continue;
      ctx.drafts.push({
        rule_id: `cwv_${m.key === "lcpMs" ? "lcp" : m.key === "inpMs" ? "inp" : "cls"}_field`,
        category: "performance",
        severity,
        confidence: "high",
        page_url: null,
        summary: `Real visitors on ${fieldRun.strategy} see ${metric.category === "SLOW" ? "poor" : "middling"} ${m.name}: ${m.unit(metric.percentile)} at the 75th percentile.`,
        observed: {
          metric: m.key,
          p75: metric.percentile,
          category: metric.category,
          strategy: fieldRun.strategy,
          scope: fieldRun.field.originFallback ? "whole site" : "this page",
          tested_url: tested,
        },
        recommendation:
          m.key === "lcpMs"
            ? "Speed up the main image or text block at the top of the page: compress and resize images, and cut render-blocking scripts."
            : m.key === "inpMs"
              ? "Reduce heavy JavaScript (chat widgets, trackers, sliders) so the page responds quickly to taps and clicks."
              : "Reserve space for images, ads and embeds so the layout doesn't jump while the page loads.",
        source_type: "core_web_vitals_field_data",
      });
    }
  }

  const mobile = psi.mobile;
  // A run where Lighthouse couldn't measure the page reports 0; that's not a real score, so don't flag it.
  if (mobile && !mobile.labError && mobile.scores.performance < 90) {
    const poor = mobile.scores.performance < 50;
    ctx.drafts.push({
      rule_id: "lab_performance",
      category: "performance",
      severity: poor ? "medium" : "low",
      confidence: "medium",
      page_url: null,
      summary: `Mobile performance scored ${mobile.scores.performance} of 100 in Google's lab test (a simulated device, not real visitors).`,
      observed: { score: mobile.scores.performance, lab: mobile.lab, tested_url: tested },
      recommendation: "Work through the biggest PageSpeed opportunities below; lab scores vary from run to run, so look at the trend, not one number.",
      source_type: "pagespeed_lab",
    });
  }
  const opportunities = (mobile?.opportunities ?? []).filter((o) => (o.savingsMs ?? 0) >= 300);
  if (opportunities.length) {
    ctx.drafts.push({
      rule_id: "lab_opportunities",
      category: "performance",
      severity: (opportunities[0].savingsMs ?? 0) >= 1000 ? "medium" : "low",
      confidence: "medium",
      page_url: null,
      summary: `Top mobile PageSpeed opportunity: ${opportunities[0].title} (about ${((opportunities[0].savingsMs ?? 0) / 1000).toFixed(1)} s estimated savings).`,
      observed: { opportunities: opportunities.map((o) => ({ title: o.title, savings_ms: o.savingsMs })), tested_url: tested },
      recommendation: "Ask your web developer to start with the opportunities that save the most time; image compression and fewer third-party scripts are often the quickest wins.",
      source_type: "pagespeed_lab",
    });
  }
}

// Runs every rule and returns findings in priority order with refs T1, T2, …
export function runChecks(input: { audit: SiteAudit; psi: PageSpeedReport | null; observedAt?: string }): AuditFinding[] {
  const { audit, psi } = input;
  const observedAt = input.observedAt ?? new Date().toISOString();
  const ctx: Ctx = { audit, homeUrl: audit.finalUrl, drafts: [] };
  const pages = audit.pages;

  robotsRules(ctx);
  if (!audit.homeBlocked) {
    sitemapRules(ctx);
    statusRules(ctx);
    indexabilityRules(ctx, pages);
    technicalRules(ctx, pages);
    onPageRules(ctx, pages);
    structuredDataRules(ctx, pages);
  }
  performanceRules(ctx, psi);

  return ctx.drafts
    .map(({ importance, ...d }) => {
      const imp = importance ?? pageImportance(d.page_url, ctx.homeUrl);
      return { d, score: priorityScore(d.severity, d.confidence, imp), label: priorityLabel(d.severity, d.confidence, imp) };
    })
    .sort(
      (a, b) =>
        LABEL_ORDER[a.label] - LABEL_ORDER[b.label] ||
        b.score - a.score ||
        SEVERITY_ORDER[a.d.severity] - SEVERITY_ORDER[b.d.severity],
    )
    .map(({ d, label }, i) => ({ ...d, ref: `T${i + 1}`, priority_label: label, observed_at: observedAt }));
}

// Compact lines for the diagnosis prompt: ref, label, severity/confidence, source, page, summary, observed value.
// Capped (default 40, highest priority first) so the prompt stays about the same size as before.
export function promptFindings(findings: AuditFinding[], max = 40) {
  return findings
    .slice(0, max)
    .map((f) => {
      const observed = JSON.stringify(f.observed);
      return `${f.ref} [${PRIORITY_LABEL_TEXT[f.priority_label]}; ${f.severity} severity; ${f.confidence} confidence; ${f.source_type}] ${f.page_url ? pathOf(f.page_url) : "site-wide"}: ${f.summary} Observed: ${observed.length > 200 ? `${observed.slice(0, 197)}...` : observed}`;
    })
    .join("\n");
}

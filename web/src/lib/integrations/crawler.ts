import "server-only";
import { createHash } from "node:crypto";
import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import type { Readable } from "node:stream";
import zlib from "node:zlib";
import * as cheerio from "cheerio";
import { isAllowed, loadRobots, type Robots, type TextFetcher } from "./robots";
import { bareHost, loadSitemaps, type SitemapResult } from "./sitemap";

export type CrawledPage = { url: string; title: string; description: string; text: string };

export type Signals = {
  hasHttps: boolean;
  hasMetaDescription: boolean;
  h1Count: number;
  hasContactForm: boolean;
  hasPhoneNumber: boolean;
  hasSchemaMarkup: boolean;
  imagesMissingAlt: number;
  socialLinks: string[];
};

// What the deterministic checks (lib/audit/checks.ts) read for one scanned page. Measured, never AI.
export type PageAudit = {
  url: string; // final URL after redirects
  requestedUrl: string;
  source: "home" | "link" | "sitemap";
  status: number;
  redirects: { url: string; status: number }[];
  xRobotsTag: string;
  title: string;
  description: string;
  canonicals: string[];
  metaRobots: string;
  h1Count: number;
  h2Count: number;
  wordCount: number;
  images: { total: number; missingAlt: number; emptyAlt: number };
  openGraph: { title: boolean; description: boolean; image: boolean };
  jsonLd: { blocks: number; invalid: number; errors: string[]; types: string[] };
  microdataTypes: string[];
  internalLinks: string[];
  scriptCount: number;
  contentHash: string;
  hasForm: boolean;
  hasPhone: boolean;
};

// One URL the crawl considered, and what happened to it.
export type CoverageEntry = {
  url: string;
  state: "scanned" | "excluded" | "failed";
  reason?: string;
  status?: number;
  finalUrl?: string;
  redirects?: { url: string; status: number }[];
};

export type SiteAudit = {
  startUrl: string;
  finalUrl: string;
  homeBlocked: boolean;
  robots: Pick<Robots, "url" | "status" | "httpStatus" | "appliesTo" | "sitemaps">;
  sitemap: SitemapResult;
  entries: CoverageEntry[];
  pages: PageAudit[];
  // Internal links that weren't crawled, checked with a quick request (capped).
  linkChecks: { url: string; status: number | null; error?: string }[];
  // http:// and www/non-www versions of the home page, where they answer.
  variants: { url: string; finalUrl: string | null; status: number | null; error?: string }[];
  durationMs: number;
  limits: { maxPages: number; timeBudgetMs: number; maxLinkChecks: number };
};

export type CrawlResult = {
  pages: CrawledPage[];
  // Home page signals; null when robots.txt doesn't let Braventa read the home page.
  signals: Signals | null;
  audit: SiteAudit;
};

const USER_AGENT = "Mozilla/5.0 (compatible; Braventa/0.1; +https://braventa.io)";
export const MAX_PAGES = 25; // home page included
const MAX_TEXT_PER_PAGE = 6000;
const CONCURRENCY = 4;
const TIME_BUDGET_MS = 45000; // whole crawl, including robots.txt, sitemaps and link checks
const PAGE_PHASE_SHARE = 0.8; // no new pages start after 80% of the budget; the rest is for link checks
const MAX_LINK_CHECKS = 10;
const MAX_LINKS_PER_PAGE = 300;
// Pages most likely to describe the business, in priority order.
const PRIORITY = /about|service|what-we-do|solutions|products|pricing|contact|team|work|portfolio/i;
// Links to files rather than pages aren't crawl candidates.
const FILE_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|ico|zip|rar|docx?|xlsx?|pptx?|csv|mp4|mov|mp3|wav|css|js|json|xml|txt|gz)$/i;

const MAX_BYTES = 2 * 1024 * 1024; // per page; anything past this is dropped
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15000; // per page, across all redirect hops
const AUX_TIMEOUT_MS = 10000; // robots.txt, sitemaps, link and variant checks

// The crawler fetches user-supplied URLs from our server, so it must never reach internal networks
// (SSRF). Blocked: private, loopback, link-local, CGNAT, cloud metadata, documentation, multicast and
// reserved ranges, plus IPv6 forms that embed an IPv4 address (NAT64, 6to4, Teredo). IPv4-mapped IPv6
// (::ffff:a.b.c.d) needs no rule: BlockList matches it against the IPv4 rules, and a ::ffff:0:0/96 rule
// would also match every plain IPv4 address.
const BLOCKED = new net.BlockList();
for (const [subnet, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) BLOCKED.addSubnet(subnet, prefix, "ipv4");
for (const [subnet, prefix] of [
  ["::", 128], ["::1", 128], ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["100::", 64],
  ["2001::", 32], ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
] as const) BLOCKED.addSubnet(subnet, prefix, "ipv6");

export class BlockedUrlError extends Error {}

export function isBlockedAddress(address: string) {
  const family = net.isIP(address);
  if (family === 4) return BLOCKED.check(address, "ipv4");
  if (family === 6) return BLOCKED.check(address, "ipv6");
  return true;
}

// Socket lookup that refuses hostnames resolving to any blocked address. The socket connects to the
// address checked here, so a DNS answer can't change between the check and the connection (rebinding).
function safeLookup(
  hostname: string,
  options: LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
) {
  dnsLookup(hostname, { family: options.family, hints: options.hints, all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    if (addresses.length === 0 || addresses.some((a) => isBlockedAddress(a.address))) {
      return callback(new BlockedUrlError(`${hostname} points to a private or reserved network address`), "");
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

export function assertCrawlable(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new BlockedUrlError(`${url.protocol} links can't be analyzed`);
  if (url.port && url.port !== "80" && url.port !== "443") throw new BlockedUrlError("Only standard web ports (80 and 443) can be analyzed");
  if (url.username || url.password) throw new BlockedUrlError("Addresses with a username or password can't be analyzed");
  // Literal IPs skip DNS lookup when connecting, so check them here.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedAddress(host)) throw new BlockedUrlError(`${host} is a private or reserved network address`);
}

type Hop = { status: number; location?: string; body: string; contentType: string; xRobotsTag: string };
type RequestOptions = { accept: string; headersOnly?: boolean };

function header(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join(", ") : (value ?? "");
}

function requestOnce(url: URL, signal: AbortSignal, opts: RequestOptions): Promise<Hop> {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: opts.accept, "Accept-Encoding": "gzip, deflate, br" },
        lookup: safeLookup,
        agent: false, // never reuse a pooled socket opened without safeLookup
        signal,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = header(res.headers["content-type"]).toLowerCase();
        const xRobotsTag = header(res.headers["x-robots-tag"]);
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, location: res.headers.location, body: "", contentType, xRobotsTag });
        }
        if (opts.headersOnly) {
          res.destroy();
          return resolve({ status, body: "", contentType, xRobotsTag });
        }
        const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
        let stream: Readable = res;
        if (encoding === "gzip" || encoding === "deflate") stream = res.pipe(zlib.createUnzip());
        else if (encoding === "br") stream = res.pipe(zlib.createBrotliDecompress());

        // Count decoded bytes so a compressed response can't expand past the cap.
        const chunks: Buffer[] = [];
        let size = 0;
        const finish = () => resolve({ status, body: Buffer.concat(chunks).toString("utf8"), contentType, xRobotsTag });
        stream.on("data", (chunk: Buffer) => {
          const room = MAX_BYTES - size;
          chunks.push(chunk.length > room ? chunk.subarray(0, room) : chunk);
          size += chunk.length;
          if (size >= MAX_BYTES) {
            finish();
            stream.destroy();
            res.destroy();
          }
        });
        stream.on("end", finish);
        stream.on("error", reject);
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export type FetchResult = {
  url: string;
  finalUrl: string;
  status: number;
  redirects: { url: string; status: number }[];
  contentType: string;
  xRobotsTag: string;
  body: string;
  // Set when robots.txt disallows a URL in the redirect chain; that URL wasn't fetched.
  blockedUrl?: string;
};

// GET with SSRF checks on every redirect hop, a size cap, and one timeout for the whole chain. Non-2xx answers
// are returned, not thrown. `allow` (the robots.txt check) runs before every hop.
async function fetchResource(
  input: string,
  opts: { timeoutMs?: number; accept?: string; headersOnly?: boolean; allow?: (url: URL) => Promise<boolean> } = {},
): Promise<FetchResult> {
  const signal = AbortSignal.timeout(Math.max(1000, opts.timeoutMs ?? TIMEOUT_MS));
  const redirects: FetchResult["redirects"] = [];
  let url = new URL(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertCrawlable(url);
    if (opts.allow && !(await opts.allow(url))) {
      return { url: input, finalUrl: url.toString(), status: 0, redirects, contentType: "", xRobotsTag: "", body: "", blockedUrl: url.toString() };
    }
    const res = await requestOnce(url, signal, { accept: opts.accept ?? "text/html", headersOnly: opts.headersOnly });
    if (res.location) {
      redirects.push({ url: url.toString(), status: res.status });
      url = new URL(res.location, url);
      continue;
    }
    return { url: input, finalUrl: url.toString(), status: res.status, redirects, contentType: res.contentType, xRobotsTag: res.xRobotsTag, body: res.body };
  }
  throw new Error(`${input} redirected more than ${MAX_REDIRECTS} times`);
}

const fetchText: TextFetcher = async (url) => {
  const r = await fetchResource(url, { timeoutMs: AUX_TIMEOUT_MS, accept: "text/plain, application/xml, text/xml, */*" });
  return { status: r.status, body: r.body };
};

export function normalizeUrl(input: string) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input) && !/^https?:\/\//i.test(input)) throw new BlockedUrlError("Only http and https addresses can be analyzed");
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(withScheme);
  url.hash = "";
  return url.toString();
}

// Identity of a page for de-duplication: same site (www-insensitive), path without a trailing slash, no query.
export function pageKey(url: string | URL) {
  const u = typeof url === "string" ? new URL(url) : url;
  const path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : "/";
  return `${bareHost(u.hostname)}${path}`;
}

function collectTypes(node: unknown, out: Set<string>, depth = 0) {
  if (depth > 6 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) collectTypes(n, out, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") out.add(t);
  else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") out.add(x);
  if (obj["@graph"]) collectTypes(obj["@graph"], out, depth + 1);
}

// Measures one HTML page. Exported for tests; crawled HTML is untrusted and only read, never rendered.
export function extractPage(
  html: string,
  meta: { url: string; requestedUrl: string; source: PageAudit["source"]; status: number; redirects: PageAudit["redirects"]; xRobotsTag: string },
): { page: CrawledPage; audit: PageAudit; socialLinks: string[] } {
  const $ = cheerio.load(html);
  const base = new URL(meta.url);
  const metaContent = (pred: (name: string) => boolean) =>
    $("meta")
      .toArray()
      .filter((el) => pred(($(el).attr("name") ?? $(el).attr("property") ?? "").toLowerCase()))
      .map((el) => ($(el).attr("content") ?? "").trim());

  const canonicals = $("link[rel]")
    .toArray()
    .filter((el) => ($(el).attr("rel") ?? "").toLowerCase().split(/\s+/).includes("canonical"))
    .flatMap((el) => {
      try {
        return [new URL($(el).attr("href") ?? "", base).toString()];
      } catch {
        return [];
      }
    });

  const jsonLd = { blocks: 0, invalid: 0, errors: [] as string[], types: [] as string[] };
  const types = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    jsonLd.blocks++;
    const raw = $(el).text().trim();
    try {
      collectTypes(JSON.parse(raw), types);
    } catch (e) {
      jsonLd.invalid++;
      if (jsonLd.errors.length < 3) jsonLd.errors.push((e instanceof Error ? e.message : String(e)).slice(0, 160));
    }
  });
  jsonLd.types = [...types].slice(0, 20);
  const microdataTypes = [
    ...new Set(
      $("[itemscope][itemtype]")
        .toArray()
        .map((el) => ($(el).attr("itemtype") ?? "").split(/[/#]/).filter(Boolean).pop() ?? "")
        .filter(Boolean),
    ),
  ].slice(0, 20);

  const imgs = $("img").toArray();
  const images = {
    total: imgs.length,
    missingAlt: imgs.filter((el) => $(el).attr("alt") === undefined).length,
    emptyAlt: imgs.filter((el) => $(el).attr("alt")?.trim() === "").length,
  };

  const internal = new Set<string>();
  const socialLinks = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const u = new URL(href, base);
      if (u.protocol !== "http:" && u.protocol !== "https:") return;
      if (/facebook|instagram|linkedin|tiktok|youtube|twitter|x\.com/i.test(u.hostname)) {
        socialLinks.add(u.hostname.replace(/^www\./, ""));
      }
      if (bareHost(u.hostname) === bareHost(base.hostname) && !FILE_EXT.test(u.pathname) && internal.size < MAX_LINKS_PER_PAGE) {
        u.hash = "";
        u.search = "";
        internal.add(u.toString());
      }
    } catch {
      // ignore malformed links
    }
  });

  const scriptCount = $("script[src]").length;
  const hasForm = $("form").length > 0;
  const title = $("title").first().text().trim();
  const description = metaContent((n) => n === "description")[0] ?? "";
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const telLink = $('a[href^="tel:"]').length > 0;

  $("script, style, noscript, svg, iframe, template").remove();
  const fullText = $("body").text().replace(/\s+/g, " ").trim();
  const words = fullText ? fullText.split(" ").filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0;

  const audit: PageAudit = {
    url: meta.url,
    requestedUrl: meta.requestedUrl,
    source: meta.source,
    status: meta.status,
    redirects: meta.redirects,
    xRobotsTag: meta.xRobotsTag,
    title,
    description,
    canonicals: [...new Set(canonicals)],
    metaRobots: metaContent((n) => n === "robots" || n === "googlebot").join(", "),
    h1Count,
    h2Count,
    wordCount: words,
    images,
    openGraph: {
      title: metaContent((n) => n === "og:title").some(Boolean),
      description: metaContent((n) => n === "og:description").some(Boolean),
      image: metaContent((n) => n === "og:image").some(Boolean),
    },
    jsonLd,
    microdataTypes,
    internalLinks: [...internal],
    scriptCount,
    contentHash: createHash("sha256").update(fullText.toLowerCase()).digest("hex"),
    hasForm,
    hasPhone: telLink || /(\+?\d[\d\s().-]{7,}\d)/.test(fullText),
  };
  return {
    page: { url: meta.url, title, description, text: fullText.slice(0, MAX_TEXT_PER_PAGE) },
    audit,
    socialLinks: [...socialLinks],
  };
}

const isHtml = (contentType: string) => !contentType || /html|xhtml/.test(contentType);
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200);

// Crawls a site within fixed limits: robots.txt is read first and respected for every URL (redirect hops
// included); candidates come from the sitemap and the home page's links, business pages first; up to 25 pages,
// 4 at a time, within ~45 s. Every candidate is recorded as scanned, excluded (with the reason) or failed.
// Throws only when the home page itself can't be fetched (as before); a home page that robots.txt disallows
// returns an empty crawl with homeBlocked set.
export async function crawlSite(
  inputUrl: string,
  opts: { maxPages?: number; timeBudgetMs?: number } = {},
): Promise<CrawlResult> {
  const started = Date.now();
  const maxPages = opts.maxPages ?? MAX_PAGES;
  const budget = opts.timeBudgetMs ?? TIME_BUDGET_MS;
  const deadline = started + budget;
  const pagePhaseEnd = started + budget * PAGE_PHASE_SHARE;
  const startUrl = normalizeUrl(inputUrl);

  const robotsCache = new Map<string, Promise<Robots>>();
  const robotsFor = (u: URL) => {
    let r = robotsCache.get(u.origin);
    if (!r) {
      r = loadRobots(u.origin, fetchText, { rethrow: (e) => e instanceof BlockedUrlError });
      robotsCache.set(u.origin, r);
    }
    return r;
  };
  const allow = async (u: URL) => isAllowed(await robotsFor(u), u);
  const robotsSummary = (r: Robots): SiteAudit["robots"] => ({
    url: r.url,
    status: r.status,
    httpStatus: r.httpStatus,
    appliesTo: r.appliesTo,
    sitemaps: r.sitemaps,
  });
  const limits = { maxPages, timeBudgetMs: budget, maxLinkChecks: MAX_LINK_CHECKS };

  const home = await fetchResource(startUrl, { allow });
  if (home.blockedUrl) {
    const robots = await robotsFor(new URL(home.blockedUrl));
    return {
      pages: [],
      signals: null,
      audit: {
        startUrl,
        finalUrl: home.blockedUrl,
        homeBlocked: true,
        robots: robotsSummary(robots),
        sitemap: { files: [], urls: [], found: false, capped: false },
        entries: [
          { url: startUrl, state: "excluded", reason: "robots.txt", finalUrl: home.blockedUrl, redirects: home.redirects },
        ],
        pages: [],
        linkChecks: [],
        variants: [],
        durationMs: Date.now() - started,
        limits,
      },
    };
  }
  if (home.status < 200 || home.status >= 300) throw new Error(`${home.finalUrl} returned ${home.status}`);

  const homeUrl = new URL(home.finalUrl);
  const homeRobots = await robotsFor(homeUrl);
  const homeExtract = extractPage(home.body, {
    url: home.finalUrl,
    requestedUrl: startUrl,
    source: "home",
    status: home.status,
    redirects: home.redirects,
    xRobotsTag: home.xRobotsTag,
  });

  const entries: CoverageEntry[] = [
    { url: startUrl, state: "scanned", status: home.status, finalUrl: home.finalUrl, redirects: home.redirects },
  ];
  const audits: PageAudit[] = [homeExtract.audit];
  const pages: CrawledPage[] = [homeExtract.page];
  const scannedKeys = new Set([pageKey(homeUrl), pageKey(startUrl)]);

  // Sitemap and the http/www variants in parallel; both are small and capped.
  const variantUrls: string[] = [];
  if (homeUrl.protocol === "https:") variantUrls.push(`http://${homeUrl.host}/`);
  const altHost = homeUrl.hostname.startsWith("www.") ? homeUrl.hostname.slice(4) : `www.${homeUrl.hostname}`;
  if (!net.isIP(homeUrl.hostname)) variantUrls.push(`${homeUrl.protocol}//${altHost}/`);

  const [sitemap, variants] = await Promise.all([
    loadSitemaps({ siteOrigin: homeUrl.origin, listed: homeRobots.sitemaps, fetchText, allowed: (u) => allow(new URL(u)).catch(() => false) }),
    Promise.all(
      variantUrls.map(async (url): Promise<SiteAudit["variants"][number]> => {
        try {
          const r = await fetchResource(url, { timeoutMs: AUX_TIMEOUT_MS, headersOnly: true, allow });
          if (r.blockedUrl) return { url, finalUrl: null, status: null, error: "blocked by robots.txt" };
          return { url, finalUrl: r.finalUrl, status: r.status };
        } catch (e) {
          return { url, finalUrl: null, status: null, error: errorText(e) };
        }
      }),
    ),
  ]);

  // Candidates: home-page links and sitemap URLs, one per page key.
  const candidates = new Map<string, { url: string; fromHome: boolean; order: number }>();
  let order = 0;
  for (const url of homeExtract.audit.internalLinks) {
    const key = pageKey(url);
    if (!scannedKeys.has(key) && !candidates.has(key)) candidates.set(key, { url, fromHome: true, order: order++ });
  }
  for (const url of sitemap.urls) {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      continue;
    }
    if (FILE_EXT.test(u.pathname)) continue;
    u.hash = "";
    const key = pageKey(u);
    if (!scannedKeys.has(key) && !candidates.has(key)) candidates.set(key, { url: u.toString(), fromHome: false, order: order++ });
  }
  const depth = (url: string) => new URL(url).pathname.split("/").filter(Boolean).length;
  const queue = [...candidates.values()].sort(
    (a, b) =>
      Number(PRIORITY.test(b.url)) - Number(PRIORITY.test(a.url)) ||
      Number(b.fromHome) - Number(a.fromHome) ||
      depth(a.url) - depth(b.url) ||
      a.order - b.order,
  );
  const fromHome = new Map(queue.map((c) => [c.url, c.fromHome]));

  let attempts = 0;
  const worker = async () => {
    while (queue.length) {
      const c = queue.shift()!;
      const u = new URL(c.url);
      let allowed: boolean;
      try {
        allowed = await allow(u);
      } catch (e) {
        entries.push({ url: c.url, state: "failed", reason: errorText(e) });
        continue;
      }
      if (!allowed) {
        entries.push({ url: c.url, state: "excluded", reason: "robots.txt" });
        continue;
      }
      if (attempts >= maxPages - 1) {
        entries.push({ url: c.url, state: "excluded", reason: "page limit" });
        continue;
      }
      if (Date.now() > pagePhaseEnd) {
        entries.push({ url: c.url, state: "excluded", reason: "time limit" });
        continue;
      }
      attempts++;
      try {
        const r = await fetchResource(c.url, { allow, timeoutMs: Math.min(TIMEOUT_MS, deadline - Date.now()) });
        const base = { url: c.url, finalUrl: r.finalUrl, redirects: r.redirects };
        if (r.blockedUrl) {
          entries.push({ ...base, state: "excluded", reason: "robots.txt" });
        } else if (bareHost(new URL(r.finalUrl).hostname) !== bareHost(homeUrl.hostname)) {
          entries.push({ ...base, state: "excluded", reason: "redirects to another site", status: r.status });
        } else if (r.status < 200 || r.status >= 300) {
          entries.push({ ...base, state: "failed", status: r.status });
        } else if (!isHtml(r.contentType)) {
          entries.push({ ...base, state: "excluded", reason: "not an HTML page", status: r.status });
        } else if (scannedKeys.has(pageKey(r.finalUrl))) {
          entries.push({ ...base, state: "excluded", reason: "redirects to a page already scanned", status: r.status });
        } else {
          scannedKeys.add(pageKey(r.finalUrl));
          const x = extractPage(r.body, {
            url: r.finalUrl,
            requestedUrl: c.url,
            source: fromHome.get(c.url) ? "link" : "sitemap",
            status: r.status,
            redirects: r.redirects,
            xRobotsTag: r.xRobotsTag,
          });
          audits.push(x.audit);
          pages.push(x.page);
          entries.push({ ...base, state: "scanned", status: r.status });
        }
      } catch (e) {
        entries.push({ url: c.url, state: "failed", reason: errorText(e) });
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Internal links that point at pages we didn't fetch: check a few, most-linked first, within the budget.
  const known = new Set(entries.map((e) => pageKey(e.url)).concat(audits.map((a) => pageKey(a.url))));
  const linkCount = new Map<string, { url: string; n: number }>();
  for (const a of audits) {
    for (const l of a.internalLinks) {
      const key = pageKey(l);
      if (known.has(key)) continue;
      const cur = linkCount.get(key);
      if (cur) cur.n++;
      else linkCount.set(key, { url: l, n: 1 });
    }
  }
  const toCheck = [...linkCount.values()].sort((a, b) => b.n - a.n).slice(0, MAX_LINK_CHECKS);
  const linkChecks: SiteAudit["linkChecks"] = [];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (toCheck.length) {
        const { url } = toCheck.shift()!;
        const remaining = deadline - Date.now();
        if (remaining < 1500) return;
        try {
          const r = await fetchResource(url, { headersOnly: true, allow, timeoutMs: Math.min(AUX_TIMEOUT_MS, remaining) });
          if (r.blockedUrl) continue; // robots.txt: not ours to check
          linkChecks.push({ url, status: r.status });
        } catch (e) {
          linkChecks.push({ url, status: null, error: errorText(e) });
        }
      }
    }),
  );

  const h = homeExtract.audit;
  return {
    pages,
    signals: {
      hasHttps: homeUrl.protocol === "https:",
      hasMetaDescription: Boolean(h.description),
      h1Count: h.h1Count,
      hasContactForm: h.hasForm,
      hasPhoneNumber: h.hasPhone,
      hasSchemaMarkup: h.jsonLd.blocks > 0,
      imagesMissingAlt: h.images.missingAlt + h.images.emptyAlt,
      socialLinks: homeExtract.socialLinks,
    },
    audit: {
      startUrl,
      finalUrl: home.finalUrl,
      homeBlocked: false,
      robots: robotsSummary(homeRobots),
      sitemap,
      entries,
      pages: audits,
      linkChecks,
      variants,
      durationMs: Date.now() - started,
      limits,
    },
  };
}

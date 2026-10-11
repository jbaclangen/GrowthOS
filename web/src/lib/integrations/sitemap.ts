// XML sitemaps (sitemaps.org protocol): find page URLs to seed the crawl. Pure parsing plus a loader that takes
// the SSRF-safe fetch from crawler.ts (and the robots check), so it is unit-tested without a network.
// Limits: at most 3 child sitemaps from a sitemap index, 200 URLs in total, and only URLs on the site's own host
// (www and non-www count as the same site). Gzipped sitemap files (.xml.gz) aren't read.

import type { TextFetcher } from "./robots";

export const MAX_SITEMAP_URLS = 200;
export const MAX_CHILD_SITEMAPS = 3;
const MAX_SITEMAP_FILES = 4; // the first sitemap tried plus up to 3 children

export type ParsedSitemap = { kind: "index" | "urlset" | "unknown"; locs: string[] };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(s: string) {
  return s
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => ENTITIES[e])
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .trim();
}

export function parseSitemap(xml: string): ParsedSitemap {
  const kind = /<(?:\w+:)?sitemapindex[\s>]/i.test(xml) ? "index" : /<(?:\w+:)?urlset[\s>]/i.test(xml) ? "urlset" : "unknown";
  const locs: string[] = [];
  for (const m of xml.matchAll(/<(?:\w+:)?loc>([\s\S]*?)<\/(?:\w+:)?loc>/gi)) {
    const loc = decodeXml(m[1].trim());
    if (loc) locs.push(loc);
  }
  return { kind, locs };
}

export const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

export function sameSite(url: string, siteHost: string) {
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") && bareHost(u.hostname) === bareHost(siteHost);
  } catch {
    return false;
  }
}

// Only 3 child sitemaps are read, so read the ones most likely to list business pages first: page sitemaps, then
// others, then posts, tags, categories and authors (WordPress/Yoast-style names). Order is otherwise kept.
export function orderChildSitemaps(locs: string[]) {
  const rank = (u: string) => (/page/i.test(u) ? 0 : /post|blog|news|article|tag|categor|author|archive/i.test(u) ? 2 : 1);
  return locs.map((u, i) => ({ u, i })).sort((a, b) => rank(a.u) - rank(b.u) || a.i - b.i).map((x) => x.u);
}

export type SitemapResult = {
  // Sitemap files we tried, with what happened.
  files: { url: string; status: number | null; kind: ParsedSitemap["kind"] | null; error?: string }[];
  urls: string[];
  found: boolean;
  capped: boolean;
};

// Reads the sitemap(s): the ones robots.txt lists (same site only), else /sitemap.xml. `allowed` is the
// robots.txt check, so a disallowed sitemap file isn't fetched either.
export async function loadSitemaps(opts: {
  siteOrigin: string;
  listed: string[];
  fetchText: TextFetcher;
  allowed?: (url: string) => boolean | Promise<boolean>;
  maxUrls?: number;
}): Promise<SitemapResult> {
  const { siteOrigin, fetchText } = opts;
  const maxUrls = opts.maxUrls ?? MAX_SITEMAP_URLS;
  const siteHost = new URL(siteOrigin).hostname;
  const listed = opts.listed.filter((u) => sameSite(u, siteHost));
  const queue = listed.length ? [...new Set(listed)] : [`${siteOrigin.replace(/\/$/, "")}/sitemap.xml`];
  const result: SitemapResult = { files: [], urls: [], found: false, capped: false };
  const seen = new Set<string>();
  const seenFiles = new Set<string>();
  let children = 0;

  while (queue.length && result.files.length < MAX_SITEMAP_FILES && result.urls.length < maxUrls) {
    const fileUrl = queue.shift()!;
    if (seenFiles.has(fileUrl)) continue;
    seenFiles.add(fileUrl);
    if (opts.allowed && !(await opts.allowed(fileUrl))) {
      result.files.push({ url: fileUrl, status: null, kind: null, error: "blocked by robots.txt" });
      continue;
    }
    let status: number;
    let body: string;
    try {
      ({ status, body } = await fetchText(fileUrl));
    } catch (e) {
      result.files.push({ url: fileUrl, status: null, kind: null, error: e instanceof Error ? e.message : String(e) });
      continue;
    }
    if (status < 200 || status >= 300) {
      result.files.push({ url: fileUrl, status, kind: null });
      continue;
    }
    const parsed = parseSitemap(body);
    result.files.push({ url: fileUrl, status, kind: parsed.kind });
    if (parsed.kind === "index") {
      result.found = true;
      for (const child of orderChildSitemaps(parsed.locs)) {
        if (children >= MAX_CHILD_SITEMAPS) break;
        if (!sameSite(child, siteHost) || seenFiles.has(child)) continue;
        queue.push(child);
        children++;
      }
    } else if (parsed.kind === "urlset") {
      result.found = true;
      for (const loc of parsed.locs) {
        if (!sameSite(loc, siteHost)) continue;
        const key = loc.split("#")[0];
        if (seen.has(key)) continue;
        if (result.urls.length >= maxUrls) {
          result.capped = true;
          break;
        }
        seen.add(key);
        result.urls.push(key);
      }
    }
  }
  return result;
}

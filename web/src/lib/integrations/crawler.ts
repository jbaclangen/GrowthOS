import "server-only";
import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import type { Readable } from "node:stream";
import zlib from "node:zlib";
import * as cheerio from "cheerio";

export type CrawledPage = { url: string; title: string; description: string; text: string };

export type CrawlResult = {
  pages: CrawledPage[];
  signals: {
    hasHttps: boolean;
    hasMetaDescription: boolean;
    h1Count: number;
    hasContactForm: boolean;
    hasPhoneNumber: boolean;
    hasSchemaMarkup: boolean;
    imagesMissingAlt: number;
    socialLinks: string[];
  };
};

const USER_AGENT = "Mozilla/5.0 (compatible; Braventa/0.1; +https://braventa.io)";
const MAX_PAGES = 6;
const MAX_TEXT_PER_PAGE = 6000;
// Pages most likely to describe the business, in priority order.
const PRIORITY = /about|service|what-we-do|solutions|products|pricing|contact|team|work|portfolio/i;

const MAX_BYTES = 2 * 1024 * 1024; // per page; anything past this is dropped
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15000; // per page, across all redirect hops

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

function assertCrawlable(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new BlockedUrlError(`${url.protocol} links can't be analyzed`);
  if (url.port && url.port !== "80" && url.port !== "443") throw new BlockedUrlError("Only standard web ports (80 and 443) can be analyzed");
  if (url.username || url.password) throw new BlockedUrlError("Addresses with a username or password can't be analyzed");
  // Literal IPs skip DNS lookup when connecting, so check them here.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedAddress(host)) throw new BlockedUrlError(`${host} is a private or reserved network address`);
}

type Hop = { status: number; location?: string; body: string };

function requestOnce(url: URL, signal: AbortSignal): Promise<Hop> {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html", "Accept-Encoding": "gzip, deflate, br" },
        lookup: safeLookup,
        agent: false, // never reuse a pooled socket opened without safeLookup
        signal,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, location: res.headers.location, body: "" });
        }
        const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
        let stream: Readable = res;
        if (encoding === "gzip" || encoding === "deflate") stream = res.pipe(zlib.createUnzip());
        else if (encoding === "br") stream = res.pipe(zlib.createBrotliDecompress());

        // Count decoded bytes so a compressed response can't expand past the cap.
        const chunks: Buffer[] = [];
        let size = 0;
        const finish = () => resolve({ status, body: Buffer.concat(chunks).toString("utf8") });
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

// GET with SSRF checks on every redirect hop, a size cap, and one timeout for the whole chain.
async function fetchHtml(input: string) {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = new URL(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertCrawlable(url);
    const res = await requestOnce(url, signal);
    if (res.location) {
      url = new URL(res.location, url);
      continue;
    }
    if (res.status < 200 || res.status >= 300) throw new Error(`${url} returned ${res.status}`);
    return { html: res.body, finalUrl: url.toString() };
  }
  throw new Error(`${input} redirected more than ${MAX_REDIRECTS} times`);
}

function extractPage(url: string, html: string): CrawledPage {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_PER_PAGE);
  return {
    url,
    title: $("title").first().text().trim(),
    description: $('meta[name="description"]').attr("content")?.trim() ?? "",
    text,
  };
}

export function normalizeUrl(input: string) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input) && !/^https?:\/\//i.test(input)) throw new BlockedUrlError("Only http and https addresses can be analyzed");
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(withScheme);
  url.hash = "";
  return url.toString();
}

export async function crawlSite(inputUrl: string): Promise<CrawlResult> {
  const { html: homeHtml, finalUrl } = await fetchHtml(normalizeUrl(inputUrl));
  const home = new URL(finalUrl);
  const $ = cheerio.load(homeHtml);

  const links = new Set<string>();
  const socialLinks = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const u = new URL(href, home);
      if (/facebook|instagram|linkedin|tiktok|youtube|twitter|x\.com/i.test(u.hostname)) {
        socialLinks.add(u.hostname.replace(/^www\./, ""));
      }
      if (u.hostname === home.hostname && u.pathname !== home.pathname && !/\.(pdf|jpg|png|zip)$/i.test(u.pathname)) {
        u.hash = "";
        u.search = "";
        links.add(u.toString());
      }
    } catch {
      // ignore malformed links
    }
  });

  const candidates = [...links]
    .sort((a, b) => Number(PRIORITY.test(b)) - Number(PRIORITY.test(a)))
    .slice(0, MAX_PAGES - 1);

  const subpages = await Promise.allSettled(
    candidates.map(async (u) => extractPage(u, (await fetchHtml(u)).html)),
  );

  const pages = [
    extractPage(finalUrl, homeHtml),
    ...subpages.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
  ];

  return {
    pages,
    signals: {
      hasHttps: home.protocol === "https:",
      hasMetaDescription: Boolean($('meta[name="description"]').attr("content")),
      h1Count: $("h1").length,
      hasContactForm: $("form").length > 0,
      hasPhoneNumber: /(\+?\d[\d\s().-]{7,}\d)/.test($("body").text()) || $('a[href^="tel:"]').length > 0,
      hasSchemaMarkup: $('script[type="application/ld+json"]').length > 0,
      imagesMissingAlt: $("img:not([alt]), img[alt='']").length,
      socialLinks: [...socialLinks],
    },
  };
}

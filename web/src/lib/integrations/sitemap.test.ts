import { describe, expect, it } from "vitest";
import { loadSitemaps, orderChildSitemaps, parseSitemap, sameSite } from "./sitemap";

const urlset = (locs: string[]) =>
  `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs.map((l) => `<url><loc>${l}</loc></url>`).join("")}</urlset>`;
const index = (locs: string[]) =>
  `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs.map((l) => `<sitemap><loc>${l}</loc></sitemap>`).join("")}</sitemapindex>`;

describe("parseSitemap", () => {
  it("reads a urlset with entities and CDATA", () => {
    const p = parseSitemap(urlset(["https://a.test/a?x=1&amp;y=2", "<![CDATA[https://a.test/b]]>", " https://a.test/c "]));
    expect(p.kind).toBe("urlset");
    expect(p.locs).toEqual(["https://a.test/a?x=1&y=2", "https://a.test/b", "https://a.test/c"]);
  });

  it("recognises a sitemap index and unknown documents", () => {
    expect(parseSitemap(index(["https://a.test/s1.xml"])).kind).toBe("index");
    expect(parseSitemap("<html><body>Not found</body></html>").kind).toBe("unknown");
  });
});

describe("sameSite", () => {
  it("treats www and non-www as the same site and rejects other hosts and schemes", () => {
    expect(sameSite("https://www.a.test/x", "a.test")).toBe(true);
    expect(sameSite("http://a.test/x", "www.a.test")).toBe(true);
    expect(sameSite("https://cdn.a.test/x", "a.test")).toBe(false);
    expect(sameSite("https://evil.test/x", "a.test")).toBe(false);
    expect(sameSite("ftp://a.test/x", "a.test")).toBe(false);
  });
});

describe("loadSitemaps", () => {
  const fetcher = (files: Record<string, string>) => async (url: string) =>
    url in files ? { status: 200, body: files[url] } : { status: 404, body: "" };

  it("falls back to /sitemap.xml and keeps only same-site URLs", async () => {
    const r = await loadSitemaps({
      siteOrigin: "https://a.test",
      listed: [],
      fetchText: fetcher({ "https://a.test/sitemap.xml": urlset(["https://a.test/a", "https://other.test/b", "https://www.a.test/c", "https://a.test/a#top"]) }),
    });
    expect(r.found).toBe(true);
    expect(r.urls).toEqual(["https://a.test/a", "https://www.a.test/c"]);
  });

  it("follows a sitemap index to at most 3 children, page sitemaps first", async () => {
    const children = ["post-sitemap.xml", "page-sitemap.xml", "a.xml", "b.xml", "c.xml"].map((n) => `https://a.test/${n}`);
    const files: Record<string, string> = { "https://a.test/index.xml": index(children) };
    for (const c of children) files[c] = urlset([`${c}/page`]);
    const fetched: string[] = [];
    const base = fetcher(files);
    const r = await loadSitemaps({
      siteOrigin: "https://a.test",
      listed: ["https://a.test/index.xml"],
      fetchText: async (u) => {
        fetched.push(u);
        return base(u);
      },
    });
    expect(fetched).toEqual(["https://a.test/index.xml", "https://a.test/page-sitemap.xml", "https://a.test/a.xml", "https://a.test/b.xml"]);
    expect(r.urls).toHaveLength(3);
  });

  it("caps the number of URLs", async () => {
    const locs = Array.from({ length: 250 }, (_, i) => `https://a.test/p${i}`);
    const r = await loadSitemaps({ siteOrigin: "https://a.test", listed: [], fetchText: fetcher({ "https://a.test/sitemap.xml": urlset(locs) }) });
    expect(r.urls).toHaveLength(200);
    expect(r.capped).toBe(true);
  });

  it("ignores listed sitemaps on other sites and skips files robots.txt disallows", async () => {
    const r = await loadSitemaps({
      siteOrigin: "https://a.test",
      listed: ["https://evil.test/sitemap.xml"],
      fetchText: fetcher({ "https://a.test/sitemap.xml": urlset(["https://a.test/x"]) }),
      allowed: () => false,
    });
    expect(r.files).toEqual([{ url: "https://a.test/sitemap.xml", status: null, kind: null, error: "blocked by robots.txt" }]);
    expect(r.urls).toEqual([]);
    expect(r.found).toBe(false);
  });

  it("records failures instead of throwing", async () => {
    const r = await loadSitemaps({
      siteOrigin: "https://a.test",
      listed: [],
      fetchText: async () => {
        throw new Error("timeout");
      },
    });
    expect(r.found).toBe(false);
    expect(r.files[0].error).toBe("timeout");
  });

  it("orders child sitemaps", () => {
    expect(orderChildSitemaps(["/post-sitemap.xml", "/x.xml", "/page-sitemap.xml"])).toEqual(["/page-sitemap.xml", "/x.xml", "/post-sitemap.xml"]);
  });
});

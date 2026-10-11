import { describe, expect, it } from "vitest";
import { BlockedUrlError, assertCrawlable, extractPage, isBlockedAddress, normalizeUrl, pageKey } from "./crawler";

describe("SSRF guards", () => {
  it("blocks private, loopback, link-local, metadata and reserved addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.5.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "64:ff9b::7f00:1", "2002:7f00:1::"]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it("allows public addresses and rejects non-IPs", () => {
    expect(isBlockedAddress("8.8.8.8")).toBe(false);
    expect(isBlockedAddress("2606:4700:4700::1111")).toBe(false);
    expect(isBlockedAddress("not-an-ip")).toBe(true);
  });

  it("rejects unsupported schemes, ports, credentials and literal private IPs", () => {
    const bad = ["ftp://a.test/", "https://a.test:8080/", "https://user:pw@a.test/", "http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest/meta-data"];
    for (const u of bad) expect(() => assertCrawlable(new URL(u)), u).toThrow(BlockedUrlError);
    expect(() => assertCrawlable(new URL("https://example.com/"))).not.toThrow();
    expect(() => assertCrawlable(new URL("http://example.com:80/"))).not.toThrow();
  });

  it("normalizes URLs and refuses other schemes", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
    expect(normalizeUrl("http://example.com/a#b")).toBe("http://example.com/a");
    expect(() => normalizeUrl("file:///etc/passwd")).toThrow(BlockedUrlError);
  });
});

describe("pageKey", () => {
  it("ignores www, trailing slashes, query and scheme", () => {
    expect(pageKey("https://www.a.test/about/")).toBe("a.test/about");
    expect(pageKey("http://a.test/about?x=1")).toBe("a.test/about");
    expect(pageKey("https://a.test/")).toBe("a.test/");
  });
});

describe("extractPage", () => {
  const html = `<!doctype html><html><head>
    <title> Roofing in Austin </title>
    <meta name="Description" content="We fix roofs.">
    <meta name="robots" content="noindex, follow">
    <meta property="og:title" content="Roofing">
    <link rel="canonical" href="/roofing">
    <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"LocalBusiness"},{"@type":["WebPage","FAQPage"]}]}</script>
    <script type="application/ld+json">{ broken json </script>
    <script src="/app.js"></script>
  </head><body>
    <h1>Roofing</h1><h1>Again</h1><h2>Sub</h2>
    <p>We repair and replace roofs across Austin. Call (512) 555-0100.</p>
    <img src="a.jpg"><img src="b.jpg" alt=""><img src="c.jpg" alt="Crew on a roof">
    <a href="/contact">Contact</a><a href="https://www.a.test/services#x">Services</a><a href="/brochure.pdf">PDF</a>
    <a href="https://facebook.com/acme">FB</a><a href="mailto:x@a.test">Mail</a>
    <form></form>
  </body></html>`;
  const { page, audit, socialLinks } = extractPage(html, {
    url: "https://a.test/roofing-austin",
    requestedUrl: "https://a.test/roofing-austin",
    source: "link",
    status: 200,
    redirects: [],
    xRobotsTag: "",
  });

  it("reads title, description, robots, canonical and Open Graph", () => {
    expect(page.title).toBe("Roofing in Austin");
    expect(audit.description).toBe("We fix roofs.");
    expect(audit.metaRobots).toBe("noindex, follow");
    expect(audit.canonicals).toEqual(["https://a.test/roofing"]);
    expect(audit.openGraph).toEqual({ title: true, description: false, image: false });
  });

  it("counts headings, images and words, and finds forms and phone numbers", () => {
    expect(audit.h1Count).toBe(2);
    expect(audit.h2Count).toBe(1);
    expect(audit.images).toEqual({ total: 3, missingAlt: 1, emptyAlt: 1 });
    expect(audit.wordCount).toBeGreaterThan(10);
    expect(audit.hasForm).toBe(true);
    expect(audit.hasPhone).toBe(true);
    expect(audit.scriptCount).toBe(1);
  });

  it("parses JSON-LD types including @graph and counts invalid blocks", () => {
    expect(audit.jsonLd.blocks).toBe(2);
    expect(audit.jsonLd.invalid).toBe(1);
    expect(audit.jsonLd.types).toEqual(["LocalBusiness", "WebPage", "FAQPage"]);
  });

  it("keeps same-site page links without fragments or files, and social hosts", () => {
    expect(audit.internalLinks).toEqual(["https://a.test/contact", "https://www.a.test/services"]);
    expect(socialLinks).toEqual(["facebook.com"]);
  });

  it("hashes the text so identical pages can be compared", () => {
    const again = extractPage(html, { url: "https://a.test/copy", requestedUrl: "https://a.test/copy", source: "sitemap", status: 200, redirects: [], xRobotsTag: "" });
    expect(again.audit.contentHash).toBe(audit.contentHash);
  });
});

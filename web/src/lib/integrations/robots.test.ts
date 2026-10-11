import { describe, expect, it } from "vitest";
import { isAllowed, isAllowedPath, loadRobots, matchingRule, parseRobots, rulesFor, type Robots } from "./robots";

const robots = (text: string): Robots => {
  const parsed = parseRobots(text);
  return { url: "https://a.test/robots.txt", status: "found", httpStatus: 200, ...rulesFor(parsed), sitemaps: parsed.sitemaps };
};

describe("parseRobots", () => {
  it("groups consecutive user-agent lines and collects global sitemap lines", () => {
    const p = parseRobots(`# comment
User-agent: Googlebot
User-agent: Bingbot
Disallow: /private
Sitemap: https://a.test/sitemap.xml

User-agent: *
Allow: /
Disallow: /admin # trailing comment
sitemap: https://a.test/other.xml`);
    expect(p.groups).toHaveLength(2);
    expect(p.groups[0].agents).toEqual(["googlebot", "bingbot"]);
    expect(p.groups[0].rules).toEqual([{ allow: false, pattern: "/private" }]);
    expect(p.groups[1].rules).toEqual([
      { allow: true, pattern: "/" },
      { allow: false, pattern: "/admin" },
    ]);
    expect(p.sitemaps).toEqual(["https://a.test/sitemap.xml", "https://a.test/other.xml"]);
  });

  it("ignores rules before any user-agent and empty Disallow lines", () => {
    const p = parseRobots("Disallow: /x\nUser-agent: *\nDisallow:\n");
    expect(p.groups).toEqual([{ agents: ["*"], rules: [] }]);
  });
});

describe("rulesFor", () => {
  it("prefers the Braventa group over *, case-insensitively, merging duplicate groups", () => {
    const r = robots(`User-agent: *
Disallow: /

User-agent: BRAVENTA
Allow: /

User-agent: braventa
Disallow: /secret`);
    expect(r.appliesTo).toBe("braventa");
    expect(isAllowed(r, "https://a.test/about")).toBe(true);
    expect(isAllowed(r, "https://a.test/secret/page")).toBe(false);
  });

  it("falls back to * and allows everything without a matching group", () => {
    expect(robots("User-agent: *\nDisallow: /x").appliesTo).toBe("*");
    const none = robots("User-agent: Googlebot\nDisallow: /");
    expect(none.appliesTo).toBeNull();
    expect(isAllowed(none, "https://a.test/anything")).toBe(true);
  });

  it("matches a versioned product token", () => {
    expect(robots("User-agent: Braventa/0.1\nDisallow: /").appliesTo).toBe("braventa");
  });
});

describe("matching", () => {
  const rules = parseRobots(`User-agent: *
Disallow: /private
Allow: /private/public
Disallow: /*.pdf$
Disallow: /search?
Disallow: /*/drafts/
Allow: /page$`).groups[0].rules;

  it("uses the longest matching pattern", () => {
    expect(isAllowedPath(rules, "/private/x")).toBe(false);
    expect(isAllowedPath(rules, "/private/public/x")).toBe(true);
    expect(isAllowedPath(rules, "/privateer")).toBe(false); // prefix match, as the standard says
  });

  it("supports * and $ wildcards", () => {
    expect(isAllowedPath(rules, "/files/report.pdf")).toBe(false);
    expect(isAllowedPath(rules, "/files/report.pdf?v=2")).toBe(true); // $ anchors the end
    expect(isAllowedPath(rules, "/blog/drafts/one")).toBe(false);
    expect(isAllowedPath(rules, "/search?q=roof")).toBe(false);
    expect(isAllowedPath(rules, "/search")).toBe(true);
  });

  it("lets Allow win a tie of equal length", () => {
    const tie = parseRobots("User-agent: *\nDisallow: /page\nAllow: /page").groups[0].rules;
    expect(matchingRule(tie, "/page")?.allow).toBe(true);
  });

  it("disallows everything with Disallow: / but always allows /robots.txt", () => {
    const r = robots("User-agent: *\nDisallow: /");
    expect(isAllowed(r, "https://a.test/")).toBe(false);
    expect(isAllowed(r, "https://a.test/robots.txt")).toBe(true);
  });

  it("compares percent-encoded paths in a normalised form", () => {
    const enc = parseRobots("User-agent: *\nDisallow: /café").groups[0].rules;
    expect(isAllowedPath(enc, "/caf%C3%A9/menu")).toBe(false);
  });
});

describe("loadRobots", () => {
  it("parses a 200 response", async () => {
    const r = await loadRobots("https://a.test", async () => ({ status: 200, body: "User-agent: *\nDisallow: /x\nSitemap: https://a.test/s.xml" }));
    expect(r).toMatchObject({ url: "https://a.test/robots.txt", status: "found", appliesTo: "*", sitemaps: ["https://a.test/s.xml"] });
  });

  it("treats 4xx as no rules (allow all)", async () => {
    const r = await loadRobots("https://a.test/", async () => ({ status: 404, body: "" }));
    expect(r.status).toBe("missing");
    expect(isAllowed(r, "https://a.test/anything")).toBe(true);
  });

  it("treats 5xx and network errors as unreachable (disallow all)", async () => {
    const r5 = await loadRobots("https://a.test", async () => ({ status: 503, body: "" }));
    expect(r5.status).toBe("unreachable");
    expect(isAllowed(r5, "https://a.test/")).toBe(false);
    const rErr = await loadRobots("https://a.test", async () => {
      throw new Error("ECONNRESET");
    });
    expect(rErr.status).toBe("unreachable");
  });

  it("rethrows errors the caller picks out", async () => {
    class Fatal extends Error {}
    await expect(
      loadRobots("https://a.test", async () => {
        throw new Fatal("private address");
      }, { rethrow: (e) => e instanceof Fatal }),
    ).rejects.toBeInstanceOf(Fatal);
  });
});

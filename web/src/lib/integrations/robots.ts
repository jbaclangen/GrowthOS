// robots.txt (RFC 9309): parse the rules for Braventa's crawler and decide whether a URL may be fetched.
// Pure logic plus a loader that takes the SSRF-safe fetch from crawler.ts, so it is unit-tested without a network.
//
// Rules that apply to us: the group(s) naming our product token ("Braventa") if any, otherwise the "*" group(s);
// several groups for the same agent are merged. Within the rules, the longest matching pattern wins and Allow
// wins a tie. Patterns support "*" (any characters) and a trailing "$" (end of URL). An empty Disallow allows
// everything. /robots.txt itself is always allowed.

export const ROBOTS_AGENT = "braventa";

export type RobotsRule = { allow: boolean; pattern: string };
export type RobotsGroup = { agents: string[]; rules: RobotsRule[] };
export type ParsedRobots = { groups: RobotsGroup[]; sitemaps: string[] };

// How the file was obtained. 4xx means "no rules" (allow all); a server error or no answer means we must assume
// everything is disallowed (RFC 9309 §2.3.1.4).
export type RobotsStatus = "found" | "missing" | "unreachable";

export type Robots = {
  url: string;
  status: RobotsStatus;
  httpStatus: number | null;
  // Which group applied to us: our own, the "*" group, or none (no rules for us).
  appliesTo: "braventa" | "*" | null;
  rules: RobotsRule[];
  sitemaps: string[];
};

const MAX_ROBOTS_CHARS = 500 * 1024; // RFC 9309: parse at least 500 KiB

export function parseRobots(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.slice(0, MAX_ROBOTS_CHARS).split(/\r\n|\r|\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === "user-agent") {
      // Consecutive user-agent lines share one group; a user-agent after rules starts a new group.
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key === "allow" || key === "disallow") {
      lastWasAgent = false;
      if (!current) continue; // rules before any user-agent line belong to no group
      if (key === "disallow" && value === "") continue; // "Disallow:" with no path allows everything
      if (value === "") continue;
      current.rules.push({ allow: key === "allow", pattern: value });
    } else if (key === "sitemap") {
      // Sitemap lines are global and don't belong to a group.
      if (value) sitemaps.push(value);
    }
    // Other keys (crawl-delay, host, …) are ignored and don't split a run of user-agent lines.
  }
  return { groups, sitemaps };
}

// Our product token matches a group's user-agent case-insensitively (RFC 9309 §2.2.1).
function matchesAgent(agent: string, token: string) {
  return agent === token || agent.split("/")[0].trim() === token;
}

export function rulesFor(parsed: ParsedRobots, token = ROBOTS_AGENT): { appliesTo: Robots["appliesTo"]; rules: RobotsRule[] } {
  const own = parsed.groups.filter((g) => g.agents.some((a) => matchesAgent(a, token)));
  if (own.length) return { appliesTo: "braventa", rules: own.flatMap((g) => g.rules) };
  const star = parsed.groups.filter((g) => g.agents.includes("*"));
  if (star.length) return { appliesTo: "*", rules: star.flatMap((g) => g.rules) };
  return { appliesTo: null, rules: [] };
}

// Percent-encoding is compared in a normalised form, so "/caf%C3%A9" and "/café" match the same rule.
function normalisePath(path: string) {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

const regexCache = new Map<string, RegExp>();
function patternRegex(pattern: string) {
  let re = regexCache.get(pattern);
  if (!re) {
    const anchored = pattern.endsWith("$");
    const body = normalisePath(anchored ? pattern.slice(0, -1) : pattern)
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    re = new RegExp(`^${body}${anchored ? "$" : ""}`);
    regexCache.set(pattern, re);
  }
  return re;
}

// The rule that decides a path ("/a/b?x=1"), or null when no rule matches (allowed).
export function matchingRule(rules: RobotsRule[], pathWithQuery: string): RobotsRule | null {
  const path = normalisePath(pathWithQuery || "/");
  let best: RobotsRule | null = null;
  for (const rule of rules) {
    if (!patternRegex(rule.pattern).test(path)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow && !best.allow)
    ) {
      best = rule;
    }
  }
  return best;
}

export function isAllowedPath(rules: RobotsRule[], pathWithQuery: string) {
  if (pathWithQuery === "/robots.txt") return true;
  return matchingRule(rules, pathWithQuery)?.allow ?? true;
}

export function isAllowed(robots: Robots, url: string | URL) {
  const u = typeof url === "string" ? new URL(url) : url;
  if (u.pathname === "/robots.txt") return true;
  if (robots.status === "unreachable") return false;
  return isAllowedPath(robots.rules, `${u.pathname}${u.search}`);
}

export type TextFetcher = (url: string) => Promise<{ status: number; body: string }>;

// Fetches and parses robots.txt for an origin ("https://example.com"). Network errors count as unreachable, except
// errors `rethrow` picks out (the crawler rethrows its SSRF refusals so they surface as before).
export async function loadRobots(
  origin: string,
  fetchText: TextFetcher,
  opts: { rethrow?: (e: unknown) => boolean } = {},
): Promise<Robots> {
  const url = `${origin.replace(/\/$/, "")}/robots.txt`;
  let status: number;
  let body = "";
  try {
    ({ status, body } = await fetchText(url));
  } catch (e) {
    if (opts.rethrow?.(e)) throw e;
    return { url, status: "unreachable", httpStatus: null, appliesTo: null, rules: [], sitemaps: [] };
  }
  if (status >= 200 && status < 300) {
    const parsed = parseRobots(body);
    return { url, status: "found", httpStatus: status, ...rulesFor(parsed), sitemaps: parsed.sitemaps };
  }
  if (status >= 400 && status < 500) {
    return { url, status: "missing", httpStatus: status, appliesTo: null, rules: [], sitemaps: [] };
  }
  return { url, status: "unreachable", httpStatus: status, appliesTo: null, rules: [], sitemaps: [] };
}

// The group a site owner can add so Braventa may read the site (shown in the report when we're blocked).
export const ALLOW_BRAVENTA_SNIPPET = "User-agent: Braventa\nAllow: /";

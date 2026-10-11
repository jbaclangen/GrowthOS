import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "./secret-box";
import { GoogleOAuthError, mintAccessToken, revokeToken } from "./google-oauth";
import { searchConsoleAccess } from "./search-console-access";

// Google Search Console client, normalization and sync (Pro, Website Intelligence blueprint §3.5).
// Read-only: sites list, Search Analytics (last 28 days vs the 28 before), sitemaps and URL Inspection for the
// home page. Every function that touches the database takes an organization id the caller has already authorised;
// `db` is the service client (it reads the encrypted refresh token, which clients can't).
// Search Console doesn't report every query (Google omits anonymized and rare queries) and its data lags a few days.

export const PROVIDER = "google_search_console";
const API = "https://www.googleapis.com/webmasters/v3";
const INSPECT_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
export const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const TOP_ROWS = 25;
const KEEP_SNAPSHOTS = 12;
const DATA_LAG_DAYS = 3;
const RANGE_DAYS = 28;

// --- Types -------------------------------------------------------------------------------------------------------

export type Metrics = { clicks: number; impressions: number; ctr: number; position: number };
export type Row = Metrics & { key: string };
export type Sitemap = {
  path: string;
  lastSubmitted: string | null;
  lastDownloaded: string | null;
  isPending: boolean;
  errors: number;
  warnings: number;
  submitted: number;
};
export type Inspection = {
  url: string;
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  robotsTxtState: string | null;
  lastCrawlTime: string | null;
  googleCanonical: string | null;
  link: string | null;
};
export type DateRange = { start: string; end: string };
export type SnapshotTotals = { current: Metrics; previous: Metrics; previousRange: DateRange };
export type SnapshotRows = {
  queries: Row[];
  pages: Row[];
  devices: Row[];
  sitemaps: Sitemap[] | null;
  inspection: Inspection | null;
  notes: string[];
};
export type Snapshot = {
  property: string;
  date_range_start: string;
  date_range_end: string;
  totals: SnapshotTotals;
  rows: SnapshotRows;
  fetched_at: string;
};

export class SearchConsoleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// --- Pure helpers (unit-tested) ------------------------------------------------------------------------------------

const ZERO: Metrics = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown, max = 2048) => (typeof v === "string" && v ? v.slice(0, max) : null);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

// Last 28 days of final data (Search Console lags ~2–3 days) and the 28 days before.
export function dateRanges(now = new Date()): { current: DateRange; previous: DateRange } {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = addDays(today, -DATA_LAG_DAYS);
  const start = addDays(end, -(RANGE_DAYS - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(RANGE_DAYS - 1));
  return { current: { start: isoDate(start), end: isoDate(end) }, previous: { start: isoDate(prevStart), end: isoDate(prevEnd) } };
}

function metrics(r: Record<string, unknown> | undefined): Metrics {
  if (!r) return { ...ZERO };
  return {
    clicks: num(r.clicks),
    impressions: num(r.impressions),
    ctr: num(r.ctr),
    position: Math.round(num(r.position) * 10) / 10,
  };
}

export function normalizeTotals(resp: unknown): Metrics {
  const rows = (resp as { rows?: Record<string, unknown>[] } | null)?.rows;
  return metrics(Array.isArray(rows) ? rows[0] : undefined);
}

export function normalizeRows(resp: unknown, limit = TOP_ROWS): Row[] {
  const rows = (resp as { rows?: Record<string, unknown>[] } | null)?.rows;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({ key: str((r.keys as unknown[] | undefined)?.[0], 500) ?? "", ...metrics(r) }))
    .filter((r) => r.key)
    .slice(0, limit);
}

export function normalizeSitemaps(resp: unknown): Sitemap[] {
  const list = (resp as { sitemap?: Record<string, unknown>[] } | null)?.sitemap;
  if (!Array.isArray(list)) return [];
  return list.slice(0, 50).map((s) => ({
    path: str(s.path) ?? "",
    lastSubmitted: str(s.lastSubmitted, 40),
    lastDownloaded: str(s.lastDownloaded, 40),
    isPending: s.isPending === true,
    errors: Number(s.errors ?? 0) || 0,
    warnings: Number(s.warnings ?? 0) || 0,
    submitted: Array.isArray(s.contents)
      ? (s.contents as { submitted?: string | number }[]).reduce((n, c) => n + (Number(c.submitted ?? 0) || 0), 0)
      : 0,
  }));
}

export function normalizeInspection(resp: unknown, url: string): Inspection | null {
  const result = (resp as { inspectionResult?: Record<string, unknown> } | null)?.inspectionResult;
  if (!result) return null;
  const idx = (result.indexStatusResult ?? {}) as Record<string, unknown>;
  return {
    url,
    verdict: str(idx.verdict, 40),
    coverageState: str(idx.coverageState, 200),
    indexingState: str(idx.indexingState, 60),
    pageFetchState: str(idx.pageFetchState, 60),
    robotsTxtState: str(idx.robotsTxtState, 60),
    lastCrawlTime: str(idx.lastCrawlTime, 40),
    googleCanonical: str(idx.googleCanonical),
    link: str(result.inspectionResultLink),
  };
}

// Only properties the account is verified for return data.
export function verifiedProperties(resp: unknown): string[] {
  const list = (resp as { siteEntry?: { siteUrl?: string; permissionLevel?: string }[] } | null)?.siteEntry;
  if (!Array.isArray(list)) return [];
  return list
    .filter((s) => typeof s.siteUrl === "string" && s.permissionLevel !== "siteUnverifiedUser")
    .map((s) => s.siteUrl as string)
    .sort();
}

// Ranks the account's properties for the analyzed website, best first. Domain properties (sc-domain:) cover every
// protocol and subdomain, so they rank above URL-prefix ones. Non-matching properties are left out.
function rankedMatches(websiteUrl: string, properties: string[]): { property: string; rank: number }[] {
  let site: URL;
  try {
    site = new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`);
  } catch {
    return [];
  }
  const host = site.hostname.toLowerCase();
  const bare = host.replace(/^www\./, "");
  const ranked: { property: string; rank: number }[] = [];
  for (const property of properties) {
    let rank: number | null = null;
    if (property.startsWith("sc-domain:")) {
      const domain = property.slice("sc-domain:".length).toLowerCase();
      if (domain === bare || domain === host) rank = 0;
      else if (host.endsWith(`.${domain}`)) rank = 1;
    } else {
      try {
        const p = new URL(property);
        if (p.hostname.toLowerCase().replace(/^www\./, "") !== bare) continue;
        const sameOrigin = p.origin.toLowerCase() === site.origin.toLowerCase();
        if (p.pathname === "/") rank = sameOrigin ? 2 : 3;
        else if (sameOrigin && site.pathname.startsWith(p.pathname)) rank = 4;
      } catch {
        continue;
      }
    }
    if (rank !== null) ranked.push({ property, rank });
  }
  return ranked.sort((a, b) => a.rank - b.rank || a.property.localeCompare(b.property));
}

export function matchProperties(websiteUrl: string, properties: string[]): string[] {
  return rankedMatches(websiteUrl, properties).map((r) => r.property);
}

// The property to use without asking: only when one match is clearly best. Otherwise the owner picks in Settings.
export function pickProperty(websiteUrl: string, properties: string[]): string | null {
  const [first, second] = rankedMatches(websiteUrl, properties);
  if (!first) return null;
  return !second || second.rank !== first.rank ? first.property : null;
}

// The URL to inspect for a property: the website's home page, inside the property.
export function homeUrlFor(property: string, websiteUrl: string) {
  if (!property.startsWith("sc-domain:")) return property;
  try {
    return `${new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`).origin}/`;
  } catch {
    return `https://${property.slice(10)}/`;
  }
}

// Percent change, or null when there is nothing to compare against.
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function hasLittleData(totals: SnapshotTotals) {
  return totals.current.impressions < 10;
}

// User-facing wording for an API failure. Never includes tokens or raw responses.
export function describeError(e: unknown, property?: string | null): { status: "error" | "active"; message: string } {
  if (e instanceof GoogleOAuthError) {
    return {
      status: "error",
      message:
        e.code === "invalid_grant"
          ? "Google access expired or was removed in your Google account. Reconnect Search Console."
          : "Google didn't accept Braventa's access. Reconnect Search Console.",
    };
  }
  if (e instanceof SearchConsoleApiError) {
    if (e.status === 401) return { status: "error", message: "Google access expired. Reconnect Search Console." };
    if (e.status === 403)
      return {
        status: "error",
        message: property
          ? `This Google account can't read the Search Console property ${property}. Choose another property or reconnect with an account that has access.`
          : "This Google account can't read Search Console. Reconnect with an account that has access.",
      };
    if (e.status === 429)
      return { status: "active", message: "Google's Search Console limit is reached for now. Try again in a few hours." };
    if (e.status >= 500) return { status: "active", message: "Search Console didn't respond. Try again later." };
  }
  return { status: "active", message: "Search Console data couldn't be fetched. Try again later." };
}

// Compact, JSON-safe summary for a model prompt. Search queries are third-party data: treat them as untrusted input.
export function summarizeSnapshot(s: Snapshot) {
  const { current, previous, previousRange } = s.totals;
  const row = (r: Row) => ({ key: r.key, clicks: r.clicks, impressions: r.impressions, ctr: Math.round(r.ctr * 1000) / 10, position: r.position });
  return {
    source: "Google Search Console",
    property: s.property,
    period: { start: s.date_range_start, end: s.date_range_end },
    previous_period: previousRange,
    totals: {
      clicks: current.clicks,
      impressions: current.impressions,
      ctr_percent: Math.round(current.ctr * 1000) / 10,
      average_position: current.position,
      clicks_change_percent: percentChange(current.clicks, previous.clicks),
      impressions_change_percent: percentChange(current.impressions, previous.impressions),
    },
    little_data: hasLittleData(s.totals),
    top_queries: s.rows.queries.slice(0, 10).map(row),
    top_pages: s.rows.pages.slice(0, 10).map(row),
    devices: s.rows.devices.map((d) => ({ device: d.key, clicks: d.clicks, impressions: d.impressions })),
    sitemaps: s.rows.sitemaps?.map((m) => ({ path: m.path, errors: m.errors, warnings: m.warnings, submitted: m.submitted })) ?? null,
    home_page_index: s.rows.inspection
      ? { verdict: s.rows.inspection.verdict, coverage: s.rows.inspection.coverageState }
      : null,
    caveat: "Search Console doesn't show every query; anonymized and rare queries are omitted. Data lags a few days.",
    fetched_at: s.fetched_at,
  };
}

// --- Google API calls --------------------------------------------------------------------------------------------

async function gsc<T>(token: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new SearchConsoleApiError(res.status, `Search Console ${res.status}: ${data?.error?.message?.slice(0, 200) ?? "error"}`);
  }
  return (await res.json()) as T;
}

const site = (property: string) => `${API}/sites/${encodeURIComponent(property)}`;

export const listSites = (token: string) => gsc<unknown>(token, `${API}/sites`);

export const querySearchAnalytics = (token: string, property: string, range: DateRange, dimensions: string[], rowLimit = TOP_ROWS) =>
  gsc<unknown>(token, `${site(property)}/searchAnalytics/query`, {
    startDate: range.start,
    endDate: range.end,
    dimensions,
    rowLimit,
    dataState: "final",
  });

export const listSitemaps = (token: string, property: string) => gsc<unknown>(token, `${site(property)}/sitemaps`);

export const inspectUrl = (token: string, property: string, url: string) =>
  gsc<unknown>(token, INSPECT_URL, { inspectionUrl: url, siteUrl: property, languageCode: "en-US" });

// Fetches one snapshot. Performance queries must succeed; sitemaps and URL Inspection are optional extras.
export async function fetchSnapshot(token: string, property: string, websiteUrl: string, now = new Date()) {
  const { current, previous } = dateRanges(now);
  const homeUrl = homeUrlFor(property, websiteUrl);
  const [cur, prev, queries, pages, devices] = await Promise.all([
    querySearchAnalytics(token, property, current, []),
    querySearchAnalytics(token, property, previous, []),
    querySearchAnalytics(token, property, current, ["query"]),
    querySearchAnalytics(token, property, current, ["page"]),
    querySearchAnalytics(token, property, current, ["device"], 10),
  ]);
  const [sitemaps, inspection] = await Promise.allSettled([listSitemaps(token, property), inspectUrl(token, property, homeUrl)]);
  const notes: string[] = [];
  if (sitemaps.status === "rejected") notes.push("Sitemap data wasn't available.");
  if (inspection.status === "rejected") notes.push("Google's URL Inspection report for the home page wasn't available.");
  const totals: SnapshotTotals = { current: normalizeTotals(cur), previous: normalizeTotals(prev), previousRange: previous };
  const rows: SnapshotRows = {
    queries: normalizeRows(queries),
    pages: normalizeRows(pages),
    devices: normalizeRows(devices, 10),
    sitemaps: sitemaps.status === "fulfilled" ? normalizeSitemaps(sitemaps.value) : null,
    inspection: inspection.status === "fulfilled" ? normalizeInspection(inspection.value, homeUrl) : null,
    notes,
  };
  return { range: current, totals, rows };
}

// --- Database: connection lifecycle and sync ---------------------------------------------------------------------

type Db = SupabaseClient;

async function websiteFor(db: Db, organizationId: string) {
  const { data } = await db
    .from("business_profiles")
    .select("website_url")
    .eq("organization_id", organizationId)
    .not("website_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.website_url as string | undefined) ?? null;
}

// Stores a new connection (or replaces the existing one) after the OAuth callback. Revokes the replaced token.
export async function saveConnection(
  db: Db,
  c: { organizationId: string; userId: string; email: string | null; scopes: string[]; refreshToken: string },
) {
  const { data: existing } = await db
    .from("integration_connections")
    .select("id, refresh_token_ciphertext, google_account_email")
    .eq("organization_id", c.organizationId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (existing?.refresh_token_ciphertext) {
    try {
      await revokeToken(decryptSecret(existing.refresh_token_ciphertext));
    } catch {
      // Unreadable old token (key changed): nothing to revoke from here.
    }
  }
  // Another Google account means other data: drop the old snapshots.
  if (existing && existing.google_account_email !== c.email) {
    await db.from("search_console_snapshots").delete().eq("organization_id", c.organizationId);
  }
  const { error } = await db.from("integration_connections").upsert(
    {
      organization_id: c.organizationId,
      provider: PROVIDER,
      connected_by: c.userId,
      google_account_email: c.email,
      refresh_token_ciphertext: encryptSecret(c.refreshToken),
      scopes: c.scopes,
      available_properties: [],
      selected_property: null,
      status: "active",
      last_error: null,
      last_attempted_at: null,
    },
    { onConflict: "organization_id,provider" },
  );
  if (error) throw new Error("The Search Console connection wasn't saved.");
}

export type SyncResult =
  | { ok: true; property: string }
  | { ok: false; reason: "not-connected" | "paused" | "too-soon" | "needs-property" | "error"; message: string };

// Fetches and stores one snapshot for the organization. Guards: Pro access, one fetch per 10 minutes.
export async function syncSearchConsole(
  db: Db,
  organizationId: string,
  opts: { skipGuard?: boolean; now?: Date } = {},
): Promise<SyncResult> {
  const now = opts.now ?? new Date();
  const { data: conn } = await db
    .from("integration_connections")
    .select("id, refresh_token_ciphertext, selected_property, status, last_attempted_at")
    .eq("organization_id", organizationId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (!conn || conn.status === "revoked" || !conn.refresh_token_ciphertext) {
    return { ok: false, reason: "not-connected", message: "Search Console isn't connected." };
  }
  const update = (fields: Record<string, unknown>) =>
    db.from("integration_connections").update(fields).eq("id", conn.id).eq("organization_id", organizationId);

  const { data: org } = await db.from("organizations").select("plan, trial_ends_at").eq("id", organizationId).single();
  const access = org ? searchConsoleAccess(org, now) : { allowed: false as const, reason: "Organization not found." };
  if (!access.allowed) {
    if (conn.status !== "paused") await update({ status: "paused" });
    return { ok: false, reason: "paused", message: access.reason };
  }
  if (!opts.skipGuard && conn.last_attempted_at && now.getTime() - new Date(conn.last_attempted_at).getTime() < REFRESH_INTERVAL_MS) {
    return { ok: false, reason: "too-soon", message: "Search Console data was fetched in the last 10 minutes. Try again shortly." };
  }
  await update({ last_attempted_at: now.toISOString() });

  let property: string | null = conn.selected_property;
  try {
    let refreshToken: string;
    try {
      refreshToken = decryptSecret(conn.refresh_token_ciphertext);
    } catch {
      const message = "The stored Search Console connection can't be read. Reconnect Search Console.";
      await update({ status: "error", last_error: message });
      return { ok: false, reason: "error", message };
    }
    const token = await mintAccessToken(refreshToken);
    const available = verifiedProperties(await listSites(token));
    const websiteUrl = await websiteFor(db, organizationId);
    if (!property || !available.includes(property)) property = websiteUrl ? pickProperty(websiteUrl, available) : null;
    if (!property) {
      const message = available.length
        ? "Choose which Search Console property belongs to your website."
        : "This Google account has no verified Search Console property. Add your website in Search Console, or reconnect with the account that manages it.";
      await update({ status: "active", available_properties: available, selected_property: null, last_error: message });
      return { ok: false, reason: "needs-property", message };
    }
    const snap = await fetchSnapshot(token, property, websiteUrl ?? homeUrlFor(property, ""), now);
    const { error } = await db.from("search_console_snapshots").insert({
      organization_id: organizationId,
      connection_id: conn.id,
      property,
      date_range_start: snap.range.start,
      date_range_end: snap.range.end,
      dimensions: ["query", "page", "device"],
      totals: snap.totals,
      rows: snap.rows,
      fetched_at: now.toISOString(),
    });
    if (error) throw new Error("snapshot insert failed");
    await pruneSnapshots(db, organizationId);
    await update({
      status: "active",
      available_properties: available,
      selected_property: property,
      last_synced_at: now.toISOString(),
      last_error: null,
    });
    return { ok: true, property };
  } catch (e) {
    const { status, message } = describeError(e, property);
    await update({ status, last_error: message });
    return { ok: false, reason: "error", message };
  }
}

async function pruneSnapshots(db: Db, organizationId: string) {
  const { data: old } = await db
    .from("search_console_snapshots")
    .select("id")
    .eq("organization_id", organizationId)
    .order("fetched_at", { ascending: false })
    .range(KEEP_SNAPSHOTS, KEEP_SNAPSHOTS + 100);
  if (old?.length) {
    await db
      .from("search_console_snapshots")
      .delete()
      .eq("organization_id", organizationId)
      .in("id", old.map((r) => r.id));
  }
}

// Owner chose a property in Settings. Only properties the connected account can read are accepted.
// Returns "first" when no property was chosen before (the first fetch may then skip the 10-minute guard).
export async function selectProperty(db: Db, organizationId: string, property: string): Promise<"invalid" | "first" | "changed"> {
  const { data: conn } = await db
    .from("integration_connections")
    .select("id, available_properties, selected_property, status")
    .eq("organization_id", organizationId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (!conn || conn.status === "revoked") return "invalid";
  if (!(conn.available_properties as string[]).includes(property)) return "invalid";
  const { error } = await db
    .from("integration_connections")
    .update({ selected_property: property, last_error: null })
    .eq("id", conn.id)
    .eq("organization_id", organizationId);
  if (error) return "invalid";
  return conn.selected_property ? "changed" : "first";
}

// Revokes Braventa's access at Google, removes the token and deletes every snapshot for the organization.
export async function disconnectSearchConsole(db: Db, organizationId: string) {
  const { data: conn } = await db
    .from("integration_connections")
    .select("id, refresh_token_ciphertext")
    .eq("organization_id", organizationId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (!conn) return;
  if (conn.refresh_token_ciphertext) {
    try {
      await revokeToken(decryptSecret(conn.refresh_token_ciphertext));
    } catch {
      // Unreadable token: deleting it below still cuts Braventa off; the owner can also remove access in Google.
    }
  }
  const { error: snapError } = await db.from("search_console_snapshots").delete().eq("organization_id", organizationId);
  const { error } = await db
    .from("integration_connections")
    .update({
      refresh_token_ciphertext: null,
      status: "revoked",
      google_account_email: null,
      scopes: [],
      available_properties: [],
      selected_property: null,
      last_error: null,
    })
    .eq("id", conn.id)
    .eq("organization_id", organizationId);
  if (error || snapError) throw new Error("Search Console wasn't fully disconnected. Try again.");
}

export async function latestSnapshot(db: SupabaseClient, organizationId: string): Promise<Snapshot | null> {
  const { data } = await db
    .from("search_console_snapshots")
    .select("property, date_range_start, date_range_end, totals, rows, fetched_at")
    .eq("organization_id", organizationId)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Snapshot | null) ?? null;
}

// For the diagnosis prompt (wired in a later change). Null unless the connection is active, the organization has
// Pro access and a snapshot exists. Never includes tokens or the Google account email.
export async function searchConsoleSummaryForPrompt(db: Db, organizationId: string) {
  const [{ data: conn }, { data: org }] = await Promise.all([
    db.from("integration_connections").select("status").eq("organization_id", organizationId).eq("provider", PROVIDER).maybeSingle(),
    db.from("organizations").select("plan, trial_ends_at").eq("id", organizationId).maybeSingle(),
  ]);
  if (!conn || conn.status !== "active" || !org || !searchConsoleAccess(org).allowed) return null;
  const snap = await latestSnapshot(db, organizationId);
  return snap ? summarizeSnapshot(snap) : null;
}

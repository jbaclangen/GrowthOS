import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "./secret-box";
import { GoogleOAuthError, mintAccessToken } from "./google-oauth";
import { googleAnalyticsAccess } from "./google-analytics-access";

// Google Analytics 4 client, normalization and sync (Pro; founder decisions 2026-11-08, FEATURE_MODULES.md §10).
// Read-only, through the Google connection Search Console uses (one consent screen, lib/integrations/
// google-connection.ts): the Admin API lists the properties the account can read and their web streams (to find the
// one for the analyzed website), the property's creation date and its key events; the Data API reports the last 28
// days against the 28 before. Every function that touches the database takes an organization id the caller has
// already authorised; `db` is the service client (it reads the encrypted refresh token, which clients can't).
// The latest snapshot feeds the diagnosis and the growth score as the Analytics module: summarizeAnalytics and
// analyticsSummaryForPrompt below.

export const PROVIDER = "google_analytics";
const ADMIN = "https://analyticsadmin.googleapis.com/v1beta";
const DATA = "https://analyticsdata.googleapis.com/v1beta";
export const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const TOP_ROWS = 10;
const KEEP_SNAPSHOTS = 12;
// GA4 finishes processing a day within about a day; yesterday can still change, so the window ends the day before.
const DATA_LAG_DAYS = 2;
const RANGE_DAYS = 28;
// A property younger than one window can't show 28 days of data: it is "new", not poor.
const NEW_PROPERTY_DAYS = 28;
// Properties read for the picker, and properties whose web streams are read to find the website's one.
const MAX_PROPERTIES = 200;
const MAX_STREAM_LOOKUPS = 25;
const PROPERTY_RE = /^properties\/[0-9]{1,20}$/;

// --- Types -------------------------------------------------------------------------------------------------------

export type GaMetrics = { sessions: number; users: number; engagedSessions: number; engagementRate: number; keyEvents: number; views: number };
export type GaRow = { key: string; sessions: number; engagedSessions: number; keyEvents: number };
export type GaKeyEvent = { event: string; count: number };
export type DateRange = { start: string; end: string };
export type AnalyticsTotals = { current: GaMetrics; previous: GaMetrics; previousRange: DateRange };
export type AnalyticsRows = {
  channels: GaRow[];
  landingPages: GaRow[];
  devices: GaRow[];
  keyEvents: GaKeyEvent[];
  // Key events set up in the property (Admin API), or null when that call failed.
  keyEventsConfigured: number | null;
  // When the property was created (Admin API), or null when that call failed.
  propertyCreated: string | null;
  propertyName: string | null;
  notes: string[];
};
export type AnalyticsSnapshot = {
  property: string;
  date_range_start: string;
  date_range_end: string;
  totals: AnalyticsTotals;
  rows: AnalyticsRows;
  fetched_at: string;
};
export type PropertyOption = { id: string; label: string };
export type WebStream = { property: string; uri: string };

export class AnalyticsApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// --- Pure helpers (unit-tested) ------------------------------------------------------------------------------------

const ZERO: GaMetrics = { sessions: 0, users: 0, engagedSessions: 0, engagementRate: 0, keyEvents: 0, views: 0 };
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown, max = 500) => (typeof v === "string" && v ? v.slice(0, max) : null);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export const isPropertyId = (v: unknown): v is string => typeof v === "string" && PROPERTY_RE.test(v);

// The last 28 days of settled data and the 28 days before.
export function dateRanges(now = new Date()): { current: DateRange; previous: DateRange } {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = addDays(today, -DATA_LAG_DAYS);
  const start = addDays(end, -(RANGE_DAYS - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(RANGE_DAYS - 1));
  return { current: { start: isoDate(start), end: isoDate(end) }, previous: { start: isoDate(prevStart), end: isoDate(prevEnd) } };
}

type Report = {
  dimensionHeaders?: { name?: string }[];
  metricHeaders?: { name?: string }[];
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
};

function asReport(r: unknown): Report {
  return r && typeof r === "object" ? (r as Report) : {};
}

function metricIndex(report: Report) {
  const names = (report.metricHeaders ?? []).map((h) => h.name);
  return (name: string) => names.indexOf(name);
}

// The totals report has no dimension of its own; with two named date ranges GA4 adds a dateRange dimension whose
// value is the range's name.
export function normalizeTotals(resp: unknown): { current: GaMetrics; previous: GaMetrics } {
  const report = asReport(resp);
  const m = metricIndex(report);
  const dr = (report.dimensionHeaders ?? []).findIndex((h) => h.name === "dateRange");
  const out = { current: { ...ZERO }, previous: { ...ZERO } };
  for (const row of report.rows ?? []) {
    const range = dr >= 0 ? row.dimensionValues?.[dr]?.value : "current";
    if (range !== "current" && range !== "previous") continue;
    const v = (name: string) => num(row.metricValues?.[m(name)]?.value);
    out[range] = {
      sessions: v("sessions"),
      users: v("totalUsers"),
      engagedSessions: v("engagedSessions"),
      engagementRate: Math.round(v("engagementRate") * 1000) / 1000,
      keyEvents: v("keyEvents"),
      views: v("screenPageViews"),
    };
  }
  return out;
}

export function normalizeRows(resp: unknown, limit = TOP_ROWS): GaRow[] {
  const report = asReport(resp);
  const m = metricIndex(report);
  return (report.rows ?? [])
    .map((row) => ({
      key: str(row.dimensionValues?.[0]?.value) ?? "",
      sessions: num(row.metricValues?.[m("sessions")]?.value),
      engagedSessions: num(row.metricValues?.[m("engagedSessions")]?.value),
      keyEvents: num(row.metricValues?.[m("keyEvents")]?.value),
    }))
    .filter((r) => r.key && r.key !== "(not set)")
    .slice(0, limit);
}

export function normalizeKeyEvents(resp: unknown, limit = TOP_ROWS): GaKeyEvent[] {
  const report = asReport(resp);
  const m = metricIndex(report);
  return (report.rows ?? [])
    .map((row) => ({ event: str(row.dimensionValues?.[0]?.value, 100) ?? "", count: num(row.metricValues?.[m("keyEvents")]?.value) }))
    .filter((e) => e.event && e.count > 0)
    .slice(0, limit);
}

// Every GA4 property the account can read, from accountSummaries, labelled "Property (Account)".
export function propertyOptions(resp: unknown): PropertyOption[] {
  const accounts = (resp as { accountSummaries?: { displayName?: string; propertySummaries?: { property?: string; displayName?: string }[] }[] } | null)
    ?.accountSummaries;
  if (!Array.isArray(accounts)) return [];
  const out: PropertyOption[] = [];
  for (const a of accounts) {
    for (const p of a.propertySummaries ?? []) {
      if (!isPropertyId(p.property)) continue;
      const name = str(p.displayName, 100) ?? p.property;
      const account = str(a.displayName, 100);
      out.push({ id: p.property, label: account ? `${name} (${account})` : name });
    }
  }
  return out.slice(0, MAX_PROPERTIES);
}

export function webStreams(property: string, resp: unknown): WebStream[] {
  const list = (resp as { dataStreams?: { type?: string; webStreamData?: { defaultUri?: string } }[] } | null)?.dataStreams;
  if (!Array.isArray(list)) return [];
  return list
    .filter((s) => s.type === "WEB_DATA_STREAM" && typeof s.webStreamData?.defaultUri === "string")
    .map((s) => ({ property, uri: s.webStreamData!.defaultUri!.slice(0, 2048) }));
}

const bareHost = (url: string) => {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
};

// The property to use without asking: the only one with a web stream for the analyzed website's host (www or not).
// Two or none: the owner picks in Settings.
export function pickProperty(websiteUrl: string, streams: WebStream[]): string | null {
  const host = bareHost(websiteUrl);
  if (!host) return null;
  const matches = new Set(streams.filter((s) => bareHost(s.uri) === host).map((s) => s.property));
  return matches.size === 1 ? [...matches][0] : null;
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// Created within the last window: too new to judge.
export function isNewProperty(created: string | null, now = new Date()) {
  if (!created) return false;
  const t = Date.parse(created);
  return Number.isFinite(t) && now.getTime() - t < NEW_PROPERTY_DAYS * 86_400_000;
}

// User-facing wording for an API failure. Never includes tokens or raw responses.
export function describeError(e: unknown, property?: string | null): { status: "error" | "active"; message: string } {
  if (e instanceof GoogleOAuthError) {
    return {
      status: "error",
      message:
        e.code === "invalid_grant"
          ? "Google access expired or was removed in your Google account. Reconnect Google."
          : "Google didn't accept Braventa's access. Reconnect Google.",
    };
  }
  if (e instanceof AnalyticsApiError) {
    if (e.status === 401) return { status: "error", message: "Google access expired. Reconnect Google." };
    if (e.status === 403)
      return {
        status: "error",
        message: property
          ? "This Google account can't read the chosen Google Analytics property. Choose another property or reconnect with an account that has access."
          : "This Google account can't read Google Analytics. Reconnect with an account that has access.",
      };
    if (e.status === 429) return { status: "active", message: "Google Analytics' limit is reached for now. Try again in an hour." };
    if (e.status >= 500) return { status: "active", message: "Google Analytics didn't respond. Try again later." };
  }
  return { status: "active", message: "Google Analytics data couldn't be fetched. Try again later." };
}

// Compact, JSON-safe summary for a model prompt and the score. Channel names, page paths and event names come from
// the website's own tracking: treat them as untrusted input.
export function summarizeAnalytics(s: AnalyticsSnapshot, now = new Date()) {
  const { current, previous, previousRange } = s.totals;
  const row = (r: GaRow) => ({ key: r.key, sessions: r.sessions, engaged_sessions: r.engagedSessions, key_events: r.keyEvents });
  return {
    source: "Google Analytics 4",
    property: s.rows.propertyName ?? s.property,
    period: { start: s.date_range_start, end: s.date_range_end },
    previous_period: previousRange,
    totals: {
      sessions: current.sessions,
      users: current.users,
      views: current.views,
      engagement_rate_percent: Math.round(current.engagementRate * 1000) / 10,
      key_events: current.keyEvents,
      sessions_change_percent: percentChange(current.sessions, previous.sessions),
      key_events_change_percent: percentChange(current.keyEvents, previous.keyEvents),
    },
    // The property was created inside the window: no judgement on its traffic yet.
    new_property: isNewProperty(s.rows.propertyCreated, now),
    key_events_configured: s.rows.keyEventsConfigured,
    top_key_events: s.rows.keyEvents,
    top_channels: s.rows.channels.map(row),
    top_landing_pages: s.rows.landingPages.map(row),
    devices: s.rows.devices.map((d) => ({ device: d.key, sessions: d.sessions })),
    caveat: "GA4 only counts visitors whose browsers load the tag and accept its cookies, so it undercounts. Data settles within a day or two.",
    fetched_at: s.fetched_at,
  };
}

export type AnalyticsSummary = ReturnType<typeof summarizeAnalytics>;

// --- Google API calls --------------------------------------------------------------------------------------------

async function call<T>(token: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new AnalyticsApiError(res.status, `Google Analytics ${res.status}: ${data?.error?.message?.slice(0, 200) ?? "error"}`);
  }
  return (await res.json()) as T;
}

export async function listProperties(token: string): Promise<PropertyOption[]> {
  const out: PropertyOption[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({ pageSize: "200", ...(pageToken ? { pageToken } : {}) });
    const resp = await call<{ nextPageToken?: string }>(token, `${ADMIN}/accountSummaries?${q}`);
    out.push(...propertyOptions(resp));
    pageToken = resp.nextPageToken;
  } while (pageToken && out.length < MAX_PROPERTIES);
  return out.slice(0, MAX_PROPERTIES);
}

const listWebStreams = async (token: string, property: string) =>
  webStreams(property, await call<unknown>(token, `${ADMIN}/${property}/dataStreams?pageSize=50`));

// The web streams of the account's properties, for pickProperty. Stops after MAX_STREAM_LOOKUPS properties; a
// failed lookup only means that property isn't matched automatically.
export async function streamsFor(token: string, properties: PropertyOption[]): Promise<WebStream[]> {
  const results = await Promise.allSettled(properties.slice(0, MAX_STREAM_LOOKUPS).map((p) => listWebStreams(token, p.id)));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

const getProperty = (token: string, property: string) => call<{ createTime?: string; displayName?: string }>(token, `${ADMIN}/${property}`);
const listKeyEvents = (token: string, property: string) => call<{ keyEvents?: unknown[] }>(token, `${ADMIN}/${property}/keyEvents?pageSize=200`);

const metrics = (...names: string[]) => names.map((name) => ({ name }));
const dims = (...names: string[]) => names.map((name) => ({ name }));
const bySessions = [{ metric: { metricName: "sessions" }, desc: true }];

// Fetches one snapshot. The traffic reports must succeed; the property details and key events are optional extras.
export async function fetchSnapshot(token: string, property: string, now = new Date()) {
  const { current, previous } = dateRanges(now);
  const one = [{ startDate: current.start, endDate: current.end }];
  const requests = [
    {
      dateRanges: [
        { startDate: current.start, endDate: current.end, name: "current" },
        { startDate: previous.start, endDate: previous.end, name: "previous" },
      ],
      metrics: metrics("sessions", "totalUsers", "engagedSessions", "engagementRate", "keyEvents", "screenPageViews"),
    },
    { dateRanges: one, dimensions: dims("sessionDefaultChannelGroup"), metrics: metrics("sessions", "engagedSessions", "keyEvents"), orderBys: bySessions, limit: TOP_ROWS },
    { dateRanges: one, dimensions: dims("landingPage"), metrics: metrics("sessions", "engagedSessions", "keyEvents"), orderBys: bySessions, limit: TOP_ROWS },
    { dateRanges: one, dimensions: dims("deviceCategory"), metrics: metrics("sessions", "engagedSessions", "keyEvents"), orderBys: bySessions, limit: 5 },
    {
      dateRanges: one,
      dimensions: dims("eventName"),
      metrics: metrics("keyEvents"),
      metricFilter: { filter: { fieldName: "keyEvents", numericFilter: { operation: "GREATER_THAN", value: { int64Value: "0" } } } },
      orderBys: [{ metric: { metricName: "keyEvents" }, desc: true }],
      limit: TOP_ROWS,
    },
  ];
  const [batch, details, keyEvents] = await Promise.all([
    call<{ reports?: unknown[] }>(token, `${DATA}/${property}:batchRunReports`, { requests }),
    getProperty(token, property).catch(() => null),
    listKeyEvents(token, property).catch(() => null),
  ]);
  const [totals, channels, pages, devices, events] = batch.reports ?? [];
  const notes: string[] = [];
  if (!details) notes.push("The property's details weren't available.");
  if (!keyEvents) notes.push("The list of key events set up in the property wasn't available.");
  const t = normalizeTotals(totals);
  return {
    range: current,
    totals: { current: t.current, previous: t.previous, previousRange: previous } satisfies AnalyticsTotals,
    rows: {
      channels: normalizeRows(channels),
      landingPages: normalizeRows(pages),
      devices: normalizeRows(devices, 5),
      keyEvents: normalizeKeyEvents(events),
      keyEventsConfigured: keyEvents ? (Array.isArray(keyEvents.keyEvents) ? keyEvents.keyEvents.length : 0) : null,
      propertyCreated: str(details?.createTime, 40),
      propertyName: str(details?.displayName, 100),
      notes,
    } satisfies AnalyticsRows,
  };
}

// --- Database: sync ------------------------------------------------------------------------------------------------

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

export type SyncResult =
  | { ok: true; property: string }
  | { ok: false; reason: "not-connected" | "paused" | "too-soon" | "needs-property" | "error"; message: string };

// Fetches and stores one snapshot for the organization. Guards: Pro access, one fetch per 10 minutes.
export async function syncAnalytics(db: Db, organizationId: string, opts: { skipGuard?: boolean; now?: Date } = {}): Promise<SyncResult> {
  const now = opts.now ?? new Date();
  const { data: conn } = await db
    .from("integration_connections")
    .select("id, refresh_token_ciphertext, selected_property, status, last_attempted_at")
    .eq("organization_id", organizationId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (!conn || conn.status === "revoked" || !conn.refresh_token_ciphertext) {
    return { ok: false, reason: "not-connected", message: "Google Analytics isn't connected." };
  }
  const update = (fields: Record<string, unknown>) =>
    db.from("integration_connections").update(fields).eq("id", conn.id).eq("organization_id", organizationId);

  const { data: org } = await db.from("organizations").select("plan, trial_ends_at").eq("id", organizationId).single();
  const access = org ? googleAnalyticsAccess(org, now) : { allowed: false as const, reason: "Organization not found." };
  if (!access.allowed) {
    if (conn.status !== "paused") await update({ status: "paused" });
    return { ok: false, reason: "paused", message: access.reason };
  }
  if (!opts.skipGuard && conn.last_attempted_at && now.getTime() - new Date(conn.last_attempted_at).getTime() < REFRESH_INTERVAL_MS) {
    return { ok: false, reason: "too-soon", message: "Google Analytics data was fetched in the last 10 minutes. Try again shortly." };
  }
  await update({ last_attempted_at: now.toISOString() });

  let property: string | null = conn.selected_property;
  try {
    let refreshToken: string;
    try {
      refreshToken = decryptSecret(conn.refresh_token_ciphertext);
    } catch {
      const message = "The stored Google connection can't be read. Reconnect Google.";
      await update({ status: "error", last_error: message });
      return { ok: false, reason: "error", message };
    }
    const token = await mintAccessToken(refreshToken);
    const options = await listProperties(token);
    const available = options.map((o) => o.id);
    const labels = Object.fromEntries(options.map((o) => [o.id, o.label]));
    if (!property || !available.includes(property)) {
      // The chosen property is gone from the account: its data no longer matches what is connected.
      if (property) await db.from("analytics_snapshots").delete().eq("organization_id", organizationId);
      const websiteUrl = await websiteFor(db, organizationId);
      property = websiteUrl && options.length ? pickProperty(websiteUrl, await streamsFor(token, options)) : null;
    }
    if (!property) {
      const message = available.length
        ? "Choose which Google Analytics property belongs to your website."
        : "This Google account has no Google Analytics 4 property. Set one up in Google Analytics, or reconnect with the account that manages it.";
      await update({ status: "active", available_properties: available, property_labels: labels, selected_property: null, last_error: message });
      return { ok: false, reason: "needs-property", message };
    }
    const snap = await fetchSnapshot(token, property, now);
    const { error } = await db.from("analytics_snapshots").insert({
      organization_id: organizationId,
      connection_id: conn.id,
      property,
      date_range_start: snap.range.start,
      date_range_end: snap.range.end,
      totals: snap.totals,
      rows: snap.rows,
      fetched_at: now.toISOString(),
    });
    if (error) throw new Error("snapshot insert failed");
    await pruneSnapshots(db, organizationId);
    await update({
      status: "active",
      available_properties: available,
      property_labels: labels,
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
    .from("analytics_snapshots")
    .select("id")
    .eq("organization_id", organizationId)
    .order("fetched_at", { ascending: false })
    .range(KEEP_SNAPSHOTS, KEEP_SNAPSHOTS + 100);
  if (old?.length) {
    await db
      .from("analytics_snapshots")
      .delete()
      .eq("organization_id", organizationId)
      .in("id", old.map((r) => r.id));
  }
}

// Owner chose a property in Settings. Only properties the connected account can read are accepted.
// Returns "first" when no property was chosen before and "changed" for another one (both fetch at once, skipping the
// 10-minute guard: there is no data for the property yet), "same" when it was already chosen.
export async function selectProperty(db: Db, organizationId: string, property: string): Promise<"invalid" | "first" | "changed" | "same"> {
  if (!isPropertyId(property)) return "invalid";
  const { data: conn } = await db
    .from("integration_connections")
    .select("id, available_properties, selected_property, status")
    .eq("organization_id", organizationId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (!conn || conn.status === "revoked") return "invalid";
  if (!(conn.available_properties as string[]).includes(property)) return "invalid";
  if (conn.selected_property === property) return "same";
  if (conn.selected_property) {
    // Another property means other data.
    await db.from("analytics_snapshots").delete().eq("organization_id", organizationId);
  }
  const { error } = await db
    .from("integration_connections")
    .update({ selected_property: property, last_error: null })
    .eq("id", conn.id)
    .eq("organization_id", organizationId);
  if (error) return "invalid";
  return conn.selected_property ? "changed" : "first";
}

export async function latestAnalyticsSnapshot(db: SupabaseClient, organizationId: string): Promise<AnalyticsSnapshot | null> {
  const { data } = await db
    .from("analytics_snapshots")
    .select("property, date_range_start, date_range_end, totals, rows, fetched_at")
    .eq("organization_id", organizationId)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AnalyticsSnapshot | null) ?? null;
}

// For the diagnosis prompt and the growth score (the Analytics module; called by the pipeline's scoring and
// diagnosis-update steps for organizations whose enabled modules include it). Null unless the connection is active,
// the organization has Pro access and a snapshot exists. Never includes tokens or the Google account email.
export async function analyticsSummaryForPrompt(db: Db, organizationId: string): Promise<AnalyticsSummary | null> {
  const [{ data: conn }, { data: org }] = await Promise.all([
    db.from("integration_connections").select("status").eq("organization_id", organizationId).eq("provider", PROVIDER).maybeSingle(),
    db.from("organizations").select("plan, trial_ends_at").eq("id", organizationId).maybeSingle(),
  ]);
  if (!conn || conn.status !== "active" || !org || !googleAnalyticsAccess(org).allowed) return null;
  const snap = await latestAnalyticsSnapshot(db, organizationId);
  return snap ? summarizeAnalytics(snap) : null;
}

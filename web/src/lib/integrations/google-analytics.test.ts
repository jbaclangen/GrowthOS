import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fakeSupabase } from "../../../test/fake-supabase";
import { GoogleOAuthError } from "./google-oauth";
import { googleAnalyticsAccess } from "./google-analytics-access";
import {
  AnalyticsApiError,
  dateRanges,
  describeError,
  isNewProperty,
  isPropertyId,
  normalizeKeyEvents,
  normalizeRows,
  normalizeTotals,
  pickProperty,
  propertyOptions,
  selectProperty,
  summarizeAnalytics,
  webStreams,
  type AnalyticsSnapshot,
} from "./google-analytics";

// Response shapes from the GA4 Data API (batchRunReports) and Admin API (accountSummaries, dataStreams).
const TOTALS = {
  dimensionHeaders: [{ name: "dateRange" }],
  metricHeaders: ["sessions", "totalUsers", "engagedSessions", "engagementRate", "keyEvents", "screenPageViews"].map((name) => ({ name })),
  rows: [
    { dimensionValues: [{ value: "current" }], metricValues: ["420", "350", "231", "0.55", "14", "980"].map((value) => ({ value })) },
    { dimensionValues: [{ value: "previous" }], metricValues: ["350", "300", "180", "0.514285", "9", "800"].map((value) => ({ value })) },
  ],
};
const CHANNELS = {
  dimensionHeaders: [{ name: "sessionDefaultChannelGroup" }],
  metricHeaders: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "keyEvents" }],
  rows: [
    { dimensionValues: [{ value: "Organic Search" }], metricValues: [{ value: "250" }, { value: "150" }, { value: "9" }] },
    { dimensionValues: [{ value: "(not set)" }], metricValues: [{ value: "5" }, { value: "1" }, { value: "0" }] },
    { dimensionValues: [{ value: "Direct" }], metricValues: [{ value: "120" }, { value: "60" }, { value: "4" }] },
  ],
};

describe("GA4 normalization", () => {
  it("reads the totals of both named date ranges", () => {
    const t = normalizeTotals(TOTALS);
    expect(t.current).toEqual({ sessions: 420, users: 350, engagedSessions: 231, engagementRate: 0.55, keyEvents: 14, views: 980 });
    expect(t.previous.engagementRate).toBe(0.514);
    expect(normalizeTotals(null).current.sessions).toBe(0);
  });

  it("keeps named rows in order and drops (not set)", () => {
    expect(normalizeRows(CHANNELS).map((r) => [r.key, r.sessions, r.keyEvents])).toEqual([
      ["Organic Search", 250, 9],
      ["Direct", 120, 4],
    ]);
    expect(normalizeRows({})).toEqual([]);
  });

  it("lists recorded key events only", () => {
    const resp = {
      metricHeaders: [{ name: "keyEvents" }],
      rows: [
        { dimensionValues: [{ value: "generate_lead" }], metricValues: [{ value: "12" }] },
        { dimensionValues: [{ value: "phone_call" }], metricValues: [{ value: "0" }] },
      ],
    };
    expect(normalizeKeyEvents(resp)).toEqual([{ event: "generate_lead", count: 12 }]);
  });

  it("ends the window two days back and compares it with the 28 days before", () => {
    expect(dateRanges(new Date("2026-11-08T10:00:00Z"))).toEqual({
      current: { start: "2026-10-10", end: "2026-11-06" },
      previous: { start: "2026-09-12", end: "2026-10-09" },
    });
  });
});

describe("GA4 properties", () => {
  const SUMMARIES = {
    accountSummaries: [
      {
        displayName: "Example Plumbing",
        propertySummaries: [
          { property: "properties/111", displayName: "example.com" },
          { property: "properties/222", displayName: "Old site" },
          { property: "accounts/9", displayName: "Not a property" },
        ],
      },
    ],
  };

  it("lists readable properties with their account", () => {
    expect(propertyOptions(SUMMARIES)).toEqual([
      { id: "properties/111", label: "example.com (Example Plumbing)" },
      { id: "properties/222", label: "Old site (Example Plumbing)" },
    ]);
    expect(isPropertyId("properties/111")).toBe(true);
    expect(isPropertyId("properties/111/../x")).toBe(false);
  });

  it("picks the only property with a web stream for the website, www or not", () => {
    const streams = [
      ...webStreams("properties/111", { dataStreams: [{ type: "WEB_DATA_STREAM", webStreamData: { defaultUri: "https://www.example.com" } }] }),
      ...webStreams("properties/222", { dataStreams: [{ type: "ANDROID_APP_DATA_STREAM" }, { type: "WEB_DATA_STREAM", webStreamData: { defaultUri: "https://old.example.net" } }] }),
    ];
    expect(pickProperty("example.com", streams)).toBe("properties/111");
    expect(pickProperty("https://unknown.org", streams)).toBeNull();
    // Two properties for the same website: the owner chooses.
    expect(pickProperty("example.com", [...streams, { property: "properties/333", uri: "http://example.com/" }])).toBeNull();
  });

  it("only accepts a property the connected account can read", async () => {
    const { db } = fakeSupabase({
      integration_connections: [
        { id: "c", organization_id: "o", provider: "google_analytics", status: "active", available_properties: ["properties/111"], selected_property: null },
      ],
    });
    expect(await selectProperty(db as never, "o", "properties/999")).toBe("invalid");
    expect(await selectProperty(db as never, "o", "not-a-property")).toBe("invalid");
    expect(await selectProperty(db as never, "o", "properties/111")).toBe("first");
    // Choosing it again changes nothing, so the refresh guard still applies.
    expect(await selectProperty(db as never, "o", "properties/111")).toBe("same");
  });
});

describe("GA4 summary and errors", () => {
  const snapshot: AnalyticsSnapshot = {
    property: "properties/111",
    date_range_start: "2026-10-10",
    date_range_end: "2026-11-06",
    totals: { ...normalizeTotals(TOTALS), previousRange: { start: "2026-09-12", end: "2026-10-09" } },
    rows: {
      channels: normalizeRows(CHANNELS),
      landingPages: [],
      devices: [],
      keyEvents: [{ event: "generate_lead", count: 14 }],
      keyEventsConfigured: 2,
      propertyCreated: "2026-10-30T00:00:00Z",
      propertyName: "example.com",
      notes: [],
    },
    fetched_at: "2026-11-08T10:00:00Z",
  };

  it("summarizes the window for the prompt and the score", () => {
    const s = summarizeAnalytics(snapshot, new Date("2026-11-08T10:00:00Z"));
    expect(s.property).toBe("example.com");
    expect(s.totals).toEqual({
      sessions: 420,
      users: 350,
      views: 980,
      engagement_rate_percent: 55,
      key_events: 14,
      sessions_change_percent: 20,
      key_events_change_percent: 55.6,
    });
    expect(s.new_property).toBe(true);
    expect(s.key_events_configured).toBe(2);
    expect(JSON.stringify(s)).not.toMatch(/token|@/);
  });

  it("calls a property created inside the window new, and an older or unknown one not", () => {
    const now = new Date("2026-11-08T00:00:00Z");
    expect(isNewProperty("2026-10-20T00:00:00Z", now)).toBe(true);
    expect(isNewProperty("2026-09-01T00:00:00Z", now)).toBe(false);
    expect(isNewProperty(null, now)).toBe(false);
  });

  it("explains failures without raw responses", () => {
    expect(describeError(new GoogleOAuthError("x", "invalid_grant"))).toMatchObject({ status: "error", message: expect.stringMatching(/Reconnect Google/) });
    expect(describeError(new AnalyticsApiError(403, "x"), "properties/1").message).toMatch(/can't read the chosen Google Analytics property/);
    expect(describeError(new AnalyticsApiError(429, "x"))).toMatchObject({ status: "active" });
    expect(describeError(new Error("boom")).message).toBe("Google Analytics data couldn't be fetched. Try again later.");
  });

  it("is a Pro feature: the trial counts, Basic pauses", () => {
    const soon = new Date(Date.now() + 5 * 86_400_000).toISOString();
    expect(googleAnalyticsAccess({ plan: "trial", trial_ends_at: soon }).allowed).toBe(true);
    expect(googleAnalyticsAccess({ plan: "pro", trial_ends_at: soon }).allowed).toBe(true);
    expect(googleAnalyticsAccess({ plan: "basic", trial_ends_at: soon }).allowed).toBe(false);
  });
});

describe("the google_analytics migration", () => {
  const dir = new URL("../../../../supabase/migrations/", import.meta.url);
  const sql = () => {
    const file = readdirSync(dir).find((f) => f.endsWith("_google_analytics.sql"));
    expect(file).toBeTruthy();
    return readFileSync(new URL(file!, dir), "utf8");
  };

  it("allows both Google products and keeps snapshots server-written and member-readable", () => {
    const s = sql();
    expect(s).toMatch(/check \(provider in \('google_search_console', 'google_analytics'\)\)/);
    expect(s).toMatch(/grant select \(property_labels\) on public\.integration_connections to authenticated/);
    expect(s).toMatch(/alter table public\.analytics_snapshots enable row level security/);
    expect(s).toMatch(/using \(public\.is_member\(organization_id\)\)/);
    expect(s).toMatch(/revoke all on public\.analytics_snapshots from authenticated, anon/);
    expect(s).toMatch(/references public\.integration_connections\(id, organization_id\) on delete cascade/);
  });
});

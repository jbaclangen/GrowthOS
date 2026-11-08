import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import {
  HUBSPOT_SCOPES,
  buildHubSpotAuthUrl,
  hubspotRedirectUriFor,
  hubspotStateMatches,
  missingHubSpotScopes,
  openHubSpotState,
  sealHubSpotState,
} from "./hubspot-oauth";
import { sealState } from "./google-oauth";
import { HUBSPOT_PAUSED_MESSAGE, hubspotAccess } from "./hubspot-access";
import { HubSpotApiError, describeHubSpotError } from "./hubspot";
import { HubSpotOAuthError } from "./hubspot-oauth";
import {
  MAX_DEALS,
  aggregateDeals,
  countOf,
  dealStages,
  periods,
  propertyOptions,
  snapshotSizeOk,
  type DealRow,
  type HubSpotMetrics,
} from "./hubspot-metrics";

beforeAll(() => {
  process.env.INTEGRATIONS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

const NOW = new Date("2026-11-08T15:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => String(NOW.getTime() - days * DAY);

const PIPELINES = {
  results: [
    {
      id: "default",
      label: "Sales pipeline",
      archived: false,
      stages: [
        { id: "closedwon", label: "Closed won", displayOrder: 5, archived: false, metadata: { isClosed: "true", probability: "1.0" } },
        { id: "appointmentscheduled", label: "Appointment scheduled", displayOrder: 0, archived: false, metadata: { isClosed: "false", probability: "0.2" } },
        { id: "closedlost", label: "Closed lost", displayOrder: 6, archived: false, metadata: { isClosed: "true", probability: "0.0" } },
        { id: "old", label: "Old stage", displayOrder: 7, archived: true, metadata: { isClosed: "false", probability: "0.5" } },
      ],
    },
    { id: "archived-pipeline", label: "Old", archived: true, stages: [{ id: "x", label: "X", metadata: {} }] },
  ],
};

const deal = (p: DealRow["properties"]): DealRow => ({ properties: { pipeline: "default", ...p } });

describe("periods", () => {
  it("covers the last 28 days up to today and the 28 days before, in UTC", () => {
    const p = periods(NOW);
    expect(p.current).toEqual({ start: "2026-10-12", end: "2026-11-08" });
    expect(p.previous).toEqual({ start: "2026-09-14", end: "2026-10-11" });
    expect(p.ms.currentStart).toBe(Date.UTC(2026, 9, 12));
    expect(p.ms.winRateStart).toBe(Date.UTC(2026, 7, 11));
  });
});

describe("propertyOptions", () => {
  it("keeps visible options in display order, labels only", () => {
    const opts = propertyOptions({
      options: [
        { value: "customer", label: "Customer", displayOrder: 5, hidden: false },
        { value: "lead", label: "Lead", displayOrder: 1, hidden: false },
        { value: "other", label: "Other", displayOrder: 9, hidden: true },
        { value: "", label: "Empty" },
      ],
    });
    expect(opts).toEqual([
      { key: "lead", label: "Lead" },
      { key: "customer", label: "Customer" },
    ]);
    expect(propertyOptions(null)).toEqual([]);
    expect(propertyOptions({ options: "nope" })).toEqual([]);
  });
});

describe("dealStages", () => {
  it("reads open, won and lost stages and skips archived ones", () => {
    const stages = dealStages(PIPELINES);
    expect(stages.map((s) => [s.stage, s.closed, s.won])).toEqual([
      ["appointmentscheduled", false, false],
      ["closedwon", true, true],
      ["closedlost", true, false],
    ]);
    expect(stages[0].pipelineLabel).toBe("Sales pipeline");
    expect(dealStages({})).toEqual([]);
  });
});

describe("aggregateDeals", () => {
  const stages = dealStages(PIPELINES);

  it("sums open deals, counts stale ones, and splits won and lost by close date", () => {
    const d = aggregateDeals(
      [
        deal({ dealstage: "appointmentscheduled", amount: "1000", createdate: ago(3), hs_lastmodifieddate: ago(1) }),
        deal({ dealstage: "appointmentscheduled", amount: "500.5", amount_in_home_currency: "600", createdate: ago(40), hs_lastmodifieddate: ago(45) }),
        deal({ dealstage: "closedwon", amount: "2000", closedate: new Date(NOW.getTime() - 10 * DAY).toISOString(), createdate: ago(60) }),
        deal({ dealstage: "closedwon", amount: "300", closedate: ago(70), createdate: ago(100) }),
        deal({ dealstage: "closedlost", amount: "100", closedate: ago(5), createdate: ago(20) }),
        deal({ dealstage: "closedlost", closedate: ago(200), createdate: ago(300) }),
        deal({ dealstage: "deleted-stage", amount: "999", createdate: ago(2) }),
      ],
      stages,
      NOW,
    );
    expect(d.read).toBe(7);
    expect(d.truncated).toBe(false);
    expect(d.open).toEqual({ count: 2, amount: 1600 });
    expect(d.staleOpen).toBe(1);
    expect(d.createdCurrent).toBe(3);
    expect(d.createdPrevious).toBe(1);
    expect(d.wonCurrent).toEqual({ count: 1, amount: 2000 });
    expect(d.lostCurrent).toBe(1);
    expect(d.won90).toBe(2);
    expect(d.lost90).toBe(1);
    expect(d.winRate90).toBe(0.667);
    expect(d.byStage.find((s) => s.stage === "appointmentscheduled")).toMatchObject({ count: 2, amount: 1600 });
  });

  it("has no win rate without closed deals in 90 days, and ignores bad amounts", () => {
    const d = aggregateDeals([deal({ dealstage: "appointmentscheduled", amount: "abc" }), deal({ dealstage: "appointmentscheduled", amount: "-5" })], stages, NOW, true);
    expect(d.winRate90).toBeNull();
    expect(d.open).toEqual({ count: 2, amount: 0 });
    expect(d.truncated).toBe(true);
  });

  it("stores no record content: only labels from the portal's configuration", () => {
    const d = aggregateDeals([deal({ dealstage: "closedwon", amount: "10", closedate: ago(1) })], stages, NOW);
    const keys = new Set(d.byStage.flatMap((s) => Object.keys(s)));
    expect([...keys].sort()).toEqual(["amount", "closed", "count", "label", "pipeline", "pipelineLabel", "stage", "won"]);
    expect(MAX_DEALS).toBe(5000);
  });
});

describe("countOf", () => {
  it("reads a search total", () => {
    expect(countOf({ total: 42, results: [{ id: "1" }] })).toBe(42);
    expect(countOf({ total: -1 })).toBeNull();
    expect(countOf({})).toBeNull();
    expect(countOf(null)).toBeNull();
  });
});

describe("snapshotSizeOk", () => {
  it("accepts a full snapshot of labels and counts", () => {
    const stage = { pipeline: "p", pipelineLabel: "Pipeline", stage: "s", label: "Stage name", closed: false, won: false, count: 1, amount: 1 };
    const m: HubSpotMetrics = {
      version: 1,
      currency: "USD",
      contacts: {
        total: 1,
        newCurrent: 1,
        newPrevious: 1,
        byLifecycle: Array.from({ length: 41 }, (_, i) => ({ key: `k${i}`, label: "A lifecycle stage label", count: i })),
        newBySource: Array.from({ length: 40 }, (_, i) => ({ key: `s${i}`, label: "A source label", count: i })),
        unassigned: 0,
        newNotContacted: 0,
      },
      companies: { total: 1 },
      deals: { ...aggregateDeals([], [], NOW), byStage: Array.from({ length: 100 }, () => stage) },
      notes: [],
    };
    expect(snapshotSizeOk(m)).toBe(true);
  });
});

describe("hubspotAccess", () => {
  it("allows Pro, Premium and an active trial; pauses Basic and an ended trial", () => {
    expect(hubspotAccess({ plan: "pro", trial_ends_at: "2026-01-01" }, NOW)).toEqual({ allowed: true });
    expect(hubspotAccess({ plan: "premium", trial_ends_at: "2026-01-01" }, NOW)).toEqual({ allowed: true });
    expect(hubspotAccess({ plan: "trial", trial_ends_at: "2026-11-20" }, NOW)).toEqual({ allowed: true });
    expect(hubspotAccess({ plan: "trial", trial_ends_at: "2026-11-01" }, NOW)).toEqual({ allowed: false, reason: HUBSPOT_PAUSED_MESSAGE });
    expect(hubspotAccess({ plan: "basic", trial_ends_at: "2026-11-20" }, NOW)).toEqual({ allowed: false, reason: HUBSPOT_PAUSED_MESSAGE });
  });
});

describe("HubSpot OAuth", () => {
  it("asks only for read scopes, and the same ones the HubSpot app declares", () => {
    for (const s of HUBSPOT_SCOPES) expect(s.endsWith(".read"), s).toBe(true);
    const app = JSON.parse(readFileSync(fileURLToPath(new URL("../../../../hubspot/src/app/app-hsmeta.json", import.meta.url)), "utf8"));
    expect([...app.config.auth.requiredScopes].sort()).toEqual([...HUBSPOT_SCOPES].sort());
    expect(app.config.auth.optionalScopes ?? []).toEqual([]);
    expect([...app.config.auth.redirectUrls].sort()).toEqual([
      "http://localhost:3000/api/integrations/hubspot/callback",
      "https://app.braventa.io/api/integrations/hubspot/callback",
    ]);
  });

  it("builds the install URL with the scopes and the state", () => {
    const url = new URL(buildHubSpotAuthUrl({ clientId: "cid", redirectUri: "https://app.braventa.io/api/integrations/hubspot/callback", state: "st" }));
    expect(url.origin + url.pathname).toBe("https://app.hubspot.com/oauth/authorize");
    expect(url.searchParams.get("scope")).toBe(HUBSPOT_SCOPES.join(" "));
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("client_id")).toBe("cid");
  });

  it("accepts only registered redirect origins", () => {
    expect(hubspotRedirectUriFor("https://app.braventa.io")).toBe("https://app.braventa.io/api/integrations/hubspot/callback");
    expect(hubspotRedirectUriFor("http://localhost:3000/x")).toBe("http://localhost:3000/api/integrations/hubspot/callback");
    expect(hubspotRedirectUriFor("https://evil.com")).toBeNull();
    expect(hubspotRedirectUriFor("not a url")).toBeNull();
  });

  it("seals the state, binds it to user and organization, and rejects a Search Console state", () => {
    const s = { state: "abc", userId: "u", orgId: "o", redirectUri: "r", expiresAt: Date.now() + 60_000 };
    const opened = openHubSpotState(sealHubSpotState(s));
    expect(opened).toMatchObject(s);
    expect(hubspotStateMatches(opened, "abc", "u", "o")).toBe(true);
    expect(hubspotStateMatches(opened, "abc", "u", "other")).toBe(false);
    expect(hubspotStateMatches(opened, "xyz", "u", "o")).toBe(false);
    expect(openHubSpotState(sealState({ ...s, verifier: "v" }))).toBeNull();
    expect(openHubSpotState(sealHubSpotState({ ...s, expiresAt: Date.now() - 1 }))).toBeNull();
    expect(openHubSpotState("garbage")).toBeNull();
  });

  it("reports missing scopes", () => {
    expect(missingHubSpotScopes([...HUBSPOT_SCOPES])).toEqual([]);
    expect(missingHubSpotScopes(["oauth", "crm.objects.contacts.read"])).toEqual(["crm.objects.companies.read", "crm.objects.deals.read"]);
  });
});

describe("describeHubSpotError", () => {
  it("asks for a reconnect when access ended and keeps the connection otherwise", () => {
    expect(describeHubSpotError(new HubSpotOAuthError("x", "BAD_REFRESH_TOKEN")).status).toBe("error");
    expect(describeHubSpotError(new HubSpotApiError(401, "x")).status).toBe("error");
    expect(describeHubSpotError(new HubSpotApiError(403, "x")).status).toBe("error");
    expect(describeHubSpotError(new HubSpotApiError(429, "x"))).toMatchObject({ status: "active" });
    expect(describeHubSpotError(new HubSpotApiError(503, "x"))).toMatchObject({ status: "active" });
    expect(describeHubSpotError(new Error("x"))).toMatchObject({ status: "active" });
  });
});

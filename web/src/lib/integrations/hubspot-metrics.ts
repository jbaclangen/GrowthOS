// HubSpot snapshot shape and the pure aggregation behind it (D-048, D-059: aggregates only). Braventa reads contact,
// company and deal records from the owner's HubSpot portal but stores only what is defined here: counts, sums and the
// labels of the portal's own stages and sources. Never names, email addresses, phone numbers, deal names, record ids
// or owner names. Pure logic, unit-tested; the API calls live in hubspot.ts.

export const RANGE_DAYS = 28;
export const WIN_RATE_DAYS = 90;
// An open deal untouched for this long counts as stale ("deals stall").
export const STALE_DEAL_DAYS = 30;
// Deals read per sync (100 a page). Past this the deal figures cover the most recently changed deals only, and the
// snapshot says so.
export const MAX_DEALS = 5000;

export type Period = { start: string; end: string };
export type Count = { key: string; label: string; count: number };
export type StageTotals = {
  pipeline: string;
  pipelineLabel: string;
  stage: string;
  label: string;
  closed: boolean;
  won: boolean;
  count: number;
  amount: number;
};

export type HubSpotMetrics = {
  version: 1;
  currency: string | null;
  contacts: {
    total: number;
    newCurrent: number;
    newPrevious: number;
    // Every lifecycle stage the portal defines, plus "none" for contacts without one.
    byLifecycle: Count[];
    // New contacts in the current period by original source.
    newBySource: Count[];
    // Contacts with no contact owner.
    unassigned: number;
    // Contacts created in the current period with no logged sales activity yet.
    newNotContacted: number;
  };
  companies: { total: number };
  deals: {
    read: number;
    truncated: boolean;
    open: { count: number; amount: number };
    staleOpen: number;
    createdCurrent: number;
    createdPrevious: number;
    wonCurrent: { count: number; amount: number };
    lostCurrent: number;
    won90: number;
    lost90: number;
    // won90 / (won90 + lost90), 0–1; null without closed deals in 90 days.
    winRate90: number | null;
    byStage: StageTotals[];
  };
  notes: string[];
};

const DAY = 86_400_000;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// The last 28 days up to now, the 28 before, and the start of the 90-day win-rate window. CRM data has no reporting
// lag, so the current period ends today. Each bound is a UTC midnight timestamp in milliseconds for the API filters.
export function periods(now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const currentStart = today - (RANGE_DAYS - 1) * DAY;
  const previousStart = currentStart - RANGE_DAYS * DAY;
  return {
    current: { start: isoDate(new Date(currentStart)), end: isoDate(new Date(today)) } as Period,
    previous: { start: isoDate(new Date(previousStart)), end: isoDate(new Date(currentStart - DAY)) } as Period,
    ms: {
      currentStart,
      previousStart,
      winRateStart: today - (WIN_RATE_DAYS - 1) * DAY,
      staleBefore: now.getTime() - STALE_DEAL_DAYS * DAY,
      now: now.getTime(),
    },
  };
}

const label = (v: unknown, max = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

// Options of an enumeration property (GET properties/{object}/{name}): the portal's own lifecycle stages or sources.
export function propertyOptions(resp: unknown): { key: string; label: string }[] {
  const options = (resp as { options?: { value?: unknown; label?: unknown; hidden?: unknown; displayOrder?: unknown }[] } | null)?.options;
  if (!Array.isArray(options)) return [];
  return options
    .filter((o) => label(o.value, 100) && o.hidden !== true)
    .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0))
    .slice(0, 40)
    .map((o) => ({ key: label(o.value, 100)!, label: label(o.label) ?? label(o.value, 100)! }));
}

export type Stage = { pipeline: string; pipelineLabel: string; stage: string; label: string; closed: boolean; won: boolean };

// Deal pipelines and their stages (GET pipelines/deals). A stage is closed when HubSpot marks it so; it is won when it
// is closed with probability 1.
export function dealStages(resp: unknown): Stage[] {
  const pipelines = (resp as { results?: Record<string, unknown>[] } | null)?.results;
  if (!Array.isArray(pipelines)) return [];
  const out: Stage[] = [];
  for (const p of pipelines.slice(0, 20)) {
    const pipeline = label(p.id, 100);
    if (!pipeline || p.archived === true) continue;
    const stages = Array.isArray(p.stages) ? (p.stages as Record<string, unknown>[]) : [];
    for (const s of [...stages].sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0)).slice(0, 50)) {
      const stage = label(s.id, 100);
      if (!stage || s.archived === true) continue;
      const meta = (s.metadata ?? {}) as Record<string, unknown>;
      const closed = String(meta.isClosed) === "true";
      out.push({
        pipeline,
        pipelineLabel: label(p.label) ?? pipeline,
        stage,
        label: label(s.label) ?? stage,
        closed,
        won: closed && Number(meta.probability) === 1,
      });
    }
  }
  return out;
}

// Only these deal properties are requested, and nothing else of a deal is kept.
export const DEAL_PROPERTIES = [
  "amount",
  "amount_in_home_currency",
  "dealstage",
  "pipeline",
  "createdate",
  "closedate",
  "hs_lastmodifieddate",
] as const;

export type DealRow = { properties?: Partial<Record<(typeof DEAL_PROPERTIES)[number], string | null>> };

const time = (v: string | null | undefined) => {
  if (!v) return null;
  const t = /^\d+$/.test(v) ? Number(v) : Date.parse(v);
  return Number.isFinite(t) ? t : null;
};
const money = (p: DealRow["properties"]) => {
  const n = Number(p?.amount_in_home_currency ?? p?.amount ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const round = (n: number) => Math.round(n * 100) / 100;

export function aggregateDeals(deals: DealRow[], stages: Stage[], now = new Date(), truncated = false): HubSpotMetrics["deals"] {
  const { ms } = periods(now);
  const byKey = new Map(stages.map((s) => [`${s.pipeline}\u0000${s.stage}`, s]));
  const totals = new Map<string, StageTotals>(
    stages.map((s) => [`${s.pipeline}\u0000${s.stage}`, { ...s, count: 0, amount: 0 }]),
  );
  const d: HubSpotMetrics["deals"] = {
    read: deals.length,
    truncated,
    open: { count: 0, amount: 0 },
    staleOpen: 0,
    createdCurrent: 0,
    createdPrevious: 0,
    wonCurrent: { count: 0, amount: 0 },
    lostCurrent: 0,
    won90: 0,
    lost90: 0,
    winRate90: null,
    byStage: [],
  };
  for (const deal of deals) {
    const p = deal.properties ?? {};
    const key = `${p.pipeline ?? ""}\u0000${p.dealstage ?? ""}`;
    const stage = byKey.get(key);
    const amount = money(p);
    const created = time(p.createdate);
    if (created !== null && created >= ms.currentStart) d.createdCurrent++;
    else if (created !== null && created >= ms.previousStart) d.createdPrevious++;
    const row = totals.get(key);
    if (row) {
      row.count++;
      row.amount += amount;
    }
    // A deal in a stage the pipelines don't list (deleted stage) is left out of open, won and lost.
    if (!stage) continue;
    if (!stage.closed) {
      d.open.count++;
      d.open.amount += amount;
      const touched = time(p.hs_lastmodifieddate);
      if (touched !== null && touched < ms.staleBefore) d.staleOpen++;
      continue;
    }
    const closedAt = time(p.closedate);
    if (closedAt === null) continue;
    if (stage.won) {
      if (closedAt >= ms.currentStart) {
        d.wonCurrent.count++;
        d.wonCurrent.amount += amount;
      }
      if (closedAt >= ms.winRateStart) d.won90++;
    } else {
      if (closedAt >= ms.currentStart) d.lostCurrent++;
      if (closedAt >= ms.winRateStart) d.lost90++;
    }
  }
  d.open.amount = round(d.open.amount);
  d.wonCurrent.amount = round(d.wonCurrent.amount);
  d.winRate90 = d.won90 + d.lost90 > 0 ? Math.round((d.won90 / (d.won90 + d.lost90)) * 1000) / 1000 : null;
  d.byStage = [...totals.values()].map((s) => ({ ...s, amount: round(s.amount) }));
  return d;
}

// Search totals (CRM search `total`) to counts. A missing or invalid total counts as 0 and is noted by the caller.
export function countOf(resp: unknown): number | null {
  const total = (resp as { total?: unknown } | null)?.total;
  return typeof total === "number" && Number.isFinite(total) && total >= 0 ? Math.floor(total) : null;
}

// Every stored string is a label from the portal's own configuration, never record content; this keeps the stored
// JSON well under the table's size bound.
export function snapshotSizeOk(metrics: HubSpotMetrics) {
  return JSON.stringify(metrics).length <= 32_000;
}

// The percentage change from previous to current, or null when there was nothing before.
export function percentChange(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
}

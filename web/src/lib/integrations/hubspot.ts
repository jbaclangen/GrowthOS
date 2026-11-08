import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "./secret-box";
import { HubSpotOAuthError, mintHubSpotAccessToken, revokeHubSpotRefreshToken, uninstallHubSpot } from "./hubspot-oauth";
import { hubspotAccess } from "./hubspot-access";
import {
  DEAL_PROPERTIES,
  MAX_DEALS,
  aggregateDeals,
  countOf,
  dealStages,
  periods,
  propertyOptions,
  snapshotSizeOk,
  type Count,
  type DealRow,
  type HubSpotMetrics,
} from "./hubspot-metrics";

// HubSpot client and sync for the read-only HubSpot connection (D-048), storing aggregates only (D-059): contact and
// company counts from the CRM search API, deal totals summed in memory from a deal list (only DEAL_PROPERTIES are
// requested), and the portal's own stage and source labels. Record content is never stored or logged. Every function
// that touches the database takes an organization id the caller has already authorised; `db` is the service client
// (it reads the encrypted refresh token, which clients can't). API version 2026-09 (date-based paths).
// The counts don't reach the diagnosis or the growth score yet; that is the CRM module (D-051, next step).

export const HUBSPOT_PROVIDER = "hubspot";
const API = "https://api.hubapi.com";
const VERSION = "2026-09";
export const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const KEEP_SNAPSHOTS = 12;
// The CRM search API allows 5 requests a second per portal; stay under it.
const SEARCH_GAP_MS = 250;

export class HubSpotApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// --- API calls ---------------------------------------------------------------------------------------------------

async function hs<T>(token: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    // Only HubSpot's category is kept: the message of a failed search can echo filter values.
    const data = (await res.json().catch(() => null)) as { category?: string } | null;
    throw new HubSpotApiError(res.status, `HubSpot ${res.status}: ${data?.category?.slice(0, 60) ?? "error"}`);
  }
  return (await res.json()) as T;
}

type Filter = { propertyName: string; operator: string; value?: string; highValue?: string; values?: string[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One CRM search that returns only the total (limit 1, a single property): the record itself is discarded.
async function searchTotal(token: string, object: "contacts" | "companies" | "deals", filters: Filter[]): Promise<number | null> {
  await sleep(SEARCH_GAP_MS);
  const resp = await hs<unknown>(token, `/crm/objects/${VERSION}/${object}/search`, {
    filterGroups: filters.length ? [{ filters }] : [],
    properties: ["hs_object_id"],
    limit: 1,
  });
  return countOf(resp);
}

// Dates are epoch-millisecond strings. Two filters in one group are ANDed.
const between = (propertyName: string, from: number, to: number): Filter[] => [
  { propertyName, operator: "GTE", value: String(from) },
  { propertyName, operator: "LTE", value: String(to) },
];

async function listDeals(token: string): Promise<{ deals: DealRow[]; truncated: boolean }> {
  const deals: DealRow[] = [];
  let after: string | undefined;
  while (deals.length < MAX_DEALS) {
    const params = new URLSearchParams({ limit: "100", properties: DEAL_PROPERTIES.join(","), archived: "false" });
    if (after) params.set("after", after);
    const page = await hs<{ results?: { properties?: Record<string, string | null> }[]; paging?: { next?: { after?: string } } }>(
      token,
      `/crm/objects/${VERSION}/deals?${params}`,
    );
    // Keep only the requested properties; ids, associations and timestamps of the record object are dropped.
    for (const r of page.results ?? []) {
      const p = r.properties ?? {};
      deals.push({ properties: Object.fromEntries(DEAL_PROPERTIES.map((k) => [k, p[k] ?? null])) });
    }
    after = page.paging?.next?.after;
    if (!after) return { deals, truncated: false };
  }
  return { deals: deals.slice(0, MAX_DEALS), truncated: true };
}

const counted = async (options: { key: string; label: string }[], count: (key: string) => Promise<number | null>) => {
  const out: Count[] = [];
  for (const o of options) out.push({ ...o, count: (await count(o.key)) ?? 0 });
  return out;
};

// Fetches one snapshot's metrics. Contacts and deals must succeed; a missing extra (sources, companies, currency) is
// noted instead.
export async function fetchMetrics(token: string, now = new Date()): Promise<HubSpotMetrics> {
  const { ms } = periods(now);
  const notes: string[] = [];
  const optional = async <T>(note: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch {
      notes.push(note);
      return fallback;
    }
  };
  const SOURCES_NOTE = "New contacts by source weren't available.";

  const lifecycleOptions = propertyOptions(await hs<unknown>(token, `/crm/properties/${VERSION}/contacts/lifecyclestage`));
  const sourceOptions = await optional(
    SOURCES_NOTE,
    async () => propertyOptions(await hs<unknown>(token, `/crm/properties/${VERSION}/contacts/hs_analytics_source`)),
    [] as { key: string; label: string }[],
  );
  // 0-3 is HubSpot's object type id for deals.
  const stages = dealStages(await hs<unknown>(token, `/crm/pipelines/${VERSION}/0-3`));

  const total = (await searchTotal(token, "contacts", [])) ?? 0;
  const newCurrent = (await searchTotal(token, "contacts", between("createdate", ms.currentStart, ms.now))) ?? 0;
  const newPrevious = (await searchTotal(token, "contacts", between("createdate", ms.previousStart, ms.currentStart - 1))) ?? 0;
  const byLifecycle = await counted(lifecycleOptions, (key) =>
    searchTotal(token, "contacts", [{ propertyName: "lifecyclestage", operator: "EQ", value: key }]),
  );
  byLifecycle.push({
    key: "none",
    label: "No lifecycle stage",
    count: (await searchTotal(token, "contacts", [{ propertyName: "lifecyclestage", operator: "NOT_HAS_PROPERTY" }])) ?? 0,
  });
  const newBySource = await optional(
    SOURCES_NOTE,
    () =>
      counted(sourceOptions, (key) =>
        searchTotal(token, "contacts", [
          ...between("createdate", ms.currentStart, ms.now),
          { propertyName: "hs_analytics_source", operator: "EQ", value: key },
        ]),
      ),
    [] as Count[],
  );
  const unassigned = (await searchTotal(token, "contacts", [{ propertyName: "hubspot_owner_id", operator: "NOT_HAS_PROPERTY" }])) ?? 0;
  // "Last contacted" is set when a call, sales email or meeting is logged.
  const newNotContacted =
    (await searchTotal(token, "contacts", [
      ...between("createdate", ms.currentStart, ms.now),
      { propertyName: "notes_last_contacted", operator: "NOT_HAS_PROPERTY" },
    ])) ?? 0;
  const companies = await optional("The company count wasn't available.", async () => (await searchTotal(token, "companies", [])) ?? 0, 0);
  // Not a documented 2026-09 path we rely on: without it, amounts show without a currency symbol.
  const currency = await optional(
    "The portal's currency wasn't available, so amounts show without a currency.",
    async () => {
      const info = await hs<{ companyCurrency?: unknown }>(token, `/account-info/${VERSION}/details`);
      return typeof info.companyCurrency === "string" && /^[A-Z]{3}$/.test(info.companyCurrency) ? info.companyCurrency : null;
    },
    null as string | null,
  );

  const { deals, truncated } = await listDeals(token);
  const metrics: HubSpotMetrics = {
    version: 1,
    currency,
    contacts: {
      total,
      newCurrent,
      newPrevious,
      byLifecycle,
      newBySource: newBySource.filter((s) => s.count > 0),
      unassigned,
      newNotContacted,
    },
    companies: { total: companies },
    deals: aggregateDeals(deals, stages, now, truncated),
    notes: [...new Set(notes)],
  };
  return metrics;
}

export function describeHubSpotError(e: unknown): { status: "error" | "active"; message: string } {
  if (e instanceof HubSpotOAuthError) {
    return { status: "error", message: "HubSpot access ended: the app was removed from your portal or the access expired. Reconnect HubSpot." };
  }
  if (e instanceof HubSpotApiError) {
    if (e.status === 401) return { status: "error", message: "HubSpot access expired. Reconnect HubSpot." };
    if (e.status === 403)
      return { status: "error", message: "HubSpot didn't allow Braventa to read this portal's CRM. Reconnect HubSpot and approve every permission it asks for." };
    if (e.status === 429) return { status: "active", message: "HubSpot's limit for this portal is reached for now. Try again in a few minutes." };
    if (e.status >= 500) return { status: "active", message: "HubSpot didn't respond. Try again later." };
  }
  return { status: "active", message: "HubSpot counts couldn't be fetched. Try again later." };
}

// --- Database: connection lifecycle and sync ---------------------------------------------------------------------

type Db = SupabaseClient;

// Stores a new connection (or replaces the existing one) after the OAuth callback. Revokes the replaced token at
// HubSpot (it doesn't uninstall: the owner just installed the app again), and deletes the old counts when another
// portal is connected.
export async function saveHubSpotConnection(
  db: Db,
  c: { organizationId: string; userId: string; hubId: string; hubDomain: string | null; scopes: string[]; refreshToken: string },
) {
  const { data: existing } = await db
    .from("integration_connections")
    .select("id, refresh_token_ciphertext, external_account_id")
    .eq("organization_id", c.organizationId)
    .eq("provider", HUBSPOT_PROVIDER)
    .maybeSingle();
  if (existing?.refresh_token_ciphertext) {
    try {
      const old = decryptSecret(existing.refresh_token_ciphertext);
      if (old !== c.refreshToken) await revokeHubSpotRefreshToken(old);
    } catch {
      // Unreadable old token (key changed): nothing to delete from here.
    }
  }
  if (existing && existing.external_account_id !== c.hubId) {
    await db.from("hubspot_snapshots").delete().eq("organization_id", c.organizationId);
  }
  const { error } = await db.from("integration_connections").upsert(
    {
      organization_id: c.organizationId,
      provider: HUBSPOT_PROVIDER,
      connected_by: c.userId,
      external_account_id: c.hubId,
      external_account_name: c.hubDomain,
      refresh_token_ciphertext: encryptSecret(c.refreshToken),
      scopes: c.scopes,
      status: "active",
      last_error: null,
      last_attempted_at: null,
    },
    { onConflict: "organization_id,provider" },
  );
  if (error) throw new Error("The HubSpot connection wasn't saved.");
}

export type HubSpotSyncResult =
  | { ok: true }
  | { ok: false; reason: "not-connected" | "paused" | "too-soon" | "error"; message: string };

// Fetches and stores one snapshot for the organization. Guards: Pro access, one fetch per 10 minutes.
export async function syncHubSpot(db: Db, organizationId: string, opts: { skipGuard?: boolean; now?: Date } = {}): Promise<HubSpotSyncResult> {
  const now = opts.now ?? new Date();
  const { data: conn } = await db
    .from("integration_connections")
    .select("id, refresh_token_ciphertext, external_account_id, status, last_attempted_at")
    .eq("organization_id", organizationId)
    .eq("provider", HUBSPOT_PROVIDER)
    .maybeSingle();
  if (!conn || conn.status === "revoked" || !conn.refresh_token_ciphertext || !conn.external_account_id) {
    return { ok: false, reason: "not-connected", message: "HubSpot isn't connected." };
  }
  const update = (fields: Record<string, unknown>) =>
    db.from("integration_connections").update(fields).eq("id", conn.id).eq("organization_id", organizationId);

  const { data: org } = await db.from("organizations").select("plan, trial_ends_at").eq("id", organizationId).single();
  const access = org ? hubspotAccess(org, now) : { allowed: false as const, reason: "Organization not found." };
  if (!access.allowed) {
    if (conn.status !== "paused") await update({ status: "paused" });
    return { ok: false, reason: "paused", message: access.reason };
  }
  if (!opts.skipGuard && conn.last_attempted_at && now.getTime() - new Date(conn.last_attempted_at).getTime() < REFRESH_INTERVAL_MS) {
    return { ok: false, reason: "too-soon", message: "HubSpot counts were fetched in the last 10 minutes. Try again shortly." };
  }
  await update({ last_attempted_at: now.toISOString() });

  try {
    let refreshToken: string;
    try {
      refreshToken = decryptSecret(conn.refresh_token_ciphertext);
    } catch {
      const message = "The stored HubSpot connection can't be read. Reconnect HubSpot.";
      await update({ status: "error", last_error: message });
      return { ok: false, reason: "error", message };
    }
    const { accessToken, refreshToken: latest } = await mintHubSpotAccessToken(refreshToken);
    // HubSpot may rotate the refresh token: always keep the latest one.
    if (latest !== refreshToken) await update({ refresh_token_ciphertext: encryptSecret(latest) });
    const metrics = await fetchMetrics(accessToken, now);
    if (!snapshotSizeOk(metrics)) throw new Error("snapshot too large");
    const { current } = periods(now);
    const { error } = await db.from("hubspot_snapshots").insert({
      organization_id: organizationId,
      connection_id: conn.id,
      portal_id: conn.external_account_id,
      period_start: current.start,
      period_end: current.end,
      metrics,
      fetched_at: now.toISOString(),
    });
    if (error) throw new Error("snapshot insert failed");
    await pruneSnapshots(db, organizationId);
    await update({ status: "active", last_synced_at: now.toISOString(), last_error: null });
    return { ok: true };
  } catch (e) {
    const { status, message } = describeHubSpotError(e);
    await update({ status, last_error: message });
    return { ok: false, reason: "error", message };
  }
}

async function pruneSnapshots(db: Db, organizationId: string) {
  const { data: old } = await db
    .from("hubspot_snapshots")
    .select("id")
    .eq("organization_id", organizationId)
    .order("fetched_at", { ascending: false })
    .range(KEEP_SNAPSHOTS, KEEP_SNAPSHOTS + 100);
  if (old?.length) {
    await db
      .from("hubspot_snapshots")
      .delete()
      .eq("organization_id", organizationId)
      .in("id", old.map((r) => r.id));
  }
}

// Uninstalls Braventa's app from the portal and revokes the refresh token (HubSpot's Developer Terms §4.E: delete the
// data, including tokens, when a customer stops), removes the token here and deletes every snapshot for the
// organization.
export async function disconnectHubSpot(db: Db, organizationId: string) {
  const { data: conn } = await db
    .from("integration_connections")
    .select("id, refresh_token_ciphertext")
    .eq("organization_id", organizationId)
    .eq("provider", HUBSPOT_PROVIDER)
    .maybeSingle();
  if (!conn) return;
  if (conn.refresh_token_ciphertext) {
    try {
      await uninstallHubSpot(decryptSecret(conn.refresh_token_ciphertext));
    } catch {
      // Unreadable token: deleting it below still cuts Braventa off; the owner can also uninstall the app in HubSpot.
    }
  }
  const { error: snapError } = await db.from("hubspot_snapshots").delete().eq("organization_id", organizationId);
  const { error } = await db
    .from("integration_connections")
    .update({
      refresh_token_ciphertext: null,
      status: "revoked",
      external_account_id: null,
      external_account_name: null,
      scopes: [],
      last_error: null,
    })
    .eq("id", conn.id)
    .eq("organization_id", organizationId);
  if (error || snapError) throw new Error("HubSpot wasn't fully disconnected. Try again.");
}

// Removing the business (D-061): uninstalls the app from the portal and revokes the refresh token, as disconnecting
// does, and returns [true] when HubSpot confirmed the uninstall, [false] when it didn't or the token was unreadable,
// [] when no token is stored. The row and snapshots are deleted with the organization (on delete cascade). Throws
// when the connection can't be read, so the business isn't deleted with a token Braventa never tried to revoke.
export async function revokeHubSpotForRemoval(db: Db, organizationId: string): Promise<boolean[]> {
  const { data: conn, error } = await db
    .from("integration_connections")
    .select("refresh_token_ciphertext")
    .eq("organization_id", organizationId)
    .eq("provider", HUBSPOT_PROVIDER)
    .maybeSingle();
  if (error) throw new Error("The HubSpot connection couldn't be read.");
  if (!conn?.refresh_token_ciphertext) return [];
  try {
    return [await uninstallHubSpot(decryptSecret(conn.refresh_token_ciphertext))];
  } catch {
    return [false];
  }
}

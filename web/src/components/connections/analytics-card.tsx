import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchConsoleConfigured } from "@/lib/integrations/google-oauth";
import { googleAnalyticsAccess } from "@/lib/integrations/google-analytics-access";
import { PROVIDER, percentChange, type AnalyticsSnapshot } from "@/lib/integrations/google-analytics";
import { searchConsoleCardState, type SearchConsoleCardState } from "@/lib/integrations/connect-step";
import { ANALYTICS_CARD_ID } from "@/lib/integrations/return-to";
import { formatChange, formatDateTime, formatInt } from "@/app/search/format";
import { chooseAnalyticsProperty, refreshAnalytics } from "@/app/settings/connections-actions";
import { can } from "@/lib/team/roles";
import { SearchConsoleConnectForm } from "./connect-form";
import { ConnectionNotice } from "./connection-notice";
import { DisconnectButton } from "./disconnect-button";
import { SubmitButton } from "./submit-button";

// The Google Analytics 4 connection card (Pro), shared by Settings → Connections and the onboarding step "Connect your
// tools". GA4 comes through the same Google sign-in as Search Console (founder decision 2026-11-08,
// lib/integrations/google-connection.ts), so connecting and disconnecting go through the same routes and actions; the
// property, the data and the refresh are its own. Reads through the signed-in user's client (RLS and column grants:
// the encrypted refresh token is never selected). The card states are Search Console's (connect-step.ts) with GA4's
// own plan check.

type Connection = {
  google_account_email: string | null;
  available_properties: string[];
  property_labels: Record<string, string>;
  selected_property: string | null;
  status: "active" | "paused" | "revoked" | "error";
  last_error: string | null;
  last_synced_at: string | null;
};

type Latest = Pick<AnalyticsSnapshot, "property" | "totals" | "rows" | "fetched_at">;

export async function AnalyticsCard({
  org,
  canConnectHere = true,
  returnTo,
  eyebrow,
  reasons = [],
  connectClassName = "btn-primary",
}: {
  org: { id: string; role: string } | null;
  canConnectHere?: boolean;
  returnTo: string;
  eyebrow?: string;
  reasons?: string[];
  connectClassName?: "btn-primary" | "btn-secondary";
}) {
  const configured = searchConsoleConfigured();
  const load = Boolean(configured && org && canConnectHere);
  const supabase = load ? await createSupabaseServerClient() : null;
  const [{ data: orgRow }, { data: conn }, { data: snap }] =
    supabase && org
      ? await Promise.all([
          supabase.from("organizations").select("plan, trial_ends_at").eq("id", org.id).maybeSingle(),
          supabase
            .from("integration_connections")
            .select("google_account_email, available_properties, property_labels, selected_property, status, last_error, last_synced_at")
            .eq("organization_id", org.id)
            .eq("provider", PROVIDER)
            .maybeSingle(),
          supabase
            .from("analytics_snapshots")
            .select("property, totals, rows, fetched_at")
            .eq("organization_id", org.id)
            .order("fetched_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
      : [{ data: null }, { data: null }, { data: null }];

  const connection = conn && (conn as Connection).status !== "revoked" ? (conn as Connection) : null;
  const canConnect = can(org?.role, "integrations.connect");
  const state = searchConsoleCardState({
    configured,
    hasBusiness: Boolean(org),
    canConnectHere,
    role: org?.role,
    allowed: Boolean(orgRow && googleAnalyticsAccess(orgRow).allowed),
    connection,
  });
  // The business the forms act on (D-062): the connect routes and actions read it back and check the role there.
  const organizationId = org?.id ?? "";
  const headingId = `${ANALYTICS_CARD_ID}-heading`;

  return (
    <section id={ANALYTICS_CARD_ID} className="card mt-6 scroll-mt-6" aria-labelledby={headingId}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className={`${eyebrow ? "mt-1 " : ""}flex flex-wrap items-center gap-2`}>
        <h3 id={headingId} className="text-lg font-semibold">
          Google Analytics 4
        </h3>
        <span className="chip bg-accent-soft text-accent-soft-foreground">Pro</span>
        <StateChip state={state} connection={connection} />
        {reasons.length > 0 && <span className="chip bg-surface-muted text-muted">Suggested</span>}
      </div>
      {reasons.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <ConnectionNotice product="google_analytics" />

      {state === "not-configured" ? (
        <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
          The Google Analytics connection isn&apos;t set up yet. It will appear here once the Braventa team turns it on.
        </p>
      ) : state === "no-business" ? (
        <p className="mt-4 text-sm">
          <Link href="/onboarding" className="underline">
            Analyze a website first
          </Link>{" "}
          so we know which website to match in Google Analytics.
        </p>
      ) : state === "other-business" ? (
        <WhatWeAccess />
      ) : state === "connected" || state === "paused-connected" ? (
        <Connected
          connection={connection!}
          latest={snap as Latest | null}
          allowed={state === "connected"}
          canConnect={canConnect}
          returnTo={returnTo}
          organizationId={organizationId}
        />
      ) : (
        <>
          <WhatWeAccess />
          {state === "paused-not-connected" ? (
            <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
              The Google Analytics connection is part of Pro. This business is on Basic, so it&apos;s paused. It&apos;s available
              on Pro or Premium.{" "}
              <Link href="/plans" className="underline">
                See plans
              </Link>
            </p>
          ) : state === "owner-only" ? (
            <p className="mt-4 text-sm text-muted">Ask the business owner to connect Google Analytics.</p>
          ) : (
            <SearchConsoleConnectForm id="ga-connect-agree" returnTo={returnTo} organizationId={organizationId} label="Connect Google" buttonClassName={connectClassName} />
          )}
        </>
      )}
    </section>
  );
}

function StateChip({ state, connection }: { state: SearchConsoleCardState; connection: Connection | null }) {
  switch (state) {
    case "not-configured":
      return <span className="chip bg-surface-muted text-muted">Not available yet</span>;
    case "other-business":
      return null;
    case "paused-connected":
    case "paused-not-connected":
      return <span className="chip bg-surface-muted text-muted">Paused</span>;
    case "connected":
      if (connection?.status === "error") return <span className="chip bg-danger-soft text-danger">Needs attention</span>;
      if (!connection?.selected_property) return <span className="chip bg-warning-soft text-warning">Choose a property</span>;
      return <span className="chip bg-success-soft text-success">Connected</span>;
    default:
      return <span className="chip bg-surface-muted text-muted">Not connected</span>;
  }
}

function WhatWeAccess() {
  return (
    <div className="mt-3 text-sm text-muted">
      <p>
        Connect the Google account that manages your website in Google Analytics 4, and Braventa shows how visits turn into
        inquiries: sessions, engagement, key events, traffic channels and landing pages. A summary also goes into your
        diagnosis, which Braventa&apos;s AI writes, and into your growth score as Analytics. The same Google sign-in connects
        Search Console.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          Read-only: Braventa reads reports for the property that matches your website, the property&apos;s name and creation
          date, and the key events set up in it. It also sees the Google account&apos;s email address, to show which account is
          connected.
        </li>
        <li>Braventa can&apos;t change anything in your Google account or in Google Analytics.</li>
        <li>
          GA4 counts only visitors whose browsers load its tag, so its numbers are lower than your real traffic. Disconnecting
          Google deletes the data Braventa stored.
        </li>
      </ul>
    </div>
  );
}

function Connected({
  connection,
  latest,
  allowed,
  canConnect,
  returnTo,
  organizationId,
}: {
  connection: Connection;
  latest: Latest | null;
  allowed: boolean;
  canConnect: boolean;
  returnTo: string;
  organizationId: string;
}) {
  const choices = connection.available_properties;
  const label = (id: string) => connection.property_labels?.[id] ?? id;
  const change = latest ? formatChange(percentChange(latest.totals.current.sessions, latest.totals.previous.sessions)) : null;
  return (
    <>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted">Google account</dt>
        <dd>{connection.google_account_email ?? "Unknown"}</dd>
        <dt className="text-muted">Property</dt>
        <dd className="break-all">{connection.selected_property ? label(connection.selected_property) : "Not chosen yet"}</dd>
        <dt className="text-muted">Last fetched</dt>
        <dd>{connection.last_synced_at ? formatDateTime(connection.last_synced_at) : "Not yet"}</dd>
      </dl>

      {!allowed && (
        <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
          The Google Analytics connection is part of Pro. This business is on Basic, so it&apos;s paused: data already fetched
          is kept, but nothing new is fetched. It resumes on Pro or Premium.{" "}
          <Link href="/plans" className="underline">
            See plans
          </Link>
        </p>
      )}
      {allowed && connection.last_error && (
        <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-foreground" role="status">
          {connection.last_error}
        </p>
      )}

      {latest && (
        <div className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm">
          <p>
            Last 28 days: <strong>{formatInt(latest.totals.current.sessions)}</strong> sessions
            {change && <span className="text-muted"> ({change} vs the previous 28 days)</span>},{" "}
            <strong>{Math.round(latest.totals.current.engagementRate * 100)}%</strong> engaged and{" "}
            <strong>{formatInt(latest.totals.current.keyEvents)}</strong> key events.
          </p>
          {latest.rows.keyEventsConfigured === 0 && (
            <p className="mt-1">No key events are set up in this property, so inquiries and calls aren&apos;t counted yet.</p>
          )}
          {latest.rows.channels.length > 0 && (
            <p className="mt-1 text-muted">
              Top channels: {latest.rows.channels.slice(0, 3).map((c) => `${c.key} (${formatInt(c.sessions)})`).join(", ")}.
            </p>
          )}
        </div>
      )}

      {canConnect && choices.length > 0 && (choices.length > 1 || !connection.selected_property) && (
        <form action={chooseAnalyticsProperty} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="organizationId" value={organizationId} />
          <label className="block flex-1 text-sm">
            <span className="font-medium">Google Analytics property for your website</span>
            <select name="property" defaultValue={connection.selected_property ?? ""} required className="input mt-1">
              <option value="" disabled>
                Choose a property
              </option>
              {choices.map((p) => (
                <option key={p} value={p}>
                  {label(p)}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton label="Use this property" pendingLabel="Fetching…" />
        </form>
      )}

      <div className="mt-4 flex flex-wrap items-start gap-2">
        {allowed && connection.selected_property && (
          <form action={refreshAnalytics}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="organizationId" value={organizationId} />
            <SubmitButton label="Refresh Google Analytics data" pendingLabel="Refreshing…" />
          </form>
        )}
        {canConnect && connection.status === "error" && allowed && (
          <SearchConsoleConnectForm id="ga-reconnect-agree" returnTo={returnTo} organizationId={organizationId} label="Reconnect Google" buttonClassName="btn-secondary" />
        )}
        {canConnect && <DisconnectButton returnTo={returnTo} organizationId={organizationId} />}
      </div>
      <p className="mt-3 text-xs text-muted">
        Read-only access. Braventa can&apos;t change anything in Google. Disconnecting Google also disconnects Search Console.
      </p>
    </>
  );
}

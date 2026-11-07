import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hubspotConfigured } from "@/lib/integrations/hubspot-oauth";
import { hubspotAccess } from "@/lib/integrations/hubspot-access";
import { HUBSPOT_PROVIDER } from "@/lib/integrations/hubspot";
import { percentChange, type HubSpotMetrics } from "@/lib/integrations/hubspot-metrics";
import { connectionCardState, type ConnectionCardState } from "@/lib/integrations/connect-step";
import { formatChange, formatDateTime, formatInt } from "@/app/search/format";
import { disconnectHubSpotAction, refreshHubSpot } from "@/app/settings/connections-actions";
import { can } from "@/lib/team/roles";
import { HubSpotConnectForm } from "./connect-form";
import { ConnectionNotice } from "./connection-notice";
import { DisconnectButton } from "./disconnect-button";
import { SubmitButton } from "./submit-button";

// The HubSpot connection card (Pro, read-only, D-048), shared by Settings → Connections and the onboarding step
// "Connect your tools", built like the Search Console card. Reads through the signed-in user's client, so RLS and
// column grants apply: the encrypted refresh token is never selected here. Braventa stores only counts and totals
// from HubSpot (D-058), so that is all this card can show. The counts don't reach the diagnosis yet (the CRM module,
// D-051, is the next step), so nothing here says they do.

type Connection = {
  external_account_id: string | null;
  external_account_name: string | null;
  status: "active" | "paused" | "revoked" | "error";
  last_error: string | null;
  last_synced_at: string | null;
};

type Latest = { metrics: HubSpotMetrics; fetched_at: string };

const DISCONNECT_EXPLANATION =
  "Disconnecting uninstalls Braventa's app from your HubSpot portal (HubSpot emails the portal's admins) and deletes the HubSpot counts Braventa stored for this business. Your CRM records aren't changed.";

export async function HubSpotCard({
  org,
  canConnectHere = true,
  returnTo,
  sectionId = "hubspot",
  reasons = [],
  connectClassName = "btn-primary",
}: {
  org: { id: string; role: string } | null;
  canConnectHere?: boolean;
  // Where actions and HubSpot's consent screen come back to (lib/integrations/return-to.ts).
  returnTo: string;
  // The outcome links (?hubspot=…) scroll to #hubspot.
  sectionId?: string;
  reasons?: string[];
  connectClassName?: "btn-primary" | "btn-secondary";
}) {
  const configured = hubspotConfigured();
  const load = Boolean(configured && org && canConnectHere);
  const supabase = load ? await createSupabaseServerClient() : null;
  const [{ data: orgRow }, { data: conn }, { data: snap }] =
    supabase && org
      ? await Promise.all([
          supabase.from("organizations").select("plan, trial_ends_at").eq("id", org.id).maybeSingle(),
          supabase
            .from("integration_connections")
            .select("external_account_id, external_account_name, status, last_error, last_synced_at")
            .eq("organization_id", org.id)
            .eq("provider", HUBSPOT_PROVIDER)
            .maybeSingle(),
          supabase
            .from("hubspot_snapshots")
            .select("metrics, fetched_at")
            .eq("organization_id", org.id)
            .order("fetched_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
      : [{ data: null }, { data: null }, { data: null }];

  const connection = conn && (conn as Connection).status !== "revoked" ? (conn as Connection) : null;
  // Connecting, reconnecting and disconnecting need integrations.connect (owner only, D-046).
  const canConnect = can(org?.role, "integrations.connect");
  const state = connectionCardState({
    configured,
    hasBusiness: Boolean(org),
    canConnectHere,
    role: org?.role,
    allowed: Boolean(orgRow && hubspotAccess(orgRow).allowed),
    connection,
  });
  const headingId = `${sectionId}-heading`;

  return (
    <section id={sectionId} className="card mt-6 scroll-mt-6" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={headingId} className="text-lg font-semibold">
          HubSpot
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
      <ConnectionNotice param="hubspot" />

      {state === "not-configured" ? (
        <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
          HubSpot connection isn&apos;t set up yet. It will appear here once the Braventa team turns it on.
        </p>
      ) : state === "no-business" ? (
        <p className="mt-4 text-sm">
          <Link href="/onboarding" className="underline">
            Analyze a website first
          </Link>{" "}
          so we know which business to connect.
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
        />
      ) : (
        <NotConnected state={state} returnTo={returnTo} connectClassName={connectClassName} />
      )}
    </section>
  );
}

function StateChip({ state, connection }: { state: ConnectionCardState; connection: Connection | null }) {
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
      return <span className="chip bg-success-soft text-success">Connected</span>;
    default:
      return <span className="chip bg-surface-muted text-muted">Not connected</span>;
  }
}

function WhatWeAccess() {
  return (
    <div className="mt-3 text-sm text-muted">
      <p>
        Connect your HubSpot portal and Braventa shows your CRM in counts: contacts by lifecycle stage, new contacts and
        where they came from, and open, won and lost deals. These counts aren&apos;t used in your diagnosis yet.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          Read-only: Braventa reads contacts, companies, deals and your deal pipelines, and stores only counts and totals.
          It doesn&apos;t keep names, email addresses, phone numbers or deal names.
        </li>
        <li>Braventa can&apos;t create, change or delete anything in HubSpot.</li>
        <li>
          You install Braventa&apos;s app in your HubSpot portal, as a Super admin or a user with HubSpot Marketplace access.
          HubSpot hasn&apos;t reviewed the app yet, so it shows a warning before you install.
        </li>
        <li>
          Disconnect any time. Disconnecting uninstalls the app from your portal and deletes the HubSpot counts Braventa
          stored.
        </li>
      </ul>
    </div>
  );
}

function PausedNotice({ connected }: { connected: boolean }) {
  return (
    <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
      The HubSpot connection is part of Pro. This business is on Basic, so it&apos;s paused
      {connected ? ": counts already fetched are kept, but nothing new is fetched. It resumes on Pro or Premium." : ". It's available on Pro or Premium."}{" "}
      <Link href="/plans" className="underline">
        See plans
      </Link>
    </p>
  );
}

function NotConnected({
  state,
  returnTo,
  connectClassName,
}: {
  state: "connectable" | "owner-only" | "paused-not-connected";
  returnTo: string;
  connectClassName: "btn-primary" | "btn-secondary";
}) {
  return (
    <>
      <WhatWeAccess />
      {state === "paused-not-connected" ? (
        <PausedNotice connected={false} />
      ) : state === "owner-only" ? (
        <p className="mt-4 text-sm text-muted">Ask the business owner to connect HubSpot.</p>
      ) : (
        // A GET form with the required agreement checkbox (D-057); the start route redirects to HubSpot.
        <HubSpotConnectForm id="hubspot-connect-agree" returnTo={returnTo} label="Connect HubSpot" buttonClassName={connectClassName} />
      )}
    </>
  );
}

function money(amount: number, currency: string | null) {
  try {
    if (currency) return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    // Not an ISO currency code: show the plain number.
  }
  return formatInt(amount);
}

const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;

function Counts({ metrics }: { metrics: HubSpotMetrics }) {
  const { contacts, deals, currency } = metrics;
  const newChange = formatChange(percentChange(contacts.newCurrent, contacts.newPrevious));
  const stages = contacts.byLifecycle.filter((s) => s.count > 0);
  return (
    <div className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm">
      <p className="font-medium">Last 28 days</p>
      <ul className="mt-1 space-y-0.5">
        <li>
          {plural(contacts.newCurrent, "new contact", "new contacts")}
          {newChange && <span className="text-muted"> ({newChange} vs the previous 28 days)</span>}, of which{" "}
          {formatInt(contacts.newNotContacted)} have no logged sales activity yet
        </li>
        <li>
          {plural(deals.wonCurrent.count, "deal", "deals")} won ({money(deals.wonCurrent.amount, currency)}),{" "}
          {plural(deals.lostCurrent, "deal", "deals")} lost
        </li>
      </ul>
      <p className="mt-3 font-medium">Now</p>
      <ul className="mt-1 space-y-0.5">
        <li>
          {plural(contacts.total, "contact", "contacts")}, {formatInt(contacts.unassigned)} without a contact owner
        </li>
        <li>
          {plural(deals.open.count, "open deal", "open deals")} worth {money(deals.open.amount, currency)}
          {deals.staleOpen > 0 && <span>, {formatInt(deals.staleOpen)} not updated in 30 days</span>}
        </li>
        {deals.winRate90 !== null && (
          <li>
            Win rate over 90 days: {Math.round(deals.winRate90 * 100)}% ({formatInt(deals.won90)} won, {formatInt(deals.lost90)} lost)
          </li>
        )}
      </ul>
      {stages.length > 0 && (
        <>
          <p className="mt-3 font-medium">Contacts by lifecycle stage</p>
          <ul className="mt-1 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
            {stages.map((s) => (
              <li key={s.key} className="flex justify-between gap-2">
                <span>{s.label}</span>
                <span>{formatInt(s.count)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {(deals.truncated || metrics.notes.length > 0) && (
        <ul className="mt-3 space-y-0.5 text-xs text-muted">
          {deals.truncated && <li>Deal figures cover the {formatInt(deals.read)} most recently updated deals.</li>}
          {metrics.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Connected({
  connection,
  latest,
  allowed,
  canConnect,
  returnTo,
}: {
  connection: Connection;
  latest: Latest | null;
  allowed: boolean;
  canConnect: boolean;
  returnTo: string;
}) {
  return (
    <>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted">HubSpot portal</dt>
        <dd className="break-all">
          {connection.external_account_name ?? "Unknown"}
          {connection.external_account_id && <span className="text-muted"> (ID {connection.external_account_id})</span>}
        </dd>
        <dt className="text-muted">Last fetched</dt>
        <dd>{connection.last_synced_at ? formatDateTime(connection.last_synced_at) : "Not yet"}</dd>
      </dl>

      {!allowed && <PausedNotice connected />}
      {allowed && connection.last_error && (
        <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-foreground" role="status">
          {connection.last_error}
        </p>
      )}

      {latest?.metrics?.version === 1 && <Counts metrics={latest.metrics} />}

      <div className="mt-4 flex flex-wrap items-start gap-2">
        {allowed && (
          <form action={refreshHubSpot}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <SubmitButton label="Refresh HubSpot counts" pendingLabel="Refreshing…" />
          </form>
        )}
        {canConnect && connection.status === "error" && allowed && (
          <HubSpotConnectForm id="hubspot-reconnect-agree" returnTo={returnTo} label="Reconnect" buttonClassName="btn-secondary" />
        )}
        {canConnect && <DisconnectButton returnTo={returnTo} action={disconnectHubSpotAction} explanation={DISCONNECT_EXPLANATION} />}
      </div>
      <p className="mt-3 text-xs text-muted">
        Read-only access. Braventa can&apos;t change anything in HubSpot and stores counts only. Disconnecting deletes them.
      </p>
    </>
  );
}

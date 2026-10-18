import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchConsoleConfigured } from "@/lib/integrations/google-oauth";
import { searchConsoleAccess } from "@/lib/integrations/search-console-access";
import { PROVIDER, percentChange, type Snapshot } from "@/lib/integrations/search-console";
import { searchConsoleCardState, type SearchConsoleCardState } from "@/lib/integrations/connect-step";
import { searchConsoleStartHref } from "@/lib/integrations/return-to";
import { formatChange, formatDateTime, formatInt } from "@/app/search/format";
import { chooseSearchConsoleProperty, refreshSearchConsole } from "@/app/settings/connections-actions";
import { ConnectionNotice } from "./connection-notice";
import { DisconnectButton } from "./disconnect-button";
import { SubmitButton } from "./submit-button";

// The Google Search Console connection card (Pro), shared by Settings → Connections and the onboarding step
// "Connect your tools" (D-041). Reads through the signed-in user's client, so RLS and column grants apply: the
// encrypted refresh token is never selected here. Which state it shows is decided in lib/integrations/connect-step.ts.
// `org` is the user's first membership, the business the OAuth routes and actions act on. When the onboarding session
// belongs to another business (canConnectHere false), nothing of `org` is loaded or shown.

type Connection = {
  google_account_email: string | null;
  available_properties: string[];
  selected_property: string | null;
  status: "active" | "paused" | "revoked" | "error";
  last_error: string | null;
  last_synced_at: string | null;
};

type Latest = Pick<Snapshot, "property" | "totals" | "fetched_at">;

export async function SearchConsoleCard({
  org,
  canConnectHere = true,
  returnTo,
  sectionId,
  eyebrow,
  reasons = [],
  connectClassName = "btn-primary",
}: {
  org: { id: string; role: string } | null;
  canConnectHere?: boolean;
  // Where actions and the Google consent screen come back to (lib/integrations/return-to.ts).
  returnTo: string;
  sectionId: string;
  eyebrow?: string;
  // Why it's suggested, from the onboarding answers (lib/integrations/tool-catalog.ts).
  reasons?: string[];
  // The step's Continue is its one primary action, so the connect link is secondary there.
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
            .select("google_account_email, available_properties, selected_property, status, last_error, last_synced_at")
            .eq("organization_id", org.id)
            .eq("provider", PROVIDER)
            .maybeSingle(),
          supabase
            .from("search_console_snapshots")
            .select("property, totals, fetched_at")
            .eq("organization_id", org.id)
            .order("fetched_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
      : [{ data: null }, { data: null }, { data: null }];

  const connection = conn && (conn as Connection).status !== "revoked" ? (conn as Connection) : null;
  const isOwner = org?.role === "owner";
  const state = searchConsoleCardState({
    configured,
    hasBusiness: Boolean(org),
    canConnectHere,
    isOwner,
    allowed: Boolean(orgRow && searchConsoleAccess(orgRow).allowed),
    connection,
  });
  const headingId = `${sectionId}-heading`;

  return (
    <section id={sectionId} className="card mt-6 scroll-mt-6" aria-labelledby={headingId}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className={`${eyebrow ? "mt-1 " : ""}flex flex-wrap items-center gap-2`}>
        <h3 id={headingId} className="text-lg font-semibold">
          Google Search Console
        </h3>
        <span className="chip bg-accent-soft text-accent-soft-foreground">Pro</span>
        <StateChip state={state} connection={connection} />
        {reasons.length > 0 && <span className="chip bg-surface-muted text-muted">Suggested</span>}
      </div>
      {reasons.length > 0 && <Reasons reasons={reasons} />}
      <ConnectionNotice />

      {state === "not-configured" ? (
        <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
          Search Console connection isn&apos;t set up yet. It will appear here once the Braventa team turns it on.
        </p>
      ) : state === "no-business" ? (
        <p className="mt-4 text-sm">
          <Link href="/onboarding" className="underline">
            Analyze a website first
          </Link>{" "}
          so we know which website to match in Search Console.
        </p>
      ) : state === "other-business" ? (
        <WhatWeAccess />
      ) : state === "connected" || state === "paused-connected" ? (
        <Connected
          connection={connection!}
          latest={snap as Latest | null}
          allowed={state === "connected"}
          isOwner={isOwner}
          returnTo={returnTo}
        />
      ) : (
        <NotConnected state={state} returnTo={returnTo} connectClassName={connectClassName} />
      )}
    </section>
  );
}

function Reasons({ reasons }: { reasons: string[] }) {
  return (
    <ul className="mt-2 space-y-0.5 text-sm">
      {reasons.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
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
        Connect the Google account that manages your website in Search Console, and Braventa shows how people find you on
        Google Search: clicks, impressions, top search queries and pages.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          Read-only: Braventa reads Search Console performance and sitemap data, and Google&apos;s index report for your home
          page, for the property that matches your website. It also sees the Google account&apos;s email address, to show
          which account is connected.
        </li>
        <li>Braventa can&apos;t change anything in your Google account or in Search Console.</li>
        <li>Disconnect any time. Disconnecting revokes Braventa&apos;s access and deletes the Search Console data it stored.</li>
      </ul>
    </div>
  );
}

// Connected before, now on Basic: the data stays, nothing new is fetched.
function PausedNotice() {
  return (
    <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
      The Search Console connection is part of Pro. This business is on Basic, so it&apos;s paused: data already fetched is
      kept, but nothing new is fetched. It resumes on Pro or Premium.{" "}
      <Link href="/plans" className="underline">
        See plans
      </Link>
    </p>
  );
}

// Never connected, on Basic: there's no data to keep.
function PausedNotConnectedNotice() {
  return (
    <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
      The Search Console connection is part of Pro. This business is on Basic, so it&apos;s paused. It&apos;s available on Pro
      or Premium.{" "}
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
        <PausedNotConnectedNotice />
      ) : state === "owner-only" ? (
        <p className="mt-4 text-sm text-muted">Ask the business owner to connect Search Console.</p>
      ) : (
        // A plain link, not a form: the start route redirects to Google's consent screen.
        <a href={searchConsoleStartHref(returnTo)} className={`${connectClassName} mt-4`}>
          Connect Google Search Console
        </a>
      )}
    </>
  );
}

function Connected({
  connection,
  latest,
  allowed,
  isOwner,
  returnTo,
}: {
  connection: Connection;
  latest: Latest | null;
  allowed: boolean;
  isOwner: boolean;
  returnTo: string;
}) {
  const choices = connection.available_properties;
  const clicksChange = latest ? formatChange(percentChange(latest.totals.current.clicks, latest.totals.previous.clicks)) : null;
  return (
    <>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted">Google account</dt>
        <dd>{connection.google_account_email ?? "Unknown"}</dd>
        <dt className="text-muted">Property</dt>
        <dd className="break-all">{connection.selected_property ?? "Not chosen yet"}</dd>
        <dt className="text-muted">Last fetched</dt>
        <dd>{connection.last_synced_at ? formatDateTime(connection.last_synced_at) : "Not yet"}</dd>
      </dl>

      {!allowed && <PausedNotice />}
      {allowed && connection.last_error && (
        <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-foreground" role="status">
          {connection.last_error}
        </p>
      )}

      {latest && (
        <div className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm">
          <p>
            Last 28 days: <strong>{formatInt(latest.totals.current.clicks)}</strong> clicks
            {clicksChange && <span className="text-muted"> ({clicksChange} vs the previous 28 days)</span>} and{" "}
            <strong>{formatInt(latest.totals.current.impressions)}</strong> impressions.
          </p>
          <Link href="/search" className="mt-1 inline-block underline">
            View search performance
          </Link>
        </div>
      )}

      {isOwner && choices.length > 0 && (choices.length > 1 || !connection.selected_property) && (
        <form action={chooseSearchConsoleProperty} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block flex-1 text-sm">
            <span className="font-medium">Search Console property for your website</span>
            <select name="property" defaultValue={connection.selected_property ?? ""} required className="input mt-1">
              <option value="" disabled>
                Choose a property
              </option>
              {choices.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton label="Use this property" pendingLabel="Fetching…" />
        </form>
      )}

      <div className="mt-4 flex flex-wrap items-start gap-2">
        {allowed && connection.selected_property && (
          <form action={refreshSearchConsole}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <SubmitButton label="Refresh Search Console data" pendingLabel="Refreshing…" />
          </form>
        )}
        {isOwner && connection.status === "error" && allowed && (
          <a href={searchConsoleStartHref(returnTo)} className="btn-secondary">
            Reconnect
          </a>
        )}
        {isOwner && <DisconnectButton returnTo={returnTo} />}
      </div>
      <p className="mt-3 text-xs text-muted">
        Read-only access. Braventa can&apos;t change anything in Google. Disconnecting deletes the Search Console data Braventa
        stored.
      </p>
    </>
  );
}

import Link from "next/link";
import { getCurrentOrg } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchConsoleConfigured } from "@/lib/integrations/google-oauth";
import { searchConsoleAccess } from "@/lib/integrations/search-console-access";
import { PROVIDER, percentChange, type Snapshot } from "@/lib/integrations/search-console";
import { formatChange, formatDateTime, formatInt } from "../search/format";
import { chooseSearchConsoleProperty, refreshSearchConsole } from "./connections-actions";
import { ConnectionNotice } from "./connection-notice";
import { DisconnectButton } from "./disconnect-button";
import { SubmitButton } from "./submit-button";

// Settings → Connections: the optional Google Search Console connection (Pro). Reads through the signed-in user's
// client, so RLS and column grants apply: the encrypted refresh token is never selected here.

type Connection = {
  google_account_email: string | null;
  available_properties: string[];
  selected_property: string | null;
  status: "active" | "paused" | "revoked" | "error";
  last_error: string | null;
  last_synced_at: string | null;
};

export async function ConnectionsSection() {
  const org = await getCurrentOrg();
  const configured = searchConsoleConfigured();
  const supabase = await createSupabaseServerClient();
  const [{ data: orgRow }, { data: conn }, { data: snap }] = org
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

  const access = orgRow ? searchConsoleAccess(orgRow) : null;
  const connection = conn && (conn as Connection).status !== "revoked" ? (conn as Connection) : null;
  const latest = snap as Pick<Snapshot, "property" | "totals" | "fetched_at"> | null;
  const isOwner = org?.role === "owner";

  return (
    <section id="connections" className="card mt-6 scroll-mt-6" aria-labelledby="connections-heading">
      <p className="eyebrow">Connections</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h3 id="connections-heading" className="text-lg font-semibold">
          Google Search Console
        </h3>
        <span className="chip bg-accent-soft text-accent-soft-foreground">Pro</span>
        {!configured ? (
          <span className="chip bg-surface-muted text-muted">Not available yet</span>
        ) : connection ? (
          <StatusChip connection={connection} paused={!access?.allowed} />
        ) : (
          <span className="chip bg-surface-muted text-muted">Not connected</span>
        )}
      </div>
      <ConnectionNotice />

      {!configured ? (
        <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
          Search Console connection isn&apos;t set up yet. It will appear here once the Braventa team turns it on.
        </p>
      ) : !org ? (
        <p className="mt-4 text-sm">
          <Link href="/onboarding" className="underline">
            Analyze a website first
          </Link>{" "}
          so we know which website to match in Search Console.
        </p>
      ) : connection ? (
        <Connected connection={connection} latest={latest} allowed={Boolean(access?.allowed)} isOwner={isOwner} />
      ) : (
        <NotConnected allowed={Boolean(access?.allowed)} isOwner={isOwner} />
      )}
    </section>
  );
}

function StatusChip({ connection, paused }: { connection: Connection; paused: boolean }) {
  if (paused) return <span className="chip bg-surface-muted text-muted">Paused</span>;
  if (connection.status === "error") return <span className="chip bg-danger-soft text-danger">Needs attention</span>;
  if (!connection.selected_property) return <span className="chip bg-warning-soft text-warning">Choose a property</span>;
  return <span className="chip bg-success-soft text-success">Connected</span>;
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

function NotConnected({ allowed, isOwner }: { allowed: boolean; isOwner: boolean }) {
  return (
    <>
      <WhatWeAccess />
      {!allowed ? (
        <PausedNotice />
      ) : !isOwner ? (
        <p className="mt-4 text-sm text-muted">Ask the business owner to connect Search Console.</p>
      ) : (
        // A plain link, not a form: the start route redirects to Google's consent screen.
        <a href="/api/integrations/google/start" className="btn-primary mt-4">
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
}: {
  connection: Connection;
  latest: Pick<Snapshot, "property" | "totals" | "fetched_at"> | null;
  allowed: boolean;
  isOwner: boolean;
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
            <SubmitButton label="Refresh Search Console data" pendingLabel="Refreshing…" />
          </form>
        )}
        {isOwner && connection.status === "error" && allowed && (
          <a href="/api/integrations/google/start" className="btn-secondary">
            Reconnect
          </a>
        )}
        {isOwner && <DisconnectButton />}
      </div>
      <p className="mt-3 text-xs text-muted">
        Read-only access. Braventa can&apos;t change anything in Google. Disconnecting deletes the Search Console data Braventa
        stored.
      </p>
    </>
  );
}

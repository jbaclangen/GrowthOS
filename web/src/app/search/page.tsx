import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchConsoleAccess } from "@/lib/integrations/search-console-access";
import { hasLittleData, percentChange, type Row, type Snapshot } from "@/lib/integrations/search-console";
import { formatChange, formatCtr, formatDateTime, formatDay, formatInt, formatPosition, shortPage } from "./format";

export const metadata: Metadata = { title: "Search performance" };

// Google's URL Inspection verdicts, in plain words. Wording reports what Google says; it promises nothing.
const VERDICTS: Record<string, string> = {
  PASS: "Pass: Google reports this URL is indexed",
  NEUTRAL: "Neutral: Google reports this URL isn't indexed",
  FAIL: "Fail: Google reports an indexing error",
  PARTIAL: "Partial",
};

// Read-only view of the latest Google Search Console snapshot (Pro). Data comes from search_console_snapshots
// through the signed-in user's client (RLS: members of the organization).
export default function SearchPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <SearchPerformance />
      </Suspense>
    </main>
  );
}

async function SearchPerformance() {
  await requireUser();
  const org = await getCurrentOrg();
  const supabase = await createSupabaseServerClient();
  const [{ data: snap }, { data: orgRow }] = org
    ? await Promise.all([
        supabase
          .from("search_console_snapshots")
          .select("property, date_range_start, date_range_end, totals, rows, fetched_at")
          .eq("organization_id", org.id)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("organizations").select("plan, trial_ends_at").eq("id", org.id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const s = snap as Snapshot | null;
  const access = orgRow ? searchConsoleAccess(orgRow) : null;

  return (
    <>
      <Link href="/settings#connections" className="text-sm text-muted underline">
        Settings
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Search performance</h1>

      {!s ? (
        <p className="mt-4 text-sm text-muted">
          No Search Console data yet.{" "}
          <Link href="/settings#connections" className="underline">
            Connect Google Search Console in Settings
          </Link>{" "}
          to see how people find your website on Google Search.
        </p>
      ) : (
        <Report s={s} paused={access ? !access.allowed : false} />
      )}
    </>
  );
}

function Report({ s, paused }: { s: Snapshot; paused: boolean }) {
  const { current, previous } = s.totals;
  return (
    <>
      <p className="mt-1 text-sm text-muted">
        Google Search Console, last 28 days ({formatDay(s.date_range_start)} to {formatDay(s.date_range_end)}), property{" "}
        <span className="break-all text-foreground">{s.property}</span>. Fetched {formatDateTime(s.fetched_at)}.
      </p>
      <p className="mt-2 text-sm text-muted">
        Search Console doesn&apos;t show every query: Google leaves out rare and anonymized searches, and its data runs a few
        days behind. Compared with the previous 28 days ({formatDay(s.totals.previousRange.start)} to{" "}
        {formatDay(s.totals.previousRange.end)}).
      </p>
      {paused && (
        <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm" role="status">
          The Search Console connection is paused because this business is on Basic, so this data isn&apos;t updated. It
          resumes on Pro or Premium.{" "}
          <Link href="/plans" className="underline">
            See plans
          </Link>
        </p>
      )}
      {hasLittleData(s.totals) && (
        <p className="mt-4 rounded-md bg-info-soft px-3 py-2 text-sm text-foreground" role="status">
          Google has little or no search data for this property yet. That&apos;s normal for a new website or one with little
          search traffic.
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clicks" value={formatInt(current.clicks)} change={formatChange(percentChange(current.clicks, previous.clicks))} />
        <Stat
          label="Impressions"
          value={formatInt(current.impressions)}
          change={formatChange(percentChange(current.impressions, previous.impressions))}
        />
        <Stat label="Average click-through rate" value={formatCtr(current.ctr)} change={previous.impressions ? `was ${formatCtr(previous.ctr)}` : null} />
        <Stat
          label="Average position"
          value={formatPosition(current.position)}
          change={previous.position ? `was ${formatPosition(previous.position)} (lower is better)` : null}
        />
      </div>

      <RowsTable caption="Top search queries" keyLabel="Query" rows={s.rows.queries} />
      <RowsTable caption="Top pages" keyLabel="Page" rows={s.rows.pages} format={shortPage} />
      <RowsTable caption="Devices" keyLabel="Device" rows={s.rows.devices} format={(d) => d.charAt(0) + d.slice(1).toLowerCase()} />

      {s.rows.sitemaps && (
        <section className="card mt-6" aria-labelledby="sitemaps">
          <h2 id="sitemaps" className="text-lg font-semibold">
            Sitemaps
          </h2>
          {s.rows.sitemaps.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No sitemap is submitted in Search Console for this property.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border text-sm">
              {s.rows.sitemaps.map((m) => (
                <li key={m.path} className="py-2">
                  <p className="break-all font-medium">{m.path}</p>
                  <p className="text-xs text-muted">
                    {formatInt(m.submitted)} URLs submitted · {m.errors} errors · {m.warnings} warnings
                    {m.lastDownloaded ? ` · last read by Google ${formatDateTime(m.lastDownloaded)}` : ""}
                    {m.isPending ? " · pending" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {s.rows.inspection && (
        <section className="card mt-6" aria-labelledby="inspection">
          <h2 id="inspection" className="text-lg font-semibold">
            Home page in Google&apos;s index
          </h2>
          <p className="mt-1 text-sm text-muted">
            Google&apos;s URL Inspection report for <span className="break-all">{s.rows.inspection.url}</span>, as of the last
            fetch.
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted">Verdict</dt>
            <dd>{VERDICTS[s.rows.inspection.verdict ?? ""] ?? s.rows.inspection.verdict ?? "Unknown"}</dd>
            <dt className="text-muted">Coverage</dt>
            <dd>{s.rows.inspection.coverageState ?? "Unknown"}</dd>
            <dt className="text-muted">Last crawled</dt>
            <dd>{s.rows.inspection.lastCrawlTime ? formatDateTime(s.rows.inspection.lastCrawlTime) : "Unknown"}</dd>
            {s.rows.inspection.googleCanonical && (
              <>
                <dt className="text-muted">Google-selected canonical</dt>
                <dd className="break-all">{s.rows.inspection.googleCanonical}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {s.rows.notes.length > 0 && (
        <ul className="mt-6 list-disc pl-5 text-sm text-muted">
          {s.rows.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function Stat({ label, value, change }: { label: string; value: string; change: string | null }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{change ?? "No earlier data to compare"}</p>
    </div>
  );
}

function RowsTable({ caption, keyLabel, rows, format = (k) => k }: { caption: string; keyLabel: string; rows: Row[]; format?: (key: string) => string }) {
  return (
    <section className="card mt-6 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="mb-2 text-left text-lg font-semibold">{caption}</caption>
        <thead className="text-xs text-muted">
          <tr>
            <th scope="col" className="py-1 pr-3 font-medium">
              {keyLabel}
            </th>
            <th scope="col" className="py-1 pr-3 text-right font-medium">
              Clicks
            </th>
            <th scope="col" className="py-1 pr-3 text-right font-medium">
              Impressions
            </th>
            <th scope="col" className="py-1 pr-3 text-right font-medium">
              CTR
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              Position
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-2 text-muted">
                No data for this period.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.key}>
                <th scope="row" className="max-w-xs break-words py-1.5 pr-3 font-normal">
                  {format(r.key)}
                </th>
                <td className="py-1.5 pr-3 text-right">{formatInt(r.clicks)}</td>
                <td className="py-1.5 pr-3 text-right">{formatInt(r.impressions)}</td>
                <td className="py-1.5 pr-3 text-right">{formatCtr(r.ctr)}</td>
                <td className="py-1.5 text-right">{formatPosition(r.position)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

import {
  PRIORITY_LABEL_TEXT,
  SOURCE_LABEL,
  coverageLine,
  richResultsTestUrl,
  type Category,
  type PriorityLabel,
} from "@/lib/audit/checks";
import type { FieldData, PageSpeedRun } from "@/lib/integrations/google";
import { ALLOW_BRAVENTA_SNIPPET } from "@/lib/integrations/robots";
import type { AuditData, AuditFindingRow } from "./report-data";

// Technical checks (Website Intelligence Phase 1): coverage, robots.txt, deterministic findings by priority label,
// and PageSpeed with real-user (field) and lab data kept apart. Everything here is measured, not AI-written.
// Crawled values (titles, URLs, errors) are untrusted text: rendered as plain text, never as HTML.

const LABELS: PriorityLabel[] = ["fix_first", "improve_next", "monitor"];
const LABEL_TONE: Record<PriorityLabel, string> = {
  fix_first: "bg-danger-soft text-danger",
  improve_next: "bg-warning-soft text-warning",
  monitor: "bg-surface-muted text-muted",
};
const CATEGORY_LABEL: Record<Category, string> = {
  indexability: "Indexability",
  technical: "Technical",
  on_page: "On-page",
  structured_data: "Structured data",
  performance: "Performance",
};
const MAX_LISTED = 10;

const pathOf = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
};

export function TechnicalSection({ audit }: { audit: AuditData | null }) {
  if (!audit) {
    return (
      <p className="text-sm text-muted">
        Technical checks weren&apos;t part of this analysis. Re-run the analysis to add them.
      </p>
    );
  }
  const { run, findings } = audit;
  const coverage = run.coverage;
  const summary = coverage.summary;
  const robotsStatus = coverage.robots?.status;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Measured by Braventa&apos;s crawler and Google PageSpeed: observations, not AI opinions. Braventa reads public
        pages only and follows your site&apos;s robots.txt.
      </p>

      {summary?.homeBlocked ? (
        <section className="rounded-md bg-warning-soft p-4 text-sm" aria-labelledby="robots-blocked-title">
          <h3 id="robots-blocked-title" className="font-semibold">
            {robotsStatus === "unreachable" ? "Your robots.txt couldn't be read" : "Your robots.txt doesn't allow Braventa to read your site"}
          </h3>
          <p className="mt-1">
            {robotsStatus === "unreachable"
              ? "The file didn't load (no answer or a server error), and Braventa doesn't read a site whose robots.txt it can't check. "
              : "Braventa respects it, so no pages were read. "}
            This analysis used Google PageSpeed and your answers only.
          </p>
          {robotsStatus !== "unreachable" && (
            <>
              <p className="mt-2">To let Braventa read your pages, add this to your robots.txt and re-run the analysis:</p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-surface p-3 text-xs">{ALLOW_BRAVENTA_SNIPPET}</pre>
            </>
          )}
        </section>
      ) : (
        summary && (
          <section aria-label="Coverage">
            <p className="text-sm font-medium">{coverageLine(summary)}</p>
            <p className="mt-1 text-xs text-muted">
              Braventa reads up to {coverage.limits?.maxPages ?? 25} pages per analysis, business pages first, from your
              sitemap and home page links.
              {coverage.sitemap && !coverage.sitemap.found && " No XML sitemap was found."}
            </p>
            {summary.robotsExcluded.length > 0 && (
              <div className="mt-3 rounded-md bg-surface-muted p-3 text-sm">
                <p>
                  Your robots.txt blocks {summary.robotsExcluded.length}{" "}
                  {summary.robotsExcluded.length === 1 ? "page" : "pages"}, so Braventa didn&apos;t read{" "}
                  {summary.robotsExcluded.length === 1 ? "it" : "them"}:
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted">
                  {summary.robotsExcluded.slice(0, MAX_LISTED).map((u) => (
                    <li key={u} className="break-all">
                      {pathOf(u)}
                    </li>
                  ))}
                </ul>
                {summary.robotsExcluded.length > MAX_LISTED && (
                  <p className="mt-1 text-xs text-muted">and {summary.robotsExcluded.length - MAX_LISTED} more</p>
                )}
              </div>
            )}
          </section>
        )
      )}

      {LABELS.map((label) => {
        const group = findings.filter((f) => f.priority_label === label);
        if (!group.length) return null;
        return (
          <section key={label} aria-labelledby={`tech-${label}`}>
            <h3 id={`tech-${label}`} className="flex items-center gap-2 font-semibold">
              <span className={`chip ${LABEL_TONE[label]}`}>{PRIORITY_LABEL_TEXT[label]}</span>
              <span className="text-sm font-normal text-muted tabular-nums">{group.length}</span>
            </h3>
            <ul className="mt-3 space-y-3">
              {group.map((f) => (
                <FindingItem key={f.id} finding={f} />
              ))}
            </ul>
          </section>
        );
      })}
      {findings.length === 0 && !summary?.homeBlocked && (
        <p className="text-sm text-muted">The checks found no issues on the pages scanned.</p>
      )}

      <StructuredData audit={audit} />
      <PageSpeed pagespeed={run.pagespeed} />

      <section className="rounded-md bg-surface-muted p-3 text-xs text-muted" aria-label="Limits of these checks">
        <p className="font-medium text-foreground">What these checks can&apos;t tell you</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>A public crawl isn&apos;t Google&apos;s index: a page that loads here may or may not be indexed by Google.</li>
          <li>The Lighthouse SEO score checks basics on one page. It isn&apos;t a Google ranking score.</li>
          <li>Valid structured data can make a page eligible for rich results; it doesn&apos;t guarantee them.</li>
          <li>Lab tests use a simulated device and vary between runs; real-user data shows what visitors experience.</li>
        </ul>
      </section>
    </div>
  );
}

function FindingItem({ finding: f }: { finding: AuditFindingRow }) {
  return (
    <li className="card">
      <p className="text-sm font-medium">
        <span className="mr-2 text-xs text-muted tabular-nums">{f.ref}</span>
        {f.summary}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <span className="chip bg-surface-muted text-muted">{CATEGORY_LABEL[f.category] ?? f.category}</span>
        <span>{f.severity === "high" ? "High" : f.severity === "medium" ? "Medium" : "Low"} severity</span>
        <span aria-hidden="true">·</span>
        <span>{f.confidence === "high" ? "High" : f.confidence === "medium" ? "Medium" : "Low"} confidence</span>
        <span aria-hidden="true">·</span>
        <span>Source: {SOURCE_LABEL[f.source_type] ?? f.source_type}</span>
      </p>
      <p className="mt-1 break-all text-xs text-muted">Page: {f.page_url ? pathOf(f.page_url) : "site-wide"}</p>
      <Observed observed={f.observed} />
      <p className="mt-2 text-sm">
        <span className="font-medium">What to do: </span>
        {f.recommendation}
      </p>
    </li>
  );
}

const KEY_LABEL: Record<string, string> = {
  rich_results_test: "Rich Results Test",
};

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "none";
  if (Array.isArray(v)) return v.map(show).join("; ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    // PageSpeed opportunities: "Font display (0.8 s)".
    if (typeof o.title === "string" && "savings_ms" in o) {
      return typeof o.savings_ms === "number" ? `${o.title} (${(o.savings_ms / 1000).toFixed(1)} s)` : o.title;
    }
    return Object.entries(o)
      .map(([k, x]) => `${k.replace(/_/g, " ")} ${show(x)}`)
      .join(", ");
  }
  return String(v);
}

// The observed values as plain text. A Rich Results Test link is the only link, and it's built by Braventa.
function Observed({ observed }: { observed: Record<string, unknown> }) {
  const entries = Object.entries(observed ?? {});
  if (!entries.length) return null;
  return (
    <dl className="mt-2 space-y-0.5 rounded-md bg-surface p-2 text-xs">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="shrink-0 text-muted">{KEY_LABEL[k] ?? k.replace(/_/g, " ")}:</dt>
          <dd className="min-w-0 break-all">
            {k === "rich_results_test" && typeof v === "string" && v.startsWith("https://search.google.com/") ? (
              <a href={v} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Check in Google&apos;s Rich Results Test
              </a>
            ) : (
              show(v).slice(0, 600)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StructuredData({ audit }: { audit: AuditData }) {
  const pages = audit.run.coverage.pages ?? [];
  const typed = pages.filter((p) => p.jsonLd.types.length || p.microdataTypes.length);
  if (!typed.length) return null;
  const home = audit.run.coverage.finalUrl;
  return (
    <section aria-labelledby="sd-title">
      <h3 id="sd-title" className="font-semibold">
        Structured data found
      </h3>
      <ul className="mt-2 space-y-1 text-sm">
        {typed.slice(0, MAX_LISTED).map((p) => (
          <li key={p.url} className="break-all">
            <span className="text-muted">{pathOf(p.url)}: </span>
            {[...new Set([...p.jsonLd.types, ...p.microdataTypes])].join(", ")}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Valid markup can make a page eligible for some rich results; Google decides whether to show them.
        {home && (
          <>
            {" "}
            <a href={richResultsTestUrl(home)} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Test your home page in Google&apos;s Rich Results Test
            </a>
          </>
        )}
      </p>
    </section>
  );
}

const CATEGORY_TEXT: Record<string, string> = { FAST: "Good", AVERAGE: "Needs improvement", SLOW: "Poor" };

function FieldRows({ field }: { field: FieldData }) {
  const rows = [
    { label: "Loading (LCP)", m: field.lcpMs, v: (n: number) => `${(n / 1000).toFixed(1)} s` },
    { label: "Responsiveness (INP)", m: field.inpMs, v: (n: number) => `${Math.round(n)} ms` },
    { label: "Visual stability (CLS)", m: field.cls, v: (n: number) => n.toFixed(2) },
  ];
  return (
    <dl className="space-y-1 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-2">
          <dt>{r.label}</dt>
          <dd className="tabular-nums">
            {r.m ? (
              <>
                {r.v(r.m.percentile)} <span className="text-xs text-muted">{CATEGORY_TEXT[r.m.category] ?? r.m.category}</span>
              </>
            ) : (
              <span className="text-muted">no data</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RunColumn({ title, run, error }: { title: string; run: PageSpeedRun | null | undefined; error: string | null | undefined }) {
  return (
    <div className="card">
      <h4 className="font-semibold">{title}</h4>
      {!run ? (
        <p className="mt-2 text-sm text-muted">PageSpeed didn&apos;t return results{error ? `: ${error}` : "."}</p>
      ) : (
        <>
          <p className="eyebrow mt-3">Real visitors (Chrome UX Report, last 28 days)</p>
          <div className="mt-1">
            {run.field ? (
              <>
                <FieldRows field={run.field} />
                {run.field.originFallback && <p className="mt-1 text-xs text-muted">Data for the whole site; this page alone had too few visits.</p>}
              </>
            ) : (
              <p className="text-sm text-muted">Not enough real-user data for this site yet. Google publishes it only for sites with enough Chrome visitors.</p>
            )}
          </div>
          <p className="eyebrow mt-4">Lab test (simulated device)</p>
          {run.labError ? (
            <p className="mt-1 text-sm text-muted">Lighthouse couldn&apos;t measure performance on this run.</p>
          ) : null}
          <dl className="mt-1 space-y-1 text-sm">
            {[
              // A run Lighthouse couldn't measure reports 0; show it as not measured.
              ["Performance", run.labError ? "–" : run.scores.performance],
              ["SEO basics", run.scores.seo],
              ["Accessibility", run.scores.accessibility],
              ["Best practices", run.scores.bestPractices],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <dt>{label}</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))}
            {run.lab.lcpMs !== null && (
              <div className="flex justify-between gap-2">
                <dt>Loading (LCP)</dt>
                <dd className="tabular-nums">{(run.lab.lcpMs / 1000).toFixed(1)} s</dd>
              </div>
            )}
          </dl>
        </>
      )}
    </div>
  );
}

function PageSpeed({ pagespeed }: { pagespeed: AuditData["run"]["pagespeed"] }) {
  if (!pagespeed) return null;
  const opportunities = pagespeed.mobile?.opportunities ?? [];
  return (
    <section aria-labelledby="psi-title">
      <h3 id="psi-title" className="font-semibold">
        Google PageSpeed: home page
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <RunColumn title="Mobile" run={pagespeed.mobile} error={pagespeed.errors?.mobile} />
        <RunColumn title="Desktop" run={pagespeed.desktop} error={pagespeed.errors?.desktop} />
      </div>
      {opportunities.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium">Biggest lab opportunities (mobile)</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {opportunities.map((o) => (
              <li key={o.id}>
                {o.title}
                {o.savingsMs ? <span className="text-xs text-muted"> about {(o.savingsMs / 1000).toFixed(1)} s estimated savings</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

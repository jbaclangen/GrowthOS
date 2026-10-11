import Link from "next/link";
import { getPainPoint } from "@/lib/onboarding/catalog";
import { PROVENANCE_LABEL, type Provenance } from "@/lib/plan/priority";
import { PRIORITY_LABEL_TEXT, type PriorityLabel } from "@/lib/audit/checks";
import { scoreTone } from "@/components/score-badge";
import { sortedPlan } from "./plan-section";
import type { Report } from "./report-data";

// The report as an infographic (founder request, 2026-10-11): a one-screen summary where every tile opens the
// full section in a dialog (?view=…). Charts follow the dataviz rules: one hue for single series, the chart
// palette in fixed order for categories, values always printed next to the marks (the chart blue is below 3:1
// on the dark surface, so color never carries a value alone).

export const VIEWS = {
  scores: "Growth score",
  diagnosis: "What's holding the business back",
  plan: "Growth plan",
  technical: "Technical checks",
  answers: "What you told us",
  profile: "Business profile",
  content: "30-day content plan",
  drafts: "Drafted posts",
  opportunities: "Top 5 opportunities",
} as const;
export type ViewKey = keyof typeof VIEWS;

export function isView(v: unknown): v is ViewKey {
  return typeof v === "string" && v in VIEWS;
}

const PROVENANCE_ORDER: Provenance[] = ["customer_provided", "verified", "inferred"];
const PROVENANCE_COLOR: Record<Provenance, string> = {
  customer_provided: "var(--color-chart-1)",
  verified: "var(--color-chart-2)",
  inferred: "var(--color-chart-3)",
};

function Tile({
  href,
  view,
  className = "",
  children,
}: {
  href: string;
  view: ViewKey;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`${href}?view=${view}`}
      scroll={false}
      aria-label={`${VIEWS[view]}: open the full report`}
      className={`card group flex flex-col transition-colors hover:border-accent focus-visible:border-accent ${className}`}
    >
      <span className="eyebrow">{VIEWS[view]}</span>
      <div className="mt-2 flex-1">{children}</div>
      <span className="mt-3 text-xs text-muted group-hover:text-foreground">Open full report →</span>
    </Link>
  );
}

// Growth score as a ring: one value against 100.
function ScoreRing({ score }: { score: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0" role="img" aria-label={`Growth score ${score} out of 100`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-surface-muted)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--color-chart-1)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[26px] font-semibold">
        {score}
      </text>
      <text x="50" y="72" textAnchor="middle" className="fill-muted text-[9px]">
        of 100
      </text>
    </svg>
  );
}

// Horizontal bars for a single series; the value is printed at the end of each bar.
function Bars({ rows, max = 100 }: { rows: { label: string; value: number; note?: string }[]; max?: number }) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-xs" title={`${r.label}: ${r.value}${max === 100 ? " of 100" : ""}`}>
          <div className="flex justify-between gap-2">
            <span className="truncate">
              {r.label}
              {r.note && <span className="ml-1 text-muted">{r.note}</span>}
            </span>
            <span className="font-medium tabular-nums">{r.value}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface-muted">
            <div
              className="h-2 rounded-full"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: "var(--color-chart-1)" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// One stacked bar of categories, 2px surface gaps between segments, legend with counts (never color alone).
function StackedBar({ parts }: { parts: { key: string; label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={shown.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {shown.map((p) => (
          <div key={p.key} title={`${p.label}: ${p.value}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
            {p.label} <span className="font-medium tabular-nums">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

// Technical checks: how much of the site was read, and the findings per priority label.
function TechnicalTile({ audit, href }: { audit: NonNullable<Report["audit"]>; href: string }) {
  const summary = audit.run.coverage.summary;
  const count = (label: PriorityLabel) => audit.findings.filter((f) => f.priority_label === label).length;
  return (
    <Tile href={href} view="technical">
      {summary?.homeBlocked ? (
        <p className="text-sm">
          <span className="chip bg-warning-soft text-foreground">Blocked by robots.txt</span>
          <span className="mt-2 block text-xs text-muted">Your site&apos;s robots.txt doesn&apos;t allow Braventa to read it.</span>
        </p>
      ) : (
        <p className="text-xs text-muted">
          <span className="font-medium tabular-nums text-foreground">{summary?.scanned ?? audit.run.pages_scanned}</span> of{" "}
          {summary?.discovered ?? audit.run.pages_discovered} pages scanned
          {summary?.robotsExcluded.length ? `; ${summary.robotsExcluded.length} excluded by robots.txt` : ""}
        </p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat value={count("fix_first")} label={PRIORITY_LABEL_TEXT.fix_first.toLowerCase()} />
        <Stat value={count("improve_next")} label={PRIORITY_LABEL_TEXT.improve_next.toLowerCase()} />
        <Stat value={count("monitor")} label={PRIORITY_LABEL_TEXT.monitor.toLowerCase()} />
      </div>
    </Tile>
  );
}

export function ReportInfographic({ report, href }: { report: Report; href: string }) {
  const { data, diagnosis, findings, planItems, issues, ownStatement, intel, strategy, contentItems, drafts, audit } = report;
  if (!data) return null;

  const scoreRows = [
    { label: "Content clarity", value: data.scores.content_clarity },
    { label: "Conversion readiness", value: data.scores.conversion_readiness },
    { label: "Online presence", value: data.scores.online_presence },
    ...(data.pagespeed
      ? [
          { label: "Mobile speed", value: data.pagespeed.performance, note: "Google" },
          { label: "SEO basics", value: data.pagespeed.seo, note: "Google" },
        ]
      : []),
  ];

  const confirmed = diagnosis?.status === "confirmed";
  const plan = diagnosis ? sortedPlan(planItems, confirmed) : [];
  const done = planItems.filter((i) => i.status === "done").length;
  const active = planItems.filter((i) => i.status !== "dismissed").length;

  const channels = Object.entries(
    contentItems.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.channel]: (acc[i.channel] ?? 0) + 1 }), {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const draftCount = (s: string) => drafts.filter((d) => d.status === s).length;

  return (
    <section aria-label="Report summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Tile href={href} view="scores" className="lg:row-span-2">
        <div className="flex items-center gap-4">
          <ScoreRing score={data.growth_score} />
          <p className={`text-sm font-medium ${scoreTone(data.growth_score)}`}>
            {data.growth_score >= 70 ? "Strong" : data.growth_score >= 45 ? "Room to grow" : "Needs attention"}
            <span className="mt-1 block text-xs font-normal text-muted">Measured site quality and assessed marketing readiness</span>
          </p>
        </div>
        <div className="mt-4">
          <Bars rows={scoreRows} />
        </div>
      </Tile>

      {diagnosis ? (
        <Tile href={href} view="diagnosis">
          <div className="flex items-baseline justify-between gap-2">
            <Stat value={findings.length} label="findings" />
            <span className={`chip ${confirmed ? "bg-success-soft text-foreground" : "bg-warning-soft text-foreground"}`}>
              {confirmed ? "Confirmed by you" : "Needs your check"}
            </span>
          </div>
          <div className="mt-3">
            <StackedBar
              parts={PROVENANCE_ORDER.map((p) => ({
                key: p,
                label: PROVENANCE_LABEL[p],
                value: findings.filter((f) => f.provenance === p).length,
                color: PROVENANCE_COLOR[p],
              }))}
            />
          </div>
        </Tile>
      ) : data.opportunities?.length ? (
        <Tile href={href} view="opportunities">
          <Stat value={data.opportunities.length} label="opportunities" />
          <p className="mt-2 line-clamp-2 text-sm">{data.opportunities[0].title}</p>
        </Tile>
      ) : null}

      {diagnosis && (
        <Tile href={href} view="plan">
          <div className="flex items-baseline justify-between gap-2">
            <Stat value={plan.length} label={confirmed ? "actions in your plan" : "proposed actions"} />
            {confirmed && (
              <span className="text-xs text-muted">
                <span className="font-medium tabular-nums text-foreground">{done}</span> of {active} done
              </span>
            )}
          </div>
          {confirmed && (
            <div className="mt-2 h-2 rounded-full bg-surface-muted" role="img" aria-label={`${done} of ${active} actions done`}>
              <div className="h-2 rounded-full" style={{ width: `${active ? (done / active) * 100 : 0}%`, background: "var(--color-chart-1)" }} />
            </div>
          )}
          <ol className="mt-3 space-y-1 text-sm">
            {plan.slice(0, 3).map((i, n) => (
              <li key={i.id} className="flex gap-2">
                <span className="text-muted tabular-nums">{i.final_priority ?? n + 1}</span>
                <span className="line-clamp-1">{i.title}</span>
              </li>
            ))}
          </ol>
        </Tile>
      )}

      {audit && <TechnicalTile audit={audit} href={href} />}

      {(issues.length > 0 || ownStatement) && (
        <Tile href={href} view="answers">
          <ol className="space-y-1 text-sm">
            {issues
              .filter((i) => i.priority)
              .map((i) => (
                <li key={i.id} className="flex gap-2">
                  <span className="chip bg-accent-soft text-accent-soft-foreground">{i.priority}</span>
                  <span className="line-clamp-1">{getPainPoint(i.id)?.label}</span>
                </li>
              ))}
          </ol>
          {issues.length > 3 && <p className="mt-2 text-xs text-muted">and {issues.length - 3} more you mentioned</p>}
        </Tile>
      )}

      {intel.summary && (
        <Tile href={href} view="profile">
          <p className="line-clamp-4 text-sm">{intel.summary}</p>
        </Tile>
      )}

      {strategy && (
        <Tile href={href} view="content">
          <Stat value={contentItems.length} label="planned posts in 30 days" />
          {channels.length > 0 && (
            <div className="mt-3">
              <Bars rows={channels.map(([label, value]) => ({ label, value }))} max={channels[0][1]} />
            </div>
          )}
        </Tile>
      )}

      {drafts.length > 0 && (
        <Tile href={href} view="drafts">
          <div className="grid grid-cols-3 gap-2">
            <Stat value={draftCount("needs_approval")} label="waiting for you" />
            <Stat value={draftCount("approved")} label="approved" />
            <Stat value={draftCount("rejected")} label="rejected" />
          </div>
          <p className="mt-3 text-xs text-muted">Nothing is published until you approve it.</p>
        </Tile>
      )}
    </section>
  );
}

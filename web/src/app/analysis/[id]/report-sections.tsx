import { getPainPoint } from "@/lib/onboarding/catalog";
import { fromProfileRow } from "@/lib/owner-inputs";
import { ScoreBadge, ScoreBar } from "@/components/score-badge";
import { ContentActions } from "./controls";
import { OwnerPanel } from "./owner-panel";
import { DiagnosisSection, PlanSection } from "./plan-section";
import { TechnicalSection } from "./technical-section";
import type { ViewKey } from "./infographic";
import type { Report } from "./report-data";

// The full sections behind each infographic tile, shown in the report dialog.

type DraftNotes = { image_prompt?: string; compliance_note?: string; regulated_area?: string | null };

export function ReportSection({ view, report }: { view: ViewKey; report: Report }) {
  switch (view) {
    case "scores":
      return <Scores report={report} />;
    case "diagnosis":
      return report.diagnosis ? (
        <DiagnosisSection
          diagnosis={report.diagnosis}
          findings={report.findings}
          updating={report.updatingDiagnosis}
          replacesConfirmedOn={
            report.earlierConfirmed?.confirmed_at ? new Date(report.earlierConfirmed.confirmed_at).toLocaleDateString() : null
          }
        />
      ) : null;
    case "plan":
      return report.diagnosis ? (
        <PlanSection items={report.planItems} confirmed={report.diagnosis.status === "confirmed"} />
      ) : null;
    case "technical":
      return <TechnicalSection audit={report.audit} />;
    case "answers":
      return <Answers report={report} />;
    case "profile":
      return <Profile report={report} />;
    case "content":
      return <Content report={report} />;
    case "drafts":
      return <Drafts report={report} />;
    case "opportunities":
      return <Opportunities report={report} />;
  }
}

function Scores({ report }: { report: Report }) {
  const { data } = report;
  if (!data) return null;
  return (
    <section className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className="flex items-center gap-4 md:w-1/3">
        <ScoreBadge score={data.growth_score} />
        <p className="text-xs text-muted">
          A blend of measured site quality (Google PageSpeed) and Braventa&apos;s assessment of your marketing readiness.
        </p>
      </div>
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <ScoreBar label="Content clarity" value={data.scores.content_clarity} />
        <ScoreBar label="Conversion readiness" value={data.scores.conversion_readiness} />
        <ScoreBar label="Online presence" value={data.scores.online_presence} />
        {data.pagespeed ? (
          <>
            <ScoreBar label="Mobile speed" value={data.pagespeed.performance} note="Google" />
            <ScoreBar label="SEO basics" value={data.pagespeed.seo} note="Google" />
            <ScoreBar label="Accessibility" value={data.pagespeed.accessibility} note="Google" />
            <ScoreBar label="Best practices" value={data.pagespeed.bestPractices} note="Google" />
          </>
        ) : (
          <p className="text-sm text-muted">Google PageSpeed scores weren&apos;t available for this run.</p>
        )}
      </div>
    </section>
  );
}

function Answers({ report }: { report: Report }) {
  return (
    <div className="space-y-6">
      {(report.issues.length > 0 || report.ownStatement) && (
        <section aria-label="Issues you told us about">
          <span className="chip bg-accent-soft text-accent-soft-foreground">From you</span>
          {report.issues.length > 0 && (
            <ul className="mt-3 space-y-2 text-sm">
              {report.issues.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span className="w-24 shrink-0 text-xs text-muted">{c.priority ? `Priority ${c.priority}` : "Also noted"}</span>
                  <span>
                    {getPainPoint(c.id)?.label}
                    {c.details.map((d) => (
                      <span key={d.question} className="mt-0.5 block text-xs text-muted">
                        {d.question} <span className="text-foreground">{d.answer}</span>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {report.ownStatement && <p className="mt-3 text-sm text-muted">In your words: “{report.ownStatement}”</p>}
        </section>
      )}
      <OwnerPanel businessProfileId={report.id} inputs={fromProfileRow(report.profile)} />
    </div>
  );
}

function Profile({ report }: { report: Report }) {
  const { intel } = report;
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <div className="md:col-span-3">
        <p className="text-sm">{intel.summary}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Services" value={intel.services?.join(", ")} />
          <Field label="Customers" value={intel.target_customers} />
          <Field label="Locations" value={intel.locations?.join(", ")} />
          <Field label="Brand voice" value={intel.brand_voice?.tone} />
        </dl>
      </div>
      <ListCard title="Strengths" items={intel.strengths} />
      <ListCard title="Gaps" items={intel.gaps} />
      <ListCard title="Likely competitors" items={intel.likely_competitors} />
    </section>
  );
}

function Content({ report }: { report: Report }) {
  const { strategy, contentItems } = report;
  return (
    <div className="space-y-6">
      {strategy && (
        <section>
          <p className="text-sm">
            <span className="font-medium">Goal: </span>
            {strategy.primary_goal}
          </p>
          <p className="mt-1 text-sm">
            <span className="font-medium">Audience: </span>
            {strategy.audience}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {strategy.pillars.map((p) => (
              <div key={p.name} className="rounded-md bg-surface p-3">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted">{p.purpose}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      {contentItems.length > 0 && (
        <section className="overflow-x-auto" aria-label="Content calendar">
          <h3 className="font-semibold">Content calendar</h3>
          <table className="mt-3 w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Channel</th>
                <th className="py-2 pr-3 font-medium">Topic</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {contentItems.map((i) => (
                <tr key={i.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap py-2 pr-3 text-muted">{formatDay(i.scheduled_for)}</td>
                  <td className="py-2 pr-3">{i.channel}</td>
                  <td className="py-2 pr-3">
                    {i.title}
                    <span className="block text-xs text-muted">{i.brief}</span>
                  </td>
                  <td className="py-2">
                    <StatusTag status={i.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Drafts({ report }: { report: Report }) {
  return (
    <section>
      <p className="text-sm text-muted">Nothing is published until you approve it.</p>
      <div className="mt-3 space-y-3">
        {report.drafts.map((d) => {
          const notes = d.qa_notes as DraftNotes | null;
          return (
            <article key={d.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag>{d.channel}</Tag>
                  <span className="text-xs text-muted">{formatDay(d.scheduled_for)}</span>
                  <StatusTag status={d.status} />
                </div>
                <ContentActions itemId={d.id} status={d.status} />
              </div>
              <h3 className="mt-2 font-medium">{d.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm">{d.body}</p>
              {notes?.compliance_note && (
                <div className="mt-3 rounded-md bg-warning-soft p-3 text-sm">
                  <span className="chip bg-warning-soft text-warning">Check before approving</span>
                  <p className="mt-1">
                    {notes.regulated_area && <span className="font-medium">{notes.regulated_area} is regulated. </span>}
                    {notes.compliance_note}
                  </p>
                </div>
              )}
              {notes?.image_prompt && (
                <p className="mt-3 rounded-md bg-background p-3 text-xs text-muted">
                  <span className="font-medium text-foreground">Image idea: </span>
                  {notes.image_prompt}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

// Reports from before the single plan (ON-8).
function Opportunities({ report }: { report: Report }) {
  const priorityOf = new Map(report.issues.map((c) => [c.id, c.priority]));
  return (
    <ol className="space-y-3">
      {(report.data?.opportunities ?? []).map((o, i) => (
        <li key={i} className="card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-muted tabular-nums">{i + 1}</span>
            <h3 className="font-medium">{o.title}</h3>
            <Tag>{o.area}</Tag>
            <Tag tone={o.impact === "high" ? "accent" : undefined}>{o.impact} impact</Tag>
            <Tag>{o.effort} effort</Tag>
          </div>
          {(o.pain_point_ids?.length ?? 0) > 0 && (
            <p className="mt-2 text-xs text-accent-soft-foreground">
              Addresses{" "}
              {o.pain_point_ids!
                .map((pid) => {
                  const rank = priorityOf.get(pid);
                  const label = getPainPoint(pid)?.label ?? pid;
                  return rank ? `your priority ${rank}: ${label.toLowerCase()}` : label.toLowerCase();
                })
                .join("; ")}
            </p>
          )}
          <p className="mt-2 text-sm text-muted">{o.why}</p>
          <p className="mt-2 text-sm">
            <span className="font-medium">First step: </span>
            {o.action}
          </p>
        </li>
      ))}
    </ol>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="card">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: "accent" }) {
  return (
    <span className={`chip ${tone === "accent" ? "bg-accent-soft text-accent-soft-foreground" : "bg-surface-muted text-muted"}`}>
      {children}
    </span>
  );
}

const STATUS_LABEL: Record<string, string> = {
  brief: "Planned",
  needs_approval: "Needs approval",
  approved: "Approved",
  rejected: "Rejected",
};

// Status chip tones: design-system/component-guidelines.md#status-chips
const STATUS_TONE: Record<string, string> = {
  approved: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
  needs_approval: "bg-warning-soft text-warning",
};

function StatusTag({ status }: { status: string }) {
  return <span className={`chip ${STATUS_TONE[status] ?? "bg-surface-muted text-muted"}`}>{STATUS_LABEL[status] ?? status}</span>;
}

function formatDay(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

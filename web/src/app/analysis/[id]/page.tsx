import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STEPS, type BusinessIntel, type StepKey } from "@/lib/pipeline/website-intel";
import { ScoreBadge, ScoreBar } from "@/components/score-badge";
import { AutoRefresh } from "./auto-refresh";
import { ContentActions, RerunButton } from "./controls";
import { OwnerPanel } from "./owner-panel";
import { fromProfileRow } from "@/lib/owner-inputs";
import { getPainPoint } from "@/lib/onboarding/catalog";
import { answerLabel, getQuestion } from "@/lib/onboarding/followups";
import { continueLabel, isOpen, onboardingPath } from "@/lib/onboarding/steps";
import Link from "next/link";

export const metadata: Metadata = { title: "Growth assessment" };

type Opportunity = {
  title: string;
  area: string;
  why: string;
  action: string;
  impact: string;
  effort: string;
  pain_point_ids?: string[];
};
type DraftNotes = { image_prompt?: string; compliance_note?: string; regulated_area?: string | null };
type ReportData = {
  growth_score: number;
  scores: { content_clarity: number; conversion_readiness: number; online_presence: number };
  pagespeed: { performance: number; seo: number; accessibility: number; bestPractices: number } | null;
  pagespeed_error: string | null;
  opportunities: Opportunity[];
  pages: { url: string; title: string }[];
};
type Strategy = {
  primary_goal: string;
  audience: string;
  pillars: { name: string; purpose: string }[];
  channels: string[];
};

export default function AnalysisPage(props: PageProps<"/analysis/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Analysis {...props} />
      </Suspense>
    </main>
  );
}

async function Analysis({ params }: PageProps<"/analysis/[id]">) {
  const { id } = await params;
  await requireUser();
  const supabase = await createSupabaseServerClient();

  // All reads go through RLS: a business from another organization simply isn't found.
  const { data: profile } = await supabase.from("business_profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();

  const [{ data: job }, { data: report }, { data: calendar }] = await Promise.all([
    supabase
      .from("ai_jobs")
      .select("status, error, output, created_at")
      .eq("input->>businessProfileId", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("reports")
      .select("data, created_at")
      .eq("data->>business_profile_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("content_calendars")
      .select("id, strategy, starts_on")
      .eq("strategy->>business_profile_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const { data: items } = calendar
    ? await supabase
        .from("content_items")
        .select("id, channel, content_type, scheduled_for, title, brief, body, qa_notes, status")
        .eq("calendar_id", calendar.id)
        .order("scheduled_for")
    : { data: [] };

  // Onboarding discovery (D-028): the latest session decides whether we're waiting for the owner's answers.
  const { data: session } = await supabase
    .from("onboarding_sessions")
    .select("id, status, plan_job_id")
    .eq("business_profile_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const [{ data: answers }, { data: followUps }] = session
    ? await Promise.all([
        supabase
          .from("onboarding_responses")
          .select("kind, pain_point_id, confirmed, original_text, customer_priority")
          .eq("session_id", session.id),
        supabase
          .from("onboarding_follow_ups")
          .select("pain_point_id, question_key, answer, created_at")
          .eq("session_id", session.id)
          .eq("status", "answered")
          .order("created_at"),
      ])
    : [{ data: [] }, { data: [] }];

  const discoveryOpen = isOpen(session?.status);
  const jobStep = (job?.output as { step?: StepKey } | null)?.step;
  // Evidence is in and discovery is done, but the plan job hasn't been created yet: show it as starting.
  const planPending =
    !!session &&
    (session.status === "completed" || session.status === "skipped") &&
    !session.plan_job_id &&
    job?.status === "succeeded" &&
    jobStep === "evidence_done";
  const running = job?.status === "queued" || job?.status === "running" || planPending;
  const progressStep: StepKey = planPending || jobStep === "evidence_done" ? "scoring" : (jobStep ?? "crawling");

  const confirmedIssues = (answers ?? [])
    .filter((a) => a.kind === "pain_point" && a.confirmed && a.pain_point_id && getPainPoint(a.pain_point_id))
    .sort((a, b) => (a.customer_priority ?? 99) - (b.customer_priority ?? 99))
    .map((a) => ({ id: a.pain_point_id as string, priority: a.customer_priority as number | null }));
  const ownStatement = (answers ?? []).find((a) => a.kind === "statement")?.original_text ?? null;
  const priorityOf = new Map(confirmedIssues.map((c) => [c.id, c.priority]));
  const detailsOf = (painPointId: string) =>
    (followUps ?? [])
      .filter((f) => f.pain_point_id === painPointId && f.answer && getQuestion(f.pain_point_id, f.question_key))
      .map((f) => ({
        question: getQuestion(f.pain_point_id, f.question_key)!.text,
        answer: answerLabel(f.pain_point_id, f.question_key, f.answer as string),
      }));

  const intel = profile.intelligence as Partial<BusinessIntel>;
  const data = report?.data as ReportData | undefined;
  const strategy = calendar?.strategy as Strategy | undefined;
  const drafts = (items ?? []).filter((i) => i.body);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{profile.company_name}</h1>
          <a href={profile.website_url ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
            {profile.website_url}
          </a>
          {profile.industry && <p className="mt-1 text-sm text-muted">{profile.industry}</p>}
        </div>
        {!running && !discoveryOpen && <RerunButton businessProfileId={id} />}
      </header>

      {discoveryOpen && session && (
        <section className="card border-accent" aria-labelledby="discovery-open-title">
          <h2 id="discovery-open-title" className="font-semibold">
            Tell us what&apos;s holding the business back
          </h2>
          <p className="mt-1 text-sm text-muted">
            Your plan is built from your answers and your website. Finish the questions to start it; the website
            analysis keeps running in the meantime.
          </p>
          <Link
            href={onboardingPath({ ...session, business_profile_id: id })}
            className="btn-primary mt-3"
          >
            {continueLabel(session.status)}
          </Link>
        </section>
      )}

      {running && <Progress step={progressStep} />}

      <OwnerPanel businessProfileId={id} inputs={fromProfileRow(profile)} />

      {(confirmedIssues.length > 0 || ownStatement) && (
        <section className="card" aria-labelledby="told-us-title">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="told-us-title" className="font-semibold">
              What you told us
            </h2>
            <span className="chip bg-accent-soft text-accent-soft-foreground">From you</span>
          </div>
          {confirmedIssues.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {confirmedIssues.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span className="w-24 shrink-0 text-xs text-muted">
                    {c.priority ? `Priority ${c.priority}` : "Also noted"}
                  </span>
                  <span>
                    {getPainPoint(c.id)?.label}
                    {detailsOf(c.id).map((d) => (
                      <span key={d.question} className="mt-0.5 block text-xs text-muted">
                        {d.question} <span className="text-foreground">{d.answer}</span>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {ownStatement && <p className="mt-3 text-sm text-muted">In your words: “{ownStatement}”</p>}
        </section>
      )}

      {job?.status === "failed" && (
        <div className="card border-danger/40">
          <p className="font-medium text-danger">The last analysis didn&apos;t finish</p>
          <p className="mt-1 text-sm text-muted">{job.error}</p>
          <p className="mt-2 text-sm text-muted">The AI service may have been busy. Try again in a minute.</p>
        </div>
      )}

      {data && (
        <>
          <section className="card flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-4 md:w-1/3">
              <ScoreBadge score={data.growth_score} />
              <div>
                <p className="font-medium">Growth score</p>
                <p className="text-xs text-muted">Blend of measured site quality and assessed marketing readiness</p>
              </div>
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <ScoreBar label="Content clarity" value={data.scores.content_clarity} />
              <ScoreBar label="Conversion readiness" value={data.scores.conversion_readiness} />
              <ScoreBar label="Online presence" value={data.scores.online_presence} />
              {data.pagespeed && (
                <>
                  <ScoreBar label="Mobile speed" value={data.pagespeed.performance} note="Google" />
                  <ScoreBar label="SEO basics" value={data.pagespeed.seo} note="Google" />
                  <ScoreBar label="Accessibility" value={data.pagespeed.accessibility} note="Google" />
                </>
              )}
            </div>
          </section>

          {intel.summary && (
            <section className="grid gap-4 md:grid-cols-3">
              <div className="card md:col-span-3">
                <h2 className="font-semibold">Business profile</h2>
                <p className="mt-2 text-sm">{intel.summary}</p>
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
          )}

          <section>
            <h2 className="text-lg font-semibold">Top 5 opportunities</h2>
            <ol className="mt-3 space-y-3">
              {data.opportunities.map((o, i) => (
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
          </section>
        </>
      )}

      {strategy && (
        <section className="card">
          <h2 className="text-lg font-semibold">30-day plan</h2>
          <p className="mt-2 text-sm">
            <span className="font-medium">Goal: </span>
            {strategy.primary_goal}
          </p>
          <p className="mt-1 text-sm">
            <span className="font-medium">Audience: </span>
            {strategy.audience}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {strategy.pillars.map((p) => (
              <div key={p.name} className="rounded-md bg-background p-3">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted">{p.purpose}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {drafts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">First content batch</h2>
          <p className="text-sm text-muted">Nothing is published until you approve it.</p>
          <div className="mt-3 space-y-3">
            {drafts.map((d) => (
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
                {(d.qa_notes as DraftNotes | null)?.compliance_note && (
                  <div className="mt-3 rounded-md bg-warning-soft p-3 text-sm">
                    <span className="chip bg-warning-soft text-warning">Check before approving</span>
                    <p className="mt-1">
                      {(d.qa_notes as DraftNotes).regulated_area && (
                        <span className="font-medium">{(d.qa_notes as DraftNotes).regulated_area} is regulated. </span>
                      )}
                      {(d.qa_notes as DraftNotes).compliance_note}
                    </p>
                  </div>
                )}
                {(d.qa_notes as { image_prompt?: string } | null)?.image_prompt && (
                  <p className="mt-3 rounded-md bg-background p-3 text-xs text-muted">
                    <span className="font-medium text-foreground">Image idea: </span>
                    {(d.qa_notes as { image_prompt: string }).image_prompt}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {items && items.length > 0 && (
        <section className="card overflow-x-auto">
          <h2 className="text-lg font-semibold">Content calendar</h2>
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
              {items.map((i) => (
                <tr key={i.id} className="border-t border-border align-top">
                  <td className="py-2 pr-3 whitespace-nowrap text-muted">{formatDay(i.scheduled_for)}</td>
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

      {running && <AutoRefresh />}
    </div>
  );
}

function Progress({ step }: { step: StepKey }) {
  const current = STEPS.findIndex((s) => s.key === step);
  return (
    <section className="card" aria-live="polite">
      <p className="font-medium">Analyzing your business…</p>
      <p className="text-sm text-muted">About 3–4 minutes. This page updates on its own, or you can leave and come back.</p>
      <ol className="mt-4 space-y-2">
        {STEPS.filter((s) => s.key !== "done").map((s, i) => (
          <li key={s.key} className="flex items-center gap-3 text-sm">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                i < current ? "bg-accent text-accent-foreground" : i === current ? "border-2 border-accent" : "border border-border"
              }`}
            >
              {i < current ? "✓" : ""}
            </span>
            <span className={i === current ? "font-medium" : i < current ? "" : "text-muted"}>{s.label}</span>
            {i === current && <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />}
          </li>
        ))}
      </ol>
    </section>
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

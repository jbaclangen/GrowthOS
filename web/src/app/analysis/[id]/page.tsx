import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STEPS, type StepKey } from "@/lib/pipeline/website-intel";
import { continueLabel, onboardingPath } from "@/lib/onboarding/steps";
import { AutoRefresh } from "./auto-refresh";
import { RerunButton } from "./controls";
import { ReportInfographic, VIEWS, isView } from "./infographic";
import { DoThisFirst } from "./plan-section";
import { ReportDialog } from "./report-dialog";
import { loadReport } from "./report-data";
import { ReportSection } from "./report-sections";

export const metadata: Metadata = { title: "Growth assessment" };
// Analysis jobs run in after() for up to ~4 minutes; 300 s is the Vercel Hobby maximum.
export const maxDuration = 300;

export default function AnalysisPage(props: PageProps<"/analysis/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Analysis {...props} />
      </Suspense>
    </main>
  );
}

async function Analysis({ params, searchParams }: PageProps<"/analysis/[id]">) {
  const [{ id }, { view }] = await Promise.all([params, searchParams]);
  await requireUser();
  const supabase = await createSupabaseServerClient();
  // RLS: a business from another organization simply isn't found.
  const report = await loadReport(supabase, id);
  if (!report) notFound();
  const { profile, session, job, diagnosis, running, updatingDiagnosis, discoveryOpen } = report;
  const openView = isView(view) ? view : null;

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
        {!running && !updatingDiagnosis && !discoveryOpen && <RerunButton businessProfileId={id} />}
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
          <Link href={onboardingPath({ ...session, business_profile_id: id })} className="btn-primary mt-3">
            {continueLabel(session.status)}
          </Link>
        </section>
      )}

      {running && <Progress step={report.progressStep} />}

      {job?.status === "failed" && (
        <div className="card border-danger/40">
          <p className="font-medium text-danger">The last analysis didn&apos;t finish</p>
          <p className="mt-1 text-sm text-muted">{job.error}</p>
          <p className="mt-2 text-sm text-muted">The AI service may have been busy. Try again in a minute.</p>
        </div>
      )}

      {updatingDiagnosis && (
        <p className="card text-sm" role="status">
          Updating the diagnosis and plan with your corrections. This takes about a minute.
        </p>
      )}

      {diagnosis && !running && (
        <DoThisFirst
          diagnosis={diagnosis}
          items={report.planItems}
          draftsWaiting={report.drafts.filter((d) => d.status === "needs_approval").length}
          href={`/analysis/${id}`}
        />
      )}

      <ReportInfographic report={report} href={`/analysis/${id}`} />

      {openView && (
        <ReportDialog key={openView} title={VIEWS[openView]}>
          <ReportSection view={openView} report={report} />
        </ReportDialog>
      )}

      {(running || updatingDiagnosis) && <AutoRefresh />}
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

import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { failStaleJobs } from "@/lib/pipeline/jobs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ScoreBadge } from "@/components/score-badge";
import { isOpen } from "@/lib/onboarding/steps";
import { ReportInfographic } from "../analysis/[id]/infographic";
import { loadReport } from "../analysis/[id]/report-data";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const org = await getCurrentOrg(user.id);
  const supabase = await createSupabaseServerClient();
  if (org) await failStaleJobs(org.id);

  const [{ data: profiles }, { data: jobs }, { data: sessions }] = await Promise.all([
    supabase
      .from("business_profiles")
      .select("id, company_name, website_url, industry, growth_score, analyzed_at, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("ai_jobs").select("input, status, created_at").order("created_at", { ascending: false }).limit(100),
    supabase
      .from("onboarding_sessions")
      .select("business_profile_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const latestStatus = new Map<string, string>();
  for (const j of jobs ?? []) {
    const id = (j.input as { businessProfileId?: string }).businessProfileId;
    if (id && !latestStatus.has(id)) latestStatus.set(id, j.status);
  }
  // Discovery not finished yet (D-028): the plan waits for the owner's answers.
  const latestSession = new Map<string, string>();
  for (const s of sessions ?? []) {
    if (!latestSession.has(s.business_profile_id)) latestSession.set(s.business_profile_id, s.status);
  }
  for (const [id, status] of latestSession) {
    if (isOpen(status)) latestStatus.set(id, "awaiting_answers");
  }

  // The most recently analyzed business opens as an infographic; each tile opens its full report.
  const latest = profiles?.filter((p) => p.analyzed_at).sort((a, b) => +new Date(b.analyzed_at!) - +new Date(a.analyzed_at!))[0];
  const latestReport = latest ? await loadReport(supabase, latest.id) : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{org?.name ?? "Your businesses"}</h1>
          <p className="mt-1 text-sm text-muted">Businesses you&apos;ve analyzed</p>
        </div>
        <Link href="/onboarding" className="btn-primary">
          Analyze a website
        </Link>
      </div>

      {latest && latestReport?.data && (
        <section className="mt-8" aria-labelledby="latest-title">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="latest-title" className="text-lg font-semibold">
              Latest report: {latest.company_name}
            </h2>
            <Link href={`/analysis/${latest.id}`} className="text-sm text-accent hover:underline">
              Open full report
            </Link>
          </div>
          <ReportInfographic report={latestReport} href={`/analysis/${latest.id}`} />
        </section>
      )}

      {!profiles?.length ? (
        <div className="card mt-8 text-center">
          <p className="font-medium">No businesses yet</p>
          <p className="mt-1 text-sm text-muted">Add a website to get a growth score, a diagnosis, a growth plan and a 30-day content plan.</p>
          <Link href="/onboarding" className="btn-primary mt-4">
            Analyze your first website
          </Link>
          <p className="mt-4 text-sm text-muted">
            Already worked on your business with Claude?{" "}
            <Link href="/settings#ai-assistant" className="text-accent hover:underline">
              Let Claude fill in the setup
            </Link>
          </p>
        </div>
      ) : (
        <>
        <h2 className="mt-10 text-lg font-semibold">All businesses</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {profiles.map((p) => {
            const status = latestStatus.get(p.id);
            return (
              <li key={p.id}>
                <Link href={`/analysis/${p.id}`} className="card flex items-center gap-4 hover:border-accent">
                  <ScoreBadge score={p.growth_score} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.company_name}</p>
                    <p className="truncate text-sm text-muted">{p.website_url}</p>
                    <p className="mt-1 text-xs text-muted">
                      {status === "awaiting_answers"
                        ? "Waiting for your answers"
                        : status === "running" || status === "queued"
                        ? "Analyzing…"
                        : status === "failed"
                          ? "Last analysis failed"
                          : p.analyzed_at
                            ? `Analyzed ${new Date(p.analyzed_at).toLocaleDateString()}`
                            : "Not analyzed yet"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        </>
      )}
    </>
  );
}

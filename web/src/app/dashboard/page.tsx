import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ScoreBadge } from "@/components/score-badge";

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
  await requireUser();
  const org = await getCurrentOrg();
  const supabase = await createSupabaseServerClient();

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
    if (status === "discovering" || status === "reviewing") latestStatus.set(id, "awaiting_answers");
  }

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

      {!profiles?.length ? (
        <div className="card mt-8 text-center">
          <p className="font-medium">No businesses yet</p>
          <p className="mt-1 text-sm text-muted">Add a website to get a growth score, five opportunities, and a 30-day plan.</p>
          <Link href="/onboarding" className="btn-primary mt-4">
            Analyze your first website
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
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
      )}
    </>
  );
}

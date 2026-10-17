import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROVIDER } from "@/lib/integrations/search-console";
import { orderPlan, type Provenance } from "@/lib/plan/priority";
import { isOpen } from "@/lib/onboarding/steps";
import { effectiveAccess } from "@/lib/plans/tiers";
import { describeSearchConsole, type BusinessSummary } from "./prompt";

// The signed-in user's own account, summarized for the assistant (D-042). Every read uses the user's client, so RLS
// limits it to their organization; the organization id is only used to narrow queries RLS already allows.
// Lighter than loadReport (analysis/[id]/report-data.ts): no page text, no crawl coverage, and it never writes.

const MAX_BUSINESSES = 5;

function planLabel(org: { plan: string; trial_ends_at: string }) {
  const a = effectiveAccess(org);
  if (a.trial?.active) return `Pro trial, ${a.trial.daysLeft} day${a.trial.daysLeft === 1 ? "" : "s"} left`;
  if (a.trial) return "Pro trial ended; Basic features (no plan chosen yet)";
  return a.tier === "basic" ? "Basic" : a.tier === "pro" ? "Pro" : "Premium";
}

function jobLabel(status: string | undefined, discoveryOpen: boolean) {
  if (discoveryOpen) return "waiting for the owner's discovery answers";
  if (status === "queued" || status === "running") return "analyzing now";
  if (status === "failed") return "last analysis failed";
  if (status === "succeeded") return "complete";
  return "not analyzed yet";
}

export async function loadBusinessSummary(
  supabase: SupabaseClient,
  org: { id: string; name: string; plan: string; trial_ends_at: string },
  userId: string,
): Promise<BusinessSummary> {
  const [{ data: profiles }, { data: jobs }, { data: sessions }, { data: conn }, { count: keyCount }] = await Promise.all([
    supabase
      .from("business_profiles")
      .select("id, company_name, website_url, industry, growth_score, analyzed_at, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ai_jobs")
      .select("input, status, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("onboarding_sessions")
      .select("business_profile_id, status, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("integration_connections")
      .select("status, selected_property")
      .eq("organization_id", org.id)
      .eq("provider", PROVIDER)
      .maybeSingle(),
    supabase
      .from("mcp_access_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("revoked_at", null),
  ]);

  const jobStatus = new Map<string, string>();
  for (const j of jobs ?? []) {
    const id = (j.input as { businessProfileId?: string } | null)?.businessProfileId;
    if (id && !jobStatus.has(id)) jobStatus.set(id, j.status);
  }
  const sessionStatus = new Map<string, string>();
  for (const s of sessions ?? []) if (!sessionStatus.has(s.business_profile_id)) sessionStatus.set(s.business_profile_id, s.status);

  const all = profiles ?? [];
  const businesses = all.slice(0, MAX_BUSINESSES).map((p) => ({
    name: p.company_name ?? "Unnamed business",
    website: p.website_url,
    growthScore: p.growth_score,
    status: jobLabel(jobStatus.get(p.id), isOpen(sessionStatus.get(p.id))),
    link: `/analysis/${p.id}`,
  }));


  const summary: BusinessSummary = {
    organizationName: org.name,
    plan: planLabel(org),
    searchConsole: describeSearchConsole(conn, org),
    claudeKeys: keyCount ?? 0,
    businesses,
    latest: null,
  };

  const latest = all.filter((p) => p.analyzed_at).sort((a, b) => +new Date(b.analyzed_at!) - +new Date(a.analyzed_at!))[0];
  if (!latest) return summary;

  const [{ data: report }, { data: diagnoses }, { data: calendar }] = await Promise.all([
    supabase
      .from("reports")
      .select("data")
      .eq("organization_id", org.id)
      .eq("data->>business_profile_id", latest.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("diagnoses")
      .select("id, status, summary")
      .eq("business_profile_id", latest.id)
      .in("status", ["proposed", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("content_calendars")
      .select("id")
      .eq("organization_id", org.id)
      .eq("strategy->>business_profile_id", latest.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const diagnosis = diagnoses?.[0] ?? null;

  const [{ data: findings }, { data: items }, { data: content }] = await Promise.all([
    diagnosis
      ? supabase
          .from("diagnosis_findings")
          .select("statement, provenance, confidence, owner_verdict, position")
          .eq("diagnosis_id", diagnosis.id)
          .order("position")
          .limit(6)
      : Promise.resolve({ data: [] }),
    diagnosis
      ? supabase
          .from("growth_plan_items")
          .select("title, status, first_action, customer_priority, calculated_priority, ai_priority, final_priority")
          .eq("diagnosis_id", diagnosis.id)
          .limit(7)
      : Promise.resolve({ data: [] }),
    calendar
      ? supabase
          .from("content_items")
          .select("title, channel, status, body, scheduled_for")
          .eq("calendar_id", calendar.id)
          .order("scheduled_for")
          .limit(60)
      : Promise.resolve({ data: null }),
  ]);

  const data = (report?.data ?? null) as {
    scores?: Record<string, number>;
    pagespeed?: Record<string, number> | null;
  } | null;
  const planRows = (items ?? []).map((r) => ({ ...r, calculated_priority: Number(r.calculated_priority) }));
  const ordered =
    diagnosis?.status === "confirmed"
      ? [...planRows].sort((a, b) => (a.final_priority ?? 99) - (b.final_priority ?? 99) || a.ai_priority - b.ai_priority)
      : orderPlan(planRows);

  const byStatus: Record<string, number> = {};
  for (const c of content ?? []) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;

  summary.latest = {
    name: latest.company_name ?? "Unnamed business",
    website: latest.website_url,
    industry: latest.industry,
    link: `/analysis/${latest.id}`,
    analyzedAt: latest.analyzed_at,
    analysisStatus: jobLabel(jobStatus.get(latest.id), isOpen(sessionStatus.get(latest.id))),
    growthScore: latest.growth_score,
    scores: data?.scores ?? null,
    pagespeed: data?.pagespeed ?? null,
    diagnosis: diagnosis
      ? {
          status: diagnosis.status,
          summary: diagnosis.summary ?? "",
          findings: (findings ?? []).map((f) => ({
            statement: f.statement,
            provenance: f.provenance as Provenance,
            confidence: f.confidence,
            ownerVerdict: f.owner_verdict === "pending" ? "not checked yet" : f.owner_verdict === "confirmed" ? "said it's right" : "said it's wrong",
          })),
        }
      : null,
    plan: ordered.map((p) => ({ title: p.title, status: p.status, firstStep: p.first_action })),
    content: content ? { total: content.length, byStatus, channels: [...new Set(content.map((c) => c.channel))] } : null,
    drafts: (content ?? []).filter((c) => c.body).slice(0, 10).map((c) => ({ title: c.title ?? "", channel: c.channel, status: c.status })),
  };
  return summary;
}

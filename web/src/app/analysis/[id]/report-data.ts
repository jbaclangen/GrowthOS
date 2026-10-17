import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessIntel, StepKey } from "@/lib/pipeline/website-intel";
import type { CoverageSummary, AuditFinding } from "@/lib/audit/checks";
import type { CoverageEntry, PageAudit, SiteAudit } from "@/lib/integrations/crawler";
import type { PageSpeedReport } from "@/lib/integrations/google";
import { superviseJobs } from "@/lib/pipeline/jobs";
import { firstStep } from "@/lib/pipeline/steps";
import { getPainPoint } from "@/lib/onboarding/catalog";
import { answerLabel, getQuestion } from "@/lib/onboarding/followups";
import { isOpen } from "@/lib/onboarding/steps";
import type { DiagnosisRow, FindingRow, PlanItemRow } from "./plan-section";

// Everything the results page and the dashboard infographic show for one business. All reads go through the
// signed-in user's client, so RLS limits them to the user's organization.

export type Opportunity = {
  title: string;
  area: string;
  why: string;
  action: string;
  impact: string;
  effort: string;
  pain_point_ids?: string[];
};
export type ReportData = {
  growth_score: number;
  scores: { content_clarity: number; conversion_readiness: number; online_presence: number };
  pagespeed: { performance: number; seo: number; accessibility: number; bestPractices: number } | null;
  pagespeed_error: string | null;
  // Reports from before the single plan (ON-8) list five opportunities instead.
  opportunities?: Opportunity[];
  pages: { url: string; title: string }[];
  // Website Intelligence Phase 1; missing on older reports.
  audit_run_id?: string | null;
};

// The stored audit run (audit_runs) as the report reads it. Coverage values come from crawled pages: untrusted
// text, rendered as plain text only.
export type StoredCoverage = Partial<Omit<SiteAudit, "pages" | "entries">> & {
  summary?: CoverageSummary;
  entries?: CoverageEntry[];
  pages?: (Omit<PageAudit, "internalLinks"> & { internalLinkCount?: number })[];
};
export type AuditRunRow = {
  id: string;
  status: "queued" | "running" | "completed" | "partial" | "failed";
  pages_discovered: number;
  pages_scanned: number;
  coverage: StoredCoverage;
  pagespeed: Partial<PageSpeedReport> | null;
  error_summary: string | null;
  completed_at: string | null;
};
export type AuditFindingRow = Omit<AuditFinding, "observed_at"> & { id: string };
export type AuditData = { run: AuditRunRow; findings: AuditFindingRow[] };
export type Strategy = {
  primary_goal: string;
  audience: string;
  pillars: { name: string; purpose: string }[];
  channels: string[];
};
export type ContentItem = {
  id: string;
  channel: string;
  content_type: string | null;
  scheduled_for: string | null;
  title: string | null;
  brief: string | null;
  body: string | null;
  qa_notes: unknown;
  status: string;
};
export type Issue = { id: string; priority: number | null; details: { question: string; answer: string }[] };

export async function loadReport(supabase: SupabaseClient, id: string) {
  const { data: profile } = await supabase.from("business_profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) return null;
  // Clear jobs cut off by the hosting time limit, so the report shows a failure instead of polling forever, and
  // re-send steps whose hand-off was lost.
  await superviseJobs(profile.organization_id);

  const [{ data: job }, { data: report }, { data: calendar }, { data: session }, { data: diagnoses }] = await Promise.all([
    supabase
      .from("ai_jobs")
      .select("worker, status, error, output, created_at")
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
    // Onboarding discovery (D-028): the latest session decides whether we're waiting for the owner's answers.
    supabase
      .from("onboarding_sessions")
      .select("id, status, plan_job_id")
      .eq("business_profile_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Diagnosis and growth plan (ON-7, ON-8): the newest one that isn't replaced, plus any earlier confirmed plan.
    supabase
      .from("diagnoses")
      .select("id, status, summary, missing_info, version, confirmed_at, created_at")
      .eq("business_profile_id", id)
      .in("status", ["proposed", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(2),
  ]);
  const diagnosis = (diagnoses?.[0] ?? null) as DiagnosisRow | null;
  const earlierConfirmed = diagnoses?.[1]?.status === "confirmed" ? diagnoses[1] : null;

  const auditRunId = (report?.data as ReportData | undefined)?.audit_run_id ?? null;
  const [{ data: items }, { data: answers }, { data: followUps }, { data: findingRows }, { data: planRows }, { data: auditRun }, { data: auditRows }] =
    await Promise.all([
      calendar
        ? supabase
            .from("content_items")
            .select("id, channel, content_type, scheduled_for, title, brief, body, qa_notes, status")
            .eq("calendar_id", calendar.id)
            .order("scheduled_for")
        : Promise.resolve({ data: [] }),
      session
        ? supabase
            .from("onboarding_responses")
            .select("kind, pain_point_id, confirmed, original_text, customer_priority")
            .eq("session_id", session.id)
        : Promise.resolve({ data: [] }),
      session
        ? supabase
            .from("onboarding_follow_ups")
            .select("pain_point_id, question_key, answer, created_at")
            .eq("session_id", session.id)
            .eq("status", "answered")
            .order("created_at")
        : Promise.resolve({ data: [] }),
      diagnosis
        ? supabase
            .from("diagnosis_findings")
            // "*" so the page keeps working before the audit_refs column (20261011160802_website_audit) exists.
            .select("*")
            .eq("diagnosis_id", diagnosis.id)
            .order("position")
        : Promise.resolve({ data: [] }),
      diagnosis
        ? supabase
            .from("growth_plan_items")
            .select(
              "id, title, area, pain_point_ids, finding_positions, why, first_action, dependencies, success_metric, solution_ids, manual_alternative, impact, urgency, urgency_from_owner, effort, confidence, customer_priority, ai_priority, calculated_priority, final_priority, status",
            )
            .eq("diagnosis_id", diagnosis.id)
        : Promise.resolve({ data: [] }),
      // Technical checks (Website Intelligence Phase 1): the audit run behind this report, if it has one.
      auditRunId
        ? supabase
            .from("audit_runs")
            .select("id, status, pages_discovered, pages_scanned, coverage, pagespeed, error_summary, completed_at")
            .eq("id", auditRunId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      auditRunId
        ? supabase
            .from("audit_findings")
            .select("id, ref, page_url, rule_id, category, severity, confidence, priority_label, summary, observed, recommendation, source_type")
            .eq("audit_run_id", auditRunId)
        : Promise.resolve({ data: [] }),
    ]);

  const findings = (findingRows ?? []) as FindingRow[];
  const audit: AuditData | null = auditRun
    ? {
        run: auditRun as AuditRunRow,
        findings: ((auditRows ?? []) as AuditFindingRow[]).sort((a, b) => Number(a.ref.slice(1)) - Number(b.ref.slice(1))),
      }
    : null;
  const planItems = (planRows ?? []).map((r) => ({ ...r, calculated_priority: Number(r.calculated_priority) })) as PlanItemRow[];
  const contentItems = (items ?? []) as ContentItem[];

  const discoveryOpen = isOpen(session?.status);
  const jobStep = (job?.output as { step?: StepKey } | null)?.step;
  const jobActive = job?.status === "queued" || job?.status === "running";
  // Corrections being applied (ON-7): only the diagnosis is rebuilt, so the rest of the page stays as it is.
  const updatingDiagnosis = jobActive && job?.worker === "diagnosis_update";
  // Evidence is in and discovery is done, but the plan job hasn't been created yet: show it as starting.
  const planPending =
    !!session &&
    (session.status === "completed" || session.status === "skipped") &&
    !session.plan_job_id &&
    job?.status === "succeeded" &&
    jobStep === "evidence_done";
  const running = (jobActive && !updatingDiagnosis) || planPending;
  // A job without a step state yet (queued by an older version) shows its own first step.
  const progressStep: StepKey =
    planPending || jobStep === "evidence_done" ? "scoring" : (jobStep ?? (job ? firstStep(job.worker) : "crawling"));

  const issues: Issue[] = (answers ?? [])
    .filter((a) => a.kind === "pain_point" && a.confirmed && a.pain_point_id && getPainPoint(a.pain_point_id))
    .sort((a, b) => (a.customer_priority ?? 99) - (b.customer_priority ?? 99))
    .map((a) => ({
      id: a.pain_point_id as string,
      priority: a.customer_priority as number | null,
      details: (followUps ?? [])
        .filter((f) => f.pain_point_id === a.pain_point_id && f.answer && getQuestion(f.pain_point_id, f.question_key))
        .map((f) => ({
          question: getQuestion(f.pain_point_id, f.question_key)!.text,
          answer: answerLabel(f.pain_point_id, f.question_key, f.answer as string),
        })),
    }));

  return {
    id,
    profile,
    intel: profile.intelligence as Partial<BusinessIntel>,
    job,
    data: report?.data as ReportData | undefined,
    strategy: calendar?.strategy as Strategy | undefined,
    contentItems,
    drafts: contentItems.filter((i) => i.body),
    session,
    issues,
    ownStatement: (answers ?? []).find((a) => a.kind === "statement")?.original_text ?? null,
    diagnosis,
    earlierConfirmed,
    findings,
    planItems,
    audit,
    discoveryOpen,
    updatingDiagnosis,
    running,
    progressStep,
  };
}

export type Report = NonNullable<Awaited<ReturnType<typeof loadReport>>>;

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase, type Row, type Write } from "../../../test/fake-supabase";
import { HANDOFF_ERROR } from "./handoff";
import { initialState, type JobState } from "./steps";
import { runAnalysisJob } from "./website-intel";

// runAnalysisJob's orchestration (claim, run, advance, hand off) against an in-memory database. The step itself is
// "profiling", with the model call stubbed.

const fake = vi.hoisted(() => ({ current: null as FakeSupabase | null, adminThrows: false }));
const dispatchStep = vi.hoisted(() => vi.fn(async (): Promise<boolean> => true));
const runWorkerJson = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => {
    if (fake.adminThrows) throw new Error("Missing or invalid environment variable: SUPABASE_SECRET_KEY");
    return fake.current!.db;
  },
}));
vi.mock("./dispatch", () => ({ dispatchStep }));
vi.mock("@/lib/ai/router", () => ({ runWorkerJson }));
vi.mock("next/server", () => ({ after: () => {} }));

const ORG = "org-1";
const JOB = "job-1";
const PROFILE = "profile-1";
const SESSION = "session-1";
const REF = { id: JOB, organizationId: ORG };

const INTEL = {
  company_name: "Example Plumbing",
  industry: "Plumbing",
  services: ["Repairs"],
  target_customers: ["Homeowners"],
  locations: ["Austin"],
  likely_competitors: [],
  offers: [],
  brand_voice: { tone: "Friendly", traits: ["plain"] },
};
const EVIDENCE = { signals: null, psi: null, psiError: null, pages: [] };

function profilingState(worker: string): JobState {
  return { ...initialState(worker), step: "profiling", digest: "page text", evidence: EVIDENCE };
}

function setup(worker = "website_intel", extra: Record<string, Row[]> = {}) {
  fake.current = fakeSupabase({
    ai_jobs: [
      {
        id: JOB,
        organization_id: ORG,
        worker,
        status: "running",
        input: { businessProfileId: PROFILE, websiteUrl: "https://example.com", sessionId: SESSION },
        output: profilingState(worker),
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      },
    ],
    business_profiles: [{ id: PROFILE, organization_id: ORG, goals: null, service_area: null, current_tools: null }],
    organizations: [{ id: ORG, plan: "trial", trial_ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString() }],
    ...extra,
  }, { ai_jobs: { status: "queued", output: null, started_at: null } });
  return fake.current;
}
const moduleRuns = () => fake.current!.tables.module_runs ?? [];
const jobRow = (id = JOB) => fake.current!.tables.ai_jobs.find((r) => r.id === id)!;
const isAdvance = (w: Write) => w.table === "ai_jobs" && (w.values as { output?: { step?: string } }).output?.step === "scoring";

beforeEach(() => {
  fake.adminThrows = false;
  dispatchStep.mockReset().mockResolvedValue(true);
  runWorkerJson.mockReset().mockResolvedValue(INTEL);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("runAnalysisJob", () => {
  it("runs a pending step once, however often it is handed over, then hands the next step on", async () => {
    setup();
    await Promise.all([runAnalysisJob(JOB, "profiling"), runAnalysisJob(JOB, "profiling")]);
    expect(runWorkerJson).toHaveBeenCalledTimes(1);
    expect(dispatchStep).toHaveBeenCalledTimes(1);
    expect(dispatchStep).toHaveBeenCalledWith(REF, "scoring", expect.anything());
    expect(jobRow()).toMatchObject({ status: "running", output: { step: "scoring", step_state: "pending", claim: null, evidence: EVIDENCE } });
    expect((jobRow().output as JobState).digest).toBeUndefined();
  });

  it("records the modules that ran in the evidence phase, scoped to the job's organization (D-051)", async () => {
    setup();
    await runAnalysisJob(JOB, "profiling");
    expect(moduleRuns()).toHaveLength(2);
    expect(moduleRuns()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ organization_id: ORG, job_id: JOB, module_id: "business_intel", status: "completed", sub_score: null }),
        // No PageSpeed in this evidence: the website module ran, but has nothing to score.
        expect.objectContaining({ organization_id: ORG, job_id: JOB, module_id: "website_seo", status: "partial", sub_score: null, audit_run_id: null }),
      ]),
    );
  });

  it("continues when a module run can't be recorded: the rows are a record, not an input", async () => {
    setup().failWrites(1, (w) => w.table === "module_runs");
    await runAnalysisJob(JOB, "profiling");
    expect(moduleRuns()).toHaveLength(0);
    expect(jobRow().output).toMatchObject({ step: "scoring", step_state: "pending" });
  });

  it("ignores a continuation for a step that isn't the pending one", async () => {
    setup();
    await runAnalysisJob(JOB, "crawling");
    await runAnalysisJob(JOB, "scoring");
    expect(runWorkerJson).not.toHaveBeenCalled();
    expect(jobRow().output).toMatchObject({ step: "profiling", step_state: "pending" });
  });

  it("fails the job at once, with what happened, when the next step's hand-off isn't accepted", async () => {
    setup();
    dispatchStep.mockResolvedValue(false);
    await runAnalysisJob(JOB, "profiling");
    expect(jobRow()).toMatchObject({ status: "failed", error: HANDOFF_ERROR, output: { step: "scoring" } });
  });

  it("records a failed step and drops its artifacts", async () => {
    setup();
    runWorkerJson.mockRejectedValue(new Error("OpenRouter: provider error"));
    await runAnalysisJob(JOB, "profiling");
    expect(jobRow()).toMatchObject({ status: "failed", error: "OpenRouter: provider error", output: { step: "profiling" } });
    expect(dispatchStep).not.toHaveBeenCalled();
  });

  it("retries a failed write of the next step once", async () => {
    setup().failWrites(1, isAdvance);
    await runAnalysisJob(JOB, "profiling");
    expect(jobRow().output).toMatchObject({ step: "scoring", step_state: "pending" });
    expect(dispatchStep).toHaveBeenCalledWith(REF, "scoring", expect.anything());
  });

  it("fails the job when the next step can't be written", async () => {
    setup().failWrites(2, isAdvance);
    await runAnalysisJob(JOB, "profiling");
    expect(jobRow()).toMatchObject({ status: "failed", error: HANDOFF_ERROR, output: { step: "profiling" } });
    expect(dispatchStep).not.toHaveBeenCalled();
  });

  it("never throws, even when the database client can't be created", async () => {
    setup();
    fake.adminThrows = true;
    await expect(runAnalysisJob(JOB, "profiling")).resolves.toBeUndefined();
  });

  it("queues the plan at its first step when the evidence is in, and fails it if its hand-off isn't accepted", async () => {
    setup("website_evidence", {
      onboarding_sessions: [
        {
          id: SESSION,
          organization_id: ORG,
          business_profile_id: PROFILE,
          status: "completed",
          evidence_job_id: JOB,
          plan_job_id: null,
          created_by: "user-1",
        },
      ],
    });
    dispatchStep.mockResolvedValue(false);
    await runAnalysisJob(JOB, "profiling");

    expect(jobRow()).toMatchObject({ status: "succeeded", output: { step: "evidence_done", evidence: EVIDENCE } });
    const session = fake.current!.tables.onboarding_sessions[0];
    const plan = jobRow(session.plan_job_id as string);
    expect(plan.worker).toBe("website_plan");
    expect(dispatchStep).toHaveBeenCalledWith(expect.objectContaining({ id: plan.id, organizationId: ORG }), "scoring", expect.anything());
    // Not left queued for ten minutes: failed now, with an accurate message.
    expect(plan).toMatchObject({ status: "failed", error: HANDOFF_ERROR, output: { step: "scoring" } });
  });

  it("queues the plan with its first step as the progress the report shows", async () => {
    setup("website_evidence", {
      onboarding_sessions: [
        { id: SESSION, organization_id: ORG, business_profile_id: PROFILE, status: "skipped", evidence_job_id: JOB, plan_job_id: null },
      ],
    });
    await runAnalysisJob(JOB, "profiling");
    const plan = jobRow(fake.current!.tables.onboarding_sessions[0].plan_job_id as string);
    expect(plan).toMatchObject({ output: { step: "scoring", step_state: "pending", claim: null } });
  });
});

// --- Step "scoring": the diagnosis, the growth score and the Search Console evidence (D-051 step 6) -------------

// A stored business profile the scoring step can load (profileSchema), and a diagnosis as the model returns it.
const PROFILE_INTEL = {
  company_name: "Example Plumbing",
  industry: "Plumbing",
  summary: "Plumbers in Austin.",
  target_customers: "Homeowners",
  brand_voice: { tone: "Friendly", traits: ["plain"] },
};
const DIAGNOSIS = {
  scores: { content_clarity: 60, conversion_readiness: 40, online_presence: 50 },
  summary: "A steady local plumber that is barely found on Google.",
  findings: [
    // Rests on the Search Console summary (G1): verified and Search visibility's when the summary was in the prompt.
    { statement: "The site is barely found on Google", evidence: "Search Console: 120 clicks in 28 days", source: "search_console", confidence: "high", pain_point_ids: [], evidence_refs: ["G1"] },
    { statement: "There is no sitemap", evidence: "Technical check T1", source: "website", confidence: "high", pain_point_ids: [], evidence_refs: ["T1"] },
  ],
  missing_info: [],
  plan: [
    { title: "Submit a sitemap", area: "seo", pain_point_ids: [], finding_refs: [2], why: "w", first_action: "a", dependencies: "", success_metric: "m", solution_ids: [], manual_alternative: "", impact: 3, urgency: 3, effort: 2, confidence: "high" },
  ],
};
// Three crawled pages and one technical check; no PageSpeed, so the growth score is the assessed parts plus, on
// Pro with a snapshot, Search visibility.
const SCORING_EVIDENCE = {
  signals: null,
  psi: null,
  psiError: null,
  pages: [{ url: "https://example.com/", title: "Home" }, { url: "https://example.com/services", title: "Services" }, { url: "https://example.com/contact", title: "Contact" }],
  audit: { coverage: "3 of 3 pages scanned", homeBlocked: false, findings: "T1 [Monitor; low severity; high confidence; crawler_observation] site-wide: no sitemap", desktop: null, runId: null },
};
// The latest Search Console snapshot: position 14.3 → 58, 2.5% click-through → 50, clicks +20% → 60, all 3 crawled
// pages served → 100, home page indexed → 100: sub-score (2.32 + 1 + 1.2 + 1 + 1) / 0.1 = 65. With the assessed
// parts (60, 40, 50 at 0.25, 0.25, 0.15) the growth score is (32.5 + 6.52) / 0.75 = 52; without it, 50.
const SNAPSHOT = {
  organization_id: ORG,
  connection_id: "conn-1",
  property: "sc-domain:example.com",
  date_range_start: "2026-09-11",
  date_range_end: "2026-10-08",
  dimensions: ["query", "page", "device"],
  totals: {
    current: { clicks: 120, impressions: 4800, ctr: 0.025, position: 14.3 },
    previous: { clicks: 100, impressions: 5000, ctr: 0.02, position: 16 },
    previousRange: { start: "2026-08-14", end: "2026-09-10" },
  },
  rows: {
    queries: [{ key: "plumber near me", clicks: 40, impressions: 900, ctr: 0.044, position: 6.3 }],
    pages: [
      { key: "https://example.com/", clicks: 100, impressions: 4000, ctr: 0.025, position: 12 },
      { key: "https://example.com/services", clicks: 15, impressions: 600, ctr: 0.025, position: 18 },
      { key: "https://example.com/contact", clicks: 5, impressions: 200, ctr: 0.025, position: 22 },
    ],
    devices: [],
    sitemaps: null,
    inspection: { url: "https://example.com/", verdict: "PASS", coverageState: "Submitted and indexed", indexingState: null, pageFetchState: null, robotsTxtState: null, lastCrawlTime: null, googleCanonical: null, link: null },
    notes: [],
  },
  fetched_at: "2026-10-11T15:00:00Z",
};
const CONNECTED: Record<string, Row[]> = {
  integration_connections: [{ id: "conn-1", organization_id: ORG, provider: "google_search_console", status: "active" }],
  search_console_snapshots: [SNAPSHOT],
};

function scoringSetup(plan: string, extra: Record<string, Row[]> = {}) {
  fake.current = fakeSupabase({
    ai_jobs: [
      {
        id: JOB,
        organization_id: ORG,
        worker: "website_intel",
        status: "running",
        input: { businessProfileId: PROFILE, websiteUrl: "https://example.com", sessionId: SESSION },
        output: { ...initialState("website_intel"), step: "scoring", evidence: SCORING_EVIDENCE },
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      },
    ],
    business_profiles: [{ id: PROFILE, organization_id: ORG, goals: null, service_area: null, current_tools: null, intelligence: PROFILE_INTEL }],
    organizations: [{ id: ORG, plan, trial_ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString() }],
    ...extra,
  }, { ai_jobs: { status: "queued", output: null, started_at: null } });
  runWorkerJson.mockResolvedValue(DIAGNOSIS);
  return fake.current;
}
const prompt = () => (runWorkerJson.mock.calls[0][0] as { messages: { content: string }[] }).messages[0].content;
const findings = () => fake.current!.tables.diagnosis_findings ?? [];
const reportData = () => fake.current!.tables.reports?.[0]?.data as Record<string, unknown>;

describe("the scoring step with Search Console (the search visibility module, D-051 step 6)", () => {
  it("feeds the summary to the diagnosis, scores it, tags its findings and records the module run on Pro", async () => {
    scoringSetup("trial", CONNECTED);
    await runAnalysisJob(JOB, "scoring");
    expect(jobRow().output).toMatchObject({ step: "planning", step_state: "pending", growth_score: 52 });
    expect(runWorkerJson).toHaveBeenCalledTimes(1);
    expect(prompt()).toContain("G1 GOOGLE SEARCH CONSOLE (measured by Google for the property sc-domain:example.com, 2026-09-11 to 2026-10-08");
    expect(prompt()).toContain("<search_console>");
    expect(reportData()).toMatchObject({
      growth_score: 52,
      score_version: 2,
      score_modules: ["conversion", "search_visibility"],
      module_scores: { conversion: 50, search_visibility: 65 },
      search_console: { property: "sc-domain:example.com", period: { start: "2026-09-11", end: "2026-10-08" }, little_data: false },
    });
    expect(fake.current!.tables.business_profiles[0].growth_score).toBe(52);
    expect(findings().map((f) => [f.provenance, f.audit_refs, f.module_id])).toEqual([
      ["verified", ["G1"], "search_visibility"],
      ["verified", ["T1"], "website_seo"],
    ]);
    expect(moduleRuns()).toHaveLength(2);
    expect(moduleRuns()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ organization_id: ORG, job_id: JOB, module_id: "conversion", status: "completed", sub_score: 50 }),
        expect.objectContaining({
          organization_id: ORG,
          job_id: JOB,
          module_id: "search_visibility",
          status: "completed",
          sub_score: 65,
          details: expect.objectContaining({ snapshot: true, property: "sc-domain:example.com", little_data: false, score_version: 2 }),
        }),
      ]),
    );
  });

  it("runs the module as partial, with the prompt and the score unchanged, when nothing is connected", async () => {
    scoringSetup("trial");
    await runAnalysisJob(JOB, "scoring");
    expect(prompt()).not.toContain("search_console");
    expect(prompt()).not.toContain("G1");
    expect(reportData()).toMatchObject({ growth_score: 50, score_version: 2, score_modules: ["conversion"], search_console: null });
    // The model cited G1 with no summary in the prompt: the finding is inferred and belongs to no module.
    expect(findings()[0]).toMatchObject({ provenance: "inferred", audit_refs: [], module_id: null });
    expect(moduleRuns().find((r) => r.module_id === "search_visibility")).toMatchObject({
      status: "partial",
      sub_score: null,
      details: expect.objectContaining({ snapshot: false, property: null }),
    });
  });

  it("records a completed run without a sub-score when the window has too little data", async () => {
    const empty = { ...SNAPSHOT, totals: { ...SNAPSHOT.totals, current: { clicks: 1, impressions: 6, ctr: 0.17, position: 9 } } };
    scoringSetup("trial", { ...CONNECTED, search_console_snapshots: [empty] });
    await runAnalysisJob(JOB, "scoring");
    expect(prompt()).toContain("Fewer than 10 impressions in the window");
    expect(reportData()).toMatchObject({ growth_score: 50, score_modules: ["conversion"], search_console: { little_data: true } });
    expect(moduleRuns().find((r) => r.module_id === "search_visibility")).toMatchObject({
      status: "completed",
      sub_score: null,
      details: expect.objectContaining({ snapshot: true, little_data: true }),
    });
  });

  it("records no Search visibility run and reads no snapshot for a Basic organization, even with a connection", async () => {
    scoringSetup("basic", CONNECTED);
    await runAnalysisJob(JOB, "scoring");
    expect(prompt()).not.toContain("search_console");
    expect(reportData()).toMatchObject({ growth_score: 50, score_modules: ["conversion"], search_console: null });
    expect(moduleRuns().map((r) => r.module_id)).toEqual(["conversion"]);
  });

  it("leaves the module out when the organization switched it off", async () => {
    scoringSetup("trial", { ...CONNECTED, organization_modules: [{ organization_id: ORG, module_id: "search_visibility", enabled: false }] });
    await runAnalysisJob(JOB, "scoring");
    expect(prompt()).not.toContain("search_console");
    expect(reportData()).toMatchObject({ growth_score: 50, score_modules: ["conversion"] });
    expect(moduleRuns().map((r) => r.module_id)).toEqual(["conversion"]);
  });
});

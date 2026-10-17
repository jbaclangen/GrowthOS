// End-to-end check of the step-chained analysis pipeline against a running dev server (dev tool; spends AI credit,
// about $0.30-0.45 per site). No sign-in needed: it uses the service client to queue a re-run (website_intel) for a
// throwaway business in a dedicated test organization, hands the first step to /api/jobs/continue exactly as the
// app does, then polls the job and prints how long each step (= one function invocation) took.
//
//   npx next dev -p 3006   (with NEXT_PUBLIC_APP_URL=http://localhost:3006)
//   npm run pipeline:local -- https://example.com [https://another.com]
//
// Every row it creates belongs to the organization named below; delete that organization to clean up.

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { dispatchStep } from "@/lib/pipeline/dispatch";
import { firstStep } from "@/lib/pipeline/steps";

const ORG_NAME = "Pipeline test (delete me)";
const WORKER = "website_intel";
const POLL_MS = 2000;
const GIVE_UP_MS = 20 * 60 * 1000;

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error("Usage: npm run pipeline:local -- https://example.com [...]");
  process.exit(1);
}

const db = createSupabaseAdminClient();

async function testOrg(): Promise<string> {
  const { data: existing } = await db.from("organizations").select("id").eq("name", ORG_NAME).limit(1).maybeSingle();
  if (existing) return existing.id as string;
  const { data, error } = await db.from("organizations").insert({ name: ORG_NAME }).select("id").single();
  if (error || !data) throw new Error(`creating the test organization failed: ${error?.message}`);
  return data.id as string;
}

type Snapshot = { status: string; step?: string; state?: string; at?: string };
type Final = { status: string; error: string | null; finished_at: string | null; output: unknown };

async function runOne(org: string, websiteUrl: string) {
  const { data: profile, error: pErr } = await db
    .from("business_profiles")
    .insert({ organization_id: org, company_name: new URL(websiteUrl).hostname, website_url: websiteUrl })
    .select("id")
    .single();
  if (pErr || !profile) throw new Error(`profile insert failed: ${pErr?.message}`);
  const { data: job, error: jErr } = await db
    .from("ai_jobs")
    .insert({ organization_id: org, worker: WORKER, task_class: "complex", input: { businessProfileId: profile.id, websiteUrl } })
    .select("id, created_at")
    .single();
  if (jErr || !job) throw new Error(`job insert failed: ${jErr?.message}`);

  console.log(`\n${websiteUrl}: job ${job.id}`);
  const t0 = Date.now();
  if (!(await dispatchStep(job.id, firstStep(WORKER)))) throw new Error("the continue route did not accept the first step");

  // Each running step's claim time and each pending step's queue time come from output.step_started_at.
  const claims = new Map<string, number>();
  const ends = new Map<string, number>();
  let last = "";
  let final = null as Final | null;
  while (Date.now() - t0 < GIVE_UP_MS) {
    const { data } = await db.from("ai_jobs").select("status, error, output, finished_at").eq("id", job.id).single();
    const o = (data?.output ?? {}) as { step?: string; step_state?: string; step_started_at?: string };
    const snap: Snapshot = { status: data!.status, step: o.step, state: o.step_state, at: o.step_started_at };
    const key = JSON.stringify(snap);
    if (key !== last) {
      last = key;
      console.log(`  +${((Date.now() - t0) / 1000).toFixed(0)}s ${snap.status} ${snap.step ?? ""} ${snap.state ?? ""}`);
      if (snap.state === "running" && snap.step && snap.at) claims.set(snap.step, Date.parse(snap.at));
    }
    if (data!.status !== "queued" && data!.status !== "running") {
      final = data as Final;
      break;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  if (!final) throw new Error("gave up waiting for the job");

  // A step ends when the next one is queued; the last one ends when the job finishes. Recomputed from the claims.
  const steps = [...claims.keys()];
  const { data: usage } = await db
    .from("ai_usage")
    .select("worker, model, latency_ms, cost_usd, status, created_at")
    .eq("job_id", job.id)
    .order("created_at");
  steps.forEach((s, i) => {
    const end = i + 1 < steps.length ? claims.get(steps[i + 1])! : Date.parse(final!.finished_at ?? new Date().toISOString());
    ends.set(s, end);
  });
  console.log(`  result: ${final.status}${final.error ? ` (${final.error})` : ""}, total ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  for (const s of steps) {
    console.log(`  step ${s.padEnd(9)} ~${((ends.get(s)! - claims.get(s)!) / 1000).toFixed(1)}s (claim to next step's claim)`);
  }
  let cost = 0;
  for (const u of usage ?? []) {
    cost += Number(u.cost_usd ?? 0);
    console.log(`  ai ${u.worker.padEnd(18)} ${u.model.padEnd(32)} ${(u.latency_ms / 1000).toFixed(1)}s $${Number(u.cost_usd ?? 0).toFixed(4)} ${u.status}`);
  }
  console.log(`  AI cost $${cost.toFixed(4)}`);
}

const org = await testOrg();
console.log(`test organization: ${org} (${ORG_NAME})`);
for (const url of urls) {
  try {
    await runOne(org, url);
  } catch (e) {
    console.error(`${url}: ${e instanceof Error ? e.message : e}`);
  }
}
console.log(`\nClean up when done (cascades to every row the runs created):\n  delete from public.organizations where id = '${org}';`);

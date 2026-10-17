import { NextResponse, connection } from "next/server";
import { keyInfo } from "@/lib/integrations/openrouter";
import { listWorkflows } from "@/lib/integrations/n8n";
import { pageSpeed } from "@/lib/integrations/google";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { envConfigured } from "@/lib/env";
import { continueKey } from "@/lib/pipeline/continue-token";
import { continueUrl, databaseContinueUrl, dispatchMode } from "@/lib/pipeline/dispatch";

type Check = { ok: boolean; detail: string };

async function check(fn: () => Promise<string>): Promise<Check> {
  try {
    return { ok: true, detail: await fn() };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

// Dev-only connectivity check for every external service the app uses.
export async function GET() {
  await connection();
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in production" }, { status: 404 });
  }

  const [supabase, assistant, openrouter, n8n, google, handoff] = await Promise.all([
    check(async () => {
      const { error, count } = await createSupabaseAdminClient()
        .from("organizations")
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return `connected, ${count} organizations`;
    }),
    // The in-app assistant (D-043) fails closed without its table: migration 20261017020224_assistant_usage.sql.
    check(async () => {
      const { error } = await createSupabaseAdminClient().from("assistant_usage").select("id", { count: "exact", head: true });
      if (error) throw new Error(`assistant_usage unavailable (apply migration 20261017020224_assistant_usage.sql): ${error.message}`);
      return "assistant_usage table present";
    }),
    check(async () => {
      const k = await keyInfo();
      return `${k.is_free_tier ? "FREE TIER (paid models will fail until credits are added)" : "paid"}; ` +
        `limit remaining: ${k.limit_remaining ?? "unlimited"}; expires: ${k.expires_at ?? "never"}`;
    }),
    check(async () => {
      const wf = await listWorkflows();
      return `${wf.length} workflows (${wf.filter((w) => w.active).length} active)`;
    }),
    check(async () => {
      const r = await pageSpeed("https://example.com", "desktop");
      return `PageSpeed OK (example.com performance ${r.scores.performance})`;
    }),
    check(jobHandoffCheck),
  ]);

  return NextResponse.json({
    supabase,
    assistant,
    openrouter,
    n8n,
    google_pagespeed: google,
    job_handoff: handoff,
    // OAuth needs a signed-in owner, so this only checks the configuration (docs/architecture/SEARCH_CONSOLE_SETUP.md).
    google_search_console: searchConsoleCheck(),
    hubspot: { ok: false, detail: "Sprint 5: needs a HubSpot public app (OAuth)" },
    stripe: { ok: false, detail: "Sprint 6: needs Stripe test-mode keys" },
  });
}

function searchConsoleCheck(): Check {
  const missing = (["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "INTEGRATIONS_ENCRYPTION_KEY"] as const).filter(
    (k) => !envConfigured(k),
  );
  return missing.length
    ? { ok: false, detail: `not set up: missing or invalid ${missing.join(", ")}` }
    : { ok: true, detail: "configured (OAuth client and encryption key set; the OAuth flow itself isn't exercised here)" };
}

// Analysis steps hand off to each other through /api/jobs/continue (D-042). Checks the signing key and reports the
// dispatch mode (lib/pipeline/dispatch.ts). Direct mode: the route is reachable where the steps will call it. Database
// mode: the job_dispatches migration is applied, pg_net and pg_cron are installed and the sweeper is scheduled
// (job_dispatch_health, service role only), and the public URL Postgres posts to answers.
async function jobHandoffCheck(): Promise<string> {
  if (!envConfigured("JOB_CONTINUE_SECRET")) {
    throw new Error("JOB_CONTINUE_SECRET is set but shorter than 32 characters: every analysis would fail as soon as it is queued");
  }
  if (!envConfigured("JOB_DISPATCH")) throw new Error('JOB_DISPATCH must be "database" or "direct" (or unset)');
  continueKey();
  const key = process.env.JOB_CONTINUE_SECRET?.trim() ? "from JOB_CONTINUE_SECRET" : "derived from SUPABASE_SECRET_KEY";
  if (dispatchMode() === "direct") {
    const url = continueUrl();
    await expectContinueRoute(url);
    return `direct mode (the app posts to itself): ${url} reachable; key ${key}`;
  }
  const url = databaseContinueUrl();
  const { data, error } = await createSupabaseAdminClient().rpc("job_dispatch_health");
  if (error) {
    throw new Error(`database mode, but job_dispatch_health failed (apply migration 20261017110000_job_dispatches.sql): ${error.message}`);
  }
  const h = (data ?? {}) as {
    pg_net?: string | null;
    pg_cron?: string | null;
    sweeper_scheduled?: boolean;
    dispatches_last_day?: number;
    failed_posts_last_6h?: number;
  };
  if (!h.pg_net) throw new Error("database mode, but the pg_net extension isn't installed");
  if (!h.pg_cron || !h.sweeper_scheduled) throw new Error("database mode, but pg_cron or the braventa-job-dispatch-sweeper schedule is missing");
  await expectContinueRoute(url);
  return (
    `database mode (Postgres posts each hand-off): ${url} reachable; pg_net ${h.pg_net}, pg_cron ${h.pg_cron}, sweeper scheduled; ` +
    `${h.dispatches_last_day ?? 0} hand-offs in the last day, ${h.failed_posts_last_6h ?? 0} failed posts in the last 6 h; key ${key}`
  );
}

// An empty request must come back 400 from the route itself, not a redirect to /login or another server.
async function expectContinueRoute(url: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status !== 400) {
    const hint = res.status >= 300 && res.status < 400 ? " (redirected: is the route public in proxy.ts, and is this the right server?)" : "";
    throw new Error(`${url} answered HTTP ${res.status}, expected 400 for an empty request${hint}`);
  }
}

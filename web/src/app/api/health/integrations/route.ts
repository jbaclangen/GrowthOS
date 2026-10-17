import { NextResponse, connection } from "next/server";
import { keyInfo } from "@/lib/integrations/openrouter";
import { listWorkflows } from "@/lib/integrations/n8n";
import { pageSpeed } from "@/lib/integrations/google";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { envConfigured } from "@/lib/env";
import { continueKey } from "@/lib/pipeline/continue-token";
import { continueUrl, databaseContinueUrl, dispatchMode } from "@/lib/pipeline/dispatch";
import { assessDispatchHealth, type DispatchHealth } from "@/lib/pipeline/dispatch-health";

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

// Analysis steps hand off to each other through /api/jobs/continue (D-042). Checks the signing key, reports the
// dispatch mode (lib/pipeline/dispatch.ts) and checks that the route is reachable where the hand-offs will call it
// (direct mode: this server; database mode: the public https URL Postgres posts to). Whatever the mode here, it also
// checks the database side (job_dispatch_health, service role only): every environment shares one database and
// production hands off through it, so a missing migration, extension, worker or sweeper, or posts that were refused
// or never answered, make this check fail even on a developer machine.
async function jobHandoffCheck(): Promise<string> {
  if (!envConfigured("JOB_CONTINUE_SECRET")) {
    throw new Error("JOB_CONTINUE_SECRET is set but shorter than 32 characters: every analysis would fail as soon as it is queued");
  }
  if (!envConfigured("JOB_DISPATCH")) throw new Error('JOB_DISPATCH must be "database" or "direct" (or unset)');
  continueKey();
  const key = process.env.JOB_CONTINUE_SECRET?.trim() ? "from JOB_CONTINUE_SECRET" : "derived from SUPABASE_SECRET_KEY";
  const mode = dispatchMode();
  const url = mode === "direct" ? continueUrl() : databaseContinueUrl();
  const label = mode === "direct" ? "direct mode (this app posts to itself)" : "database mode (Postgres posts each hand-off)";
  const { data, error } = await createSupabaseAdminClient().rpc("job_dispatch_health");
  if (error) {
    throw new Error(
      `${label}; job_dispatch_health failed, so production can't hand analysis steps on: apply the job_dispatches migration ` +
        `(supabase/migrations) with the Supabase CLI: ${error.message}`,
    );
  }
  const report = assessDispatchHealth((data ?? {}) as DispatchHealth);
  await expectContinueRoute(url);
  const detail = `${label}: ${url} reachable; key ${key}; Postgres side: ${report.summary}`;
  if (report.problems.length) throw new Error(`${detail}. ${report.status}: ${report.problems.join("; ")}`);
  return detail;
}

// An empty request must come back 400 from the route itself, not a redirect to /login or another server. It can't
// prove that the deployment signs with the same key (the route rejects the body before it checks a token): in database
// mode a key mismatch shows up as 401s among the failed posts that job_dispatch_health reports.
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

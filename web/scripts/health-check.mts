// Braventa health check (ops tool; read-only, spends nothing except one tiny PageSpeed call).
// Checks what's running and what isn't across the public sites, the app, Supabase, AI, Google, email DNS and
// recent pipeline jobs, and prints one line per check: OK / WARN / FAIL.
//
//   npm run health
//   HEALTH_JSON=1 npm run health      # machine-readable output (used by the braventa-health-check agent)
//
// Uses web/.env.local (service key) to read Supabase; never prints secrets.

import { assessDispatchHealth, type DispatchHealth } from "@/lib/pipeline/dispatch-health";

type Status = "OK" | "WARN" | "FAIL";
type Result = { area: string; check: string; status: Status; detail: string };
const results: Result[] = [];
const add = (area: string, check: string, status: Status, detail: string) => results.push({ area, check, status, detail });

const APP = process.env.HEALTH_APP_URL ?? "https://app.braventa.io";
const SITE = process.env.HEALTH_SITE_URL ?? "https://braventa.io";
const env = (k: string) => process.env[k]?.trim() ?? "";

async function timed(url: string, init?: RequestInit) {
  const t = Date.now();
  const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20000), ...init });
  return { res, ms: Date.now() - t };
}

async function web() {
  for (const [area, base, paths] of [
    ["Site", SITE, ["/", "/pricing", "/how-it-works", "/product", "/trust", "/trust/ai", "/legal/privacy", "/legal/terms", "/contact", "/robots.txt"]],
    ["App", APP, ["/login", "/robots.txt"]],
  ] as const) {
    for (const p of paths) {
      try {
        const { res, ms } = await timed(base + p);
        const ok = res.status === 200;
        add(area, `GET ${p}`, ok ? (ms > 3000 ? "WARN" : "OK") : "FAIL", `${res.status} in ${ms} ms`);
      } catch (e) {
        add(area, `GET ${p}`, "FAIL", (e as Error).message);
      }
    }
  }
  // Signed-out app pages must redirect to login, not error.
  for (const p of ["/dashboard", "/settings", "/plans"]) {
    try {
      const { res } = await timed(APP + p);
      const loc = res.headers.get("location") ?? "";
      add("App", `GET ${p} (signed out)`, res.status >= 300 && res.status < 400 && loc.includes("/login") ? "OK" : "FAIL", `${res.status} → ${loc || "no redirect"}`);
    } catch (e) {
      add("App", `GET ${p} (signed out)`, "FAIL", (e as Error).message);
    }
  }
  // MCP endpoint: must refuse a request without a key, with a JSON-RPC error.
  try {
    const { res } = await timed(APP + "/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    add("App", "MCP endpoint refuses missing key", res.status === 401 ? "OK" : "FAIL", `${res.status}`);
  } catch (e) {
    add("App", "MCP endpoint", "FAIL", (e as Error).message);
  }
  // The app must stay out of search engines; the site follows SITE_INDEXABLE.
  try {
    const { res } = await timed(APP + "/login");
    add("App", "Not indexable (X-Robots-Tag)", (res.headers.get("x-robots-tag") ?? "").includes("noindex") ? "OK" : "WARN", res.headers.get("x-robots-tag") ?? "missing");
  } catch {}
}

async function supabase() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SECRET_KEY");
  if (!url || !key) return add("Supabase", "Credentials", "FAIL", "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing in .env.local");
  const h = { apikey: key, authorization: `Bearer ${key}` };
  const get = async (q: string) => {
    const res = await fetch(`${url}/rest/v1/${q}`, { headers: { ...h, prefer: "count=exact" } });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return { rows: (await res.json()) as Record<string, unknown>[], count: Number(res.headers.get("content-range")?.split("/")[1] ?? NaN) };
  };
  try {
    const orgs = await get("organizations?select=name,plan,trial_ends_at");
    add("Supabase", "Database reachable", "OK", `${orgs.count} organizations`);
    for (const o of orgs.rows) {
      const ends = new Date(String(o.trial_ends_at));
      const plan = String(o.plan);
      const note = plan === "trial" ? `trial ends ${ends.toISOString().slice(0, 10)}${ends < new Date() ? " (ended)" : ""}` : plan;
      add("Accounts", String(o.name), plan === "trial" && ends < new Date() ? "WARN" : "OK", note);
    }
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const jobs = await get(`ai_jobs?select=worker,status,error,created_at&created_at=gte.${since}&order=created_at.desc&limit=200`);
    const failed = jobs.rows.filter((j) => j.status === "failed");
    const stuck = jobs.rows.filter((j) => (j.status === "running" || j.status === "queued") && Date.now() - +new Date(String(j.created_at)) > 15 * 60e3);
    add("Pipeline", "Jobs last 7 days", failed.length ? "WARN" : "OK", `${jobs.rows.length} jobs, ${failed.length} failed`);
    if (failed[0]) add("Pipeline", "Latest failure", "WARN", `${failed[0].worker} ${String(failed[0].created_at).slice(0, 16)}: ${String(failed[0].error).slice(0, 140)}`);
    add("Pipeline", "Stuck jobs (>15 min)", stuck.length ? "FAIL" : "OK", `${stuck.length}`);
    const usage = await get(`ai_usage?select=model,cost_usd&created_at=gte.${since}&limit=5000`);
    const spend = usage.rows.reduce((a, r) => a + Number(r.cost_usd ?? 0), 0);
    const free = usage.rows.filter((r) => String(r.model).endsWith(":free")).length;
    add("AI", "Spend last 7 days", "OK", `$${spend.toFixed(2)} over ${usage.rows.length} calls`);
    add("AI", "Free-model calls (blocked by ZDR)", free ? "WARN" : "OK", `${free}`);
    const audits = await get(`audit_runs?select=status,error_summary,created_at&order=created_at.desc&limit=1`);
    const a = audits.rows[0];
    if (a) add("Pipeline", "Latest website audit", a.status === "completed" ? "OK" : "WARN", `${a.status} ${String(a.created_at).slice(0, 16)}${a.error_summary ? ` — ${String(a.error_summary).slice(0, 120)}` : ""}`);
    const gsc = await get("integration_connections?select=provider,status,last_error,last_synced_at");
    for (const c of gsc.rows) add("Integrations", String(c.provider), c.status === "active" ? "OK" : "WARN", `${c.status}${c.last_error ? ` — ${c.last_error}` : ""}`);
    const keys = await get("mcp_access_keys?select=id&revoked_at=is.null");
    add("Integrations", "Active MCP access keys", "OK", `${keys.count}`);
  } catch (e) {
    add("Supabase", "Queries", "FAIL", (e as Error).message.slice(0, 200));
  }
  // Production hands each analysis step on through Postgres (job_dispatches + pg_net, re-posted by a pg_cron sweeper;
  // D-042). job_dispatch_health is service-role only and returns counts and versions, never tokens. The rules are
  // shared with /api/health/integrations (src/lib/pipeline/dispatch-health.ts): FAIL when hand-offs can't go out,
  // including posts pg_net never answered (stalled worker: `select net.worker_restart();`), WARN on refused posts.
  const check = "Step hand-off through Postgres (pg_net)";
  try {
    const res = await fetch(`${url}/rest/v1/rpc/job_dispatch_health`, { method: "POST", headers: { ...h, "content-type": "application/json" }, body: "{}" });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
    const report = assessDispatchHealth((await res.json()) as DispatchHealth);
    add("Pipeline", check, report.status, report.problems.length ? `${report.problems.join("; ")} — ${report.summary}` : report.summary);
  } catch (e) {
    add("Pipeline", check, "FAIL", `job_dispatch_health unavailable (apply the job_dispatches migration in supabase/migrations with the Supabase CLI): ${(e as Error).message.slice(0, 160)}`);
  }
}

async function ai() {
  const key = env("OPENROUTER_API_KEY");
  if (!key) return add("AI", "OpenRouter key", "FAIL", "missing");
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", { headers: { authorization: `Bearer ${key}` } });
    const j = (await res.json()) as { data?: { limit_remaining?: number | null; usage?: number } };
    const left = j.data?.limit_remaining;
    add("AI", "OpenRouter key + credit", !res.ok ? "FAIL" : left != null && left < 10 ? "WARN" : "OK", res.ok ? `credit left: ${left == null ? "no limit" : `$${left.toFixed(2)}`}` : `${res.status}`);
  } catch (e) {
    add("AI", "OpenRouter", "FAIL", (e as Error).message);
  }
}

async function google() {
  const key = env("GOOGLE_API_KEY");
  if (!key) return add("Google", "PageSpeed key", "FAIL", "missing");
  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&category=performance&key=${key}`, { signal: AbortSignal.timeout(60000) });
    add("Google", "PageSpeed API", res.ok ? "OK" : "FAIL", `${res.status}`);
  } catch (e) {
    add("Google", "PageSpeed API", "FAIL", (e as Error).message);
  }
  add("Google", "Search Console OAuth configured (local env)", env("GOOGLE_OAUTH_CLIENT_ID") && env("INTEGRATIONS_ENCRYPTION_KEY") ? "OK" : "WARN", "production is checked by connecting in Settings");
}

async function emailDns() {
  // DNS-over-HTTPS (Google): the local resolver on some machines can't see TXT records.
  const txt = async (name: string) => {
    const res = await fetch(`https://dns.google/resolve?name=${name}&type=TXT`, { signal: AbortSignal.timeout(10000) }).catch(() => null);
    const j = res?.ok ? ((await res.json()) as { Answer?: { data: string }[] }) : {};
    return (j.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, "").replace(/" "/g, ""));
  };
  const root = await txt("braventa.io");
  const spf = root.filter((r) => r.startsWith("v=spf1"));
  add("Email DNS", "SPF (exactly one)", spf.length === 1 ? "OK" : "FAIL", spf.join(" | ") || "none");
  add("Email DNS", "Google site verification", root.some((r) => r.startsWith("google-site-verification=")) ? "OK" : "FAIL", "must never be removed");
  const dmarc = (await txt("_dmarc.braventa.io")).filter((r) => r.startsWith("v=DMARC1"));
  add("Email DNS", "DMARC (exactly one)", dmarc.length === 1 ? "OK" : "FAIL", dmarc.join(" | ") || "none");
}

await Promise.all([web(), supabase(), ai(), google(), emailDns()]);

const order = ["Site", "App", "Supabase", "Accounts", "Pipeline", "AI", "Google", "Integrations", "Email DNS"];
results.sort((a, b) => order.indexOf(a.area) - order.indexOf(b.area));
if (process.env.HEALTH_JSON) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const r of results) console.log(`${r.status.padEnd(4)} ${r.area.padEnd(12)} ${r.check} — ${r.detail}`);
  const fails = results.filter((r) => r.status === "FAIL").length;
  const warns = results.filter((r) => r.status === "WARN").length;
  console.log(`\n${results.length} checks: ${fails} failing, ${warns} warnings.`);
}
process.exitCode = results.some((r) => r.status === "FAIL") ? 1 : 0;

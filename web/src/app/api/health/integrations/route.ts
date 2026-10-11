import { NextResponse, connection } from "next/server";
import { keyInfo } from "@/lib/integrations/openrouter";
import { listWorkflows } from "@/lib/integrations/n8n";
import { pageSpeed } from "@/lib/integrations/google";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { envConfigured } from "@/lib/env";

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

  const [supabase, openrouter, n8n, google] = await Promise.all([
    check(async () => {
      const { error, count } = await createSupabaseAdminClient()
        .from("organizations")
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return `connected, ${count} organizations`;
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
  ]);

  return NextResponse.json({
    supabase,
    openrouter,
    n8n,
    google_pagespeed: google,
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

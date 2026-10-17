import { NextResponse, type NextRequest } from "next/server";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { BudgetExceededError, runWorker, summarizeError } from "@/lib/ai/router";
import { handleAssistantRequest, type AssistantOrg, type Reservation } from "@/lib/assistant/handler";
import { loadBusinessSummary } from "@/lib/assistant/context";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

// POST /api/assistant — "Ask Braventa", the in-app assistant (D-042). Body: { question, history? }.
// Answers in one JSON response ({ answer } or { error }); the flow and its checks live in lib/assistant/handler.ts.
// Reads go through the signed-in user's client (RLS). The service client only reserves and settles this
// organization's assistant_usage rows, scoped to the organization the user's membership resolved.

export const maxDuration = 60;
// One model attempt, no retry, well inside maxDuration (the lookups before it take a second or two), so a slow
// provider ends in this route's own JSON error instead of the platform's timeout page.
const MODEL_TIMEOUT_MS = 40_000;
const MAX_BODY_BYTES = 64 * 1024;

function json(status: number, body: object) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function sameHost(origin: string, host: string | null) {
  try {
    return new URL(origin).host === host;
  } catch {
    return false; // "null" or malformed
  }
}

export async function POST(request: NextRequest) {
  // Same-origin only: a JSON content type forces a CORS preflight from other sites, and the Origin must match.
  const origin = request.headers.get("origin");
  if (origin && !sameHost(origin, request.headers.get("host"))) {
    return json(403, { error: "This request came from another site, so it was blocked." });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json(415, { error: "Send the question as JSON." });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: "That message is too long. Shorten it and try again." });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "That question couldn't be read. Type it again and resend it." });
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const result = await handleAssistantRequest(body, {
    getUserId: async () => {
      const { data, error } = await supabase.auth.getUser();
      // No session or an invalid one means signed out; an unreachable or failing Auth server is a lookup failure.
      if (error && (isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500)) throw error;
      return data.user?.id ?? null;
    },
    getOrg: async () => {
      // RLS: only the user's own memberships are visible (MVP: one organization per user).
      const { data, error } = await supabase
        .from("memberships")
        .select("organizations(id, name, plan, trial_ends_at)")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.organizations as unknown as AssistantOrg | null) ?? null;
    },
    reserve: async (orgId, userId, limits): Promise<Reservation> => {
      const { data, error } = await admin.rpc("reserve_assistant_question", {
        p_organization_id: orgId,
        p_user_id: userId,
        p_per_org_per_day: limits.perOrgPerDay,
        p_per_user_per_minute: limits.perUserPerMinute,
      });
      if (error) throw new Error(error.message);
      const row = (Array.isArray(data) ? data[0] : data) as
        | { usage_id: number | null; org_last_day: number; user_last_minute: number }
        | undefined;
      if (!row) throw new Error("reserve_assistant_question returned no row");
      return { usageId: row.usage_id, orgLastDay: row.org_last_day, userLastMinute: row.user_last_minute };
    },
    finish: async (orgId, usageId, status) => {
      const { error } = await admin
        .from("assistant_usage")
        .update({ status, finished_at: new Date().toISOString() })
        .eq("id", usageId)
        .eq("organization_id", orgId);
      if (error) throw new Error(error.message);
    },
    loadSummary: (org, userId) => loadBusinessSummary(supabase, org, userId),
    ask: (orgId, messages) =>
      runWorker({ organizationId: orgId, worker: "app_assistant", messages, maxTokens: 800, timeoutMs: MODEL_TIMEOUT_MS, retry: false }),
    isBudgetError: (e) => e instanceof BudgetExceededError,
    // Never logs the question or answer: only a one-line error summary.
    logError: (message, e) => console.error(message, summarizeError(e)),
  });

  return json(result.status, result.body);
}

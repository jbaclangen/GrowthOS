import { NextResponse, type NextRequest } from "next/server";
import { BudgetExceededError, runWorker, summarizeError } from "@/lib/ai/router";
import { handleAssistantRequest, type AssistantOrg } from "@/lib/assistant/handler";
import { loadBusinessSummary } from "@/lib/assistant/context";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

// POST /api/assistant — "Ask Braventa", the in-app assistant (D-042). Body: { question, history? }.
// Answers in one JSON response ({ answer } or { error }); the flow and its checks live in lib/assistant/handler.ts.
// Reads go through the signed-in user's client (RLS). The service client only counts and stores this
// organization's assistant_messages, scoped to the organization the user's membership resolved.

export const maxDuration = 60;
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
    getUserId: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    getOrg: async () => {
      // RLS: only the user's own memberships are visible (MVP: one organization per user).
      const { data } = await supabase
        .from("memberships")
        .select("organizations(id, name, plan, trial_ends_at)")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      return (data?.organizations as unknown as AssistantOrg | null) ?? null;
    },
    countUsage: async (orgId, userId, { dayStart, minuteStart }) => {
      const [day, minute] = await Promise.all([
        admin.from("assistant_messages").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", dayStart),
        admin
          .from("assistant_messages")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("user_id", userId)
          .gte("created_at", minuteStart),
      ]);
      if (day.error || minute.error) throw new Error((day.error ?? minute.error)!.message);
      return { orgLastDay: day.count ?? 0, userLastMinute: minute.count ?? 0 };
    },
    loadSummary: (org, userId) => loadBusinessSummary(supabase, org, userId),
    ask: (orgId, messages) => runWorker({ organizationId: orgId, worker: "app_assistant", messages, maxTokens: 800 }),
    save: async (row) => {
      const { error } = await admin.from("assistant_messages").insert(row);
      if (error) throw new Error(error.message);
    },
    isBudgetError: (e) => e instanceof BudgetExceededError,
    // Never logs the question or answer: only a one-line error summary.
    logError: (message, e) => console.error(message, summarizeError(e)),
  });

  return json(result.status, result.body);
}

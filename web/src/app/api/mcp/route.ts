import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { hashKey, keyFromAuthHeader } from "@/lib/mcp/keys";
import { mcpAccess } from "@/lib/mcp/access";
import { ERR, SUPPORTED_VERSIONS, handleMessage, rpcError, type JsonRpcRequest } from "@/lib/mcp/protocol";

// The AI assistant connection (MCP, D-036): Braventa's MCP server for Claude Code and Claude Desktop.
// Auth is a personal access key (Settings → AI assistant access) sent as "Authorization: Bearer brv_…". The key
// resolves to one user and organization; every tool call is scoped to that organization (lib/mcp/tools.ts).
// proxy.ts lets this path through without a session cookie because the key is checked here.

// Tool calls can start the website analysis and the plan; their steps run in their own invocations, handed on after
// the response (D-042). The follow-up question tools call the extractor model, which can take a few minutes.
export const maxDuration = 300;

const RATE_PER_MINUTE = 30;
const RATE_PER_HOUR = 300;
const MAX_BODY_BYTES = 64 * 1024;

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });

const unauthorized = (message: string) =>
  json(rpcError(null, ERR.invalidRequest, message), 401, { "WWW-Authenticate": 'Bearer realm="braventa"' });

export async function POST(request: Request) {
  // DNS-rebinding protection (MCP spec): browsers send Origin; only our own origin may call from a page.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json(rpcError(null, ERR.invalidRequest, "Origin not allowed."), 403);

  const version = request.headers.get("mcp-protocol-version");
  if (version && !SUPPORTED_VERSIONS.includes(version as (typeof SUPPORTED_VERSIONS)[number])) {
    return json(rpcError(null, ERR.invalidRequest, `Unsupported MCP protocol version: ${version}`), 400);
  }

  const key = keyFromAuthHeader(request.headers.get("authorization"));
  if (!key) return unauthorized("Add your Braventa access key: Authorization: Bearer brv_… (Braventa → Settings → AI assistant access).");

  const db = createSupabaseAdminClient();
  const { data: row } = await db
    .from("mcp_access_keys")
    .select("id, organization_id, user_id, revoked_at, organizations(plan, trial_ends_at)")
    .eq("key_hash", hashKey(key))
    .maybeSingle();
  if (!row || row.revoked_at) return unauthorized("This Braventa access key isn't valid or was revoked. Create a new one in Braventa → Settings.");

  // The key's owner must still belong to the organization.
  const { data: membership } = await db
    .from("memberships")
    .select("user_id")
    .eq("organization_id", row.organization_id)
    .eq("user_id", row.user_id)
    .maybeSingle();
  if (!membership) return unauthorized("This access key's account no longer has access to the business.");

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json(rpcError(null, ERR.invalidRequest, "Request too large."), 413);
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return json(rpcError(null, ERR.parse, "Invalid JSON."), 400);
  }
  const messages = (Array.isArray(payload) ? payload : [payload]) as JsonRpcRequest[];
  if (!messages.length || messages.length > 10 || messages.some((m) => !m || m.jsonrpc !== "2.0" || typeof m.method !== "string")) {
    return json(rpcError(null, ERR.invalidRequest, "Expected a JSON-RPC 2.0 request."), 400);
  }

  await db.from("mcp_access_keys").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);

  const org = row.organizations as unknown as { plan: string; trial_ends_at: string };
  const access = mcpAccess(org);
  const ctx = { db, organizationId: row.organization_id as string, userId: row.user_id as string, appUrl: new URL(request.url).origin };
  const log = async (tool: string, ok: boolean, error?: string) => {
    await db.from("mcp_tool_calls").insert({ organization_id: ctx.organizationId, key_id: row.id, tool, ok, error: error?.slice(0, 300) ?? null });
  };

  const responses = [];
  for (const msg of messages) {
    if (msg.method === "tools/call" && msg.id !== undefined) {
      // Paused after the trial (D-036): listing tools still works, so the assistant can explain why.
      if (!access.allowed) {
        responses.push({ jsonrpc: "2.0" as const, id: msg.id, result: { content: [{ type: "text", text: access.reason }], isError: true } });
        continue;
      }
      const since = (ms: number) => new Date(Date.now() - ms).toISOString();
      const [{ count: lastMinute }, { count: lastHour }] = await Promise.all([
        db.from("mcp_tool_calls").select("id", { count: "exact", head: true }).eq("key_id", row.id).gte("created_at", since(60_000)),
        db.from("mcp_tool_calls").select("id", { count: "exact", head: true }).eq("key_id", row.id).gte("created_at", since(3_600_000)),
      ]);
      if ((lastMinute ?? 0) >= RATE_PER_MINUTE || (lastHour ?? 0) >= RATE_PER_HOUR) {
        responses.push({ jsonrpc: "2.0" as const, id: msg.id, result: { content: [{ type: "text", text: "Too many Braventa requests in a short time. Wait a minute and try again." }], isError: true } });
        continue;
      }
    }
    const response = await handleMessage(msg, ctx, log);
    if (response) responses.push(response);
  }

  if (!responses.length) return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
  return json(Array.isArray(payload) ? responses : responses[0]);
}

// Stateless server without server-sent events: no GET stream and no sessions to delete.
export function GET() {
  return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
}

export function DELETE() {
  return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
}

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { authenticateMcp } from "@/lib/mcp/auth";
import { AUTH_MESSAGES } from "@/lib/mcp/principal";
import { mcpAccess } from "@/lib/mcp/access";
import { ERR, SUPPORTED_VERSIONS, handleMessage, rpcError, type JsonRpcRequest } from "@/lib/mcp/protocol";
import { mcpOriginAllowed, mcpResourceFor, publicOrigin, wwwAuthenticate } from "@/lib/oauth/server-metadata";

// The AI assistant connection (MCP, D-036): Braventa's MCP server for Claude (claude.ai, Desktop, Code), ChatGPT and
// automation tools. Three credentials, all sent as "Authorization: Bearer …" (lib/mcp/auth.ts):
//   - OAuth access tokens (brv_at_…) from "Sign in with Braventa" (/oauth/*), bound to a user, organization and scopes;
//   - personal access keys (brv_…) from Settings → Integrations, bound to a user and organization;
//   - service keys (brv_sk_…) from Settings → Integrations, bound to an organization (owner-created, for automation).
// Every tool call is scoped to the credential's organization (lib/mcp/tools.ts).
// proxy.ts lets this path through without a session cookie because the credential is checked here.

// Tool calls can start the website analysis and the plan; their steps run in their own invocations, handed on after
// the response (D-042). The follow-up question tools call the extractor model, which can take a few minutes.
export const maxDuration = 300;

const RATE_PER_MINUTE = 30;
const RATE_PER_HOUR = 300;
const MAX_BODY_BYTES = 64 * 1024;

function corsFor(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version, Mcp-Session-Id",
    "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  const ownOrigin = new URL(request.url).origin;
  const origin = publicOrigin(request.url);
  // DNS-rebinding and cross-site protection (MCP transport spec): browsers send Origin; only our own origin and the
  // known AI clients may call from a page. Servers, CLIs and desktop apps send no Origin.
  if (!mcpOriginAllowed(requestOrigin, ownOrigin) && !mcpOriginAllowed(requestOrigin, origin)) {
    return json(rpcError(null, ERR.invalidRequest, "Origin not allowed."), 403);
  }
  const cors = corsFor(requestOrigin);
  const reply = (body: unknown, status = 200, extra: Record<string, string> = {}) => json(body, status, { ...cors, ...extra });

  const version = request.headers.get("mcp-protocol-version");
  if (version && !SUPPORTED_VERSIONS.includes(version as (typeof SUPPORTED_VERSIONS)[number])) {
    return reply(rpcError(null, ERR.invalidRequest, `Unsupported MCP protocol version: ${version}`), 400);
  }

  const db = createSupabaseAdminClient();
  const auth = await authenticateMcp(db, request.headers.get("authorization"), mcpResourceFor(origin));
  if (!auth.ok) {
    // RFC 9728 §5.1: the header points the client at the metadata, which starts "Sign in with Braventa".
    const message = auth.reason === "missing" ? AUTH_MESSAGES.missing : auth.message;
    const header = auth.reason === "missing" ? wwwAuthenticate(origin) : wwwAuthenticate(origin, { code: "invalid_token", description: message });
    return reply(rpcError(null, ERR.invalidRequest, message), 401, { "WWW-Authenticate": header });
  }
  const { principal } = auth;

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return reply(rpcError(null, ERR.invalidRequest, "Request too large."), 413);
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return reply(rpcError(null, ERR.parse, "Invalid JSON."), 400);
  }
  const messages = (Array.isArray(payload) ? payload : [payload]) as JsonRpcRequest[];
  if (!messages.length || messages.length > 10 || messages.some((m) => !m || m.jsonrpc !== "2.0" || typeof m.method !== "string")) {
    return reply(rpcError(null, ERR.invalidRequest, "Expected a JSON-RPC 2.0 request."), 400);
  }

  const access = mcpAccess(principal.org);
  const ctx = {
    db,
    organizationId: principal.organizationId,
    userId: principal.userId,
    appUrl: origin,
    // A personal key or sign-in acts with its user's role; a service key keeps its rule (lib/mcp/principal.ts).
    actor: { kind: principal.kind, role: principal.role },
  };
  // Calls are logged against the key or the OAuth grant; rate limits count the same column.
  const subject = principal.grantId ? { column: "oauth_grant_id", id: principal.grantId } : { column: "key_id", id: principal.keyId! };
  const log = async (tool: string, ok: boolean, error?: string) => {
    await db.from("mcp_tool_calls").insert({
      organization_id: ctx.organizationId,
      key_id: principal.keyId,
      oauth_grant_id: principal.grantId,
      tool,
      ok,
      error: error?.slice(0, 300) ?? null,
    });
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
        db.from("mcp_tool_calls").select("id", { count: "exact", head: true }).eq(subject.column, subject.id).gte("created_at", since(60_000)),
        db.from("mcp_tool_calls").select("id", { count: "exact", head: true }).eq(subject.column, subject.id).gte("created_at", since(3_600_000)),
      ]);
      if ((lastMinute ?? 0) >= RATE_PER_MINUTE || (lastHour ?? 0) >= RATE_PER_HOUR) {
        responses.push({ jsonrpc: "2.0" as const, id: msg.id, result: { content: [{ type: "text", text: "Too many Braventa requests in a short time. Wait a minute and try again." }], isError: true } });
        continue;
      }
    }
    const response = await handleMessage(msg, ctx, log, principal.scopes);
    if (response) responses.push(response);
  }

  if (!responses.length) return new Response(null, { status: 202, headers: { "Cache-Control": "no-store", ...cors } });
  return reply(Array.isArray(payload) ? responses : responses[0]);
}

export function OPTIONS(request: Request) {
  const requestOrigin = request.headers.get("origin");
  const ownOrigin = new URL(request.url).origin;
  if (requestOrigin && !mcpOriginAllowed(requestOrigin, ownOrigin) && !mcpOriginAllowed(requestOrigin, publicOrigin(request.url))) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsFor(requestOrigin) });
}

// Stateless server without server-sent events: no GET stream and no sessions to delete.
export function GET() {
  return new Response("Method not allowed", { status: 405, headers: { Allow: "POST, OPTIONS" } });
}

export function DELETE() {
  return new Response("Method not allowed", { status: 405, headers: { Allow: "POST, OPTIONS" } });
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });
}

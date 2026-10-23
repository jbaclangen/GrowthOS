import "server-only";
import { z } from "zod";
import { hasScope } from "@/lib/oauth/scopes";
import { deniedMessage } from "@/lib/team/roles";
import { principalCan } from "./principal";
import { TOOLS, ToolError, findTool, type ToolContext } from "./tools";

// A minimal MCP server over Streamable HTTP (stateless, JSON responses only, no server-sent events): enough for
// tools/list and tools/call, which is all phase 1 needs (D-036). Spec: https://modelcontextprotocol.io/specification

export const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26"] as const;
const SERVER_INFO = { name: "braventa", title: "Braventa", version: "0.1.0" };

const INSTRUCTIONS = `Braventa builds a prioritized growth plan for a small or mid-sized service business. These tools let you fill in Braventa's onboarding for the owner you're talking with, using what they've told you.

Order: braventa_start_onboarding → braventa_get_discovery_questions → braventa_submit_discovery → confirm the candidates and top priorities with the owner → braventa_confirm_priorities → answer any follow-up questions (braventa_answer_follow_up_questions) → braventa_get_status.

Rules:
- Use only information the owner has given you. Don't invent numbers, tools or problems; skip a question rather than guess.
- Check the priorities with the owner before confirming them.
- Braventa never publishes anything. The owner confirms or corrects the diagnosis and approves drafted posts in the Braventa app (report_url).`;

export type JsonRpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: unknown };
export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string } };

export const ERR = { parse: -32700, invalidRequest: -32600, methodNotFound: -32601, invalidParams: -32602, internal: -32603 } as const;

export const rpcError = (id: JsonRpcRequest["id"], code: number, message: string): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

const callParams = z.object({ name: z.string(), arguments: z.record(z.string(), z.unknown()).optional() });

export type CallLog = (tool: string, ok: boolean, error?: string) => Promise<void>;

// Handles one JSON-RPC message. Returns null for notifications (no id), which get no response body.
// `scopes` are what the caller's key or OAuth grant allows: tools outside them are neither listed nor callable.
// A tool that writes also needs its permission from the caller's role (ctx.actor, D-046); it stays listed, and a
// call gets the same refusal the web action gives.
export async function handleMessage(
  msg: JsonRpcRequest,
  ctx: ToolContext,
  log: CallLog,
  scopes: readonly string[],
): Promise<JsonRpcResponse | null> {
  const isNotification = msg.id === undefined;
  if (isNotification) return null;
  const { id } = msg;

  switch (msg.method) {
    case "initialize": {
      const requested = (msg.params as { protocolVersion?: string } | undefined)?.protocolVersion;
      const protocolVersion = SUPPORTED_VERSIONS.includes(requested as (typeof SUPPORTED_VERSIONS)[number])
        ? requested
        : SUPPORTED_VERSIONS[0];
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: { protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id: id ?? null, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          tools: TOOLS.filter((t) => hasScope(scopes, t.scope)).map((t) => ({
            name: t.name,
            title: t.title,
            description: t.description,
            inputSchema: t.inputSchema,
            annotations: { readOnlyHint: t.name.includes("_get_"), openWorldHint: false },
          })),
        },
      };
    case "tools/call": {
      const params = callParams.safeParse(msg.params);
      if (!params.success) return rpcError(id, ERR.invalidParams, "tools/call needs a tool name.");
      const tool = findTool(params.data.name);
      if (!tool) return rpcError(id, ERR.invalidParams, `Unknown tool: ${params.data.name}`);
      if (!hasScope(scopes, tool.scope)) {
        const message = `This connection isn't allowed to use ${tool.name} (needs the "${tool.scope}" scope). Reconnect Braventa and approve that access.`;
        await log(tool.name, false, message);
        return { jsonrpc: "2.0", id: id ?? null, result: { content: [{ type: "text", text: message }], isError: true } };
      }
      if (tool.permission && !principalCan(ctx.actor, tool.permission)) {
        const message = deniedMessage(tool.permission);
        await log(tool.name, false, message);
        return { jsonrpc: "2.0", id: id ?? null, result: { content: [{ type: "text", text: message }], isError: true } };
      }
      const args = tool.args.safeParse(params.data.arguments ?? {});
      if (!args.success) {
        const issue = args.error.issues[0];
        const message = `Invalid arguments: ${issue.path.join(".") || "input"} — ${issue.message}`;
        await log(tool.name, false, message);
        return { jsonrpc: "2.0", id: id ?? null, result: { content: [{ type: "text", text: message }], isError: true } };
      }
      try {
        const result = await tool.run(ctx, args.data as never);
        await log(tool.name, true);
        return {
          jsonrpc: "2.0",
          id: id ?? null,
          result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result },
        };
      } catch (e) {
        // Expected problems (wrong step, validation) go back to the assistant; anything else stays in our logs.
        const message = e instanceof ToolError ? e.message : "Something went wrong in Braventa. Try again in a minute.";
        if (!(e instanceof ToolError)) console.error(`MCP tool ${tool.name} failed`, e);
        await log(tool.name, false, message);
        return { jsonrpc: "2.0", id: id ?? null, result: { content: [{ type: "text", text: message }], isError: true } };
      }
    }
    default:
      return rpcError(id, ERR.methodNotFound, `Method not supported: ${msg.method}`);
  }
}

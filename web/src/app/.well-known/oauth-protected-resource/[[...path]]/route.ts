import { connection } from "next/server";
import { oauthJson, preflight } from "@/lib/oauth/http";
import { protectedResourceMetadata, publicOrigin } from "@/lib/oauth/server-metadata";

// OAuth 2.0 Protected Resource Metadata (RFC 9728) for the MCP server. Served at the root and in the path-inserted
// form /.well-known/oauth-protected-resource/api/mcp, which MCP clients try first.
export async function GET(request: Request, ctx: RouteContext<"/.well-known/oauth-protected-resource/[[...path]]">) {
  await connection();
  const path = ((await ctx.params).path ?? []).join("/");
  if (path && path !== "api/mcp") return oauthJson({ error: "not_found" }, 404);
  return oauthJson(protectedResourceMetadata(publicOrigin(request.url)), 200, { "Cache-Control": "public, max-age=300" });
}

export const OPTIONS = preflight;

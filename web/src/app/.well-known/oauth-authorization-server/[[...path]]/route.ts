import { connection } from "next/server";
import { oauthJson, preflight } from "@/lib/oauth/http";
import { authorizationServerMetadata, publicOrigin } from "@/lib/oauth/server-metadata";

// OAuth 2.0 Authorization Server Metadata (RFC 8414). The issuer is the app origin, so the root form is canonical;
// the path-inserted form for /api/mcp is served too for clients that derive it from the MCP URL.
export async function GET(request: Request, ctx: RouteContext<"/.well-known/oauth-authorization-server/[[...path]]">) {
  await connection();
  const path = ((await ctx.params).path ?? []).join("/");
  if (path && path !== "api/mcp") return oauthJson({ error: "not_found" }, 404);
  return oauthJson(authorizationServerMetadata(publicOrigin(request.url)), 200, { "Cache-Control": "public, max-age=300" });
}

export const OPTIONS = preflight;

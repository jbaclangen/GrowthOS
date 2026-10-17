import { AUTH_METHODS } from "./clients";
import { LIVE_SCOPES } from "./scopes";

// Where the authorization server and the MCP resource live, and the metadata documents that describe them
// (RFC 8414, RFC 9728). Pure apart from reading NEXT_PUBLIC_APP_URL; unit-tested.

export const MCP_PATH = "/api/mcp";
export const PROTECTED_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

// The public origin. In production it's the configured app URL (app.braventa.io), so the issuer and resource never
// depend on a Host header; in development it's whatever origin the request came to (localhost on any port).
export function publicOrigin(requestUrl: string, env: { NODE_ENV?: string; NEXT_PUBLIC_APP_URL?: string } = process.env) {
  const requestOrigin = new URL(requestUrl).origin;
  if (env.NODE_ENV !== "production") return requestOrigin;
  try {
    return env.NEXT_PUBLIC_APP_URL?.trim() ? new URL(env.NEXT_PUBLIC_APP_URL.trim()).origin : requestOrigin;
  } catch {
    return requestOrigin;
  }
}

export const issuerFor = (origin: string) => origin;
export const mcpResourceFor = (origin: string) => `${origin}${MCP_PATH}`;

// RFC 8707 `resource`: the MCP server URL. Some clients send the bare origin (with or without a trailing slash);
// that names the same server, so it's accepted and stored as the canonical MCP URL. Anything else is refused.
export function canonicalResource(requested: string | null | undefined, origin: string): string | null {
  const canonical = mcpResourceFor(origin);
  if (!requested) return canonical;
  const trimmed = requested.replace(/\/+$/, "");
  return trimmed === canonical || trimmed === origin ? canonical : null;
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: mcpResourceFor(origin),
    authorization_servers: [issuerFor(origin)],
    scopes_supported: LIVE_SCOPES,
    bearer_methods_supported: ["header"],
    resource_name: "Braventa",
    resource_documentation: "https://braventa.io",
  };
}

export function authorizationServerMetadata(origin: string) {
  return {
    issuer: issuerFor(origin),
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    revocation_endpoint: `${origin}/oauth/revoke`,
    scopes_supported: LIVE_SCOPES,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: AUTH_METHODS,
    revocation_endpoint_auth_methods_supported: AUTH_METHODS,
    // RFC 9207: every authorization response (success or error) carries `iss`.
    authorization_response_iss_parameter_supported: true,
    service_documentation: "https://braventa.io",
  };
}

// RFC 6750 §3: error_description and scope may use only printable ASCII without `"` and `\`. Header values must be
// bytes anyway: a character such as "→" makes the Response constructor throw, which turns a 401 into a 500. Arrows
// become ">"; anything else outside the set is dropped. The JSON-RPC body keeps the full message.
export function headerSafe(value: string) {
  return value
    .replace(/\s*→\s*/g, " > ")
    .replace(/[^\x20-\x21\x23-\x5B\x5D-\x7E]/g, "")
    .trim();
}

// RFC 6750 §3 + RFC 9728 §5.1: tells the client where to find the authorization server.
export function wwwAuthenticate(origin: string, error?: { code: "invalid_token" | "insufficient_scope"; description: string; scope?: string }) {
  const parts = [`resource_metadata="${origin}${PROTECTED_RESOURCE_METADATA_PATH}"`];
  if (error) {
    parts.push(`error="${error.code}"`, `error_description="${headerSafe(error.description)}"`);
    if (error.scope) parts.push(`scope="${headerSafe(error.scope)}"`);
  }
  return `Bearer ${parts.join(", ")}`;
}

// Browser origins allowed to call /api/mcp directly (DNS-rebinding and cross-site protection, MCP transport spec).
// Requests without an Origin header (servers, CLIs, desktop apps) are allowed; tokens are checked either way.
export const KNOWN_CLIENT_ORIGINS = ["https://claude.ai", "https://claude.com", "https://chatgpt.com", "https://chat.openai.com"];

export function mcpOriginAllowed(origin: string | null, ownOrigin: string) {
  return !origin || origin === ownOrigin || KNOWN_CLIENT_ORIGINS.includes(origin);
}

const LOOPBACK_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

// Browser origins allowed to register a client (/oauth/register). Native apps and servers send no Origin. In a
// browser, only our own pages, the known AI clients and local developer tools (MCP Inspector on localhost) may
// register; any other website could otherwise register clients from its visitors' browsers.
export function registrationOriginAllowed(origin: string | null, ownOrigins: readonly string[]) {
  return !origin || ownOrigins.includes(origin) || KNOWN_CLIENT_ORIGINS.includes(origin) || LOOPBACK_ORIGIN.test(origin);
}

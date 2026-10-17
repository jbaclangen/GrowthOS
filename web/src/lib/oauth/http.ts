// Response helpers for the OAuth endpoints.
//
// CORS: the metadata, registration, token and revocation endpoints don't use cookies, so any origin may call them
// (browser-based MCP clients such as MCP Inspector need this). Credentials are never allowed cross-origin.

export const PUBLIC_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version",
  "Access-Control-Max-Age": "600",
};

export function oauthJson(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", Pragma: "no-cache", ...PUBLIC_CORS, ...extra },
  });
}

export function oauthError(error: string, description: string, status = 400, extra: Record<string, string> = {}) {
  return oauthJson({ error, error_description: description }, status, extra);
}

export const preflight = () => new Response(null, { status: 204, headers: PUBLIC_CORS });

// Token and revocation requests are application/x-www-form-urlencoded (RFC 6749 §4.1.3). Accepts JSON too, which
// some clients send.
export async function readForm(request: Request, maxBytes = 8 * 1024): Promise<URLSearchParams | null> {
  const text = await request.text();
  if (text.length > maxBytes) return null;
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    try {
      const obj = JSON.parse(text) as Record<string, unknown>;
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(obj)) if (typeof v === "string") form.set(k, v);
      return form;
    } catch {
      return null;
    }
  }
  return new URLSearchParams(text);
}

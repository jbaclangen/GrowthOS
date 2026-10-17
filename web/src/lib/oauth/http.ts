// Response helpers for the OAuth endpoints. Pure, unit-tested.
//
// CORS: the metadata, token and revocation endpoints don't use cookies, so any origin may call them (browser-based
// MCP clients such as MCP Inspector need this). Credentials are never allowed cross-origin. Registration is
// narrower: see registrationCors.

export const PUBLIC_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version",
  "Access-Control-Max-Age": "600",
};

// /oauth/register answers browsers only from the origins registrationOriginAllowed accepts (lib/oauth/server-metadata.ts),
// so any other website can't register clients from its visitors' browsers.
export function registrationCors(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, MCP-Protocol-Version",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function oauthJson(body: unknown, status = 200, extra: Record<string, string> = {}, cors: Record<string, string> = PUBLIC_CORS) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", Pragma: "no-cache", ...cors, ...extra },
  });
}

export function oauthError(error: string, description: string, status = 400, extra: Record<string, string> = {}, cors: Record<string, string> = PUBLIC_CORS) {
  return oauthJson({ error, error_description: description }, status, extra, cors);
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

// Client credentials at the token and revocation endpoints (RFC 6749 §2.3.1): client_id (and client_secret) in the
// body, or HTTP Basic with both form-urlencoded. Null when the Basic header can't be decoded (no colon, or a broken
// percent-encoding such as "%zz"), so the endpoint answers 401 invalid_client instead of failing with a 500.
export function clientCredentials(form: URLSearchParams, authorization: string | null): { clientId: string | null; secret: string | null } | null {
  const basic = authorization?.match(/^Basic\s+(\S+)$/i);
  if (!basic) return { clientId: form.get("client_id"), secret: form.get("client_secret") };
  const decoded = Buffer.from(basic[1], "base64").toString("utf8");
  const i = decoded.indexOf(":");
  if (i <= 0) return null;
  try {
    return { clientId: decodeURIComponent(decoded.slice(0, i)), secret: decodeURIComponent(decoded.slice(i + 1)) };
  } catch {
    return null;
  }
}

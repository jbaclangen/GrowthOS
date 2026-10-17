import "server-only";
import { headers } from "next/headers";
import { publicOrigin } from "./server-metadata";

// The public origin inside a page or server action, where there's no Request object.
export async function originFromHeaders() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "app.braventa.io";
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? (local ? "http" : "https");
  return publicOrigin(`${proto}://${host}/`);
}

// The OAuth parameters /oauth/authorize carries from the client to the consent form and back.
export const AUTHORIZE_PARAM_KEYS = [
  "response_type",
  "client_id",
  "redirect_uri",
  "code_challenge",
  "code_challenge_method",
  "state",
  "scope",
  "resource",
] as const;

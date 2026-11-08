import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GOOGLE_AUTH_URL } from "./google-oauth";
import { HUBSPOT_AUTH_URL } from "./hubspot-oauth";

// The connect forms GET a start route that redirects to the provider's consent screen. CSP form-action also governs
// redirects after a form submits, so every provider's host must be allowed there or the browser silently stays on the
// page (production, 2026-11-08). next.config.ts is read as text: importing it would load Next's config types.
const config = readFileSync(fileURLToPath(new URL("../../../next.config.ts", import.meta.url)), "utf8");
const formAction = (config.match(/const FORM_ACTION = \[([^\]]*)\]/)?.[1] ?? "")
  .split(",")
  .map((s) => s.trim().replace(/^"|"$/g, ""))
  .filter(Boolean);

function allows(sources: string[], url: string) {
  const { protocol, host } = new URL(url);
  return sources.some((s) => {
    if (s === "'self'") return false;
    const m = s.match(/^(https?:)\/\/(\*\.)?(.+)$/);
    if (!m || m[1] !== protocol) return false;
    return m[2] ? host.endsWith(`.${m[3]}`) : host === m[3];
  });
}

describe("Content-Security-Policy form-action", () => {
  it("is built from FORM_ACTION and keeps 'self'", () => {
    expect(config).toContain("form-action ${FORM_ACTION.join(\" \")}");
    expect(formAction).toContain("'self'");
  });

  it("allows the consent screens the connect forms redirect to", () => {
    expect(allows(formAction, GOOGLE_AUTH_URL), GOOGLE_AUTH_URL).toBe(true);
    expect(allows(formAction, HUBSPOT_AUTH_URL), HUBSPOT_AUTH_URL).toBe(true);
  });

  it("allows nothing else", () => {
    expect(formAction).toEqual(["'self'", "https://accounts.google.com", "https://*.hubspot.com"]);
    expect(allows(formAction, "https://evil.example/oauth")).toBe(false);
    expect(allows(formAction, "https://hubspot.com.evil.example/")).toBe(false);
  });
});

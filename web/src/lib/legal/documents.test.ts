import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ACCEPTANCE_CONTEXTS,
  CONSENT_FIELD,
  CONSENT_REQUIRED,
  CONSENT_VALUE,
  CONTEXT_DOCUMENTS,
  LEGAL_DOCS,
  LEGAL_VERSION,
  consentGiven,
  legalUrl,
} from "./documents";

const dir = fileURLToPath(new URL("../../../../supabase/migrations/", import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith("_legal_acceptances.sql"));
const code = files.length === 1 ? readFileSync(dir + files[0], "utf8").replace(/--.*$/gm, "") : "";
const quoted = (s: string) => [...s.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);

describe("legal documents", () => {
  it("links to the published pages on braventa.io", () => {
    expect(legalUrl("terms")).toBe("https://braventa.io/legal/terms");
    expect(legalUrl("msa", "top")).toBe("https://braventa.io/legal/msa#top");
  });

  it("uses a date as the version", () => {
    expect(LEGAL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("covers every context with documents and a message", () => {
    for (const c of ACCEPTANCE_CONTEXTS) {
      expect(CONTEXT_DOCUMENTS[c].length).toBeGreaterThan(0);
      expect(CONSENT_REQUIRED[c]).toBeTruthy();
    }
    expect(CONTEXT_DOCUMENTS.signup).toEqual(["terms", "msa", "dpa", "privacy"]);
  });

  it("accepts only the exact checkbox value", () => {
    const form = (v: string | null) => ({ get: (k: string) => (k === CONSENT_FIELD ? v : null) });
    expect(consentGiven(form(CONSENT_VALUE))).toBe(true);
    expect(consentGiven(form("on"))).toBe(false);
    expect(consentGiven(form(null))).toBe(false);
  });
});

describe("the legal_acceptances migration", () => {
  it("exists exactly once", () => {
    expect(files).toHaveLength(1);
  });

  it("allows the same contexts as the code", () => {
    const check = code.match(/context text not null check \(context in \(([^)]*)\)\)/);
    expect(check).toBeTruthy();
    expect(quoted(check![1])).toEqual([...ACCEPTANCE_CONTEXTS]);
  });

  it("allows the same documents as the code", () => {
    const docs = code.match(/documents <@ array\[([^\]]*)\]/);
    expect(docs).toBeTruthy();
    expect(quoted(docs![1])).toEqual(Object.keys(LEGAL_DOCS));
  });

  it("keeps writes server-only and reads to the user's own rows", () => {
    expect(code).toMatch(/enable row level security/);
    expect(code).toMatch(/for select to authenticated using \(user_id = \(select auth\.uid\(\)\)\)/);
    expect(code).toMatch(/revoke all on public\.legal_acceptances from anon, authenticated/);
    expect(code).not.toMatch(/grant (insert|update|delete)/);
  });
});

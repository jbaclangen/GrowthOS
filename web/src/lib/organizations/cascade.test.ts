import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Removing a business deletes one organizations row and relies on every tenant table's on delete cascade foreign key
// (D-061, app/settings/remove-business-actions.ts). There is no Postgres in the tests, so these checks read the
// migrations themselves (comments stripped) and fail when a new tenant table wouldn't go with its organization. The
// live database was checked the same way on 2026-11-08 (pg_constraint: every foreign key to organizations cascades).

const dir = fileURLToPath(new URL("../../../../supabase/migrations/", import.meta.url));
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const code = (file: string) => readFileSync(dir + file, "utf8").replace(/--.*$/gm, "");
const all = files.map(code).join("\n");

const tables = new Map<string, string>();
for (const m of all.matchAll(/create table public\.(\w+) \(([\s\S]*?)\n\);/g)) tables.set(m[1], m[2]);

// Platform tables with an organization id but no tenant: the deletion log outlives the organization it names.
const NOT_TENANT = new Set(["organization_deletions"]);

const direct = (body: string) => /\borganization_id uuid[^,\n]*references public\.organizations\(id\) on delete cascade/.test(body);
const viaParent = (body: string) =>
  [...body.matchAll(/foreign key \(([^)]*)\)\s+references public\.(\w+)\([^)]*\)\s+on delete cascade/g)]
    .filter((m) => /\borganization_id\b/.test(m[1]))
    .map((m) => m[2]);

// A table goes with its organization when it references organizations with cascade, or cascades from a table that
// does (audit_findings from audit_runs, diagnosis_findings from diagnoses, …).
function cascades(table: string, seen = new Set<string>()): boolean {
  const body = tables.get(table);
  if (!body || seen.has(table)) return false;
  seen.add(table);
  return direct(body) || viaParent(body).some((parent) => cascades(parent, seen));
}

describe("removing an organization", () => {
  it("finds the tenant tables", () => {
    for (const t of ["memberships", "ai_jobs", "ai_usage", "audit_findings", "integration_connections", "hubspot_snapshots", "legal_acceptances", "team_invitations"]) {
      expect(tables.has(t), t).toBe(true);
    }
  });

  it("cascades to every table that has an organization_id", () => {
    const tenant = [...tables].filter(([name, body]) => /\n\s*organization_id uuid\b/.test(`\n${body}`) && !NOT_TENANT.has(name)).map(([name]) => name);
    expect(tenant.length).toBeGreaterThan(30);
    expect(tenant.filter((t) => !cascades(t))).toEqual([]);
  });

  it("never references organizations without on delete cascade", () => {
    const lines = all.split("\n").filter((l) => /references public\.organizations\b/.test(l));
    expect(lines.length).toBeGreaterThan(30);
    expect(lines.filter((l) => !/on delete cascade/.test(l))).toEqual([]);
  });

  it("isn't blocked by a delete trigger on a tenant table", () => {
    expect(all).not.toMatch(/before delete on public\./);
    expect(all).not.toMatch(/create (rule|policy) [^;]*on public\.organizations\s+for delete/);
  });
});

describe("the organization_deletions log", () => {
  const body = tables.get("organization_deletions") ?? "";
  const migration = files.filter((f) => f.endsWith("_remove_business.sql")).map(code).join("\n");

  it("has no foreign key and no personal columns", () => {
    expect(body).not.toBe("");
    expect(body).not.toMatch(/references/);
    const columns = [...body.matchAll(/^\s+(\w+) [a-z]/gm)].map((m) => m[1]);
    expect(columns).toEqual(["id", "organization_id", "plan", "organization_created_at", "members", "google_revoke", "hubspot_revoke", "deleted_at"]);
  });

  it("is service role only: RLS on, no policies, no client privileges", () => {
    expect(migration).toMatch(/alter table public\.organization_deletions enable row level security;/);
    expect(migration).toMatch(/revoke all on public\.organization_deletions from anon, authenticated;/);
    expect(all).not.toMatch(/create policy [^;]* on public\.organization_deletions/);
    expect(all).not.toMatch(/grant [^;]* on public\.organization_deletions/);
  });

  it("leaves organizations without a delete policy, so only the server action deletes one", () => {
    expect(all).not.toMatch(/create policy [^;]* on public\.organizations\s+for (delete|all)/);
  });
});

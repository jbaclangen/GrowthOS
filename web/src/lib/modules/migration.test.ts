import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MODULES, MODULE_IDS, moduleForArea, moduleForFinding } from "./registry";
import type { Provenance } from "@/lib/plan/priority";

// The feature_modules migration repeats what the registry defines (the module ids, the backfill rules for module_id)
// and carries the new tables' security. There is no Postgres in the tests, so these checks read the SQL itself and
// fail when the two drift apart or a safeguard is dropped.

const dir = fileURLToPath(new URL("../../../../supabase/migrations/", import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith("_feature_modules.sql"));
const sql = files.length === 1 ? readFileSync(dir + files[0], "utf8") : "";
// The SQL without comments, so a check can't pass on what a comment says.
const code = sql.replace(/--.*$/gm, "");

const quoted = (list: string) => [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);

describe("the feature_modules migration", () => {
  it("exists exactly once", () => {
    expect(files).toHaveLength(1);
  });

  it("limits module_id columns to the registry's ids, in the registry's order", () => {
    const domain = code.match(/create domain public\.module_id as text\s+check \(value in \(([^)]*)\)\)/);
    expect(domain).toBeTruthy();
    expect(quoted(domain![1])).toEqual([...MODULE_IDS]);
    for (const table of ["organization_modules", "module_runs", "diagnosis_findings", "growth_plan_items"]) {
      expect(code, table).toMatch(new RegExp(`${table}[\\s\\S]*?module_id public\\.module_id`));
    }
  });

  it("backfills plan items from their area with the registry's rule", () => {
    const update = code.match(/update public\.growth_plan_items\s+set module_id = case lower\(btrim\(split_part\(area, ',', 1\)\)\)([\s\S]*?)end/);
    expect(update).toBeTruthy();
    const pairs = [...update![1].matchAll(/when '([a-z_]+)' then '([a-z_]+)'/g)].map((m) => [m[1], m[2]]);
    expect(pairs.length).toBeGreaterThan(0);
    for (const [area, moduleId] of pairs) expect(moduleForArea(area), area).toBe(moduleId);
    const areas = pairs.map(([area]) => area);
    for (const m of MODULES) for (const area of m.planAreas) expect(areas, area).toContain(area);
    expect(areas).not.toContain("operations");
  });

  it("backfills findings from their provenance with the registry's rule", () => {
    const update = code.match(/update public\.diagnosis_findings\s+set module_id = case provenance([\s\S]*?)end/);
    expect(update).toBeTruthy();
    const pairs = [...update![1].matchAll(/when '([a-z_]+)' then '([a-z_]+)'/g)].map((m) => [m[1], m[2]]);
    const provenances: Provenance[] = ["verified", "customer_provided", "inferred"];
    for (const p of provenances) {
      const expected = moduleForFinding({ provenance: p });
      const found = pairs.find(([from]) => from === p)?.[1] ?? null;
      expect(found, p).toBe(expected);
    }
  });

  it("keeps the new tables tenant-scoped and read-only for clients", () => {
    for (const table of ["organization_modules", "module_runs"]) {
      expect(code).toContain(`alter table public.${table} enable row level security`);
      expect(code).toMatch(new RegExp(`create policy "members read" on public\\.${table} for select to authenticated using \\(public\\.is_member\\(organization_id\\)\\)`));
    }
    expect(code).toMatch(/revoke insert, update, delete on public\.organization_modules, public\.module_runs from authenticated, anon/);
    // A run can't pair one organization with another organization's job or audit.
    expect(code).toMatch(/foreign key \(job_id, organization_id\) references public\.ai_jobs\(id, organization_id\) on delete cascade/);
    expect(code).toMatch(/foreign key \(audit_run_id, organization_id\) references public\.audit_runs\(id, organization_id\) on delete set null \(audit_run_id\)/);
  });
});

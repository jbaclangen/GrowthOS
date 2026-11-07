import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Deleting an auth.users row must not fail (Q-056): the privacy policy and DPA promise erasure on request. Every
// foreign key to auth.users therefore needs an on delete action. There is no Postgres in the tests, so these checks
// read the migrations themselves (comments stripped) and fail when a new reference forgets the action.

const dir = fileURLToPath(new URL("../../../../supabase/migrations/", import.meta.url));
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const code = (file: string) => readFileSync(dir + file, "utf8").replace(/--.*$/gm, "");

const references = files.flatMap((file) =>
  code(file)
    .split("\n")
    .filter((line) => /references auth\.users\b/.test(line))
    .map((line) => ({ file, line: line.trim() })),
);

const fixFiles = files.filter((f) => f.endsWith("_user_deletion_foreign_keys.sql"));
const fix = fixFiles.length === 1 ? code(fixFiles[0]) : "";

describe("foreign keys to auth.users", () => {
  it("all declare an on delete action, except the two the user_deletion_foreign_keys migration replaces", () => {
    const missing = references.filter((r) => !/\bon delete (cascade|set null)\b/.test(r.line));
    expect(missing).toEqual([
      { file: "20261010061028_foundation.sql", line: "approved_by uuid references auth.users(id)," },
      { file: "20261010061028_foundation.sql", line: "created_by uuid references auth.users(id)," },
    ]);
  });

  it("are replaced with on delete set null for content_items.approved_by and ai_jobs.created_by", () => {
    expect(fixFiles).toHaveLength(1);
    expect(fix).toMatch(
      /alter table public\.content_items\s+drop constraint content_items_approved_by_fkey,\s+add constraint content_items_approved_by_fkey\s+foreign key \(approved_by\) references auth\.users\(id\) on delete set null;/,
    );
    expect(fix).toMatch(
      /alter table public\.ai_jobs\s+drop constraint ai_jobs_created_by_fkey,\s+add constraint ai_jobs_created_by_fkey\s+foreign key \(created_by\) references auth\.users\(id\) on delete set null;/,
    );
  });

  it("are indexed for the replaced columns, so deleting a user doesn't scan the tables", () => {
    expect(fix).toMatch(/create index content_items_approved_by_idx on public\.content_items\(approved_by\);/);
    expect(fix).toMatch(/create index ai_jobs_created_by_idx on public\.ai_jobs\(created_by\);/);
  });
});

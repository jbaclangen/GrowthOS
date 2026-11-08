import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS, can, permissionMatrixSql } from "./roles";

// The migrations repeat what roles.ts defines: the member_role enum (roles_and_permissions) and the matrix inside
// has_permission() (created there, replaced whole by later migrations when a permission is added, such as
// remove_business for organization.delete). There is no Postgres in the tests, so these checks read the SQL itself
// (comments stripped) and fail when the two drift apart or a safeguard is dropped.

const dir = fileURLToPath(new URL("../../../../supabase/migrations/", import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith("_roles_and_permissions.sql"));
const sql = files.length === 1 ? readFileSync(dir + files[0], "utf8") : "";
const code = sql.replace(/--.*$/gm, "");

const quoted = (list: string) => [...list.matchAll(/'([a-z_.]+)'/g)].map((m) => m[1]);

const HAS_PERMISSION = /create or replace function public\.has_permission\(org uuid, perm text\)([\s\S]*?)\$\$;/;
// Every migration that defines has_permission(), oldest first; the database runs the newest.
const permissionFiles = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .filter((f) => HAS_PERMISSION.test(readFileSync(dir + f, "utf8").replace(/--.*$/gm, "")));
const latestPermissionFile = permissionFiles[permissionFiles.length - 1] ?? "";
const latestPermission = latestPermissionFile ? readFileSync(dir + latestPermissionFile, "utf8").replace(/--.*$/gm, "") : "";

describe("the roles_and_permissions migration", () => {
  it("exists exactly once and creates has_permission()", () => {
    expect(files).toHaveLength(1);
    expect(permissionFiles[0]).toBe(files[0]);
  });

  it("replaces member_role with the eight roles, in order, and maps member to analyst", () => {
    const enumValues = code.match(/create type public\.member_role as enum \(([^)]*)\)/);
    expect(enumValues).toBeTruthy();
    expect(quoted(enumValues![1])).toEqual([...ROLES]);
    expect(code).toMatch(/alter type public\.member_role rename to member_role_v1/);
    expect(code).toMatch(/using \(case role::text when 'member' then 'analyst' else role::text end\)::public\.member_role/);
    expect(code).toMatch(/alter column role set default 'analyst'/);
    // The old type's drop isn't a statement here: the Supabase MCP tool refused it and the founder ran it from the SQL
    // editor, so it may appear only in the header comment, never as executable SQL.
    expect(code).not.toMatch(/drop type public\.member_role_v1/);
    expect(sql).toMatch(/drop type public\.member_role_v1;/);
  });

  it("adds the author column to content_items", () => {
    expect(code).toMatch(/alter table public\.content_items add column created_by uuid references auth\.users\(id\) on delete set null/);
  });
});

describe("the newest has_permission()", () => {
  it("is the remove_business migration's, which added organization.delete", () => {
    expect(latestPermissionFile).toMatch(/_remove_business\.sql$/);
  });

  it("encodes the same matrix as can() does", () => {
    const fn = latestPermission.match(HAS_PERMISSION);
    expect(fn).toBeTruthy();
    const body = fn![1];
    expect(body).toMatch(/returns boolean language sql stable security definer set search_path = ''/);
    expect(body).toMatch(/m\.organization_id = org and m\.user_id = \(select auth\.uid\(\)\)/);
    // No platform-staff bypass: the function reads memberships only.
    expect(body).not.toMatch(/platform_admins/);
    expect(body).toMatch(/else array\[\]::text\[\]/);

    const branches = [...body.matchAll(/when '([a-z_.]+)' then array\[([^\]]*)\]/g)].map((m) => [m[1], quoted(m[2])] as const);
    expect(branches.map(([perm]) => perm)).toEqual([...PERMISSIONS]);
    for (const [perm, roles] of branches) {
      const permission = perm as (typeof PERMISSIONS)[number];
      expect(roles, perm).toEqual([...ROLE_PERMISSIONS[permission]]);
      for (const role of ROLES) expect(roles.includes(role), `${role} ${perm}`).toBe(can(role, permission));
    }
    // And verbatim, as roles.ts renders it.
    const rendered = permissionMatrixSql().split("\n");
    for (const line of rendered) expect(body).toContain(line);
  });

  it("is limited to signed-in users, like is_member(), in every migration that defines it", () => {
    for (const f of permissionFiles) {
      const s = readFileSync(dir + f, "utf8").replace(/--.*$/gm, "");
      expect(s, f).toMatch(/revoke all on function public\.has_permission\(uuid, text\) from public, anon/);
      expect(s, f).toMatch(/grant execute on function public\.has_permission\(uuid, text\) to authenticated/);
      expect(s, f).not.toMatch(/grant execute on function public\.has_permission\(uuid, text\) to (anon|public)/);
    }
  });
});

// guard_content_item_write is replaced by later migrations (create or replace), so the rules are checked against the
// newest definition: the one the database runs.
const guardFiles = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .filter((f) => /create or replace function public\.guard_content_item_write\(\)/.test(readFileSync(dir + f, "utf8")));
const latestGuard = guardFiles.length ? readFileSync(dir + guardFiles[guardFiles.length - 1], "utf8").replace(/--.*$/gm, "") : "";

describe("the newest content approval guard", () => {
  it("records the author of client-written drafts, pins the business and applies the approval rule", () => {
    expect(guardFiles.length).toBeGreaterThan(0);
    const guard = latestGuard.match(/create or replace function public\.guard_content_item_write\(\)([\s\S]*?)\$\$;/);
    expect(guard).toBeTruthy();
    const body = guard![1];
    expect(body).toMatch(/if current_user <> 'authenticated' then\s+return new;/);
    expect(body).toMatch(/new\.created_by := \(select auth\.uid\(\)\);/);
    expect(body).toMatch(/new\.created_by := old\.created_by;/);
    // A client can't move content to a business where it holds content.approve, approve it there and move it back.
    expect(body).toMatch(/if new\.organization_id is distinct from old\.organization_id then\s+raise exception/);
    expect(body).toMatch(/public\.has_permission\(old\.organization_id, 'content\.approve'\)/);
    expect(body).toMatch(/new\.status = 'approved' and old\.created_by is not null and old\.created_by = \(select auth\.uid\(\)\)\s+and not public\.has_permission\(old\.organization_id, 'content\.approve_own'\)/);
    // The approver is still set by the database (D-018).
    expect(body).toMatch(/new\.approved_by := \(select auth\.uid\(\)\);\s+new\.approved_at := now\(\);/);
  });
});

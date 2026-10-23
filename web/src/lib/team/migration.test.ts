import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS, can, permissionMatrixSql } from "./roles";

// The roles_and_permissions migration repeats what roles.ts defines: the member_role enum and the matrix inside
// has_permission(). There is no Postgres in the tests, so these checks read the SQL itself (comments stripped) and
// fail when the two drift apart or a safeguard is dropped.

const dir = fileURLToPath(new URL("../../../../supabase/migrations/", import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith("_roles_and_permissions.sql"));
const sql = files.length === 1 ? readFileSync(dir + files[0], "utf8") : "";
const code = sql.replace(/--.*$/gm, "");

const quoted = (list: string) => [...list.matchAll(/'([a-z_.]+)'/g)].map((m) => m[1]);

describe("the roles_and_permissions migration", () => {
  it("exists exactly once", () => {
    expect(files).toHaveLength(1);
  });

  it("replaces member_role with the eight roles, in order, and maps member to analyst", () => {
    const enumValues = code.match(/create type public\.member_role as enum \(([^)]*)\)/);
    expect(enumValues).toBeTruthy();
    expect(quoted(enumValues![1])).toEqual([...ROLES]);
    expect(code).toMatch(/alter type public\.member_role rename to member_role_v1/);
    expect(code).toMatch(/using \(case role::text when 'member' then 'analyst' else role::text end\)::public\.member_role/);
    expect(code).toMatch(/alter column role set default 'analyst'/);
    // The old type's drop is a separate statement (the Supabase MCP tool refuses it inside the block); the file
    // records it as pending rather than claiming it ran.
    expect(code).not.toMatch(/drop type public\.member_role_v1/);
    expect(sql).toMatch(/drop type public\.member_role_v1;/);
  });

  it("encodes the same matrix in has_permission() as can() does", () => {
    const fn = code.match(/create or replace function public\.has_permission\(org uuid, perm text\)([\s\S]*?)\$\$;/);
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

  it("limits has_permission() to signed-in users, like is_member()", () => {
    expect(code).toMatch(/revoke all on function public\.has_permission\(uuid, text\) from public, anon/);
    expect(code).toMatch(/grant execute on function public\.has_permission\(uuid, text\) to authenticated/);
    expect(code).not.toMatch(/grant execute on function public\.has_permission\(uuid, text\) to (anon|public)/);
  });

  it("records the author of client-written drafts and applies the approval rule in the guard", () => {
    expect(code).toMatch(/alter table public\.content_items add column created_by uuid references auth\.users\(id\) on delete set null/);
    const guard = code.match(/create or replace function public\.guard_content_item_write\(\)([\s\S]*?)\$\$;/);
    expect(guard).toBeTruthy();
    const body = guard![1];
    expect(body).toMatch(/if current_user <> 'authenticated' then\s+return new;/);
    expect(body).toMatch(/new\.created_by := \(select auth\.uid\(\)\);/);
    expect(body).toMatch(/new\.created_by := old\.created_by;/);
    expect(body).toMatch(/public\.has_permission\(old\.organization_id, 'content\.approve'\)/);
    expect(body).toMatch(/new\.status = 'approved' and old\.created_by is not null and old\.created_by = \(select auth\.uid\(\)\)\s+and not public\.has_permission\(old\.organization_id, 'content\.approve_own'\)/);
    // The approver is still set by the database (D-018).
    expect(body).toMatch(/new\.approved_by := \(select auth\.uid\(\)\);\s+new\.approved_at := now\(\);/);
  });
});

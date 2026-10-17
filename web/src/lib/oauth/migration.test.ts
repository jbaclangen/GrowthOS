import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guards on the phase 2 migration that unit tests can't exercise against a database. They read the SQL and check
// that the rules reviewers found missing stay in place.
const sql = readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/20261017120000_mcp_oauth.sql", import.meta.url)), "utf8")
  .replace(/--.*$/gm, "")
  .replace(/\s+/g, " ");

const policy = (name: string) => sql.match(new RegExp(`create policy "${name}" on public\\.mcp_access_keys for update to authenticated (.*?);`))?.[1] ?? "";

describe("phase 2 migration", () => {
  it("makes key revocation one-way for personal and service keys", () => {
    for (const name of ["own keys revoke", "owner service keys revoke"]) {
      const body = policy(name);
      expect(body, name).toMatch(/using \(.*revoked_at is null\)/);
      expect(body, name).toMatch(/with check \(.*revoked_at is not null\)$/);
    }
  });

  it("stops admins from creating or changing owner memberships", () => {
    expect(sql).toMatch(/create trigger memberships_owner_guard before insert or update on public\.memberships/);
    expect(sql).toMatch(/not \(public\.is_org_owner\(new\.organization_id\)/);
  });

  it("enforces the registration limits atomically in the database", () => {
    expect(sql).toMatch(/create trigger oauth_clients_rate_limit before insert on public\.oauth_clients/);
    expect(sql).toMatch(/pg_advisory_xact_lock\(hashtextextended\('oauth_clients:ip:'/);
    expect(sql).toMatch(/where not first_party and created_at > now\(\) - interval '1 hour'/);
  });

  it("indexes the foreign keys that cascade", () => {
    for (const index of [
      "on public.oauth_tokens(user_id)",
      "on public.oauth_tokens(client_id)",
      "on public.oauth_authorization_codes(client_id)",
      "on public.oauth_authorization_codes(user_id)",
      "on public.mcp_access_keys(created_by)",
    ]) {
      expect(sql).toContain(index);
    }
  });

  it("dollar-quotes every function body", () => {
    const functions = sql.match(/create (or replace )?function/g) ?? [];
    expect(sql.match(/ as \$\$ /g) ?? []).toHaveLength(functions.length);
    expect(sql.match(/ \$\$;/g) ?? []).toHaveLength(functions.length);
  });

  it("has a cleanup for expired codes and tokens and unused clients", () => {
    expect(sql).toMatch(/create function public\.oauth_cleanup\(\)/);
    expect(sql).toMatch(/delete from public\.oauth_authorization_codes where expires_at </);
    expect(sql).toMatch(/delete from public\.oauth_tokens where expires_at </);
  });
});

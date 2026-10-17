import { describe, expect, it } from "vitest";
import { fakeSupabase } from "../../test/fake-supabase";
import { currentMembership, memberOrganizations } from "./memberships";
import { MAX_ACTIVE_SERVICE_KEYS, countActiveServiceKeys, isActiveServiceKey, listServiceKeys } from "./mcp/service-keys";

// The rows are what RLS lets the user read: every membership in their organizations, co-members' included.
const orgA = { id: "org-a", name: "Acme Plumbing", plan: "trial", trial_ends_at: "2026-10-30T00:00:00Z" };
const orgB = { id: "org-b", name: "Bright Dental", plan: "basic", trial_ends_at: "2026-10-01T00:00:00Z" };
const memberships = [
  { user_id: "owner-1", organization_id: "org-a", role: "owner", created_at: "2026-10-01T00:00:00Z", organizations: orgA },
  { user_id: "member-2", organization_id: "org-a", role: "member", created_at: "2026-10-02T00:00:00Z", organizations: orgA },
  { user_id: "owner-1", organization_id: "org-b", role: "owner", created_at: "2026-10-03T00:00:00Z", organizations: orgB },
];

describe("memberships", () => {
  it("give a second member their own role, not the first member's", async () => {
    const { db } = fakeSupabase({ memberships });
    expect(await currentMembership(db, "member-2")).toEqual({ id: "org-a", name: "Acme Plumbing", role: "member" });
    expect(await currentMembership(db, "owner-1")).toEqual({ id: "org-a", name: "Acme Plumbing", role: "owner" });
    expect(await currentMembership(db, "someone-else")).toBeNull();
  });

  it("list each business once, and only the user's own", async () => {
    const { db } = fakeSupabase({ memberships });
    expect((await memberOrganizations(db, "member-2")).map((o) => o.id)).toEqual(["org-a"]);
    expect(await memberOrganizations(db, "owner-1")).toEqual([
      { ...orgA, role: "owner" },
      { ...orgB, role: "owner" },
    ]);
  });
});

describe("service keys in Settings", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const key = (id: string, organization_id: string, over: Record<string, unknown> = {}) => ({
    id,
    organization_id,
    kind: "service",
    name: id,
    key_prefix: "brv_sk_abcde",
    created_at: "2026-10-10T00:00:00Z",
    last_used_at: null,
    revoked_at: null,
    expires_at: null,
    ...over,
  });

  it("count only keys that are neither revoked nor expired", async () => {
    expect(isActiveServiceKey({ revoked_at: null, expires_at: null }, now)).toBe(true);
    expect(isActiveServiceKey({ revoked_at: null, expires_at: "2026-10-17T11:59:59Z" }, now)).toBe(false);
    expect(isActiveServiceKey({ revoked_at: "2026-10-01T00:00:00Z", expires_at: null }, now)).toBe(false);

    // Ten expired 30-day keys no longer block a new one.
    const expired = Array.from({ length: MAX_ACTIVE_SERVICE_KEYS }, (_, i) => key(`old${i}`, "org-a", { expires_at: "2026-10-01T00:00:00Z" }));
    const { db } = fakeSupabase({ mcp_access_keys: [...expired, key("live1", "org-a"), key("revoked1", "org-a", { revoked_at: "2026-10-02T00:00:00Z" })] });
    expect(await countActiveServiceKeys(db, "org-a", now)).toBe(1);
  });

  it("list and count only the business being managed", async () => {
    // RLS returns service keys for every business the user owns.
    const { db } = fakeSupabase({ mcp_access_keys: [key("a1", "org-a"), key("b1", "org-b"), key("b2", "org-b"), key("p1", "org-a", { kind: "personal" })] });
    expect((await listServiceKeys(db, "org-a")).map((k) => k.id)).toEqual(["a1"]);
    expect(await countActiveServiceKeys(db, "org-a", now)).toBe(1);
    expect(await countActiveServiceKeys(db, "org-b", now)).toBe(2);
  });
});

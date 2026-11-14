import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase } from "../../../test/fake-supabase";

// Settings → Team acts on the business the section showed (D-062), never on the one the business cookie names when the
// form is submitted: the user may have switched business in another tab since. getCurrentOrg falls back to the cookie
// when it gets no id, so a missing or malformed id must be refused before it's called.

const h = vi.hoisted(() => {
  const USER = "11111111-1111-4111-8111-111111111111";
  const PAT = "22222222-2222-4222-8222-222222222222";
  const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // the business the page showed
  const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // the cookie's business, after a switch in another tab
  const ORGS: Record<string, { id: string; name: string; role: string }> = {
    [A]: { id: A, name: "Acme Plumbing", role: "owner" },
    [B]: { id: B, name: "Bright Dental", role: "owner" },
  };
  const EMAILS: Record<string, string> = { [USER]: "owner@example.com", [PAT]: "pat@example.com" };
  return { USER, PAT, A, B, ORGS, EMAILS, fake: null as unknown as FakeSupabase, getCurrentOrg: vi.fn() };
});
const { USER, PAT, A, B } = h;

vi.mock("@/lib/auth", () => ({ requireUser: async () => ({ id: h.USER }), getCurrentOrg: h.getCurrentOrg }));
vi.mock("next/cache", () => ({ refresh: () => {} }));
vi.mock("@/lib/oauth/request-origin", () => ({ originFromHeaders: async () => "https://app.example.com" }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => ({
    ...h.fake.db,
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: { email: h.EMAILS[id] } } }) } },
  }),
}));

const { changeMemberRole, inviteMember, removeMember, revokeInvitation } = await import("./team-actions");

const NOT_FOUND = "This business wasn't found. Reload the page and try again.";
const JOINED = "2026-11-01T00:00:00.000Z";
const INVITE = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  h.fake = fakeSupabase({
    organizations: [
      { id: A, plan: "pro", trial_ends_at: JOINED },
      { id: B, plan: "pro", trial_ends_at: JOINED },
    ],
    memberships: [A, B].flatMap((org) => [
      { organization_id: org, user_id: USER, role: "owner", created_at: JOINED },
      { organization_id: org, user_id: PAT, role: "marketing_manager", created_at: JOINED },
    ]),
    team_invitations: [
      { id: INVITE, organization_id: A, email: "sam@example.com", role: "analyst", created_at: JOINED, expires_at: "2099-01-01T00:00:00.000Z", accepted_at: null, revoked_at: null },
    ],
    mcp_access_keys: [A, B].map((org) => ({ id: `key-${org}`, organization_id: org, user_id: PAT, kind: "personal", revoked_at: null })),
    oauth_grants: [],
  });
  // Without an id, getCurrentOrg answers with the cookie's business (lib/auth.ts); with one, that business or null.
  h.getCurrentOrg.mockReset().mockImplementation(async (_userId: string, id?: unknown) => (id === undefined || id === null || id === "" ? h.ORGS[B] : (h.ORGS[id as string] ?? null)));
});

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};
const membership = (org: string, user: string) => h.fake.tables.memberships.find((m) => m.organization_id === org && m.user_id === user);

describe("team actions name their business", () => {
  it("creates the invite in the business the form named, and says which", async () => {
    const result = await inviteMember(undefined, form({ organizationId: A, email: "new@example.com", role: "analyst" }));
    expect(result?.error).toBeUndefined();
    expect(result?.business).toBe("Acme Plumbing");
    expect(h.getCurrentOrg).toHaveBeenCalledWith(USER, A);
    const created = h.fake.tables.team_invitations.filter((i) => i.email === "new@example.com");
    expect(created.map((i) => i.organization_id)).toEqual([A]);
  });

  it.each([
    ["missing", {}],
    ["empty", { organizationId: "" }],
    ["malformed", { organizationId: "not-an-id" }],
  ])("refuses an invite with a %s business id instead of using the cookie's", async (_, fields: Record<string, string>) => {
    const result = await inviteMember(undefined, form({ ...fields, email: "new@example.com", role: "analyst" }));
    expect(result?.error).toBe(NOT_FOUND);
    expect(h.getCurrentOrg).not.toHaveBeenCalled();
    expect(h.fake.tables.team_invitations.some((i) => i.email === "new@example.com")).toBe(false);
  });

  it("refuses a business the user isn't a member of", async () => {
    const other = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const result = await inviteMember(undefined, form({ organizationId: other, email: "new@example.com", role: "analyst" }));
    expect(result?.error).toBe(NOT_FOUND);
    expect(h.fake.tables.team_invitations.some((i) => i.email === "new@example.com")).toBe(false);
  });

  it("removes the person, their keys and grants from the named business only", async () => {
    await removeMember(A, PAT);
    expect(membership(A, PAT)).toBeUndefined();
    expect(membership(B, PAT)).toBeDefined();
    const keys = Object.fromEntries(h.fake.tables.mcp_access_keys.map((k) => [k.organization_id, k.revoked_at]));
    expect(keys[A]).not.toBeNull();
    expect(keys[B]).toBeNull();
  });

  it("refuses a removal without a business id", async () => {
    await expect(removeMember("", PAT)).rejects.toThrow(NOT_FOUND);
    expect(membership(A, PAT)).toBeDefined();
    expect(membership(B, PAT)).toBeDefined();
  });

  it("changes the role in the named business only", async () => {
    expect(await changeMemberRole(A, PAT, undefined, form({ role: "analyst" }))).toBeUndefined();
    expect(membership(A, PAT)?.role).toBe("analyst");
    expect(membership(B, PAT)?.role).toBe("marketing_manager");
    expect(await changeMemberRole("", PAT, undefined, form({ role: "analyst" }))).toEqual({ error: NOT_FOUND });
    expect(membership(B, PAT)?.role).toBe("marketing_manager");
  });

  it("withdraws an invite only in the named business", async () => {
    await expect(revokeInvitation("", INVITE)).rejects.toThrow(NOT_FOUND);
    // The invite belongs to A, so naming B (the cookie's business) finds nothing to withdraw.
    await revokeInvitation(B, INVITE);
    expect(h.fake.tables.team_invitations[0].revoked_at).toBeNull();
    await revokeInvitation(A, INVITE);
    expect(h.fake.tables.team_invitations[0].revoked_at).not.toBeNull();
  });
});

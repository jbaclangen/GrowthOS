import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase } from "../../../test/fake-supabase";

// Personal access keys (actions.ts) and service keys (integrations-actions.ts) are issued for the business the
// Settings page showed (D-062), never for the one the business cookie names when the form is submitted: the user may
// have switched business in another tab since. A missing, empty or malformed id is refused rather than falling back
// to the cookie, and a refused id never creates a business. Only a page without a business posts no id; then a
// personal key sets one up from the business name, as before.

const h = vi.hoisted(() => {
  const USER = "11111111-1111-4111-8111-111111111111";
  const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // the business the page showed
  const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // the cookie's business, after a switch in another tab
  const NEW = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const ORGS: Record<string, { id: string; name: string; role: string }> = {
    [A]: { id: A, name: "Acme Plumbing", role: "owner" },
    [B]: { id: B, name: "Bright Dental", role: "owner" },
  };
  return { USER, A, B, NEW, ORGS, fake: null as unknown as FakeSupabase, cookieOrg: null as string | null, getCurrentOrg: vi.fn(), remembered: [] as string[] };
});
const { USER, A, NEW } = h;

vi.mock("@/lib/auth", () => ({ requireUser: async () => ({ id: h.USER }), getCurrentOrg: h.getCurrentOrg }));
vi.mock("next/cache", () => ({ refresh: () => {} }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => h.fake.db,
  createSupabaseAdminClient: () => h.fake.db,
}));
vi.mock("@/lib/legal/acceptances", () => ({ recordAcceptance: async () => {} }));
vi.mock("@/lib/organizations/current", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/organizations/current")>()),
  rememberBusiness: async (id: string) => void h.remembered.push(id),
}));

const { createAccessKey } = await import("./actions");
const { createServiceKey } = await import("./integrations-actions");

const NOT_FOUND = "This business wasn't found. Reload the page and try again.";
const OTHER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // a business the user isn't a member of

beforeEach(() => {
  h.fake = fakeSupabase({ mcp_access_keys: [] }, {}, { rpc: { create_organization: () => h.NEW } });
  h.cookieOrg = h.B;
  h.remembered = [];
  // Without an id, getCurrentOrg answers with the cookie's business (lib/auth.ts); with one, that business or null.
  h.getCurrentOrg
    .mockReset()
    .mockImplementation(async (_userId: string, id?: unknown) => (id === undefined || id === null || id === "" ? (h.cookieOrg ? h.ORGS[h.cookieOrg] : null) : (h.ORGS[id as string] ?? null)));
});

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ agree: "yes", ...fields })) fd.set(k, v);
  return fd;
};
const keyOrgs = () => h.fake.tables.mcp_access_keys.map((k) => k.organization_id);

describe("createAccessKey", () => {
  it("issues the key for the business the page showed", async () => {
    const result = await createAccessKey(undefined, form({ organizationId: A, name: "Claude Desktop" }));
    expect(result?.error).toBeUndefined();
    expect(result?.key).toBeTruthy();
    expect(h.getCurrentOrg).toHaveBeenCalledWith(USER, A);
    expect(keyOrgs()).toEqual([A]);
  });

  it.each([
    ["empty", ""],
    ["malformed", "not-an-id"],
    ["unknown", OTHER],
  ])("refuses an %s business id without using the cookie or creating a business", async (_, organizationId) => {
    const result = await createAccessKey(undefined, form({ organizationId, name: "Claude Desktop", businessName: "Acme" }));
    expect(result).toEqual({ error: NOT_FOUND });
    expect(h.getCurrentOrg).not.toHaveBeenCalledWith(USER);
    expect(h.fake.rpcCalls).toEqual([]);
    expect(keyOrgs()).toEqual([]);
  });

  it("sets up a business from its name when the page had none", async () => {
    h.cookieOrg = null;
    const result = await createAccessKey(undefined, form({ name: "Claude Desktop", businessName: "Acme Plumbing" }));
    expect(result?.key).toBeTruthy();
    expect(h.fake.rpcCalls).toEqual([{ name: "create_organization", args: { org_name: "Acme Plumbing" } }]);
    expect(h.remembered).toEqual([NEW]);
    expect(keyOrgs()).toEqual([NEW]);
  });

  it("sets up the named business even after joining another one in another tab", async () => {
    // The page asked for a business name (no business yet); an invite accepted meanwhile made B the cookie's business.
    const result = await createAccessKey(undefined, form({ name: "Claude Desktop", businessName: "Acme Plumbing" }));
    expect(result?.key).toBeTruthy();
    expect(h.getCurrentOrg).not.toHaveBeenCalled();
    expect(keyOrgs()).toEqual([NEW]);
  });

  it("keeps the old path for a form that posts neither an id nor a name", async () => {
    const result = await createAccessKey(undefined, form({ name: "Claude Desktop" }));
    expect(result?.key).toBeTruthy();
    expect(h.fake.rpcCalls).toEqual([]);
    expect(keyOrgs()).toEqual([h.B]);
  });
});

describe("createServiceKey", () => {
  it("issues the key for the business the page showed", async () => {
    const result = await createServiceKey(undefined, form({ organizationId: A, name: "n8n onboarding workflow", expiry: "90" }));
    expect(result?.error).toBeUndefined();
    expect(h.getCurrentOrg).toHaveBeenCalledWith(USER, A);
    expect(keyOrgs()).toEqual([A]);
  });

  it.each([
    ["missing", {}],
    ["empty", { organizationId: "" }],
    ["malformed", { organizationId: "not-an-id" }],
    ["unknown", { organizationId: OTHER }],
  ])("refuses a %s business id instead of using the cookie's", async (_, fields: Record<string, string>) => {
    const result = await createServiceKey(undefined, form({ ...fields, name: "n8n onboarding workflow", expiry: "90" }));
    expect(result).toEqual({ error: NOT_FOUND });
    expect(h.getCurrentOrg).not.toHaveBeenCalledWith(USER);
    expect(keyOrgs()).toEqual([]);
  });
});

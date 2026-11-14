import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase } from "../../../test/fake-supabase";

// An upgrade request is filed for the business whose plan /plans showed (D-062), never for the one the business cookie
// names when the form is submitted: the user may have switched business in another tab since.

const h = vi.hoisted(() => {
  const USER = "11111111-1111-4111-8111-111111111111";
  const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // the business the page showed
  const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // the cookie's business, after a switch in another tab
  const ORGS: Record<string, { id: string; name: string; role: string }> = {
    [A]: { id: A, name: "Acme Plumbing", role: "owner" },
    [B]: { id: B, name: "Bright Dental", role: "owner" },
  };
  return { USER, A, B, ORGS, fake: null as unknown as FakeSupabase, getCurrentOrg: vi.fn() };
});
const { USER, A } = h;

vi.mock("@/lib/auth", () => ({ requireUser: async () => ({ id: h.USER }), getCurrentOrg: h.getCurrentOrg }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => h.fake.db }));

const { requestUpgrade } = await import("./actions");

beforeEach(() => {
  h.fake = fakeSupabase({ upgrade_requests: [] });
  h.getCurrentOrg.mockReset().mockImplementation(async (_userId: string, id?: unknown) => (id === undefined || id === null || id === "" ? h.ORGS[h.B] : (h.ORGS[id as string] ?? null)));
});

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};
const requested = () => h.fake.tables.upgrade_requests.map((r) => r.organization_id);

describe("requestUpgrade", () => {
  it("files the request for the business the page showed", async () => {
    expect(await requestUpgrade("pro", undefined, form({ organizationId: A }))).toEqual({ sent: true });
    expect(h.getCurrentOrg).toHaveBeenCalledWith(USER, A);
    expect(requested()).toEqual([A]);
  });

  it.each([
    ["missing", {}],
    ["empty", { organizationId: "" }],
    ["unknown", { organizationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }],
  ])("refuses a %s business id instead of using the cookie's", async (_, fields: Record<string, string>) => {
    expect(await requestUpgrade("pro", undefined, form(fields))).toEqual({ error: "This business wasn't found. Reload the page and try again." });
    expect(h.getCurrentOrg).not.toHaveBeenCalledWith(USER);
    expect(requested()).toEqual([]);
  });
});

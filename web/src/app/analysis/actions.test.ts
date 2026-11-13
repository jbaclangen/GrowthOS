import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase } from "../../../test/fake-supabase";

// startAnalysis sends the website to the business the onboarding form showed (D-062): its "current" choice posts that
// business's id, never relying on the business cookie at submit time, since the user may have switched business in
// another tab. An id that isn't one of the user's businesses is an error, never a new business. "new" adds a business,
// and the form shown to a user with no business posts it too; only a form rendered before that posts nothing and
// keeps the old path: the business the user works on, else a new one.

const h = vi.hoisted(() => {
  const USER = "11111111-1111-4111-8111-111111111111";
  const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // the business the page showed
  const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // the cookie's business, after a switch in another tab
  const NEW = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const ORGS: Record<string, { id: string; name: string; role: string }> = {
    [A]: { id: A, name: "Acme Plumbing", role: "owner" },
    [B]: { id: B, name: "Bright Dental", role: "owner" },
  };
  return {
    USER,
    A,
    B,
    NEW,
    ORGS,
    fake: null as unknown as FakeSupabase,
    cookieOrg: null as string | null,
    getCurrentOrg: vi.fn(),
    createOnboarding: vi.fn(),
    remembered: [] as string[],
  };
});
const { USER, A, B, NEW } = h;

class Redirect extends Error {}

vi.mock("@/lib/auth", () => ({ requireUser: async () => ({ id: h.USER }), getCurrentOrg: h.getCurrentOrg }));
vi.mock("next/cache", () => ({ refresh: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => h.fake.db }));
vi.mock("@/lib/pipeline/jobs", () => ({ failStaleJobs: async () => {} }));
vi.mock("@/lib/onboarding/start", () => ({
  createOnboarding: h.createOnboarding,
  analysesInLastDay: async () => 0,
  queueJob: async () => {},
  MAX_ANALYSES_PER_DAY: 10,
  RATE_LIMIT_MESSAGE: "",
}));
vi.mock("@/lib/legal/acceptances", () => ({ recordAcceptance: async () => {} }));
vi.mock("@/lib/organizations/current", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/organizations/current")>()),
  rememberBusiness: async (id: string) => void h.remembered.push(id),
}));

const { startAnalysis } = await import("./actions");

const NOT_FOUND = "This business wasn't found. Reload the page and try again.";

beforeEach(() => {
  h.fake = fakeSupabase({}, {}, { rpc: { create_organization: () => h.NEW } });
  h.cookieOrg = B;
  h.remembered = [];
  h.createOnboarding.mockReset().mockResolvedValue({ sessionId: "session-1", businessProfileId: "profile-1" });
  // Without an id, getCurrentOrg answers with the cookie's business (lib/auth.ts); with one, that business or null.
  h.getCurrentOrg
    .mockReset()
    .mockImplementation(async (_userId: string, id?: unknown) => (id === undefined || id === null || id === "" ? (h.cookieOrg ? h.ORGS[h.cookieOrg] : null) : (h.ORGS[id as string] ?? null)));
});

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ website: "acme-plumbing.example", agree: "yes", ...fields })) fd.set(k, v);
  return fd;
};

// Runs startAnalysis and returns the business the analysis was created for, or the error it returned.
async function start(fields: Record<string, string>): Promise<{ org?: string; error?: string }> {
  try {
    const result = await startAnalysis(undefined, form(fields));
    return { error: result?.error };
  } catch (e) {
    if (!(e instanceof Redirect)) throw e;
    return { org: h.createOnboarding.mock.calls[0][1].organizationId };
  }
}

describe("startAnalysis", () => {
  it("analyzes for the business the form showed, not the cookie's", async () => {
    expect(await start({ business: A })).toEqual({ org: A });
    expect(h.getCurrentOrg).toHaveBeenCalledWith(USER, A);
    expect(h.fake.rpcCalls).toEqual([]);
  });

  it.each([
    ["empty", ""],
    ["old form's", "current"],
    ["unknown", "cccccccc-cccc-4ccc-8ccc-cccccccccccc"],
  ])("refuses an %s business without using the cookie or creating a business", async (_, business) => {
    expect(await start({ business })).toEqual({ error: NOT_FOUND });
    expect(h.getCurrentOrg).not.toHaveBeenCalledWith(USER);
    expect(h.fake.rpcCalls).toEqual([]);
    expect(h.createOnboarding).not.toHaveBeenCalled();
  });

  it('adds a business for "new"', async () => {
    expect(await start({ business: "new" })).toEqual({ org: NEW });
    expect(h.remembered).toEqual([NEW]);
  });

  it("gives a user with no business a new one even after joining another in another tab", async () => {
    // The form without a choice posts "new" (start-form.tsx); an invite accepted meanwhile made B the cookie's business.
    expect(await start({ business: "new" })).toEqual({ org: NEW });
    expect(h.getCurrentOrg).not.toHaveBeenCalled();
  });

  it("keeps the old path for a form rendered before the choice posted anything", async () => {
    // A business made in another tab since: the website goes to it, as before.
    expect(await start({})).toEqual({ org: B });
    h.createOnboarding.mockClear();
    // No business at all: a new one.
    h.cookieOrg = null;
    expect(await start({})).toEqual({ org: NEW });
  });
});

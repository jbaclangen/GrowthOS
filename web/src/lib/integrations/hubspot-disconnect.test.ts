import { randomBytes } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fakeSupabase, type Row } from "../../../test/fake-supabase";
import { encryptSecret } from "./secret-box";
import { disconnectHubSpot, revokeHubSpotForRemoval } from "./hubspot";

// Disconnecting or removing one business must not uninstall the app from a portal another business still uses: an
// install is per portal (tenant-scoping, D-062). HubSpot itself is mocked; only which call is made is checked.
const oauth = vi.hoisted(() => ({ uninstall: vi.fn(), revoke: vi.fn() }));
vi.mock("./hubspot-oauth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./hubspot-oauth")>()),
  uninstallHubSpot: oauth.uninstall,
  revokeHubSpotRefreshToken: oauth.revoke,
}));

beforeAll(() => {
  process.env.INTEGRATIONS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

beforeEach(() => {
  oauth.uninstall.mockReset().mockResolvedValue(true);
  oauth.revoke.mockReset().mockResolvedValue(true);
});

const ORG = "org-a";
const OTHER = "org-b";
const PORTAL = "12345";

const connection = (organizationId: string, token: string | null, fields: Row = {}): Row => ({
  id: `conn-${organizationId}`,
  organization_id: organizationId,
  provider: "hubspot",
  external_account_id: PORTAL,
  external_account_name: "example.hubspot.com",
  refresh_token_ciphertext: token === null ? null : encryptSecret(token),
  status: "active",
  scopes: ["crm.objects.contacts.read"],
  ...fields,
});

function seed(rows: Row[]) {
  return fakeSupabase({
    integration_connections: rows,
    hubspot_snapshots: [{ id: "s1", organization_id: ORG }, { id: "s2", organization_id: OTHER }],
  });
}

type Loose = Record<string, (...args: unknown[]) => Loose>;

// Fails the read of the other connections to the portal (the only select that excludes an organization). The fake
// can't fail a select by itself.
function failPortalRead(db: SupabaseClient): SupabaseClient {
  const failed = { neq: () => ({ limit: async () => ({ data: null, error: { message: "connection reset" } }) }) };
  return {
    from(table: string) {
      const q = db.from(table) as unknown as Loose;
      const select = q.select;
      q.select = (...args) => {
        const built = select.apply(q, args);
        const neq = built.neq;
        built.neq = (column, value) => (column === "organization_id" ? (failed as unknown as Loose) : neq.call(built, column, value));
        return built;
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

describe("disconnectHubSpot", () => {
  it("uninstalls the app when no other business is connected to the portal", async () => {
    const { db, tables } = seed([connection(ORG, "token-a"), connection(OTHER, "token-b", { external_account_id: "999" })]);
    await disconnectHubSpot(db, ORG);
    expect(oauth.uninstall).toHaveBeenCalledWith("token-a");
    expect(oauth.revoke).not.toHaveBeenCalled();
    const own = tables.integration_connections.find((r) => r.organization_id === ORG)!;
    expect(own).toMatchObject({ refresh_token_ciphertext: null, status: "revoked", external_account_id: null });
    expect(tables.hubspot_snapshots.map((s) => s.id)).toEqual(["s2"]);
  });

  it("uninstalls when the other business's connection to the portal was already disconnected", async () => {
    const { db } = seed([connection(ORG, "token-a"), connection(OTHER, null, { status: "revoked" })]);
    await disconnectHubSpot(db, ORG);
    expect(oauth.uninstall).toHaveBeenCalledWith("token-a");
  });

  it("only revokes this business's token while another business uses the portal", async () => {
    const { db, tables } = seed([connection(ORG, "token-a"), connection(OTHER, "token-b")]);
    await disconnectHubSpot(db, ORG);
    expect(oauth.uninstall).not.toHaveBeenCalled();
    expect(oauth.revoke).toHaveBeenCalledWith("token-a");
    const other = tables.integration_connections.find((r) => r.organization_id === OTHER)!;
    expect(other).toMatchObject({ status: "active", external_account_id: PORTAL });
    expect(other.refresh_token_ciphertext).not.toBeNull();
    expect(tables.hubspot_snapshots.map((s) => s.id)).toEqual(["s2"]);
  });

  it("counts a paused connection as using the portal: it resumes on an upgrade", async () => {
    const { db } = seed([connection(ORG, "token-a"), connection(OTHER, "token-b", { status: "paused" })]);
    await disconnectHubSpot(db, ORG);
    expect(oauth.uninstall).not.toHaveBeenCalled();
    expect(oauth.revoke).toHaveBeenCalledWith("token-a");
  });

  it("revokes nothing at HubSpot when the other business holds the same token, and still deletes this one", async () => {
    const { db, tables } = seed([connection(ORG, "same-token"), connection(OTHER, "same-token")]);
    await disconnectHubSpot(db, ORG);
    expect(oauth.uninstall).not.toHaveBeenCalled();
    expect(oauth.revoke).not.toHaveBeenCalled();
    expect(tables.integration_connections.find((r) => r.organization_id === ORG)).toMatchObject({ refresh_token_ciphertext: null, status: "revoked" });
  });

  it("changes nothing when the other connections can't be read", async () => {
    const { db, tables } = seed([connection(ORG, "token-a"), connection(OTHER, "token-b")]);
    await expect(disconnectHubSpot(failPortalRead(db), ORG)).rejects.toThrow();
    expect(oauth.uninstall).not.toHaveBeenCalled();
    expect(oauth.revoke).not.toHaveBeenCalled();
    expect(tables.integration_connections.find((r) => r.organization_id === ORG)!.refresh_token_ciphertext).not.toBeNull();
    expect(tables.hubspot_snapshots).toHaveLength(2);
  });
});

describe("revokeHubSpotForRemoval", () => {
  it("returns [] when no token is stored", async () => {
    const { db } = seed([connection(ORG, null, { status: "revoked" })]);
    expect(await revokeHubSpotForRemoval(db, ORG)).toEqual([]);
  });

  it("uninstalls when no other business uses the portal and returns HubSpot's answer", async () => {
    oauth.uninstall.mockResolvedValue(false);
    const { db } = seed([connection(ORG, "token-a")]);
    expect(await revokeHubSpotForRemoval(db, ORG)).toEqual([false]);
    expect(oauth.uninstall).toHaveBeenCalledWith("token-a");
  });

  it("only revokes this business's token while another business uses the portal", async () => {
    const { db } = seed([connection(ORG, "token-a"), connection(OTHER, "token-b")]);
    expect(await revokeHubSpotForRemoval(db, ORG)).toEqual([true]);
    expect(oauth.uninstall).not.toHaveBeenCalled();
    expect(oauth.revoke).toHaveBeenCalledWith("token-a");
  });

  it("leaves a token the other business also holds, and reports this business's access as ended", async () => {
    const { db } = seed([connection(ORG, "same-token"), connection(OTHER, "same-token")]);
    expect(await revokeHubSpotForRemoval(db, ORG)).toEqual([true]);
    expect(oauth.uninstall).not.toHaveBeenCalled();
    expect(oauth.revoke).not.toHaveBeenCalled();
  });

  it("returns [false] for an unreadable token", async () => {
    const { db } = seed([connection(ORG, "token-a", { refresh_token_ciphertext: "v1:broken" })]);
    expect(await revokeHubSpotForRemoval(db, ORG)).toEqual([false]);
    expect(oauth.uninstall).not.toHaveBeenCalled();
  });

  it("throws when the other connections to the portal can't be read, so the business isn't deleted", async () => {
    const { db } = seed([connection(ORG, "token-a"), connection(OTHER, "token-b")]);
    await expect(revokeHubSpotForRemoval(failPortalRead(db), ORG)).rejects.toThrow();
    expect(oauth.uninstall).not.toHaveBeenCalled();
    expect(oauth.revoke).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import { ROLES, deniedMessage } from "@/lib/team/roles";
import {
  PHRASE_MESSAGE,
  REMOVE_BUSINESS_PHRASE,
  deletionLogRow,
  isRemovalPhrase,
  removalAllowed,
  revokeOutcome,
} from "./removal";

describe("who may remove a business", () => {
  it("is the owner only (organization.delete, D-061)", () => {
    for (const role of ROLES) {
      const result = removalAllowed({ role, phrase: REMOVE_BUSINESS_PHRASE });
      expect(result.ok, role).toBe(role === "owner");
    }
  });

  it("is no one without a role the app knows: not a member, the retired member value, a typo", () => {
    for (const role of [null, undefined, "", "member", "Owner", "owner "]) {
      expect(removalAllowed({ role, phrase: REMOVE_BUSINESS_PHRASE })).toEqual({ ok: false, error: deniedMessage("organization.delete") });
    }
  });

  it("refuses with the permission first, so a non-owner isn't asked to retype the phrase", () => {
    expect(removalAllowed({ role: "admin", phrase: "nope" })).toEqual({ ok: false, error: deniedMessage("organization.delete") });
    expect(deniedMessage("organization.delete")).toBe("Your role in this business can't remove the business. Ask the business owner.");
  });
});

describe("the confirmation phrase", () => {
  it("is DELETE APPROVED", () => {
    expect(REMOVE_BUSINESS_PHRASE).toBe("DELETE APPROVED");
    expect(isRemovalPhrase("DELETE APPROVED")).toBe(true);
    expect(removalAllowed({ role: "owner", phrase: "DELETE APPROVED" })).toEqual({ ok: true });
  });

  it("must match exactly: case, spacing and surrounding whitespace count", () => {
    for (const phrase of [
      "delete approved",
      "Delete approved",
      "DELETE APPROVED ",
      " DELETE APPROVED",
      "DELETE  APPROVED",
      "DELETE APPROVED",
      "DELETEAPPROVED",
      "DELETE APPROVED.",
      "DELETE",
      "",
    ]) {
      expect(isRemovalPhrase(phrase), JSON.stringify(phrase)).toBe(false);
      expect(removalAllowed({ role: "owner", phrase }), JSON.stringify(phrase)).toEqual({ ok: false, error: PHRASE_MESSAGE });
    }
  });

  it("must be a string: a missing field or a file upload is refused", () => {
    for (const phrase of [null, undefined, 0, ["DELETE APPROVED"], { value: "DELETE APPROVED" }, new Blob(["DELETE APPROVED"])]) {
      expect(isRemovalPhrase(phrase)).toBe(false);
      expect(removalAllowed({ role: "owner", phrase }).ok).toBe(false);
    }
  });

  it("is named in the refusal, which says what to do", () => {
    expect(PHRASE_MESSAGE).toBe("Type DELETE APPROVED exactly, in capital letters, to remove the business.");
  });
});

describe("the token revoke outcome", () => {
  it("is none without tokens, revoked when every revoke worked, failed otherwise", () => {
    expect(revokeOutcome([])).toBe("none");
    expect(revokeOutcome([true])).toBe("revoked");
    expect(revokeOutcome([true, true])).toBe("revoked");
    expect(revokeOutcome([false])).toBe("failed");
    expect(revokeOutcome([true, false])).toBe("failed");
  });
});

describe("the deletion log row", () => {
  const input = {
    organizationId: "6f1c2b9e-4c1a-4b8e-9d2f-0a1b2c3d4e5f",
    plan: "pro",
    createdAt: "2026-10-12T10:00:00.000Z",
    members: 3,
    google: "revoked" as const,
    hubspot: "none" as const,
  };

  it("holds only the organization id, plan, age, member count and revoke outcomes: no personal data", () => {
    const row = deletionLogRow({ ...input, ...({ email: "owner@example.com", name: "Acme Plumbing", userId: "u1" } as object) });
    expect(Object.keys(row).sort()).toEqual(
      ["google_revoke", "hubspot_revoke", "members", "organization_created_at", "organization_id", "plan"].sort(),
    );
    expect(JSON.stringify(row)).not.toMatch(/example\.com|Acme|u1/);
    expect(row).toEqual({
      organization_id: input.organizationId,
      plan: "pro",
      organization_created_at: input.createdAt,
      members: 3,
      google_revoke: "revoked",
      hubspot_revoke: "none",
    });
  });

  it("keeps to the table's checks: a known plan and a member count of zero or more", () => {
    expect(deletionLogRow({ ...input, plan: "enterprise" }).plan).toBe("trial");
    expect(deletionLogRow({ ...input, members: -2 }).members).toBe(0);
    expect(deletionLogRow({ ...input, members: 2.7 }).members).toBe(2);
  });
});

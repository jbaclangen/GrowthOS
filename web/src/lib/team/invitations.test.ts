import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { acceptBlocker, invitationState, inviteTokenHash, invitePath, isInviteToken, newInviteToken, normalizeEmail } from "./invitations";
import { INVITABLE_ROLES, ROLES, assignableRoles, canManageRole } from "./roles";

describe("invite tokens", () => {
  it("are brv_inv_ plus 43 random characters, stored only as a SHA-256", () => {
    const token = newInviteToken();
    expect(isInviteToken(token)).toBe(true);
    expect(token).not.toBe(newInviteToken());
    expect(inviteTokenHash(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(inviteTokenHash(token)).not.toContain(token);
    expect(invitePath(token)).toBe(`/invite/${token}`);
  });

  it("rejects anything else", () => {
    for (const v of ["", "brv_inv_short", `brv_${"a".repeat(43)}`, `brv_inv_${"a".repeat(42)}!`, null, 7]) {
      expect(isInviteToken(v)).toBe(false);
    }
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims, or returns null", () => {
    expect(normalizeEmail("  Sam@Example.COM ")).toBe("sam@example.com");
    expect(normalizeEmail("not an email")).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe("invitationState", () => {
  const now = new Date("2026-11-07T12:00:00Z");
  const base = { accepted_at: null, revoked_at: null, expires_at: "2026-11-10T00:00:00Z" };
  it("is open, accepted, revoked or expired", () => {
    expect(invitationState(base, now)).toBe("open");
    expect(invitationState({ ...base, accepted_at: "2026-11-07T00:00:00Z" }, now)).toBe("accepted");
    expect(invitationState({ ...base, revoked_at: "2026-11-07T00:00:00Z" }, now)).toBe("revoked");
    expect(invitationState({ ...base, expires_at: "2026-11-07T12:00:00Z" }, now)).toBe("expired");
  });
});

describe("acceptBlocker", () => {
  const ok = { state: "open" as const, invitedEmail: "sam@example.com", userEmail: "Sam@example.com", alreadyMember: false, otherBusiness: null, organizationName: "Acme" };
  it("lets the invited address join", () => {
    expect(acceptBlocker(ok)).toBeNull();
  });
  it("refuses another account, a used or old link, and a second business", () => {
    expect(acceptBlocker({ ...ok, userEmail: "pat@example.com" })).toContain("This invite is for sam@example.com");
    expect(acceptBlocker({ ...ok, state: "accepted" })).toContain("already been used");
    expect(acceptBlocker({ ...ok, state: "revoked" })).toContain("withdrawn");
    expect(acceptBlocker({ ...ok, state: "expired" })).toContain("expired");
    expect(acceptBlocker({ ...ok, otherBusiness: "Other Co" })).toContain("already belongs to Other Co");
    expect(acceptBlocker({ ...ok, alreadyMember: true, state: "accepted" })).toBe("You're already in Acme.");
  });
});

describe("who may manage whom", () => {
  it("owners manage every role below owner; admins everyone below admin; no one manages an owner", () => {
    expect(assignableRoles("owner")).toEqual(INVITABLE_ROLES.filter((r) => r !== "owner"));
    expect(assignableRoles("admin")).toEqual(["marketing_manager", "social_media_manager", "copywriter", "content_creator", "analyst"]);
    for (const actor of ROLES) expect(canManageRole(actor, "owner"), actor).toBe(false);
    expect(canManageRole("admin", "admin")).toBe(false);
    expect(canManageRole("owner", "admin")).toBe(true);
  });

  it("gives nothing to roles without team.manage, and never offers client approver or owner", () => {
    for (const r of ["marketing_manager", "social_media_manager", "copywriter", "content_creator", "analyst", "client_approver", "member", null]) {
      expect(assignableRoles(r)).toEqual([]);
    }
    expect(INVITABLE_ROLES).not.toContain("client_approver");
  });
});

describe("the team_invitations migration", () => {
  const dir = fileURLToPath(new URL("../../../../supabase/migrations/", import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith("_team_invitations.sql"));
  const code = files.length === 1 ? readFileSync(dir + files[0], "utf8").replace(/--.*$/gm, "") : "";

  it("exists exactly once", () => expect(files).toHaveLength(1));

  it("stores only the token's hash and never invites an owner or client approver", () => {
    expect(code).toMatch(/token_hash text not null unique check \(token_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/);
    expect(code).not.toMatch(/\btoken text/);
    expect(code).toMatch(/check \(role not in \('owner', 'client_approver'\)\)/);
    expect(code).toMatch(/where accepted_at is null and revoked_at is null/);
  });

  it("lets only team managers read, never the hash, and gives clients no writes", () => {
    for (const table of ["team_invitations", "team_events"]) {
      expect(code).toMatch(new RegExp(`alter table public\\.${table} enable row level security`));
      expect(code).toMatch(new RegExp(`on public\\.${table}\\s+for select to authenticated using \\(public\\.has_permission\\(organization_id, 'team\\.manage'\\)\\)`));
      expect(code).toMatch(new RegExp(`revoke all on public\\.${table} from anon, authenticated`));
      expect(code).not.toMatch(new RegExp(`grant (insert|update|delete|all)[^;]*on public\\.${table}`));
    }
    const grant = code.match(/grant select \(([^)]*)\)\s+on public\.team_invitations to authenticated/);
    expect(grant).toBeTruthy();
    expect(grant![1]).not.toMatch(/token_hash/);
  });
});

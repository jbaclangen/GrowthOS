import { describe, expect, it } from "vitest";
import {
  OWN_DRAFT_MESSAGE,
  PERMISSIONS,
  ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  approvalAllowed,
  can,
  deniedMessage,
  isRole,
  permissionMatrixSql,
  permissionsOf,
  roleSentence,
} from "./roles";

describe("roles", () => {
  it("are the eight fixed roles of D-046, as snake_case ids with sentence-case labels", () => {
    expect(ROLES).toEqual(["owner", "admin", "marketing_manager", "social_media_manager", "copywriter", "content_creator", "analyst", "client_approver"]);
    expect(new Set(ROLES).size).toBe(8);
    for (const r of ROLES) {
      expect(r).toMatch(/^[a-z]+(_[a-z]+)*$/);
      expect(ROLE_LABELS[r]).toMatch(/^[A-Z][a-z]+( [a-z]+)*$/);
    }
  });

  it("recognizes only those ids; the retired member value is no role", () => {
    for (const r of ROLES) expect(isRole(r)).toBe(true);
    expect(isRole("member")).toBe(false);
    expect(isRole("Owner")).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("the permission matrix", () => {
  it("lists every permission once and gives each one at least the owner", () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    for (const p of PERMISSIONS) {
      expect(ROLE_PERMISSIONS[p].length, p).toBeGreaterThan(0);
      expect(new Set(ROLE_PERMISSIONS[p]).size, p).toBe(ROLE_PERMISSIONS[p].length);
      // Each permission's roles are listed in ROLES order, so the SQL rendering is stable.
      const order = ROLE_PERMISSIONS[p].map((r) => ROLES.indexOf(r));
      expect(order, p).toEqual([...order].sort((a, b) => a - b));
      expect(can("owner", p), p).toBe(true);
    }
  });

  it("gives the owner everything and the client approver nothing yet", () => {
    expect(permissionsOf("owner")).toEqual([...PERMISSIONS]);
    expect(permissionsOf("client_approver")).toEqual([]);
  });

  it("keeps the owner-only rules: integrations, service keys and approving one's own draft (D-044, D-046)", () => {
    for (const p of ["integrations.connect", "keys.manage_any", "content.approve_own", "billing.manage"] as const) {
      expect(ROLE_PERMISSIONS[p], p).toEqual(["owner"]);
    }
    expect(can("admin", "integrations.connect")).toBe(false);
    expect(can("admin", "content.approve")).toBe(true);
    expect(can("admin", "content.approve_own")).toBe(false);
  });

  it("follows the research matrix for the working roles", () => {
    for (const p of ["profile.edit", "analysis.run", "diagnosis.correct", "plan_items.update_any", "content.approve"] as const) {
      expect(ROLE_PERMISSIONS[p], p).toEqual(["owner", "admin", "marketing_manager"]);
    }
    for (const r of ["social_media_manager", "copywriter", "content_creator"] as const) {
      expect(can(r, "content.draft"), r).toBe(true);
      expect(can(r, "plan_items.update_own"), r).toBe(true);
      expect(can(r, "plan_items.update_any"), r).toBe(false);
      expect(can(r, "analysis.run"), r).toBe(false);
      expect(can(r, "content.approve"), r).toBe(false);
    }
    expect(can("social_media_manager", "keys.manage_own")).toBe(true);
    expect(can("copywriter", "keys.manage_own")).toBe(false);
  });

  it("makes the analyst view-only: reports and the read-only assistant", () => {
    expect(permissionsOf("analyst")).toEqual(["reports.view", "reports.export", "assistant.use"]);
  });

  it("refuses anything that isn't a role", () => {
    for (const p of PERMISSIONS) {
      expect(can("member", p), p).toBe(false);
      expect(can(null, p), p).toBe(false);
      expect(can(undefined, p), p).toBe(false);
      expect(can("", p), p).toBe(false);
    }
  });

  it("explains a refusal in the business owner's terms", () => {
    expect(deniedMessage("analysis.run")).toBe("Your role in this business can't start an analysis. Ask the business owner.");
    for (const p of PERMISSIONS) expect(deniedMessage(p)).toMatch(/^Your role in this business can't [a-z].*\. Ask the business owner\.$/);
  });

  it("renders the SQL branches of has_permission() in matrix order", () => {
    const lines = permissionMatrixSql().split("\n");
    expect(lines).toHaveLength(PERMISSIONS.length);
    expect(lines[0]).toBe("when 'billing.view' then array['owner', 'admin']");
    expect(lines).toContain("when 'content.approve_own' then array['owner']");
    for (const [i, p] of PERMISSIONS.entries()) expect(lines[i]).toMatch(new RegExp(`^when '${p.replace(".", "\\.")}' then array\\[`));
  });
});

describe("approvalAllowed (D-046: no one approves their own work except the owner)", () => {
  const me = "user-1";
  const other = "user-2";

  it("lets the owner approve anything, their own draft included", () => {
    expect(approvalAllowed({ role: "owner", status: "approved", authorId: me, approverId: me })).toEqual({ ok: true });
    expect(approvalAllowed({ role: "owner", status: "approved", authorId: other, approverId: me })).toEqual({ ok: true });
    expect(approvalAllowed({ role: "owner", status: "approved", authorId: null, approverId: me })).toEqual({ ok: true });
  });

  it("lets an admin or marketing manager approve someone else's draft, or a draft with no author, but not their own", () => {
    for (const role of ["admin", "marketing_manager"] as const) {
      expect(approvalAllowed({ role, status: "approved", authorId: other, approverId: me }), role).toEqual({ ok: true });
      expect(approvalAllowed({ role, status: "approved", authorId: null, approverId: me }), role).toEqual({ ok: true });
      expect(approvalAllowed({ role, status: "approved", authorId: me, approverId: me }), role).toEqual({ ok: false, error: OWN_DRAFT_MESSAGE });
    }
  });

  it("applies the own-draft rule to approving only; rejecting or undoing one's own draft is allowed", () => {
    expect(approvalAllowed({ role: "admin", status: "rejected", authorId: me, approverId: me })).toEqual({ ok: true });
    expect(approvalAllowed({ role: "admin", status: "needs_approval", authorId: me, approverId: me })).toEqual({ ok: true });
  });

  it("refuses every status change to roles without content.approve", () => {
    for (const role of ["copywriter", "content_creator", "analyst", "client_approver", "member", null] as const) {
      for (const status of ["approved", "rejected", "needs_approval"] as const) {
        expect(approvalAllowed({ role, status, authorId: other, approverId: me }), `${role} ${status}`).toEqual({
          ok: false,
          error: deniedMessage("content.approve"),
        });
      }
    }
  });
});

describe("roleSentence", () => {
  it("says the role in words, in sentence case", () => {
    expect(roleSentence("owner", "Acme Plumbing")).toBe("Your role in Acme Plumbing is owner.");
    expect(roleSentence("marketing_manager", "Acme Plumbing")).toBe("Your role in Acme Plumbing is marketing manager.");
    expect(roleSentence("member", "Acme Plumbing")).toBeNull();
    expect(roleSentence(null, "Acme Plumbing")).toBeNull();
  });
});

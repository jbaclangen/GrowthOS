// Team roles and their fixed permissions (founder decision D-046; spec: docs/architecture/ROLES_AND_PERMISSIONS.md).
// Pure logic (no I/O), unit-tested in roles.test.ts, like plans/tiers.ts and modules/registry.ts. The database holds
// the same matrix in public.has_permission() (migration *_roles_and_permissions.sql); migration.test.ts in this folder
// parses that SQL and proves the two agree. Server code reads a user's role with memberRole() in ./server.ts.
//
// Rule (CLAUDE.md): a role check goes through can(); nothing compares a role to a literal such as "owner".

export const ROLES = [
  "owner",
  "admin",
  "marketing_manager",
  "social_media_manager",
  "copywriter",
  "content_creator",
  "analyst",
  "client_approver",
] as const;
export type Role = (typeof ROLES)[number];

// Sentence case, as Settings shows them.
export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  marketing_manager: "Marketing manager",
  social_media_manager: "Social media manager",
  copywriter: "Copywriter",
  content_creator: "Content creator",
  analyst: "Analyst",
  client_approver: "Client approver",
};

// One id per row of the research matrix (SEATS_ROLES_MODULES_2026-10-17.md §2). ROLES_AND_PERMISSIONS.md §2 says
// where each one is enforced today.
export const PERMISSIONS = [
  "billing.view",
  "billing.manage",
  "team.manage",
  "integrations.connect",
  "keys.manage_own",
  "keys.manage_any",
  "profile.edit",
  "analysis.run",
  "diagnosis.correct",
  "plan_items.update_own",
  "plan_items.update_any",
  "content.draft",
  "content.approve",
  "content.approve_own",
  "reports.view",
  "reports.export",
  "assistant.use",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// What each permission lets a person do, as a refusal names it ("Your role in this business can't …").
export const PERMISSION_ACTIONS: Record<Permission, string> = {
  "billing.view": "see billing",
  "billing.manage": "change the plan or billing",
  "team.manage": "manage the team",
  "integrations.connect": "connect or disconnect tools",
  "keys.manage_own": "create access keys",
  "keys.manage_any": "manage the business's keys and connected apps",
  "profile.edit": "change the business profile or the discovery answers",
  "analysis.run": "start an analysis",
  "diagnosis.correct": "confirm or correct the diagnosis",
  "plan_items.update_own": "update plan items",
  "plan_items.update_any": "update plan items",
  "content.draft": "write drafts",
  "content.approve": "approve or reject drafts",
  "content.approve_own": "approve its own drafts",
  "reports.view": "see reports",
  "reports.export": "export reports",
  "assistant.use": "use the assistant",
};

const EDITORS: readonly Role[] = ["owner", "admin", "marketing_manager"];
const DRAFTERS: readonly Role[] = [...EDITORS, "social_media_manager", "copywriter", "content_creator"];

// The matrix: each permission and the roles that hold it, in ROLES order (the SQL rendering below depends on it).
// Where it differs from the research matrix, ROLES_AND_PERMISSIONS.md §3 says why.
export const ROLE_PERMISSIONS: Record<Permission, readonly Role[]> = {
  "billing.view": ["owner", "admin"],
  "billing.manage": ["owner"],
  "team.manage": ["owner", "admin"],
  // Owner only, as in code before roles existed (D-046: admins don't connect by default).
  "integrations.connect": ["owner"],
  "keys.manage_own": ["owner", "admin", "marketing_manager", "social_media_manager"],
  // Service keys and disconnecting another person's app stay owner-only (D-044).
  "keys.manage_any": ["owner"],
  "profile.edit": EDITORS,
  "analysis.run": EDITORS,
  "diagnosis.correct": EDITORS,
  "plan_items.update_own": DRAFTERS,
  "plan_items.update_any": EDITORS,
  "content.draft": DRAFTERS,
  "content.approve": EDITORS,
  // No one approves their own work except the Owner (D-046).
  "content.approve_own": ["owner"],
  "reports.view": [...EDITORS, "social_media_manager", "analyst"],
  "reports.export": [...EDITORS, "analyst"],
  "assistant.use": [...DRAFTERS, "analyst"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

// Whether a role holds a permission. Anything that isn't one of the eight roles (null, the retired "member", a typo)
// holds nothing.
export function can(role: string | null | undefined, permission: Permission): boolean {
  return isRole(role) && ROLE_PERMISSIONS[permission].includes(role);
}

export function permissionsOf(role: Role): Permission[] {
  return PERMISSIONS.filter((p) => ROLE_PERMISSIONS[p].includes(role));
}

// The refusal a web action or MCP tool returns when the role lacks the permission.
export function deniedMessage(permission: Permission): string {
  return `Your role in this business can't ${PERMISSION_ACTIONS[permission]}. Ask the business owner.`;
}

export const OWN_DRAFT_MESSAGE = "You can't approve your own draft. Ask another approver; only the business owner approves their own drafts.";

// D-046: approving, rejecting or undoing a draft needs content.approve; approving a draft the approver wrote needs
// content.approve_own. A draft with no author (the pipeline wrote it) is nobody's own. The database trigger
// guard_content_item_write applies the same rule.
export function approvalAllowed(input: {
  role: string | null | undefined;
  status: "approved" | "rejected" | "needs_approval";
  authorId: string | null;
  approverId: string;
}): { ok: true } | { ok: false; error: string } {
  if (!can(input.role, "content.approve")) return { ok: false, error: deniedMessage("content.approve") };
  const own = input.authorId !== null && input.authorId === input.approverId;
  if (input.status === "approved" && own && !can(input.role, "content.approve_own")) return { ok: false, error: OWN_DRAFT_MESSAGE };
  return { ok: true };
}

// The one line Settings shows: "Your role in Acme Plumbing is owner." Null for a role the app doesn't know.
export function roleSentence(role: string | null | undefined, organizationName: string): string | null {
  return isRole(role) ? `Your role in ${organizationName} is ${ROLE_LABELS[role].toLowerCase()}.` : null;
}

// The `when … then …` branches of has_permission()'s `case perm`, one per permission, as the migration writes them.
export function permissionMatrixSql(): string {
  return PERMISSIONS.map((p) => `when '${p}' then array[${ROLE_PERMISSIONS[p].map((r) => `'${r}'`).join(", ")}]`).join("\n");
}

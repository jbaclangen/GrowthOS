"use server";

import { refresh } from "next/cache";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { originFromHeaders } from "@/lib/oauth/request-origin";
import { INVITE_TTL_DAYS, inviteTokenHash, invitePath, newInviteToken, normalizeEmail } from "@/lib/team/invitations";
import { ROLE_LABELS, assignableRoles, canManageRole, deniedMessage, isRole, type Role } from "@/lib/team/roles";
import { seatAvailable, seatKind, type SeatUsage } from "@/lib/team/seats";
import { openInvitations, recordTeamEvent, seatState, teamMembers } from "@/lib/team/team-server";

// Settings → Team (D-046; ROLES_AND_PERMISSIONS.md §8). Every action needs team.manage (owner and admin) and may touch
// only roles below the actor's own (canManageRole). The writes use the secret key, scoped to the actor's own business
// (getCurrentOrg), because invitations have no client write policy and the invitee isn't a member yet.

export type InviteState = { error?: string; link?: string; email?: string; role?: string; days?: number } | undefined;

async function manager() {
  const user = await requireUser();
  const org = await getCurrentOrg(user.id);
  if (!org) return { error: "Set up your business first." } as const;
  if (!assignableRoles(org.role).length) return { error: deniedMessage("team.manage") } as const;
  return { user, org } as const;
}

// The seats taken if one person's current seat is set aside (re-inviting an address, or changing that member's role).
function without(usage: SeatUsage, role: Role | null): SeatUsage {
  if (!role) return usage;
  const kind = seatKind(role);
  return kind === "full" ? { ...usage, full: usage.full - 1 } : kind === "analyst" ? { ...usage, analyst: usage.analyst - 1 } : usage;
}

export async function inviteMember(_: InviteState, formData: FormData): Promise<InviteState> {
  const m = await manager();
  if ("error" in m) return { error: m.error };
  const { user, org } = m;

  const email = normalizeEmail(formData.get("email"));
  if (!email) return { error: "Enter a valid email address." };
  const role = formData.get("role");
  if (!isRole(role) || !assignableRoles(org.role).includes(role)) return { error: "Choose a role you can give." };

  const admin = createSupabaseAdminClient();
  const members = await teamMembers(admin, org.id);
  if (members.some((x) => x.email.toLowerCase() === email)) return { error: `${email} is already in ${org.name}.` };

  const invites = await openInvitations(admin, org.id);
  const previous = invites.find((i) => i.email === email) ?? null;
  if (previous && !canManageRole(org.role, previous.role)) return { error: `${email} already has an invite you can't replace.` };
  const { tier, usage } = await seatState(admin, org.id);
  const fits = seatAvailable(tier, without(usage, previous?.role ?? null), role);
  if (!fits.ok) return { error: fits.error };

  // Inviting the same address again replaces the old link (one open invite per address, unique index).
  const now = new Date().toISOString();
  if (previous) await admin.from("team_invitations").update({ revoked_at: now }).eq("id", previous.id).is("revoked_at", null);

  const token = newInviteToken();
  const { error } = await admin.from("team_invitations").insert({
    organization_id: org.id,
    email,
    role,
    token_hash: inviteTokenHash(token),
    invited_by: user.id,
    expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString(),
  });
  if (error) return { error: "The invite wasn't created. Try again." };
  await recordTeamEvent(admin, { organizationId: org.id, actorId: user.id, action: "invited", subjectEmail: email, roleTo: role });
  refresh();
  // Shown once; only the token's hash is stored.
  return { link: `${await originFromHeaders()}${invitePath(token)}`, email, role: ROLE_LABELS[role], days: INVITE_TTL_DAYS };
}

export async function revokeInvitation(invitationId: string) {
  const m = await manager();
  if ("error" in m) throw new Error(m.error);
  const admin = createSupabaseAdminClient();
  const invite = (await openInvitations(admin, m.org.id)).find((i) => i.id === invitationId);
  if (!invite) return refresh();
  if (!canManageRole(m.org.role, invite.role)) throw new Error("You can't withdraw this invite. Ask the business owner.");
  const { error } = await admin
    .from("team_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invite.id)
    .eq("organization_id", m.org.id)
    .is("revoked_at", null);
  if (error) throw new Error("The invite wasn't withdrawn. Try again.");
  await recordTeamEvent(admin, { organizationId: m.org.id, actorId: m.user.id, action: "invite_revoked", subjectEmail: invite.email, roleFrom: invite.role });
  refresh();
}

export type MemberActionState = { error?: string } | undefined;

export async function changeMemberRole(userId: string, _: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const m = await manager();
  if ("error" in m) return { error: m.error };
  const role = formData.get("role");
  if (!isRole(role)) return { error: "Choose a role." };
  const admin = createSupabaseAdminClient();
  const target = (await teamMembers(admin, m.org.id)).find((x) => x.userId === userId);
  if (!target) return { error: "That person isn't in this business any more." };
  if (target.role === role) return undefined;
  if (!canManageRole(m.org.role, target.role) || !canManageRole(m.org.role, role)) {
    return { error: "You can change only roles below your own. Ask the business owner." };
  }
  if (seatKind(target.role) !== seatKind(role)) {
    const { tier, usage } = await seatState(admin, m.org.id);
    const fits = seatAvailable(tier, without(usage, target.role), role);
    if (!fits.ok) return { error: fits.error };
  }
  const { error } = await admin.from("memberships").update({ role }).eq("organization_id", m.org.id).eq("user_id", userId);
  if (error) return { error: "The role wasn't changed. Try again." };
  await recordTeamEvent(admin, {
    organizationId: m.org.id,
    actorId: m.user.id,
    action: "role_changed",
    subjectEmail: target.email,
    subjectUserId: userId,
    roleFrom: target.role,
    roleTo: role,
  });
  refresh();
  return undefined;
}

export async function removeMember(userId: string) {
  const m = await manager();
  if ("error" in m) throw new Error(m.error);
  const admin = createSupabaseAdminClient();
  const target = (await teamMembers(admin, m.org.id)).find((x) => x.userId === userId);
  if (!target) return refresh();
  if (!canManageRole(m.org.role, target.role)) throw new Error("You can remove only people with a role below your own. Ask the business owner.");

  const { error } = await admin.from("memberships").delete().eq("organization_id", m.org.id).eq("user_id", userId);
  if (error) throw new Error("That person wasn't removed. Try again.");
  // The MCP server already refuses a key or app whose user isn't a member (lib/mcp/auth.ts); revoke them as well so
  // Settings doesn't list access that no longer works.
  const now = new Date().toISOString();
  await Promise.all([
    admin.from("mcp_access_keys").update({ revoked_at: now }).eq("organization_id", m.org.id).eq("user_id", userId).eq("kind", "personal").is("revoked_at", null),
    admin.from("oauth_grants").update({ revoked_at: now }).eq("organization_id", m.org.id).eq("user_id", userId).is("revoked_at", null),
  ]);
  await recordTeamEvent(admin, { organizationId: m.org.id, actorId: m.user.id, action: "removed", subjectEmail: target.email, subjectUserId: userId, roleFrom: target.role });
  refresh();
}

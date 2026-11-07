import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveAccess, type Tier } from "@/lib/plans/tiers";
import { invitationState } from "./invitations";
import { isRole, type Role } from "./roles";
import { seatUsage, type SeatUsage } from "./seats";

// Reads for Settings → Team and the invite page. Every function takes the service client (createSupabaseAdminClient),
// so callers must pass an organization id they have already authorised: a membership for the member list, team.manage
// for invitations (CLAUDE.md). Emails live in auth.users, which no client role can read.

export type TeamMember = { userId: string; email: string; role: Role; joinedAt: string };
export type OpenInvitation = { id: string; email: string; role: Role; createdAt: string; expiresAt: string };

export async function teamMembers(admin: SupabaseClient, organizationId: string): Promise<TeamMember[]> {
  const { data } = await admin
    .from("memberships")
    .select("user_id, role, created_at")
    .eq("organization_id", organizationId)
    .order("created_at");
  const rows = (data ?? []).filter((m) => isRole(m.role));
  const users = await Promise.all(rows.map((m) => admin.auth.admin.getUserById(m.user_id as string)));
  return rows.map((m, i) => ({
    userId: m.user_id as string,
    email: users[i].data.user?.email ?? "(unknown email)",
    role: m.role as Role,
    joinedAt: m.created_at as string,
  }));
}

export async function openInvitations(admin: SupabaseClient, organizationId: string, now = new Date()): Promise<OpenInvitation[]> {
  const { data } = await admin
    .from("team_invitations")
    .select("id, email, role, created_at, expires_at, accepted_at, revoked_at")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at");
  return (data ?? [])
    .filter((r) => isRole(r.role) && invitationState(r, now) === "open")
    .map((r) => ({ id: r.id, email: r.email, role: r.role as Role, createdAt: r.created_at, expiresAt: r.expires_at }));
}

export type LoadedInvitation = {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: Role;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
};

// The invitation behind a link, found by its token's hash. The token itself is the authorisation to read it.
export async function invitationByTokenHash(admin: SupabaseClient, tokenHash: string): Promise<LoadedInvitation | null> {
  const { data } = await admin
    .from("team_invitations")
    .select("id, organization_id, email, role, accepted_at, revoked_at, expires_at, organizations(name)")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!data || !isRole(data.role)) return null;
  const org = data.organizations as unknown as { name: string } | null;
  return {
    id: data.id,
    organizationId: data.organization_id,
    organizationName: org?.name ?? "this business",
    email: data.email,
    role: data.role,
    accepted_at: data.accepted_at,
    revoked_at: data.revoked_at,
    expires_at: data.expires_at,
  };
}

// The plan's tier and the seats members and open invitations take.
export async function seatState(admin: SupabaseClient, organizationId: string, now = new Date()): Promise<{ tier: Tier; usage: SeatUsage }> {
  const [{ data: org }, members, invites] = await Promise.all([
    admin.from("organizations").select("plan, trial_ends_at").eq("id", organizationId).maybeSingle(),
    admin.from("memberships").select("role").eq("organization_id", organizationId),
    openInvitations(admin, organizationId, now),
  ]);
  const tier = org ? effectiveAccess(org, now).tier : "basic";
  const roles = [...(members.data ?? []).map((m) => m.role), ...invites.map((i) => i.role)].filter(isRole);
  return { tier, usage: seatUsage(roles) };
}

export async function recordTeamEvent(
  admin: SupabaseClient,
  event: {
    organizationId: string;
    actorId: string | null;
    action: "invited" | "invite_revoked" | "joined" | "role_changed" | "removed";
    subjectEmail?: string | null;
    subjectUserId?: string | null;
    roleFrom?: Role | null;
    roleTo?: Role | null;
  },
) {
  await admin.from("team_events").insert({
    organization_id: event.organizationId,
    actor_id: event.actorId,
    action: event.action,
    subject_email: event.subjectEmail ?? null,
    subject_user_id: event.subjectUserId ?? null,
    role_from: event.roleFrom ?? null,
    role_to: event.roleTo ?? null,
  });
}

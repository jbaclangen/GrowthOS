"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { memberOrganizations } from "@/lib/memberships";
import { acceptBlocker, invitationState, inviteTokenHash, isInviteToken } from "@/lib/team/invitations";
import { seatAvailable, seatKind, type SeatUsage } from "@/lib/team/seats";
import { invitationByTokenHash, recordTeamEvent, seatState } from "@/lib/team/team-server";

export type AcceptState = { error?: string } | undefined;

// Joins the business behind an invite link (D-046; ROLES_AND_PERMISSIONS.md §8). Re-checks everything the page showed,
// then writes the membership with the secret key: the invitee isn't a member yet, so no policy lets them insert it.
// The seat check runs again here, because the plan or the team may have changed since the invite was created.
export async function acceptInvitation(token: string): Promise<AcceptState> {
  const user = await requireUser();
  if (!isInviteToken(token)) return { error: "This invite link isn't valid. Check you copied all of it." };
  const admin = createSupabaseAdminClient();
  const invite = await invitationByTokenHash(admin, inviteTokenHash(token));
  if (!invite) return { error: "This invite link isn't valid. Check you copied all of it." };

  const mine = await memberOrganizations(await createSupabaseServerClient(), user.id);
  const blocker = acceptBlocker({
    state: invitationState(invite),
    invitedEmail: invite.email,
    userEmail: user.email,
    alreadyMember: mine.some((o) => o.id === invite.organizationId),
    otherBusiness: mine.find((o) => o.id !== invite.organizationId)?.name ?? null,
    organizationName: invite.organizationName,
  });
  if (blocker) return { error: blocker };

  // The open invite already holds this person's seat; set it aside before checking.
  const { tier, usage } = await seatState(admin, invite.organizationId);
  const kind = seatKind(invite.role);
  const others: SeatUsage = kind === "full" ? { ...usage, full: usage.full - 1 } : kind === "analyst" ? { ...usage, analyst: usage.analyst - 1 } : usage;
  const fits = seatAvailable(tier, others, invite.role);
  if (!fits.ok) return { error: `${invite.organizationName} has no free seat for this role right now. Ask the person who invited you.` };

  // Claim the invite first, so the same link can't be used twice at once.
  const { data: claimed } = await admin
    .from("team_invitations")
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", invite.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id");
  if (!claimed?.length) return { error: "This invite has already been used or withdrawn." };

  const { error } = await admin
    .from("memberships")
    .insert({ organization_id: invite.organizationId, user_id: user.id, role: invite.role });
  if (error) {
    await admin.from("team_invitations").update({ accepted_at: null, accepted_by: null }).eq("id", invite.id);
    return { error: "You weren't added to the business. Try again." };
  }
  await recordTeamEvent(admin, {
    organizationId: invite.organizationId,
    actorId: user.id,
    action: "joined",
    subjectEmail: invite.email,
    subjectUserId: user.id,
    roleTo: invite.role,
  });
  redirect("/dashboard");
}

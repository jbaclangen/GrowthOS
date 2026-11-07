import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { ROLE_LABELS, assignableRoles, canManageRole } from "@/lib/team/roles";
import { seatSummary } from "@/lib/team/seats";
import { openInvitations, seatState, teamMembers } from "@/lib/team/team-server";
import { revokeInvitation, removeMember } from "./team-actions";
import { InviteForm, RemoveButton, RoleForm } from "./team-forms";

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

// Settings → Team (D-046). Every member sees who is in the business; people with team.manage (owner, admin) also
// invite, change roles below their own and remove people. The caller has resolved the user's own membership of org.
export async function TeamSection({ org, userId }: { org: { id: string; name: string; role: string }; userId: string }) {
  const admin = createSupabaseAdminClient();
  const roles = assignableRoles(org.role);
  const manages = roles.length > 0;
  const [members, invites, seats] = await Promise.all([
    teamMembers(admin, org.id),
    manages ? openInvitations(admin, org.id) : Promise.resolve([]),
    seatState(admin, org.id),
  ]);

  return (
    <section id="team" className="card mt-8 scroll-mt-20" aria-labelledby="team-heading">
      <p className="eyebrow">Team</p>
      <h2 id="team-heading" className="mt-1 text-lg font-semibold">
        People in {org.name}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {seatSummary(seats.tier, seats.usage)}, counting open invites. Analysts and client approvers don&apos;t take a full seat.
      </p>

      <ul className="mt-4 divide-y divide-border text-sm">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="font-medium">
                {m.email}
                {m.userId === userId && <span className="font-normal text-muted"> (you)</span>}
              </p>
              <p className="text-xs text-muted">
                {ROLE_LABELS[m.role]} · joined {dateFormat.format(new Date(m.joinedAt))}
              </p>
            </div>
            {canManageRole(org.role, m.role) && (
              <div className="flex flex-wrap items-center gap-2">
                <RoleForm userId={m.userId} current={m.role} roles={roles} email={m.email} />
                <form action={removeMember.bind(null, m.userId)}>
                  <RemoveButton email={m.email} />
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>

      {manages ? (
        <>
          <h3 className="mt-6 text-sm font-semibold">Invite someone</h3>
          <p className="mt-1 text-sm text-muted">
            Braventa doesn&apos;t send invite emails yet. Create a link and send it yourself. You can give any role below your own.
          </p>
          <InviteForm roles={roles} />

          {invites.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold">Open invites</h3>
              <ul className="mt-2 divide-y divide-border text-sm">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-medium">{i.email}</p>
                      <p className="text-xs text-muted">
                        {ROLE_LABELS[i.role]} · expires {dateFormat.format(new Date(i.expiresAt))}
                      </p>
                    </div>
                    {canManageRole(org.role, i.role) && (
                      <form action={revokeInvitation.bind(null, i.id)}>
                        <button type="submit" className="btn-secondary">
                          Withdraw
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">To add someone or change a role, ask the business owner or an admin.</p>
      )}
    </section>
  );
}

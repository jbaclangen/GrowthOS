import type { SupabaseClient } from "@supabase/supabase-js";

// The signed-in user's own memberships, read through their client. RLS ("members read memberships") returns every
// membership in the user's organizations, co-members' included, and every organization's for platform staff, so each
// read filters by the user's id: otherwise a second member could get the first member's role, or a business they
// don't belong to. Unit-tested.
//
// A person can belong to several businesses (D-062). The one the app works on is the business they chose
// (lib/organizations/current.ts, passed in as `chosenId`) when they're a member of it, and otherwise their oldest
// membership.

export type MemberOrganization = { id: string; name: string; plan: string; trial_ends_at: string; role: string };

async function memberships(db: SupabaseClient, userId: string): Promise<MemberOrganization[]> {
  const { data, error } = await db
    .from("memberships")
    .select("role, created_at, organizations(id, name, plan, trial_ends_at)")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((m) => {
    const org = m.organizations as unknown as Omit<MemberOrganization, "role"> | null;
    return org ? [{ ...org, role: m.role as string }] : [];
  });
}

const pick = (orgs: MemberOrganization[], chosenId?: string | null) =>
  (chosenId ? orgs.find((o) => o.id === chosenId) : undefined) ?? orgs[0] ?? null;

// The business the user is working on, with its plan and trial: what the tier (lib/plans/access.ts) and the in-app
// assistant read. A failed read throws: callers treat null as "no business yet" and may create one
// (settings/actions.ts, analysis/actions.ts), so a lost read must not look like that.
export async function currentOrganization(db: SupabaseClient, userId: string, chosenId?: string | null): Promise<MemberOrganization | null> {
  return pick(await memberships(db, userId), chosenId);
}

// The same business, as its id, name and the user's role there.
export async function currentMembership(db: SupabaseClient, userId: string, chosenId?: string | null) {
  const org = await currentOrganization(db, userId, chosenId);
  return org ? { id: org.id, name: org.name, role: org.role } : null;
}

// Every organization the user belongs to, oldest membership first. A failed read gives an empty list.
export async function memberOrganizations(db: SupabaseClient, userId: string): Promise<MemberOrganization[]> {
  return memberships(db, userId).catch(() => []);
}

// The businesses the user's account owns (role owner): what the business limit counts (lib/plans/business-limit.ts).
// Unlike memberOrganizations, a failed read throws, so it can't pass for "owns none" and lift the limit in the UI
// (create_organization() checks again in the database either way).
export async function ownedOrganizations(db: SupabaseClient, userId: string): Promise<MemberOrganization[]> {
  return (await memberships(db, userId)).filter((o) => o.role === "owner");
}

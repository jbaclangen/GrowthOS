import type { SupabaseClient } from "@supabase/supabase-js";

// The signed-in user's own memberships, read through their client. RLS ("members read memberships") returns every
// membership in the user's organizations, co-members' included, and every organization's for platform staff, so each
// read filters by the user's id: otherwise a second member could get the first member's role, or a business they
// don't belong to. Unit-tested.

export type MemberOrganization = { id: string; name: string; plan: string; trial_ends_at: string; role: string };

// The user's first organization (MVP: one per user) and their role in it.
export async function currentMembership(db: SupabaseClient, userId: string) {
  const { data } = await db
    .from("memberships")
    .select("role, organizations(id, name)")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const org = data?.organizations as unknown as { id: string; name: string } | null;
  return org ? { id: org.id, name: org.name, role: data!.role as string } : null;
}

// Every organization the user belongs to, oldest membership first.
export async function memberOrganizations(db: SupabaseClient, userId: string): Promise<MemberOrganization[]> {
  const { data } = await db
    .from("memberships")
    .select("role, organizations(id, name, plan, trial_ends_at)")
    .eq("user_id", userId)
    .order("created_at");
  return (data ?? []).flatMap((m) => {
    const org = m.organizations as unknown as Omit<MemberOrganization, "role"> | null;
    return org ? [{ ...org, role: m.role as string }] : [];
  });
}

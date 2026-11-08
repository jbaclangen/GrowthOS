import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentMembership } from "@/lib/memberships";
import { chosenBusinessId, isOrganizationId } from "@/lib/organizations/current";
import { memberRole } from "@/lib/team/server";

// Data Access Layer: every page and action resolves the user through here.

export async function getUser() {
  // Signed-in pages render per request. Reading cookies alone doesn't defer rendering under Cache Components,
  // and the Supabase session check reads the clock, so opt in explicitly.
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

// The business the user is working on and their role in it (D-062): the one they chose with the business switcher
// (lib/organizations/current.ts) if they're a member of it, otherwise their oldest membership. RLS also returns
// co-members' memberships, so the read is filtered by the user's id (lib/memberships.ts).
//
// `organizationId`: a business a form or the OAuth state names explicitly (the onboarding "Connect your tools" step,
// connection cards). Then it's that business or null when the user isn't a member: never another one, so an action
// can't land on a different business than the page showed.
export async function getCurrentOrg(userId: string, organizationId?: unknown) {
  const supabase = await createSupabaseServerClient();
  if (organizationId !== undefined && organizationId !== null && organizationId !== "") {
    if (!isOrganizationId(organizationId)) return null;
    const [role, { data: org }] = await Promise.all([
      memberRole(supabase, organizationId, userId),
      supabase.from("organizations").select("id, name").eq("id", organizationId).maybeSingle(),
    ]);
    return role && org ? { id: org.id as string, name: org.name as string, role: role as string } : null;
  }
  return currentMembership(supabase, userId, await chosenBusinessId());
}

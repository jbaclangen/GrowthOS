import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentMembership } from "@/lib/memberships";

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

// The user's organization (MVP: one org per user) and their role in it. RLS also returns co-members' memberships,
// so the read is filtered by the user's id (lib/memberships.ts).
export async function getCurrentOrg(userId: string) {
  return currentMembership(await createSupabaseServerClient(), userId);
}

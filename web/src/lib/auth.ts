import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

// The user's organization (MVP: one org per user). RLS limits this to their own memberships.
export async function getCurrentOrg() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("memberships")
    .select("role, organizations(id, name)")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const org = data?.organizations as unknown as { id: string; name: string } | null;
  return org ? { id: org.id, name: org.name, role: data!.role as string } : null;
}

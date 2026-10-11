import "server-only";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { effectiveAccess, type Access } from "./tiers";

// The signed-in user's organization and its current tier (D-030). RLS limits the read to the user's own org.
export async function getOrgAccess(): Promise<({ orgId: string; orgName: string } & Access) | null> {
  // The trial depends on the current time, so this always renders at request time (Cache Components).
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("memberships")
    .select("organizations(id, name, plan, trial_ends_at)")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const org = data?.organizations as unknown as
    | { id: string; name: string; plan: string; trial_ends_at: string }
    | null;
  if (!org) return null;
  return { orgId: org.id, orgName: org.name, ...effectiveAccess(org) };
}

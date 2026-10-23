import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { can, isRole, type Permission, type Role } from "./roles";

// The signed-in user's role in one organization, read through their own client. RLS ("members read memberships")
// returns co-members' rows too, so the read filters by both ids (lib/memberships.ts). Null when the user isn't a
// member; platform staff without a membership get null, as has_permission() in the database gives them nothing.
export async function memberRole(db: SupabaseClient, organizationId: string, userId: string): Promise<Role | null> {
  const { data } = await db
    .from("memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  return isRole(data?.role) ? data.role : null;
}

// Whether the user may do this in the organization (lib/team/roles.ts). The same check as has_permission() in SQL.
export async function hasPermission(db: SupabaseClient, organizationId: string, userId: string, permission: Permission): Promise<boolean> {
  return can(await memberRole(db, organizationId, userId), permission);
}

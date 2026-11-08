"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrganizationId, rememberBusiness } from "@/lib/organizations/current";
import { memberRole } from "@/lib/team/server";

// The business switcher (D-062): the header menu and Settings → Businesses. Remembers the chosen business only when
// the user is a member of it (read through RLS), then opens its dashboard. Every page and action keeps checking the
// role in that business; the choice itself grants nothing.
export async function switchBusiness(formData: FormData) {
  const user = await requireUser();
  const organizationId = formData.get("organizationId");
  if (!isOrganizationId(organizationId)) redirect("/settings#businesses");
  const role = await memberRole(await createSupabaseServerClient(), organizationId, user.id);
  if (!role) redirect("/settings#businesses");
  await rememberBusiness(organizationId);
  redirect("/dashboard");
}

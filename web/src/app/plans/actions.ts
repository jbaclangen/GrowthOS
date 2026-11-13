"use server";

import { getCurrentOrg, requireUser } from "@/lib/auth";
import { isOrganizationId } from "@/lib/organizations/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RequestState = { error?: string; sent?: boolean } | undefined;

// "Talk to us": there is no billing yet (D-030), so an upgrade starts as a request the Braventa team follows up.
export async function requestUpgrade(tier: "basic" | "pro" | "premium", _: RequestState, formData: FormData): Promise<RequestState> {
  const user = await requireUser();
  if (tier !== "basic" && tier !== "pro" && tier !== "premium") return { error: "That plan isn't available." };
  const message = String(formData.get("message") ?? "").trim();
  if (message.length > 1000) return { error: "Keep your message under 1,000 characters." };

  // The business whose plan the page showed (organizationId, D-062), never the cookie's: the user may have switched
  // business in another tab. getCurrentOrg would fall back to the cookie without an id, so a missing one is refused.
  const organizationId = formData.get("organizationId");
  const org = isOrganizationId(organizationId) ? await getCurrentOrg(user.id, organizationId) : null;
  if (!org) return { error: "This business wasn't found. Reload the page and try again." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("upgrade_requests")
    .insert({ organization_id: org.id, tier, message: message || null });
  if (error) return { error: "Your request wasn't sent. Try again." };
  return { sent: true };
}

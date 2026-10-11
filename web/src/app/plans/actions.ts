"use server";

import { requireUser } from "@/lib/auth";
import { getOrgAccess } from "@/lib/plans/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RequestState = { error?: string; sent?: boolean } | undefined;

// "Talk to us": there is no billing yet (D-030), so an upgrade starts as a request the Braventa team follows up.
export async function requestUpgrade(tier: "pro" | "premium", _: RequestState, formData: FormData): Promise<RequestState> {
  await requireUser();
  if (tier !== "pro" && tier !== "premium") return { error: "That plan isn't available." };
  const message = String(formData.get("message") ?? "").trim();
  if (message.length > 1000) return { error: "Keep your message under 1,000 characters." };

  const access = await getOrgAccess();
  if (!access) return { error: "Analyze a website first so we know which business this is for." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("upgrade_requests")
    .insert({ organization_id: access.orgId, tier, message: message || null });
  if (error) return { error: "Your request wasn't sent. Try again." };
  return { sent: true };
}

"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { normalizeUrl } from "@/lib/integrations/crawler";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOnboarding, queueJob } from "@/lib/onboarding/start";
import { parseOwnerInputs, toProfileColumns } from "@/lib/owner-inputs";

export type StartState = { error?: string } | undefined;

const startSchema = z.object({
  website: z.string().trim().min(3, "Enter a website address"),
  businessName: z.string().trim().max(120).optional(),
});

export async function startAnalysis(_: StartState, formData: FormData): Promise<StartState> {
  const user = await requireUser();
  const parsed = startSchema.safeParse({
    website: formData.get("website"),
    businessName: formData.get("businessName") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const owner = parseOwnerInputs(formData);
  if ("error" in owner) return { error: owner.error };

  let websiteUrl: string;
  try {
    websiteUrl = normalizeUrl(parsed.data.website);
  } catch {
    return { error: "That doesn't look like a website address" };
  }

  const supabase = await createSupabaseServerClient();
  let org = await getCurrentOrg();
  if (!org) {
    const name = parsed.data.businessName || new URL(websiteUrl).hostname.replace(/^www\./, "");
    const { data: orgId, error } = await supabase.rpc("create_organization", { org_name: name });
    if (error) return { error: error.message };
    org = { id: orgId as string, name, role: "owner" };
  }

  // Discovery runs alongside the website analysis (D-028): open a session, start the evidence job now,
  // and send the owner to the discovery questions while it runs.
  const started = await createOnboarding(supabase, {
    organizationId: org.id,
    userId: user.id,
    websiteUrl,
    businessName: parsed.data.businessName,
    owner: owner.data,
  });
  if ("error" in started) return { error: started.error };
  redirect(`/onboarding/${started.sessionId}`);
}

export async function rerunAnalysis(businessProfileId: string) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("id, organization_id, website_url")
    .eq("id", businessProfileId)
    .single();
  if (!profile?.website_url) throw new Error("Business not found");
  await queueJob(
    supabase,
    profile.organization_id,
    "website_intel",
    { businessProfileId: profile.id, websiteUrl: profile.website_url },
    user.id,
  );
  refresh();
}

export async function setContentStatus(itemId: string, status: "approved" | "rejected" | "needs_approval") {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("content_items")
    .update({
      status,
      approved_by: status === "approved" ? user.id : null,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  refresh();
}

export type OwnerInputsState = { error?: string; saved?: boolean } | undefined;

// Saves the guided onboarding answers (Customer-provided). RLS limits the update to the user's own org.
export async function saveOwnerInputs(
  businessProfileId: string,
  _: OwnerInputsState,
  formData: FormData,
): Promise<OwnerInputsState> {
  await requireUser();
  const owner = parseOwnerInputs(formData);
  if ("error" in owner) return { error: owner.error };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("business_profiles")
    .update(toProfileColumns(owner.data))
    .eq("id", businessProfileId)
    .select("id");
  if (error) return { error: "Your answers weren't saved. Try again." };
  if (!data?.length) return { error: "This business wasn't found." };
  refresh();
  return { saved: true };
}

"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { normalizeUrl } from "@/lib/integrations/crawler";
import { runWebsiteIntel } from "@/lib/pipeline/website-intel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StartState = { error?: string } | undefined;

// Queues the website-intel job as the signed-in user (RLS checks membership),
// then runs it after the response so the browser can show progress.
async function queueJob(organizationId: string, businessProfileId: string, websiteUrl: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: job, error } = await supabase
    .from("ai_jobs")
    .insert({
      organization_id: organizationId,
      worker: "website_intel",
      task_class: "complex",
      input: { businessProfileId, websiteUrl },
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !job) throw new Error(error?.message ?? "Could not queue analysis");
  after(() => runWebsiteIntel(job.id));
}

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

  const { data: profile, error } = await supabase
    .from("business_profiles")
    .insert({
      organization_id: org.id,
      company_name: parsed.data.businessName || new URL(websiteUrl).hostname.replace(/^www\./, ""),
      website_url: websiteUrl,
    })
    .select("id")
    .single();
  if (error || !profile) return { error: error?.message ?? "Could not save the business" };

  await queueJob(org.id, profile.id, websiteUrl, user.id);
  redirect(`/analysis/${profile.id}`);
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
  await queueJob(profile.organization_id, profile.id, profile.website_url, user.id);
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

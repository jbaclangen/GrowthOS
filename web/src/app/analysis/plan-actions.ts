"use server";

import { after } from "next/server";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runAnalysisJob } from "@/lib/pipeline/website-intel";
import { finalPriorities } from "@/lib/plan/priority";

// Owner actions on the diagnosis and growth plan (ON-7, ON-8, MS-5). All go through the signed-in user's
// client: RLS limits them to the user's organization, and column grants to the review and status fields.

export type ActionResult = { error?: string };

const VERDICTS = ["pending", "confirmed", "rejected"] as const;
const ITEM_STATUSES = ["proposed", "accepted", "dismissed", "done"] as const;
const MAX_NOTE = 500;

export async function setFindingVerdict(
  findingId: string,
  verdict: (typeof VERDICTS)[number],
  note: string | null,
): Promise<ActionResult> {
  await requireUser();
  if (!VERDICTS.includes(verdict)) return { error: "That isn't a valid choice." };
  const cleanNote = note?.trim() || null;
  if (cleanNote && cleanNote.length > MAX_NOTE) return { error: `Keep your correction under ${MAX_NOTE} characters.` };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("diagnosis_findings")
    .update({ owner_verdict: verdict, owner_note: verdict === "rejected" ? cleanNote : null })
    .eq("id", findingId)
    .select("id");
  if (error || !data?.length) return { error: "Your answer wasn't saved. Try again." };
  refresh();
  return {};
}

async function loadDiagnosis(diagnosisId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: diagnosis } = await supabase
    .from("diagnoses")
    .select("id, organization_id, business_profile_id, status")
    .eq("id", diagnosisId)
    .maybeSingle();
  return { supabase, diagnosis };
}

// The owner agrees with the diagnosis: fix the plan order (owner priorities first, then the calculated score).
export async function confirmDiagnosis(diagnosisId: string): Promise<ActionResult> {
  const user = await requireUser();
  const { supabase, diagnosis } = await loadDiagnosis(diagnosisId);
  if (!diagnosis) return { error: "This diagnosis wasn't found." };
  if (diagnosis.status !== "proposed") return { error: "This diagnosis has already been confirmed or replaced." };

  const [{ data: findings }, { data: items }] = await Promise.all([
    supabase.from("diagnosis_findings").select("owner_verdict").eq("diagnosis_id", diagnosis.id),
    supabase
      .from("growth_plan_items")
      .select("id, status, customer_priority, calculated_priority, ai_priority")
      .eq("diagnosis_id", diagnosis.id),
  ]);
  if ((findings ?? []).some((f) => f.owner_verdict === "rejected")) {
    return { error: "Some findings are marked wrong. Update the plan with your corrections first." };
  }

  const ranks = finalPriorities(
    (items ?? []).map((i) => ({ ...i, calculated_priority: Number(i.calculated_priority) })),
  );
  for (const [id, rank] of ranks) {
    const { error } = await supabase.from("growth_plan_items").update({ final_priority: rank }).eq("id", id);
    if (error) return { error: "Your plan wasn't saved. Try again." };
  }
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("diagnoses")
    .update({ status: "confirmed", confirmed_at: now, confirmed_by: user.id })
    .eq("id", diagnosis.id)
    .eq("status", "proposed");
  if (error) return { error: "Your plan wasn't saved. Try again." };

  // A newly confirmed plan replaces the business's earlier confirmed one.
  await supabase
    .from("diagnoses")
    .update({ status: "superseded" })
    .eq("business_profile_id", diagnosis.business_profile_id)
    .eq("status", "confirmed")
    .neq("id", diagnosis.id);
  refresh();
  return {};
}

// The owner marked findings as wrong: re-run the diagnosis with their corrections (one Opus call, ~40 s).
export async function requestDiagnosisUpdate(diagnosisId: string): Promise<ActionResult> {
  const user = await requireUser();
  const { supabase, diagnosis } = await loadDiagnosis(diagnosisId);
  if (!diagnosis) return { error: "This diagnosis wasn't found." };
  if (diagnosis.status !== "proposed") return { error: "This diagnosis has already been confirmed or replaced." };

  const { data: corrected } = await supabase
    .from("diagnosis_findings")
    .select("id")
    .eq("diagnosis_id", diagnosis.id)
    .eq("owner_verdict", "rejected")
    .limit(1);
  if (!corrected?.length) return { error: "Mark at least one finding as wrong first." };

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("website_url")
    .eq("id", diagnosis.business_profile_id)
    .single();
  const { data: running } = await supabase
    .from("ai_jobs")
    .select("id")
    .eq("input->>businessProfileId", diagnosis.business_profile_id)
    .in("status", ["queued", "running"])
    .limit(1);
  if (running?.length) return { error: "An update is already running. It takes about a minute." };

  const { data: job, error } = await supabase
    .from("ai_jobs")
    .insert({
      organization_id: diagnosis.organization_id,
      worker: "diagnosis_update",
      task_class: "complex",
      input: { businessProfileId: diagnosis.business_profile_id, websiteUrl: profile?.website_url ?? "", diagnosisId: diagnosis.id },
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !job) return { error: "The update couldn't start. Try again." };
  after(() => runAnalysisJob(job.id));
  refresh();
  return {};
}

// MS-5: accept, dismiss or mark done; "proposed" undoes it.
export async function setPlanItemStatus(itemId: string, status: (typeof ITEM_STATUSES)[number]): Promise<ActionResult> {
  const user = await requireUser();
  if (!ITEM_STATUSES.includes(status)) return { error: "That isn't a valid choice." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("growth_plan_items")
    .update({
      status,
      status_changed_at: new Date().toISOString(),
      status_changed_by: status === "proposed" ? null : user.id,
    })
    .eq("id", itemId)
    .select("id");
  if (error || !data?.length) return { error: "Your change wasn't saved. Try again." };
  refresh();
  return {};
}

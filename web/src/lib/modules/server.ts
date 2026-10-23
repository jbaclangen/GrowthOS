import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveAccess } from "@/lib/plans/tiers";
import { enabledModuleIds, type ModuleId, type ModuleOverride } from "./registry";

// Module bookkeeping for the pipeline (D-051). Every read and write is scoped to an organization the caller has
// already authorised (the job's organization): `db` is the admin client.

// The modules whose evidence feeds this organization's growth score: the live modules its tier includes, minus
// its overrides (organization_modules). Throws when the organization can't be read, since the score depends on it.
export async function enabledModules(db: SupabaseClient, org: string): Promise<Set<ModuleId>> {
  const [{ data: orgRow, error: orgError }, { data: overrides, error: overridesError }] = await Promise.all([
    db.from("organizations").select("plan, trial_ends_at").eq("id", org).single(),
    db.from("organization_modules").select("module_id, enabled").eq("organization_id", org),
  ]);
  if (orgError || !orgRow) throw new Error(`reading the organization failed: ${orgError?.message ?? "not found"}`);
  if (overridesError) throw new Error(`reading the module settings failed: ${overridesError.message}`);
  return enabledModuleIds(effectiveAccess(orgRow).tier, (overrides ?? []) as ModuleOverride[]);
}

export type ModuleRun = {
  organization_id: string;
  job_id: string;
  module_id: ModuleId;
  // completed: everything the module collects was collected; partial: it ran with some evidence missing.
  status: "completed" | "partial";
  sub_score: number | null;
  audit_run_id?: string | null;
  report_id?: string | null;
  rules_version: number;
  details?: Record<string, unknown>;
};

// One row per module that ran in a job (module_runs). Best effort, like the audit's storage: a failed write is
// logged and the analysis continues, since the rows are a record, not an input.
export async function recordModuleRuns(db: SupabaseClient, runs: ModuleRun[]): Promise<void> {
  if (runs.length === 0) return;
  const { error } = await db.from("module_runs").insert(runs.map((r) => ({ details: {}, ...r })));
  if (error) console.error(`recording module runs for job ${runs[0].job_id} failed`, error);
}

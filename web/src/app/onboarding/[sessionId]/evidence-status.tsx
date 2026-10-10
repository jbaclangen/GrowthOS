import { createSupabaseServerClient } from "@/lib/supabase/server";

// One line telling the owner the website analysis is running in the background (ON-4).
// Rendered on load only: the discovery form keeps its own state, so this page doesn't auto-refresh.
export async function EvidenceStatus({ jobId }: { jobId: string | null }) {
  if (!jobId) return null;
  const supabase = await createSupabaseServerClient();
  const { data: job } = await supabase.from("ai_jobs").select("status").eq("id", jobId).maybeSingle();

  const text =
    job?.status === "succeeded"
      ? "Your website has been read. Your answers will shape the plan."
      : job?.status === "failed"
        ? "We couldn't finish reading your website. Your answers are still saved; you can re-run the analysis afterwards."
        : "Braventa is reading your website in the background while you answer.";
  const tone = job?.status === "failed" ? "bg-warning-soft" : "bg-surface-muted";

  return (
    <p className={`mt-4 rounded-md px-3 py-2 text-sm ${tone}`} role="status">
      {text}
    </p>
  );
}

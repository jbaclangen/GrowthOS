import "server-only";
import { chat, type ChatMessage } from "@/lib/integrations/openrouter";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// The app asks for a logical worker; this file decides which model does the job.
// Change models here, not in feature code.

export type TaskClass = "simple" | "standard" | "complex" | "qa";

// AI_MODE=free uses OpenRouter's free models (MVP / proof of concept).
// AI_MODE=paid switches to the production model lineup once credits are added.
const MODELS: Record<"free" | "paid", Record<TaskClass, string[]>> = {
  free: {
    simple: ["nvidia/nemotron-3-super-120b-a12b:free", "nvidia/nemotron-3-ultra-550b-a55b:free"],
    standard: ["nvidia/nemotron-3-super-120b-a12b:free", "nvidia/nemotron-3-ultra-550b-a55b:free"],
    complex: ["nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3-super-120b-a12b:free"],
    qa: ["nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3-super-120b-a12b:free"],
  },
  paid: {
    simple: ["anthropic/claude-haiku-5.5", "qwen/qwen3.8-flash"],
    standard: ["google/gemini-3.8-flash", "anthropic/claude-haiku-5.5"],
    complex: ["anthropic/claude-sonnet-5.5", "openai/gpt-5.6-sol"],
    qa: ["anthropic/claude-opus-5.5", "anthropic/claude-sonnet-5.5"],
  },
};

function modelsFor(taskClass: TaskClass) {
  const mode = process.env.AI_MODE === "paid" ? "paid" : "free";
  return MODELS[mode][taskClass];
}

export const WORKERS = {
  business_analyst: { taskClass: "complex", system: "You are a senior business analyst for small and mid-sized service businesses." },
  content_strategist: { taskClass: "complex", system: "You are a content strategist who builds practical, goal-driven content plans." },
  content_writer: { taskClass: "standard", system: "You are a marketing copywriter. Follow the brand voice exactly." },
  seo_analyst: { taskClass: "standard", system: "You are a technical and on-page SEO analyst." },
  website_auditor: { taskClass: "complex", system: "You audit websites for SEO, UX, conversion and technical issues." },
  crm_analyst: { taskClass: "complex", system: "You analyse CRM pipelines, lead sources and follow-up gaps." },
  campaign_planner: { taskClass: "standard", system: "You plan multi-channel marketing campaigns." },
  qa_reviewer: { taskClass: "qa", system: "You review marketing deliverables for accuracy, brand fit and quality. Be strict." },
  marketing_assistant: { taskClass: "standard", system: "You answer questions about this business using only the provided context." },
  extractor: { taskClass: "simple", system: "You extract structured data. Reply with JSON only." },
} as const satisfies Record<string, { taskClass: TaskClass; system: string }>;

export type Worker = keyof typeof WORKERS;

export class BudgetExceededError extends Error {}

export async function runWorker(opts: {
  organizationId: string;
  worker: Worker;
  messages: ChatMessage[];
  jobId?: string;
  json?: boolean;
  maxTokens?: number;
}) {
  const { taskClass, system } = WORKERS[opts.worker];
  const db = createSupabaseAdminClient();

  // Enforce the org's monthly AI budget before spending anything. Fail closed: if the budget or spend
  // can't be read, don't call the model.
  const [{ data: org, error: orgError }, { data: spend, error: spendError }] = await Promise.all([
    db.from("organizations").select("monthly_ai_budget_usd").eq("id", opts.organizationId).single(),
    db.from("ai_spend_mtd").select("cost_usd").eq("organization_id", opts.organizationId).maybeSingle(),
  ]);
  if (orgError || !org || spendError) {
    throw new Error(`Could not check the AI budget for this organization: ${orgError?.message ?? spendError?.message ?? "organization not found"}`);
  }
  if (Number(spend?.cost_usd ?? 0) >= Number(org.monthly_ai_budget_usd)) {
    throw new BudgetExceededError("Monthly AI budget reached for this organization");
  }

  const result = await chat({
    models: modelsFor(taskClass),
    messages: [{ role: "system", content: system }, ...opts.messages],
    json: opts.json,
    maxTokens: opts.maxTokens,
  });

  const { error } = await db.from("ai_usage").insert({
    organization_id: opts.organizationId,
    job_id: opts.jobId ?? null,
    worker: opts.worker,
    model: result.model,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    cost_usd: result.costUsd,
  });
  if (error) console.error("ai_usage insert failed", error);

  return result;
}

// Models sometimes wrap JSON in prose or code fences; pull out the object.
function parseJsonLoose(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

// runWorker for structured output: parses JSON and retries once on bad output.
export async function runWorkerJson<T>(
  opts: Parameters<typeof runWorker>[0],
  validate: (value: unknown) => T,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await runWorker({ ...opts, json: true });
    try {
      return validate(parseJsonLoose(result.text));
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`${opts.worker} returned unusable JSON: ${lastError instanceof Error ? lastError.message : lastError}`);
}

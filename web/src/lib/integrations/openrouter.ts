import "server-only";
import { env } from "@/lib/env";

const BASE = "https://openrouter.ai/api/v1";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatResult = {
  text: string;
  model: string; // the model that actually answered (may be a fallback)
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

function headers() {
  return {
    Authorization: `Bearer ${env().OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": env().NEXT_PUBLIC_APP_URL,
    "X-Title": "GrowthOS",
  };
}

// One chat completion. `models` is tried in order; OpenRouter handles fallback.
export async function chat(opts: {
  models: string[];
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}): Promise<ChatResult> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      models: opts.models,
      messages: opts.messages,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      response_format: opts.json ? { type: "json_object" } : undefined,
      usage: { include: true },
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: data.model,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    costUsd: data.usage?.cost ?? 0,
  };
}

// Key status: remaining credit, limits, free-tier flag.
export async function keyInfo() {
  const res = await fetch(`${BASE}/key`, { headers: headers() });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  return (await res.json()).data as {
    limit: number | null;
    limit_remaining: number | null;
    usage: number;
    is_free_tier: boolean;
    expires_at: string | null;
  };
}

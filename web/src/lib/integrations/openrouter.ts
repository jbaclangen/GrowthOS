import "server-only";
import { env } from "@/lib/env";

const BASE = "https://openrouter.ai/api/v1";
// Free models can take a minute or more on long outputs; past this we give up rather than hang the job.
const CHAT_TIMEOUT_MS = 120_000;
const KEY_TIMEOUT_MS = 15_000;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatResult = {
  text: string;
  model: string; // the model that actually answered (may be a fallback)
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  finishReason: string | null; // "length" means the output hit maxTokens and was cut off
};

function headers() {
  return {
    Authorization: `Bearer ${env().OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": env().NEXT_PUBLIC_APP_URL,
    "X-Title": "Braventa",
  };
}

// Dropped connections ("fetch failed", "terminated") and provider hiccups are worth one more try;
// bad requests and our own timeout are not.
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = 3000;

class RetryableError extends Error {}

function isDroppedConnection(e: unknown) {
  return e instanceof TypeError && /fetch failed|terminated|socket|ECONNRESET/i.test(`${e.message} ${String(e.cause ?? "")}`);
}

// One chat completion. `models` is tried in order; OpenRouter handles fallback.
export async function chat(opts: {
  models: string[];
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}): Promise<ChatResult> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await chatOnce(opts);
    } catch (e) {
      const retryable = e instanceof RetryableError || isDroppedConnection(e);
      if (!retryable || attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

async function chatOnce(opts: Parameters<typeof chat>[0]): Promise<ChatResult> {
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
    signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
  });
  if (!res.ok) {
    const message = `OpenRouter ${res.status}: ${await res.text()}`;
    throw RETRYABLE_STATUS.has(res.status) ? new RetryableError(message) : new Error(message);
  }
  const data = await res.json();
  // OpenRouter can answer 200 and report a provider failure in the body.
  if (data.error) {
    const code = Number(data.error.code);
    const message = `OpenRouter error ${data.error.code}: ${data.error.message}`;
    throw RETRYABLE_STATUS.has(code) ? new RetryableError(message) : new Error(message);
  }
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: data.model,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    costUsd: data.usage?.cost ?? 0,
    finishReason: data.choices?.[0]?.finish_reason ?? null,
  };
}

// Key status: remaining credit, limits, free-tier flag.
export async function keyInfo() {
  const res = await fetch(`${BASE}/key`, { headers: headers(), signal: AbortSignal.timeout(KEY_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  return (await res.json()).data as {
    limit: number | null;
    limit_remaining: number | null;
    usage: number;
    is_free_tier: boolean;
    expires_at: string | null;
  };
}

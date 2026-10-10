import "server-only";
import { env } from "@/lib/env";

// n8n is the execution layer: the app triggers workflows by webhook and
// n8n reports results back to /api/n8n/* with N8N_WEBHOOK_SECRET.

function api(path: string, init?: RequestInit) {
  const e = env();
  return fetch(`${e.N8N_BASE_URL}/api/v1${path}`, {
    ...init,
    headers: { "X-N8N-API-KEY": e.N8N_API_KEY, "Content-Type": "application/json", ...init?.headers },
  });
}

export async function listWorkflows() {
  const res = await api("/workflows?limit=100");
  if (!res.ok) throw new Error(`n8n ${res.status}`);
  const data = await res.json();
  return (data.data as { id: string; name: string; active: boolean }[]).map(({ id, name, active }) => ({
    id,
    name,
    active,
  }));
}

// Fire a production webhook, e.g. triggerWebhook("growthos/website-intel", {...}).
export async function triggerWebhook(path: string, payload: unknown) {
  const e = env();
  const res = await fetch(`${e.N8N_BASE_URL}/webhook/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-GrowthOS-Secret": e.N8N_WEBHOOK_SECRET },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`n8n webhook ${path} ${res.status}: ${await res.text()}`);
  return res.json().catch(() => ({}));
}

export function verifyCallback(request: Request) {
  return request.headers.get("x-growthos-secret") === env().N8N_WEBHOOK_SECRET;
}

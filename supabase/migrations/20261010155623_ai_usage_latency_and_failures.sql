-- Per-call AI telemetry (vision §10 principle 7; AI_ROUTING_AND_COSTS.md): latency and failed calls.
-- Failed calls are logged with cost 0, so ai_spend_mtd and budget checks are unaffected.
alter table public.ai_usage
  add column latency_ms integer check (latency_ms is null or latency_ms >= 0),
  add column status text not null default 'ok' check (status in ('ok', 'error')),
  add column error text check (error is null or char_length(error) <= 500);

comment on column public.ai_usage.latency_ms is 'Wall time of the call including OpenRouter retries, in milliseconds.';
comment on column public.ai_usage.status is 'ok = model answered; error = the call failed after retries (cost 0).';
comment on column public.ai_usage.error is 'Short error summary for failed calls; never includes prompts, keys or customer content.';

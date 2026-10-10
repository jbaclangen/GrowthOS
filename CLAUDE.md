# GrowthOS

AI-assisted growth system for service businesses: business intelligence, content engine,
website audit, CRM intelligence. Blueprint: GrowthOS_MVP_Product_Blueprint.pdf (Oct 2026).

## Layout
- `web/` — Next.js 16 app (App Router, `src/`, Tailwind 4). Next 16 renamed middleware to `src/proxy.ts`;
  read `web/node_modules/next/dist/docs/` before using unfamiliar Next APIs.
- `supabase/migrations/` — schema. Supabase project ref `mlztvhvmsullvwawwamc`.
- `n8n/` — exported n8n workflow JSON (instance: n8nautomations.pixelmarketingdesign.com).

## Architecture rules (do not break)
- Supabase is the system of record. n8n only executes workflows and calls back to `/api/n8n/*`.
- Every tenant table has `organization_id` + RLS via `public.is_member()`. New tables must too.
- AI calls go through `web/src/lib/ai/router.ts` (`runWorker`) — never call OpenRouter directly
  from features. It enforces the monthly budget and logs `ai_usage`.
- Secrets are server-only (`web/src/lib/env.ts`, `import "server-only"`). Never `NEXT_PUBLIC_` a secret.
- `createSupabaseAdminClient()` bypasses RLS: only for trusted server code, and always scope by an
  organization id you have already authorised.
- Human approval is the default before anything is published for a client.

## Commands (run in `web/`)
- `npm run dev` — dev server; `GET /api/health/integrations` checks every external service.
- `npm run build`, `npm run lint`

---
type: object
cluster: integrations
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: supabase/migrations/20261011055323_contact_requests.sql
---

# Contact request (`contact_requests`)

A message from the braventa.io contact form (early access, demo or question), stored insert-only by the marketing site and handed to HubSpot afterwards.

## Why this shape

Visitors are anonymous, so the table has no `organization_id` and the public may only insert the form fields (`supabase/migrations/20261011055323_contact_requests.sql:2-3,21-25`). Spam limits run in a security-definer trigger (3 per IP hash per hour, 5 per email per day) so counting never needs a readable table (`supabase/migrations/20261011070631_contact_rate_limit.sql:9-36`). Supabase stays the record; HubSpot gets a copy after the response (`site/src/app/contact/actions.ts:60-61`).

## Shape

- `intent`: `early_access | demo | question`; `status`: `new | replied | closed | spam`; `marketing_opt_in` default false (D-014) — `supabase/migrations/20261011055323_contact_requests.sql:7,13-15`
- `ip_hash` (HMAC of the visitor IP, salt `CONTACT_HASH_SALT`), 64 chars — `supabase/migrations/20261011070631_contact_rate_limit.sql:5,38,40`
- RLS "public insert" to anon and authenticated; grants insert only — `…contact_requests.sql:20-25`
- Trigger `contact_requests_rate_limit` before insert — `…contact_rate_limit.sql:11-36`
- Writer: `sendContact` with the publishable key, honeypot and timing token first — `site/src/app/contact/actions.ts:31-54`; `rate_limited` becomes a user message — `:55-57`
- HubSpot hand-off: `sendToHubspot` in `after()` — `site/src/app/contact/actions.ts:61`; Forms API with portal id + form GUID, custom properties — `site/src/lib/hubspot.ts:3-10,29-40`

Citations: `supabase/migrations/20261011055323_contact_requests.sql:5-25`, `site/src/app/contact/actions.ts:31-62`

## Connected to

- **owns:** nothing
- **owned-by:** nothing (not a tenant table)
- **joins:** nothing in the app schema
- **looks-like-but-is-not:** [upgrade-request](../tenancy/upgrade-request.md) (signed-in "Talk to us", has an organization); [assistant-usage](../access/assistant-usage.md)

## If you change this

- **Hits:** `site/src/app/contact/actions.ts`, `site/src/lib/hubspot.ts`, `docs/marketing/CONTACT_PIPELINE.md`
- **Does not hit:** any `web/` route, `is_member`, every process card

## Surfaces

| Surface | Role |
|---|---|
| braventa.io `/contact` (`site/src/app/contact/actions.ts`) | writes (insert only) |
| HubSpot Forms API (`site/src/lib/hubspot.ts`) | receives a copy |
| Supabase dashboard | reads; the team sets `status` |
| Braventa team | replies from HubSpot |

## See

- Source: `supabase/migrations/20261011055323_contact_requests.sql`, `site/src/app/contact/actions.ts`
- As built: `docs/marketing/CONTACT_PIPELINE.md`

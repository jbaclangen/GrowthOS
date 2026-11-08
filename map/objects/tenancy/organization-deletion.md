---
type: object
cluster: tenancy
universe: live
status: verified
verified: 2026-11-08
commit: de8b338
entity: supabase/migrations/20261108090000_remove_business.sql
---

# Organization deletion (`organization_deletions`)

One row per business an owner removed in Settings, kept after the business is gone; it records that a removal happened, not who asked for it.

## Why this shape

It must outlive the organization it names, so it has no foreign key and no `organization_id` cascade, and it isn't tenant data: no member can read it (`supabase/migrations/20261108090000_remove_business.sql:8-12,50-66`). It holds no personal data (no user, email, business name or website), so nothing in it needs erasing later; `deletionLogRow` builds it from named fields only (`web/src/lib/organizations/removal.ts:39-50`).

## Shape

- Columns `id`, `organization_id` (no FK), `plan` (check `trial`/`basic`/`pro`/`premium`), `organization_created_at`, `members` (≥ 0), `google_revoke` and `hubspot_revoke` (`none`/`revoked`/`failed`), `deleted_at` — `supabase/migrations/20261108090000_remove_business.sql:50-62`; index on `deleted_at desc` — `:63`.
- RLS on, no policies, all privileges revoked from `anon` and `authenticated`: service role only — `:65-66`.
- Written once per removal after the delete; a failed insert is logged to the server with the same fields — `web/src/app/settings/remove-business-actions.ts:78-88`. Shape checked by `web/src/lib/organizations/cascade.test.ts`.
- Not applied to the Supabase project yet at this commit (`docs/architecture/DATA_MODEL.md`, migrations table).

Citations: `supabase/migrations/20261108090000_remove_business.sql:8-12,50-66`; `web/src/lib/organizations/removal.ts:30-50`; `web/src/app/settings/remove-business-actions.ts:78-88`

## Connected to

- **owns:** nothing
- **owned-by:** none (platform log; outlives its organization)
- **joins:** [organization](organization.md) by id only, once the row is gone
- **looks-like-but-is-not:** `team_events` ([team-invitation](team-invitation.md)) — the tenant audit log, deleted with the organization and holding emails

## If you change this

- **Hits:** `deletionLogRow` and its test `web/src/lib/organizations/removal.test.ts`; `cascade.test.ts` (column list, no FK, service role only); [remove-business](../../processes/remove-business.md); `docs/architecture/SECURITY_AND_PRIVACY.md` §11; D-061.
- **Does not hit:** any page (nothing reads it in the app).

## Surfaces

| Surface | Role |
|---|---|
| `removeBusiness` (`web/src/app/settings/remove-business-actions.ts:87`) | writes |
| Braventa team in Supabase | reads |

## See

- Source: `supabase/migrations/20261108090000_remove_business.sql`
- As built: `docs/architecture/ROLES_AND_PERMISSIONS.md` §9

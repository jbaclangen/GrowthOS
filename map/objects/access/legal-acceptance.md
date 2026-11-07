---
type: object
cluster: access
universe: live
status: verified
verified: 2026-11-08
commit: fe535cb
entity: supabase/migrations/20261107224300_legal_acceptances.sql
---

# Legal acceptance (`legal_acceptances`)

One append-only row each time someone ticks an agreement checkbox in the app: the Terms, MSA and DPA at sign-up or on the terms banner, or a confirmation the documents require (website authorization, Search Console connect, access key, OAuth approval). D-057.

## Why this shape

It is the evidence that the Terms' liability cap and the MSA's connected-app clause bind the user. So the server writes every row with the secret key and the user can only read their own (`supabase/migrations/20261107224300_legal_acceptances.sql:31-35`). Recording never blocks the step it belongs to, and a failed read hides the banner instead of locking anyone out (`web/src/lib/legal/acceptances.ts:7-10,33-45`).

## Shape

- Columns: `user_id`, `organization_id` (null for `signup`/`terms_update`), `context`, `documents_version`, `documents[]`, `subject`, `accepted_at` — `supabase/migrations/20261107224300_legal_acceptances.sql:13-26`.
- Contexts, documents per context, `LEGAL_VERSION`, the checkbox field (`agree=yes`) and the error per step — `web/src/lib/legal/documents.ts:9,25-46,48-54,56-63`. They're kept equal to the SQL check by `web/src/lib/legal/documents.test.ts:52-62`.
- Write: `recordAcceptance` — `web/src/lib/legal/acceptances.ts:11-30`. Read: `hasAcceptedCurrentTerms` — `:33-45`.
- Checkbox UI: `ConsentCheckbox`, `LegalLink`, `CoreTermsSentence` — `web/src/components/legal/consent.tsx`.

Citations: `supabase/migrations/20261107224300_legal_acceptances.sql:13-37`, `web/src/lib/legal/acceptances.ts:11-45`

## Connected to

- **owns:** nothing
- **owned-by:** auth user (cascade), [organization](../tenancy/organization.md) (cascade, optional)
- **joins:** none
- **looks-like-but-is-not:** [team-invitation](../tenancy/team-invitation.md) `team_events` (team changes, not agreements); [oauth-grant](oauth-grant.md) (the app's access itself, not the person's agreement)

## If you change this

- **Hits:**
  - a new step or context: `ACCEPTANCE_CONTEXTS` plus a migration that changes the check constraint (the test fails otherwise);
  - a material change to the legal pages (`site/src/app/legal/`): change `LEGAL_VERSION` so everyone sees the banner (`docs/architecture/LEGAL_ACCEPTANCE.md` §4);
  - checkout, when billing is built: §5 of the same doc.
- **Does not hit:** what a step does once agreed; the checkbox never changes permissions ([member-role](../tenancy/member-role.md)).

## Surfaces

| Surface | Role |
|---|---|
| Sign-up `web/src/app/login/actions.ts:38,49-52`, form `auth-form.tsx:35-37` | writes `signup` |
| Terms banner `web/src/components/legal/terms-banner.tsx`, action `web/src/lib/legal/actions.ts`, root layout `web/src/app/layout.tsx:42-44` | reads, writes `terms_update` |
| `startAnalysis` `web/src/app/analysis/actions.ts:36,71`, form `web/src/app/onboarding/start-form.tsx:46-49` | writes `website_authorization` |
| Google start route `web/src/app/api/integrations/google/start/route.ts:39` (checks), callback `.../callback/route.ts:105-113` | writes `search_console_connect` |
| `createAccessKey` `web/src/app/settings/actions.ts:24,53`; `createServiceKey` `web/src/app/settings/integrations-actions.ts:36,55` | writes `access_key` |
| OAuth approval `web/src/app/oauth/authorize/actions.ts:27,42-45` | writes `assistant_oauth` |

## See

- Source: `supabase/migrations/20261107224300_legal_acceptances.sql`, `web/src/lib/legal/`
- As built: `docs/architecture/LEGAL_ACCEPTANCE.md`

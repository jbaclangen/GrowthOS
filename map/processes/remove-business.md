---
type: process
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
consumes: ["[[organization]]", "[[membership]]", "[[member-role]]", "[[ai-job]]", "[[integration-connection]]"]
produces: ["[[organization-deletion]]"]
---

# remove-business

An owner types `DELETE APPROVED` in Settings and the business goes: Google and HubSpot access is ended, the `organizations` row is deleted with every tenant row by cascade, and one log row without personal data is left.

## Input → Movement → Output

Input: a signed-in member submitting the Remove business dialog in Settings with an organization id and the typed phrase. Movement: the server checks `organization.delete` through the user's own client, the exact phrase, and that no analysis is queued or running; then, with the secret key scoped to that organization, it revokes the stored Google tokens, ends the HubSpot access (uninstalls the app, or, when another business in Braventa is connected to the same portal, revokes only this business's token so the other keeps it), deletes the organization row and writes `organization_deletions`. Output: no organization (and none of its tenant rows), one `organization_deletions` row, and the dashboard with a `?removed=` notice showing the user's next business or the no-business state.

## Why this shape

`organizations` has no delete policy, so a client can't delete the row with the publishable key and skip the revokes HubSpot's terms ask for (`supabase/migrations/20261108091111_remove_business.sql:3-7`). The phrase and the permission are checked on the server because the dialog's disabled button is only a convenience (`web/src/lib/organizations/removal.ts:7-13,22-26`). A running analysis blocks removal so paid model calls don't continue for a business that is gone (`web/src/app/settings/remove-business-actions.ts:42-53`). A failed revoke doesn't block it: the token is deleted with the business, and the dashboard tells the owner how to end the access themselves (`remove-business-actions.ts:62-70,91-93`; `web/src/app/dashboard/page.tsx:24-30`).

## Steps

1. Settings → Businesses lists every business; owners (`organization.delete`) get Remove next to each one they own — `web/src/app/settings/businesses-section.tsx:104` (D-062); the dialog (`<dialog>`, `showModal`) keeps Remove business disabled until the phrase matches — `web/src/app/settings/remove-business-section.tsx:22,121`.
2. `removeBusiness`: signed-in user and a UUID organization id — `web/src/app/settings/remove-business-actions.ts:30-34`.
3. Role through RLS (`memberRole`) and `removalAllowed` (permission first, then the exact phrase) — `remove-business-actions.ts:37-39`; `web/src/lib/organizations/removal.ts:22-26`; matrix `web/src/lib/team/roles.ts:105`.
4. Stale jobs failed, then refuse while a job is `queued` or `running` — `remove-business-actions.ts:45-53`.
5. Plan, creation time and member count read for the log — `remove-business-actions.ts:55-59`.
6. Revoke: `revokeGoogleForRemoval` (every distinct token at Google) — `web/src/lib/integrations/google-connection.ts:118-130`; `revokeHubSpotForRemoval` — `web/src/lib/integrations/hubspot.ts:411-427` through `endHubSpotAccess`: uninstall when no other business is connected to the portal, else revoke only this token, or nothing when another business holds the same token — `:361-379`, other connections read by `otherPortalTokens` `:335-359`; a failed read of this or the other connections stops the removal — `remove-business-actions.ts:62-70`; tested in `web/src/lib/integrations/hubspot-disconnect.test.ts`.
7. Delete the `organizations` row; every tenant table cascades — `remove-business-actions.ts:72-76`; checked by `web/src/lib/organizations/cascade.test.ts`.
8. Log the row (`deletionLogRow`, no personal data); a failed insert goes to the server log — `remove-business-actions.ts:78-88`; `web/src/lib/organizations/removal.ts:50`.
9. Redirect to `/dashboard?removed=done|check-tools` — `remove-business-actions.ts:91-93`; notice `web/src/app/dashboard/page.tsx:24-34,84-88`; the dashboard opens the next business through `getCurrentOrg` — `:36`.

## Human gate

The owner reads the dialog's list of what is deleted and types `DELETE APPROVED` (step 1). Nothing else asks: there is no grace period or restore (Q-065).

## If you change this

- **Hits:** [organization](../objects/tenancy/organization.md) (the only delete path), [member-role](../objects/tenancy/member-role.md) (`organization.delete`), [integration-connection](../objects/integrations/integration-connection.md) (the revoke helpers, HubSpot's shared-portal rule and `hubspot-disconnect.test.ts`), [organization-deletion](../objects/tenancy/organization-deletion.md), every tenant table's foreign key (`cascade.test.ts`), [assistant-knowledge](../objects/access/assistant-knowledge.md) (the Remove a business section and its labels, `web/src/lib/assistant/assistant.test.ts`), `docs/architecture/ROLES_AND_PERMISSIONS.md` §9, D-061.
- **Does not hit:** `auth.users` and account deletion; the pipeline (a removed business's late hand-off finds no job and stops, `web/src/lib/pipeline/website-intel.ts:922-926`); global tables (`oauth_clients`, `contact_requests`, `platform_admins`); the account's trial and other businesses ([account-trial](../objects/tenancy/account-trial.md)); `memberships_owner_guard`, including its written, not applied delete extension, which leaves cascades alone (`supabase/migrations/20261114120000_memberships_owner_guard_delete.sql:28-31`; [membership](../objects/tenancy/membership.md)).

## Surfaces

| Surface | Role |
|---|---|
| Owner | reads the dialog, types the phrase |
| Settings → Remove business (`web/src/app/settings/remove-business-section.tsx`) | dialog, error shown with `role="alert"` |
| `removeBusiness` (`web/src/app/settings/remove-business-actions.ts`) | checks, revokes, deletes, logs |
| Google OAuth revoke endpoint, HubSpot uninstall or token revoke | end Braventa's access at the provider |
| `/dashboard` | `?removed=` notice, next business or the no-business state |

## See

- Objects: [[organization]], [[organization-deletion]], [[member-role]], [[integration-connection]], [[ai-job]]
- Source: `web/src/app/settings/remove-business-actions.ts`, `web/src/lib/organizations/removal.ts`

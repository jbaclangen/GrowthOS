---
type: process
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
consumes: ["[[membership]]", "[[organization]]"]
produces: []
---

# switch-business

A person picks one of their businesses in the header or in Settings → Businesses, and every page, action and connection from then on works on it (D-062).

## Input → Movement → Output

Input: a signed-in person submitting a business id from the header switcher or Settings → Businesses (or creating a business, or accepting an invite). Movement: the server checks they're a member of that business through RLS and writes the `brv_business` cookie. Output: `getCurrentOrg`, `getOrgAccess` and the in-app assistant return that business; the dashboard lists only its websites (`web/src/app/dashboard/page.tsx:40-62`).

## Why this shape

The cookie is a preference, not an authorisation: every read checks membership again and falls back to the oldest membership, so a removed business or another account's cookie can't widen access (`web/src/lib/organizations/current.ts:4-8`; `web/src/lib/memberships.ts:27-28`). Pages, forms and OAuth flows that already know their business don't depend on it: `getCurrentOrg(userId, organizationId)` returns that business or nothing (`web/src/lib/auth.ts:30-44`), the forms that act on one business post its id and are refused when it is missing, malformed or foreign (step 7), and the OAuth callbacks act on the business sealed in the state (`web/src/app/api/integrations/google/callback/route.ts:51-55`), so switching in another tab mid-flow can't act on the wrong business.

## Steps

1. Header: `BusinessSwitcher` for sm and up — `web/src/app/layout.tsx:68,78`; its form posts to `switchBusiness` — `web/src/components/business-switcher.tsx:65-66`; phones link to Settings → Businesses — `web/src/components/account-menu.tsx:46-50`.
2. Settings → Businesses lists every business with Switch, Add a business and owners' Remove — `web/src/app/settings/businesses-section.tsx:49,67,97,104`.
3. `switchBusiness`: UUID, `memberRole` through RLS, `rememberBusiness`, redirect to the dashboard — `web/src/app/settings/business-actions.ts:12-20`; cookie — `web/src/lib/organizations/current.ts:14-28`.
4. Reads: `currentMembership` / `currentOrganization` pick the chosen business only if the person belongs to it — `web/src/lib/memberships.ts:27-41`; `getCurrentOrg` — `web/src/lib/auth.ts:33-44`; `getOrgAccess` — `web/src/lib/plans/access.ts:18`; the assistant — `web/src/app/api/assistant/route.ts:66`, its launcher keyed by business so a switch starts a new conversation — `web/src/app/layout.tsx:75-77`.
5. Also set by a new business (`web/src/app/analysis/actions.ts:65`, `web/src/app/settings/actions.ts:54`) and an accepted invite (`web/src/app/invite/[token]/actions.ts:66-67`).
6. Connect forms carry `organizationId`; start routes seal it — `web/src/app/api/integrations/google/start/route.ts:35-37,58`, `web/src/app/api/integrations/hubspot/start/route.ts:34-36,53`; callbacks use it — `web/src/app/api/integrations/google/callback/route.ts:51-55`, `web/src/app/api/integrations/hubspot/callback/route.ts:45-49`.
7. Forms that act on one business post the id the page showed and resolve it with `getCurrentOrg(userId, id)`, never the cookie's: Settings → Team — `web/src/app/settings/team-actions.ts:17-19,23-29`; personal keys (no id only when a business name sets up a new one) — `web/src/app/settings/actions.ts:29-43`; service keys — `web/src/app/settings/integrations-actions.ts:26-30`; the onboarding start form (`business=new` for a new one) — `web/src/app/analysis/actions.ts:50-57`, `web/src/app/onboarding/start-form.tsx:9-11,19-27`; the `/plans` request — `web/src/app/plans/actions.ts:16-20`.

## Human gate

The person chooses the business. Nothing else is approved here.

## If you change this

- **Hits:** everything that calls `getCurrentOrg` or `getOrgAccess` (dashboard, Settings, `/plans`, `/search`, connection cards and actions, OAuth routes, the assistant); the forms in step 7 and their tests (`web/src/app/settings/team-actions.test.ts`, `web/src/app/settings/key-actions.test.ts`, `web/src/app/analysis/actions.test.ts`, `web/src/app/plans/actions.test.ts`); [remove-business](remove-business.md) (the dashboard opens the next business); [invite-and-join](invite-and-join.md); `web/src/lib/memberships.test.ts`; `docs/architecture/ROLES_AND_PERMISSIONS.md:270-293` (§10).
- **Does not hit:** the MCP server (a key or grant names its business, `web/src/lib/mcp/auth.ts`), the pipeline (jobs carry their organization), pages reached by a record id (`/analysis/[id]`, onboarding sessions), which read that record's business through RLS.

## Surfaces

| Surface | Role |
|---|---|
| header switcher, Settings → Businesses | write the choice |
| new business, accepted invite | write the choice |
| every signed-in page | reads it |
| forms that name a business | ignore it |

## See

- Source: `web/src/lib/organizations/current.ts`
- As built: `docs/architecture/ROLES_AND_PERMISSIONS.md` §10

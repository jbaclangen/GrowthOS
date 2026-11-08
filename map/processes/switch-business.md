---
type: process
universe: live
status: verified
verified: 2026-11-08
commit: 9bcdf0b
consumes: ["[[membership]]", "[[organization]]"]
produces: []
---

# switch-business

A person picks one of their businesses in the header or in Settings → Businesses, and every page, action and connection from then on works on it (D-062).

## Input → Movement → Output

Input: a signed-in person submitting a business id from the header switcher or Settings → Businesses (or creating a business, or accepting an invite). Movement: the server checks they're a member of that business through RLS and writes the `brv_business` cookie. Output: `getCurrentOrg`, `getOrgAccess` and the in-app assistant return that business; the dashboard lists only its websites.

## Why this shape

The cookie is a preference, not an authorisation: every read checks membership again and falls back to the oldest membership, so a removed business or another account's cookie can't widen access (`web/src/lib/organizations/current.ts:4-8`; `web/src/lib/memberships.ts:27-28`). Pages and OAuth flows that already know their business don't depend on it: `getCurrentOrg(userId, organizationId)` returns that business or nothing (`web/src/lib/auth.ts:33-44`), and the OAuth callbacks act on the business sealed in the state (`web/src/app/api/integrations/google/callback/route.ts:51-55`), so switching in another tab mid-flow can't connect the wrong business.

## Steps

1. Header: `BusinessSwitcher` for sm and up — `web/src/app/layout.tsx:76`; `web/src/components/business-switcher.tsx`; phones link to Settings from `web/src/components/account-menu.tsx`.
2. Settings → Businesses lists every business with Switch, Add a business and owners' Remove — `web/src/app/settings/businesses-section.tsx:49,97,104`.
3. `switchBusiness`: UUID, `memberRole` through RLS, `rememberBusiness`, redirect to the dashboard — `web/src/app/settings/business-actions.ts:12-20`; cookie — `web/src/lib/organizations/current.ts:14-28`.
4. Reads: `currentMembership` / `currentOrganization` pick the chosen business only if the person belongs to it — `web/src/lib/memberships.ts:28-41`; `getCurrentOrg` — `web/src/lib/auth.ts:33-44`.
5. Also set by a new business (`web/src/app/analysis/actions.ts:60`, `web/src/app/settings/actions.ts:40`) and an accepted invite (`web/src/app/invite/[token]/actions.ts:67`).
6. Connect forms carry `organizationId`; start routes seal it — `web/src/app/api/integrations/google/start/route.ts:37`, `web/src/app/api/integrations/hubspot/start/route.ts:36`; callbacks use it — `web/src/app/api/integrations/hubspot/callback/route.ts:45-49`.

## Human gate

The person chooses the business. Nothing else is approved here.

## If you change this

- **Hits:** everything that calls `getCurrentOrg` or `getOrgAccess` (dashboard, Settings, `/plans`, `/search`, connection cards and actions, OAuth routes, the assistant); [remove-business](remove-business.md) (the dashboard opens the next business); [invite-and-join](invite-and-join.md); `web/src/lib/memberships.test.ts`.
- **Does not hit:** the MCP server (a key or grant names its business, `web/src/lib/mcp/auth.ts`), the pipeline (jobs carry their organization).

## Surfaces

| Surface | Role |
|---|---|
| header switcher, Settings → Businesses | write the choice |
| every signed-in page | reads it |

## See

- Source: `web/src/lib/organizations/current.ts`
- As built: `docs/architecture/ROLES_AND_PERMISSIONS.md` §10

# HubSpot connection: spec and setup

**Status / last reviewed: 2026-11-08.** The code is built (see [INTEGRATIONS.md](INTEGRATIONS.md#hubspot-pro-read-only)).
Until the steps in §3 are done, Settings → Connections says "HubSpot connection isn't set up yet" and nothing else
changes. The steps are for the founder: they need a HubSpot sign-in, the HubSpot CLI, Vercel and Supabase. Decisions:
D-048 (HubSpot read-only first, REST with per-tenant OAuth, unlisted app), D-059 (store aggregates only).

## 1. What it does

- An owner of a Pro, Premium or trial business connects HubSpot in Settings → Connections or on the onboarding step
  "Connect your tools". Only the owner (`integrations.connect`, D-046). Basic sees it paused.
- Read-only. Braventa reads contacts, companies, deals and deal pipelines and stores **only counts and totals** in
  `hubspot_snapshots.metrics` (`HubSpotMetrics` in `web/src/lib/integrations/hubspot-metrics.ts`): no names, email
  addresses, phone numbers, deal names, record ids or owner names.
- The HubSpot card shows the counts. They are **not** used in the diagnosis or the growth score yet; that is the CRM
  module (D-051), the next step.
- Fetches on connect and on **Refresh HubSpot counts** (at most every 10 minutes). Nothing runs in the background.
- Disconnect uninstalls the app from the portal, revokes the token and deletes every snapshot.

## 2. HubSpot facts this relies on (checked 2026-11-08)

| Fact | Value | Source |
|---|---|---|
| Developer account | Not needed: every standard HubSpot account has Development (legacy developer accounts were migrated 2026-03-09) | [Account types](https://developers.hubspot.com/docs/getting-started/account-types) |
| Platform | `2026.09` (Current since 2026-09-08); set it explicitly, the CLI defaults to `2026.03` | [Versioning](https://developers.hubspot.com/docs/developer-tooling/platform/versioning), [Project commands](https://developers.hubspot.com/docs/developer-tooling/local-development/hubspot-cli/project-commands) |
| App config | `hubspot/hsproject.json` + `hubspot/src/app/app-hsmeta.json`; `distribution: "marketplace"`, `auth.type: "oauth"` | [App configuration](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/app-configuration) |
| `permittedUrls` | Required by the CLI (8.18.0 rejects the upload without `config.permittedUrls`, although the docs list it as optional). Empty `fetch`, `iframe` and `img` lists: the app has no UI extensions, so it allows no URLs | `hs project validate`, 2026-11-08 |
| Unlisted | No flag: Distribution tab → Begin publishing → sign the Acceptable Use Policy → close without creating a listing. Up to 25 installs (test accounts don't count). Installers see an "unverified app" warning and type "I accept the risk"; Super admins or users with Marketplace access can install | [Manage apps](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/manage-apps-in-hubspot) |
| Authorize | `https://app.hubspot.com/oauth/authorize?client_id&redirect_uri&scope&state` | [Working with OAuth](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/oauth/working-with-oauth) |
| PKCE | Not documented for app OAuth; the flow uses the client secret | [Manage OAuth tokens](https://developers.hubspot.com/docs/api-reference/latest/authentication/manage-oauth-tokens) |
| Token | `POST https://api.hubapi.com/oauth/2026-09/token` (form): code exchange and refresh. Access tokens last 30 minutes. A refresh may return a new refresh token: always keep the latest | same; [token management](https://developers.hubspot.com/blog/oauth-token-management-hubspot-integrations) |
| Portal | `POST /oauth/2026-09/token/introspect` → `hub_id`, `hub_domain`, `scopes` (it also returns the installing user's email, which Braventa doesn't read) | [Manage OAuth tokens](https://developers.hubspot.com/docs/api-reference/latest/authentication/manage-oauth-tokens) |
| Disconnect | `DELETE /appinstalls/2026-09/external-install` (Bearer access token; HubSpot emails the portal admins), then `POST /oauth/2026-09/token/revoke` | [App uninstalls](https://developers.hubspot.com/docs/api-reference/latest/app-management/app-uninstalls/guide), [Revoke token](https://developers.hubspot.com/docs/api-reference/latest/authentication/oauth-tokens/revoke-token) |
| Scopes | `crm.objects.contacts.read`, `crm.objects.companies.read`, `crm.objects.deals.read`; `oauth` is added to every app. Pipelines and property options are readable with the object scopes | [Scopes](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/scopes), [Get pipelines](https://developers.hubspot.com/docs/api-reference/latest/crm/pipelines/get-pipelines), [Get property](https://developers.hubspot.com/docs/api-reference/latest/crm/properties/get-property) |
| Search | `POST /crm/objects/2026-09/{contacts,companies}/search` returns `total`; 5 requests a second per portal, 10,000-result cap, dates as epoch milliseconds | [Search the CRM](https://developers.hubspot.com/docs/api-reference/latest/crm/search-the-crm) |
| Other limits | 110 requests per 10 s per installing portal (search excluded) | [Usage guidelines](https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines) |
| Data terms | Store data only as long as needed for the service; delete data and tokens when a customer stops or asks; no model training on customer data | [Developer Terms](https://legal.hubspot.com/hs-developer-terms) §4 |

Not relied on: the account-info currency endpoint (if it fails, amounts show without a currency and the card says so).

## 3. Setup (founder)

### 3.1 Apply the migration (done 2026-11-08)

`supabase/migrations/20261108043117_hubspot_connection.sql` was applied to production on 2026-11-08 (it adds
`hubspot` to the provider check next to the two Google products, the `external_account_id` and
`external_account_name` columns, the `hubspot_snapshots` table and the `hubspot_connect` agreement context). On a new
database, apply it before you set the environment variables in §3.3: without them the card never queries the new
table, so the code can deploy first.

### 3.2 Create and upload the app

1. Install the HubSpot CLI (version 8.15.0 or later) and sign in to the HubSpot account that will own the app (under
   Pixel Marketing Design for now, D-053): `hs account auth`, with a personal access key.
2. From the repo root: `cd hubspot`, then `hs project upload`. The upload creates the project and deploys it.
3. In HubSpot: Development → Projects → **braventa_hubspot** → **Braventa** → **Auth** tab. Copy the **Client ID** and
   **Client secret**.
4. Distribution tab → **Begin publishing** → sign the Acceptable Use Policy → close the panel without creating a
   listing. Until the policy is signed, only developer test accounts can install.
5. Check that the redirect URLs on the Auth tab are exactly:
   - `https://app.braventa.io/api/integrations/hubspot/callback`
   - `http://localhost:3000/api/integrations/hubspot/callback`
6. Check that `hello@braventa.io` (the support email in `app-hsmeta.json`) is a mailbox you read; change it there and
   upload again if not.

Never change the app's `uid` (`braventa_crm_reader`): HubSpot treats a new uid as a new app.

### 3.3 Set the environment variables

Add to `web/.env.local` and to the Vercel project for the app (Production), then redeploy:

| Variable | Value |
|---|---|
| `HUBSPOT_CLIENT_ID` | the app's client ID |
| `HUBSPOT_CLIENT_SECRET` | the app's client secret (server-only, never `NEXT_PUBLIC_`) |
| `INTEGRATIONS_ENCRYPTION_KEY` | already set for Search Console; the same key encrypts HubSpot tokens |

`GET /api/health/integrations` then reports `hubspot: configured`.

### 3.4 First connection

Connect The Benefit Link's portal as the first test (a real business: read-only, and its CRM data stays in
Braventa's tenant tables). Check the counts against HubSpot's own contact and deal views, then disconnect and
reconnect once to check that the counts are deleted and the app is uninstalled.

## 4. Before the feature is opened to customers

- The privacy policy and sub-processor page describe the connection (done in the same change; pending the founder and
  counsel, D-056).
- Past 25 installs, the app needs a marketplace listing and HubSpot's review.
- Platform 2026.09 is supported until about March 2028; plan the move to the next version before then.

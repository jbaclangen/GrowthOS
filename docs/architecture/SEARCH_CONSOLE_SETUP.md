# Google connection (Search Console and Google Analytics 4): setup

**Status / last reviewed: 2026-11-08.** The code is built (see [INTEGRATIONS.md](INTEGRATIONS.md#google-search-console-pro)).
Since 2026-11-08 the same Google sign-in also connects Google Analytics 4 (D-058): one consent screen asks for both
read-only scopes, and the owner can untick either. The Search Console steps below were done on 2026-10-11; the GA4
additions (§1 step 3, the scope in §2, the migration in §5) still have to be done before GA4 works in production.
Until the steps below are done, Settings → Connections says "Search Console connection isn't set up yet" and
nothing else changes. These steps are for the founder; they need access to Google Cloud, Vercel and Supabase.

## 1. Enable the API

1. Open [Google Cloud console](https://console.cloud.google.com/) and select the existing project
   **`growth-os-511206`** (the one that holds the PageSpeed key).
2. **APIs & Services → Library**, search for **Google Search Console API**, open it and click **Enable**.
   (It may already be enabled; the infrastructure notes say so, but check.)
3. For Google Analytics 4, enable two more APIs in the same project: **Google Analytics Data API** (the reports)
   and **Google Analytics Admin API** (the list of properties, their web streams, creation date and key events).
   Without them the GA4 card shows "Google Analytics data couldn't be fetched" after connecting.

## 2. OAuth consent screen (Google Auth Platform)

**APIs & Services → OAuth consent screen** (newer consoles call it **Google Auth Platform → Branding /
Audience / Data access**).

| Setting | Value |
|---|---|
| User type / Audience | **External** |
| App name | **Braventa** |
| User support email | A braventa.io mailbox you read (for example hello@braventa.io) |
| App logo | Optional. Adding one triggers brand verification; leave it empty until you apply for verification |
| App home page | `https://braventa.io` |
| Privacy policy | `https://braventa.io/legal/privacy` |
| Terms of service | `https://braventa.io/legal/terms` (if published) |
| Authorized domains | `braventa.io` |
| Developer contact email | Your email |
| Scopes (Data access → Add or remove scopes) | `openid`, `.../auth/userinfo.email`, `https://www.googleapis.com/auth/webmasters.readonly`, `https://www.googleapis.com/auth/analytics.readonly` (added for GA4 on 2026-11-08) |
| Test users (while the app is in Testing) | The Google accounts that will connect, for example your own and pilot customers' (up to 100) |

`webmasters.readonly` and `analytics.readonly` are **sensitive** scopes. While the app is unverified:
- only listed **test users** can connect (Publishing status: Testing), and refresh tokens for apps in Testing
  **expire after 7 days**, so a test connection has to be reconnected weekly;
- if you switch to **In production** without verification, users see the "Google hasn't verified this app"
  warning and the app is capped at **100 users**.

Before opening the connection to customers generally, submit the app for **Google verification** (Audience →
Publish app, then Verification centre). Google asks for: the privacy policy that describes the Search Console data
use (read-only performance and sitemap data, shown to the business's members in Braventa, summarized for the
diagnosis model, deleted on disconnect, not sold or used for ads; drafted on `/legal/privacy`, pending the founder and
counsel),
a demo video of the consent flow and of where the data appears, and proof of ownership of `braventa.io` (already
verified in Search Console). Verification typically takes several days to a few weeks. The privacy policy should be
reviewed against [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) §6 before you submit (the blueprint's legal
section §8.3 lists what it must say).

**Google Analytics 4 adds a scope to verify.** The app asks for `analytics.readonly` on the same consent screen, so
adding it to Data access means the verification must cover it too: the submission has to explain the GA4 data use
(read-only sessions, engagement, key events, channels and landing pages for the business's website, shown in
Braventa, summarized for the diagnosis and the growth score, deleted on disconnect, not sold or used for ads) and the
demo video has to show the GA4 card. If the app was verified for `webmasters.readonly` alone, adding the new scope
needs a new verification before customers who aren't test users can grant it (Q-061). The privacy and sub-processors pages
describe GA4 data since 2026-11-14 (Q-060, resolved).

## 3. Create the OAuth client

**APIs & Services → Credentials → Create credentials → OAuth client ID** (or **Google Auth Platform → Clients**).

- Application type: **Web application**
- Name: `Braventa app`
- Authorized JavaScript origins: not needed (the flow is server-side)
- **Authorized redirect URIs** (exactly):
  - `https://app.braventa.io/api/integrations/google/callback`
  - `http://localhost:3000/api/integrations/google/callback`

Copy the **Client ID** and **Client secret**. The app accepts only these two redirect URIs (plus the origin of
`NEXT_PUBLIC_APP_URL`); Vercel preview URLs won't work for this flow.

## 4. Set the environment variables

Generate the encryption key once (keep it secret; changing it later forces every owner to reconnect):

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add the three variables to `web/.env.local` (local) and to the Vercel project for the app (Production; Preview
only if you need it), then redeploy:

| Variable | Value |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | the OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | the OAuth client secret (server-only, never `NEXT_PUBLIC_`) |
| `INTEGRATIONS_ENCRYPTION_KEY` | the generated 32-byte base64 key (server-only) |

Use a different encryption key for local development and production. Check locally with
`GET http://localhost:3000/api/health/integrations` → `google_search_console.ok: true`.

## 5. Apply the migrations

Apply `supabase/migrations/20261011161133_search_console.sql` to the Supabase project (`mlztvhvmsullvwawwamc`),
with the Supabase CLI (`supabase db push`) or the dashboard SQL editor, then run the security advisor. It creates
`integration_connections` (the refresh-token column isn't readable by clients) and `search_console_snapshots`.

For GA4, `supabase/migrations/20261107224123_google_analytics.sql` (applied 2026-11-08) must be in place **before** the GA4 code is
deployed: it allows the `google_analytics` provider, adds `integration_connections.property_labels` and creates
`analytics_snapshots`. The connect code writes `property_labels` for both products, so without this migration
connecting Search Console fails too.

## 6. Try it

1. Sign in as an owner whose organization is on the Pro trial (or Pro/Premium) and has an analysed website.
2. **Settings → Connections → Connect Google**, sign in with a test-user Google account that has access to the
   website's Search Console property and its Google Analytics 4 property, and approve both permissions.
3. You land on Settings with "Search Console is connected…". If several properties match, choose one; the Google
   Analytics card asks the same when no web stream matches the website or several do.
4. **View search performance** opens `/search`. The Google Analytics card shows the last 28 days (sessions,
   engagement, key events, top channels).
5. **Disconnect Google** revokes the access at Google for both products and deletes the stored data. You can also check
   [Google Account → Security → Third-party connections](https://myaccount.google.com/connections).

## Limits worth knowing

- Search Analytics: about 1,200 queries per minute per site and per user; each sync makes five. URL Inspection:
  2,000 per day and 600 per minute per property; each sync makes one (home page only).
- Refresh is limited to once per 10 minutes per organization. There is no scheduled sync yet.
- Search Console data is a few days behind and leaves out rare and anonymized queries; the UI says so.
- Google Analytics 4: each sync makes one Data API batch of five reports, plus Admin API calls to list the
  account's properties (and the web streams of up to 25 of them when the property has to be matched), the property's
  details and its key events. The Data API's quotas are counted in tokens per property; check Google's current limits
  before a scheduled sync is added. A 429 keeps the connection active and shows "Google Analytics' limit is reached
  for now". GA4's window ends two days ago so the data has settled, and GA4 only counts visitors whose browsers load
  its tag, so it undercounts; the card and the diagnosis prompt say so.

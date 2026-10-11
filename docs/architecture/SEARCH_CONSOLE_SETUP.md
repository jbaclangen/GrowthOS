# Google Search Console connection: setup

**Status / last reviewed: 2026-10-11.** The code is built (see [INTEGRATIONS.md](INTEGRATIONS.md#google-search-console-pro)).
Until the steps below are done, Settings → Connections says "Search Console connection isn't set up yet" and
nothing else changes. These steps are for the founder; they need access to Google Cloud, Vercel and Supabase.

## 1. Enable the API

1. Open [Google Cloud console](https://console.cloud.google.com/) and select the existing project
   **`growth-os-511206`** (the one that holds the PageSpeed key).
2. **APIs & Services → Library**, search for **Google Search Console API**, open it and click **Enable**.
   (It may already be enabled; the infrastructure notes say so, but check.)

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
| Scopes (Data access → Add or remove scopes) | `openid`, `.../auth/userinfo.email`, `https://www.googleapis.com/auth/webmasters.readonly` |
| Test users (while the app is in Testing) | The Google accounts that will connect, for example your own and pilot customers' (up to 100) |

`webmasters.readonly` is a **sensitive** scope. While the app is unverified:
- only listed **test users** can connect (Publishing status: Testing), and refresh tokens for apps in Testing
  **expire after 7 days**, so a test connection has to be reconnected weekly;
- if you switch to **In production** without verification, users see the "Google hasn't verified this app"
  warning and the app is capped at **100 users**.

Before opening the connection to customers generally, submit the app for **Google verification** (Audience →
Publish app, then Verification centre). Google asks for: the privacy policy that describes the Search Console data
use (read-only performance and sitemap data, shown to the owner, deleted on disconnect, not sold or used for ads),
a demo video of the consent flow and of where the data appears, and proof of ownership of `braventa.io` (already
verified in Search Console). Verification typically takes several days to a few weeks. The privacy policy should be
reviewed against [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) §6 before you submit (the blueprint's legal
section §8.3 lists what it must say).

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

## 5. Apply the migration

Apply `supabase/migrations/20261011161133_search_console.sql` to the Supabase project (`mlztvhvmsullvwawwamc`),
with the Supabase CLI (`supabase db push`) or the dashboard SQL editor, then run the security advisor. It creates
`integration_connections` (the refresh-token column isn't readable by clients) and `search_console_snapshots`.

## 6. Try it

1. Sign in as an owner whose organization is on the Pro trial (or Pro/Premium) and has an analysed website.
2. **Settings → Connections → Connect Google Search Console**, sign in with a test-user Google account that has
   access to the website's Search Console property, and approve.
3. You land on Settings with "Search Console is connected…". If several properties match, choose one.
4. **View search performance** opens `/search`.
5. **Disconnect** revokes the access at Google and deletes the stored data. You can also check
   [Google Account → Security → Third-party connections](https://myaccount.google.com/connections).

## Limits worth knowing

- Search Analytics: about 1,200 queries per minute per site and per user; each sync makes five. URL Inspection:
  2,000 per day and 600 per minute per property; each sync makes one (home page only).
- Refresh is limited to once per 10 minutes per organization. There is no scheduled sync yet.
- Search Console data is a few days behind and leaves out rare and anonymized queries; the UI says so.

# Braventa HubSpot app (platform 2026.09)

The HubSpot developer project for Braventa's read-only HubSpot connection (D-048). It holds only configuration: the
app's name, its redirect URLs and its read-only scopes. The connection's code is in `web/` (`lib/integrations/hubspot*.ts`,
`/api/integrations/hubspot/*`).

- `hsproject.json`: project name, `src` folder, platform version `2026.09`.
- `src/app/app-hsmeta.json`: the app. `distribution: "marketplace"` with OAuth. It stays unlisted (no marketplace
  listing): up to 25 installs without HubSpot's review.

The scopes in `app-hsmeta.json` must equal `HUBSPOT_SCOPES` in `web/src/lib/integrations/hubspot-oauth.ts`, and the
redirect URLs must equal the ones the app accepts. `web/src/lib/integrations/hubspot.test.ts` checks both.

Setup, upload and the client credentials: [docs/architecture/HUBSPOT_SETUP.md](../docs/architecture/HUBSPOT_SETUP.md).

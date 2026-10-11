# Connect ChatGPT to Braventa (MCP)

**Status (2026-10-12): not possible yet.** ChatGPT's custom connectors (Developer mode) sign in with **OAuth** or use
**no authentication**; they can't send the `Authorization: Bearer brv_…` access key that Braventa's MCP server
requires today. Braventa needs an OAuth sign-in for its MCP server first (MCP phase 2, see §3). Until then, use
Claude Desktop or Claude Code ([CONNECT_YOUR_AI_ASSISTANT.md](CONNECT_YOUR_AI_ASSISTANT.md)).

Do **not** work around this by putting an access key in the server URL: URLs are logged by proxies and browsers, and
the key would grant full setup access to the business.

## 1. What the owner will do (once OAuth ships)

Needs a ChatGPT plan with Developer mode (Plus, Pro, Business, Enterprise or Edu; business workspaces may need an admin
to allow custom connectors). OpenAI moves these settings occasionally; the names below are as of October 2026.

1. In ChatGPT, open **Settings → Apps & Connectors → Advanced** and turn on **Developer mode**.
2. Go back to **Apps & Connectors** and choose **Create** (or **Add custom connector**).
3. Fill in:
   - **Name:** Braventa
   - **Description:** Fill in Braventa's business setup from what ChatGPT knows about my business.
   - **MCP server URL:** `https://app.braventa.io/api/mcp`
   - **Authentication:** OAuth
4. Tick that you trust the connector, then **Create**.
5. ChatGPT opens a Braventa sign-in window. Sign in, choose the business, and approve the access shown
   (setup and status only). You return to ChatGPT connected.
6. In a new chat, turn on Developer mode / the Braventa connector from the tools menu (**+ → Developer mode → Braventa**).
7. Ask: "Use Braventa to set up my business from what you know about it. Ask me about anything you're not sure of."
8. Check in Braventa → Settings that the connection shows as used. Disconnect any time in ChatGPT, and revoke it in
   Braventa → Settings.

ChatGPT asks for confirmation before tools that change data (starting the analysis, submitting answers); approve
each one.

## 2. Connectivity check (once OAuth ships)

1. Complete §1 steps 1–5.
2. In ChatGPT ask: "Check my Braventa status." It should call `braventa_get_status` and report the business or say no
   analysis has started.
3. In Braventa → Settings, the ChatGPT connection shows a recent "Last used" time.
If step 5 fails, the OAuth endpoints below are the place to look (`/.well-known/oauth-authorization-server`).

## 3. What Braventa must build first (MCP phase 2)

Per the MCP authorization spec (OAuth 2.1), the same work also unlocks claude.ai custom connectors:

- `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` metadata.
- Dynamic client registration (`/oauth/register`), which ChatGPT and claude.ai use to register themselves.
- `/oauth/authorize` with PKCE: the owner signs in to Braventa, picks the business, and approves "Set up and check
  status for this business"; the consent screen names the client (ChatGPT, Claude).
- `/oauth/token` issuing short-lived access tokens and refresh tokens, stored hashed, tied to user + organization,
  revocable in Settings next to personal keys; a `401` with `WWW-Authenticate` pointing at the metadata.
- `/api/mcp` accepts either a personal key (today) or an OAuth access token; same tools, same access rule
  (trial or paid plan, D-036), same rate limits.
- Privacy and Sub-processors pages: name OpenAI (ChatGPT) as the owner's own assistant, as Claude is today.

Estimate: one focused build day plus testing in ChatGPT and claude.ai.

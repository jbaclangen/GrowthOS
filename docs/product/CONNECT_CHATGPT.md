# Connect ChatGPT to Braventa (MCP)

**Status (2026-10-17): built; live once the `20261017120000_mcp_oauth.sql` migration is applied and the release is
deployed, then confirmed with a live ChatGPT test (§2).** ChatGPT's custom connectors sign in with OAuth, which
Braventa's MCP server now supports ("Sign in with Braventa", MCP phase 2; see
[MCP_SERVER.md](../architecture/MCP_SERVER.md) §3). Until it's live, use Claude Desktop or Claude Code with an
access key ([CONNECT_YOUR_AI_ASSISTANT.md](CONNECT_YOUR_AI_ASSISTANT.md)).

Don't work around anything by putting an access key in the server URL: URLs are logged by proxies and browsers, and
the key would grant full setup access to the business.

## 1. What the owner does

Needs a ChatGPT plan with Developer mode (Plus, Pro, Business, Enterprise or Edu; business workspaces may need an admin
to allow custom connectors). OpenAI moves these settings occasionally; the names below are as of October 2026, when
OpenAI's own documentation also describes the same step as **Plugins → + → Add custom MCP server**.

1. In ChatGPT, open **Settings → Apps** (also shown as Apps & Connectors) **→ Advanced settings** and turn on
   **Developer mode**.
2. Choose **Create** (or **Add custom MCP server**).
3. Fill in:
   - **Name:** Braventa
   - **Description:** Fill in Braventa's business setup from what ChatGPT knows about my business.
   - **MCP server URL:** `https://app.braventa.io/api/mcp`
   - **Authentication:** OAuth (ChatGPT discovers Braventa's sign-in and registers itself; no client ID needed)
4. Confirm that you trust the connector ("I understand and want to continue"), then create it.
5. ChatGPT opens a Braventa sign-in window. Sign in, choose the business and approve "Set up your business and check
   its status". You return to ChatGPT connected.
6. In a new chat, turn on Braventa from the **+** menu (Developer mode → Braventa).
7. Ask: "Use Braventa to set up my business from what you know about it. Ask me about anything you're not sure of."
8. Check in Braventa → Settings → Integrations → **Connected apps** that ChatGPT shows a recent "Last used" time.
   Disconnect any time there, or remove the connector in ChatGPT.

ChatGPT asks for confirmation before tools that change data (starting the analysis, submitting answers); approve
each one.

## 2. Connectivity check (first live test)

1. Complete §1 steps 1–5.
2. In ChatGPT ask: "Check my Braventa status." It should call `braventa_get_status` and report the business or say no
   analysis has started.
3. In Braventa → Settings → Integrations, ChatGPT appears under Connected apps with a recent "Last used" time.

If step 5 fails, check in this order: `GET /.well-known/oauth-protected-resource` and
`/.well-known/oauth-authorization-server` return JSON; `POST /oauth/register` returns 201 (not 429 or 500); the
`oauth_clients` row has ChatGPT's redirect URI (`https://chatgpt.com/connector_platform_oauth_redirect`, or
`https://chatgpt.com/connector/oauth/{callback_id}`); Vercel logs for `/oauth/token`.

## 3. What Braventa built (MCP phase 2)

- `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` metadata, with
  `authorization_response_iss_parameter_supported` (so ChatGPT can use its stable redirect URI).
- Dynamic client registration (`/oauth/register`). ChatGPT prefers Client ID Metadata Documents (CIMD) but uses DCR
  when the server doesn't advertise CIMD; Braventa doesn't, by design for now.
- `/oauth/authorize` with PKCE S256: sign in, pick the business, approve. The `resource` parameter ChatGPT sends is
  accepted as the MCP URL or the bare origin.
- `/oauth/token` (1-hour access tokens, rotating 30-day refresh tokens, stored hashed) and `/oauth/revoke`.
- `/api/mcp` accepts OAuth access tokens next to personal keys and service keys; same tools, same access rule (trial
  or paid plan, D-036), same rate limits; `401` with `WWW-Authenticate` pointing at the metadata.

Still open: the Privacy and Sub-processors pages should name OpenAI (ChatGPT) as the owner's own assistant, as Claude
is today (legal copy, not part of this build).

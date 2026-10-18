# Braventa MCP server: the AI assistant connection

**Status / last reviewed: 2026-10-17.** Phase 1 live (founder decision D-036): personal access keys for Claude Code
and Claude Desktop. **Phase 2 built, not yet live:** OAuth 2.1 sign-in ("Sign in with Braventa") for claude.ai,
Claude Desktop, Claude Code and ChatGPT connectors, plus organization-level service keys for automation. Phase 2
migration `20261017030000_mcp_oauth.sql` was applied to `mlztvhvmsullvwawwamc` on 2026-10-17, before the code
shipped (the code reads the new columns, so the migration must always land first).
Decision: D-044.

Owners who already worked on their business in an AI assistant let it fill in Braventa's onboarding: website,
discovery, priorities and follow-up questions. The owner still confirms or corrects the diagnosis and approves posts
in the app. Developer guide: [MCP_AND_API.md](../developers/MCP_AND_API.md).

## 1. What's live and what isn't

| | Status |
|---|---|
| Claude Code, Claude Desktop with a personal access key (`brv_…`) | Live (phase 1) |
| OAuth sign-in: claude.ai custom connectors (also used by Claude Desktop), Claude Code `/mcp` authenticate, ChatGPT Developer mode connectors | Built (phase 2); live after migration + deploy |
| Service keys (`brv_sk_…`) for n8n, Zapier, scripts | Built (phase 2); live after migration + deploy |
| Client ID Metadata Documents (CIMD) | Not built: clients register with DCR. ChatGPT falls back to DCR when CIMD isn't advertised |
| `read` / `write` scopes (plan, drafts, approvals) | Not built. Reserved names only |
| Anything that changes the plan, approves posts or publishes | Not offered. Approval stays in the app (D-013) |

## 2. How a request is handled

```
AI app ──POST JSON-RPC──▶ app.braventa.io/api/mcp  (web/src/app/api/mcp/route.ts)
          1. Origin check: no Origin, our own origin, or claude.ai / claude.com / chatgpt.com / chat.openai.com
          2. MCP-Protocol-Version check (2025-06-18, 2025-03-26)
          3. credential (lib/mcp/auth.ts), by format:
               brv_at_…  OAuth access token → oauth_tokens (hash) → grant not revoked, not expired,
                         resource = <origin>/api/mcp, user still a member
               brv_…     personal key → mcp_access_keys (kind personal) → user still a member
               brv_sk_…  service key  → mcp_access_keys (kind service) → not revoked, not expired
             none → 401 + WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource"
             bad  → 401 + the same header with error="invalid_token"
          4. plan check (lib/mcp/access.ts): tool calls refused with a clear message after the trial
          5. scope check: tools/list shows, and tools/call allows, only tools within the credential's scopes
          6. rate limit: 30 tool calls/minute, 300/hour per key or per OAuth grant (counted in mcp_tool_calls)
          7. tools (lib/mcp/tools.ts) → lib/onboarding — the same code as the web forms
          8. every tool call logged in mcp_tool_calls (key_id or oauth_grant_id, tool, ok, short error)
```

- **Transport:** Streamable HTTP, stateless, JSON responses only (no server-sent events, no sessions). `GET` and
  `DELETE` return 405; `OPTIONS` answers CORS preflights for the allowed origins. Implemented directly in
  `lib/mcp/protocol.ts` (no SDK dependency): `initialize`, `ping`, `tools/list`, `tools/call`, notifications.
- **Tenant isolation:** the route uses the service client, so every query is scoped to the credential's
  organization: sessions are loaded with `loadSession(db, id, organizationId)`, the status tool checks the business's
  `organization_id`, and IDs from the assistant are never trusted otherwise.
- **Untrusted input:** text from the assistant is owner input, validated with the same limits as the forms and
  passed to models as quoted data.

## 3. OAuth 2.1 authorization server (phase 2)

Implements the [MCP authorization spec (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization):
Braventa is both the resource server (`/api/mcp`) and the authorization server (issuer = the app origin).

| Endpoint | Spec | Notes |
|---|---|---|
| `GET /.well-known/oauth-protected-resource` (also `/…/api/mcp`) | RFC 9728 | `resource` = `<origin>/api/mcp`, `authorization_servers` = [`<origin>`], `scopes_supported` = [`onboarding`] |
| `GET /.well-known/oauth-authorization-server` (also `/…/api/mcp`) | RFC 8414 | endpoints below, `code_challenge_methods_supported` [S256], grants `authorization_code` + `refresh_token`, auth methods `none`, `client_secret_post`, `client_secret_basic`, `authorization_response_iss_parameter_supported: true` |
| `POST /oauth/register` | RFC 7591 | Dynamic client registration. Public clients (no secret) by default; a confidential client gets a `brv_cs_…` secret once. Redirect URIs: https, or http on localhost / 127.0.0.1 / [::1]; no fragments or credentials; up to 10. Rate limits, enforced atomically by a database trigger with advisory locks (`oauth_clients_rate_limit`): 10 per IP per hour, IPv6 counted per /64 (HMAC of the IP, key derived from `SUPABASE_SECRET_KEY`; the IP isn't stored), and 500 per hour overall for clients that aren't first-party. First-party: every redirect URI is on claude.ai, claude.com, chatgpt.com or chat.openai.com, or loopback; those can't send a code to anyone else, so a flood of other registrations never blocks owners connecting Claude or ChatGPT. Browsers may register only from Braventa, those AI clients and localhost (MCP Inspector); any other `Origin` gets 403. Clients that never connect are deleted after 7 days |
| `GET /oauth/authorize` | OAuth 2.1 §4.1 | App Router page. Validates the request first, then needs a Braventa session (otherwise `/login?next=…`, which returns here). Shows the app's self-declared name, the host it returns to, the scopes in plain language and what it can't do, and the user's own businesses (picker when they have several). Approve or Cancel. PKCE S256 required; `state` (up to 1,000 characters) returned exactly; `resource` must be the MCP URL or the bare origin; `iss` on every response (RFC 9207). An unknown client, an unregistered redirect URI or a longer `state` shows an error on Braventa's page. Other protocol errors (wrong `response_type`, no PKCE, wrong `resource`) show the error with the app's return host and a **Return to &lt;host&gt;** link: the page never redirects by itself, only the Approve/Cancel POST does |
| `POST /oauth/token` | OAuth 2.1 §3.2 | `authorization_code` (code, `code_verifier`, `redirect_uri` if sent, client) and `refresh_token` (rotation, reuse detection with a 60-second grace window, may narrow scopes; scopes that weren't granted are dropped, as at authorization). Client, `resource` and scope are checked before a refresh token is used, so a refused request keeps it. A malformed HTTP Basic header gets 401 `invalid_client` |
| `POST /oauth/revoke` | RFC 7009 | Revoking a refresh token ends the grant; an access token ends just that token. 200 for unknown tokens |

**Lifetimes and storage.** All secrets are 32 random bytes (base64url) with a prefix, stored only as SHA-256 hashes:

| Secret | Prefix | Lifetime |
|---|---|---|
| Authorization code | `brv_ac_` | 10 minutes, one use; bound to client, redirect URI, code challenge, user, organization, scopes, resource |
| Access token | `brv_at_` | 1 hour |
| Refresh token | `brv_rt_` | 30 days from issue; rotated on every use |
| Client secret (confidential clients only) | `brv_cs_` | No expiry; client id `brv_client_…` |

**Grants.** Approving creates an `oauth_grants` row (user + organization + client + scopes + resource); its tokens
are the grant's family. A grant ends when: the owner selects **Disconnect** in Settings → Integrations, the client
revokes its refresh token, a refresh token is reused (both holders lose access: `refresh_reuse`), an authorization
code is reused (`code_reuse`), or the user is no longer a member of the business (`membership`, checked at every
exchange, refresh and MCP call).

- **Refresh reuse and the grace window.** A rotated refresh token keeps `rotated_at` and `successor_id`. Presenting
  it again within 60 seconds, from the same client, while its successor is still unused, returns a fresh pair
  without ending the grant: that's a client sending two refreshes at once (two requests hit an expired access token)
  or retrying after a lost response. Later, or once the successor was used, it's reuse and the grant ends. A token
  revoked by Disconnect or the revocation endpoint is refused but isn't counted as reuse.
- **Code reuse during the first exchange.** A replay that arrives while the first exchange is still running inserts
  the grant already revoked (`code_reuse`), so the first exchange can't create it and gets `invalid_grant`.

**Logic and tests.** Rules live in pure modules with an in-memory store in tests: `lib/oauth/grants.ts` (codes,
exchange, rotation, revocation), `authorize-request.ts` + `consent.ts` (authorization request and the Approve/Cancel
decision, and what the page shows), `clients.ts` (registration, redirect URIs, first-party clients, IP buckets),
`click-guard.ts` (Approve delay), `http.ts` (client credentials, CORS), `pkce.ts`, `scopes.ts`, `server-metadata.ts`,
`tokens.ts`; `supabase-store.ts` is the database implementation. Settings reads: `lib/memberships.ts` and
`lib/mcp/service-keys.ts`. Tests: `lib/oauth/oauth.test.ts`, `click-guard.test.ts`, `migration.test.ts` (checks on
the SQL), `lib/memberships.test.ts`.

**Origins.** In production the issuer and resource come from `NEXT_PUBLIC_APP_URL` (never a Host header); in
development, from the request (any localhost port).

## 4. Scopes

| Scope | Status | Tools |
|---|---|---|
| `onboarding` | Live, default | All seven tools in §5 |
| `read` | Reserved | Planned: plan, drafts, report |
| `write` | Reserved | Planned: accept plan items, approve drafts (would need its own decision against D-013) |

Unknown or not-yet-live scopes in a request are dropped (the app still connects with `onboarding`); a refresh drops
scopes the connection wasn't granted the same way, and refuses only when none are left. Each tool
declares its scope in `lib/mcp/tools.ts`. Personal keys and service keys carry `onboarding` (column default; clients
can't set it).

## 5. Tools

| Tool | What it does |
|---|---|
| `braventa_start_onboarding` | Website (+ optional business name, goal, service area, tools). Starts the website evidence job and opens a discovery session. |
| `braventa_get_discovery_questions` | The pain-point catalog by category, plus the free-text question. |
| `braventa_submit_discovery` | Chosen pain point IDs + the owner's description. Returns candidates, including AI matches for the description (Haiku "extractor"). Unknown IDs are reported and ignored. |
| `braventa_confirm_priorities` | Kept candidates + top 1–3 priorities in order. Returns the first follow-up round, or finishes. |
| `braventa_get_follow_up_questions` | Pending follow-up questions (choice values or text). When none is waiting, a `next_step` saying how to continue (below). |
| `braventa_answer_follow_up_questions` | Answers (or `not_applicable`); `finish: true` skips the rest. Returns the next round or "completed" (the plan starts). |
| `braventa_get_status` | Where the session stands; when ready: growth score (with what it measures), top 3 plan items with first steps, report link. |

The server's `instructions` tell the assistant to use only what the owner said, skip rather than guess, and check
the priorities with the owner before confirming them. A session confirmed in the web app waits on Connect your tools
(D-054) with no follow-up questions generated yet. The assistant can't connect tools (only the owner can, in Braventa),
so `braventa_get_status` and `braventa_get_follow_up_questions` tell it to call `braventa_answer_follow_up_questions`
with no answers, which generates the next round or builds the plan. Input and output schemas: [MCP_AND_API.md](../developers/MCP_AND_API.md).

## 6. Who can use it (D-036)

Every plan during the 14-day trial. When the trial ends, tool calls return "paused because the free trial has
ended" until the organization is on a plan (`organizations.plan` = basic, pro or premium, set by the Braventa team
while there's no billing). The same rule applies to OAuth tokens and service keys; connecting (OAuth approval) still
works while paused, and the consent screen says so.

## 7. Credentials at a glance

| | Personal access key | OAuth (Sign in with Braventa) | Service key |
|---|---|---|---|
| For | Claude Desktop config, Claude Code header | claude.ai, Claude Desktop connectors, Claude Code `/mcp`, ChatGPT | n8n, Zapier, scripts |
| Belongs to | One user + business | One user + business + app | The business |
| Who creates it | Any member, for themselves (max 5 active) | The user, by approving | Owners only (max 10 active; expired keys don't count) |
| Expiry | None (revoke) | Access 1 h, refresh 30 days | Optional: 30, 90 or 365 days, or none |
| Revoke | Settings → Integrations → Your keys | Settings → Integrations → Connected apps → Disconnect | Settings → Integrations → Service keys → Revoke |
| `created_by` on rows it creates | The user | The user | Empty (no person) |

## 8. Settings → Integrations

The Settings page groups everything under **Integrations**: the AI assistant card (server URL, step-by-step
instructions for claude.ai, Claude Desktop, Claude Code and ChatGPT, and the phase 1 guided key flow under "Use an
access key instead"), **Connected apps** (OAuth grants: app name, business, scopes, connected and last used,
Disconnect for the person who connected it or an owner; "Signed out" when no refresh token is left), **Service keys**
(owners; only the current business's keys, with Revoke on expired ones too), and Google Search Console. Owner guide: [CONNECT_YOUR_AI_ASSISTANT.md](../product/CONNECT_YOUR_AI_ASSISTANT.md);
ChatGPT: [CONNECT_CHATGPT.md](../product/CONNECT_CHATGPT.md).

Claude Code with a key:

```bash
claude mcp add --transport http braventa https://app.braventa.io/api/mcp --header "Authorization: Bearer brv_…"
```

Claude Desktop config with a key (`claude_desktop_config.json`; the env variable avoids a Windows quoting problem):

```json
{ "mcpServers": { "braventa": { "command": "npx",
  "args": ["-y", "mcp-remote", "https://app.braventa.io/api/mcp", "--header", "Authorization:${BRAVENTA_AUTH}"],
  "env": { "BRAVENTA_AUTH": "Bearer brv_…" } } } }
```

## 9. Data

Migrations `20261011140425_mcp_access.sql` (phase 1) and `20261017030000_mcp_oauth.sql` (phase 2):

- `mcp_access_keys`: personal and service keys. `kind` (personal | service), `user_id` (null for service keys),
  `created_by`, `name`, `key_prefix`, `key_hash` (never readable from the browser), `scopes`, `expires_at`,
  `last_used_at`, `revoked_at`. RLS: personal keys, each person their own; service keys, owners only (`is_org_owner`).
  A trigger clears `user_id` on service keys so the owner policy decides. Revoking is one-way: the update policies
  only allow setting `revoked_at` on an active key, never clearing it.
- `memberships`: a trigger (`memberships_owner_guard`) lets only an owner create an owner membership or change one,
  so an admin can't promote themselves and then create service keys.
- `oauth_clients`: registered apps. Global (not tenant data), service role only. `first_party` marks clients whose
  redirect URIs are all on the AI clients' hosts or loopback; the rate-limit trigger counts the rest.
- `oauth_grants`: one approval (organization, user, client, client name, scopes, resource, last used, revoked).
  Members read their organization's (non-secret columns); only the server writes.
- `oauth_authorization_codes`: hashed one-time codes. Service role only.
- `oauth_tokens`: hashed access and refresh tokens; `rotated_at` and `successor_id` on rotated refresh tokens.
  Members can read non-secret columns (never `token_hash`); only the server writes.
- Cleanup: `oauth_cleanup()` (service role) deletes codes and tokens a day after they expire and clients that never
  connected 7 days after registering. The server runs it after each registration and code exchange; there's no
  schedule yet (Q-043).
- `mcp_tool_calls`: audit log and rate-limit source (`organization_id`, `key_id` or `oauth_grant_id`, tool, ok, error).
  Members read their organization's; only the server writes.
- Privacy: what the assistant sends is stored like form answers. The status summary goes back into the owner's
  assistant, whose provider (Anthropic, OpenAI) processes it under the owner's own account; that provider isn't a
  Braventa sub-processor for it.

## 10. Security notes

- Consent screen: framing blocked (`X-Frame-Options: DENY`, `frame-ancestors 'none'`); shows the redirect host
  because anyone can register a client with any name. Server actions carry Next.js's built-in origin check.
  Double-clickjacking (a page swapped in under a double-click, no frame needed): Approve stays disabled until the
  page has been visible and focused for 0.75 seconds, and every blur, hide or focus starts that again
  (`lib/oauth/click-guard.ts`).
- No open redirects: anyone can register a client with any https redirect URI, so `GET /oauth/authorize` never
  redirects by itself. Errors before the client and redirect URI are verified render on Braventa's page; later
  protocol errors show a link to the app's host that the person must click. Only the Approve/Cancel POST redirects.
- Hashes only: a database leak doesn't expose usable tokens or keys.
- CORS: metadata, token and revoke allow any origin without credentials (no cookies are used there); register
  answers browsers only from Braventa, the known AI clients and localhost; `/api/mcp` reflects only the allowed
  origins.
- `WWW-Authenticate` descriptions are limited to the RFC 6750 character set ("→" becomes ">"); the JSON-RPC body
  keeps the full message. A non-ASCII header value would make the 401 a 500.
- Login `?next=` accepts same-site paths only (`lib/safe-next.ts`).
- The token endpoint isn't rate-limited: codes and tokens are 256-bit random values. Registration is.
- Known gap: the consent form relies on JavaScript to follow the redirect; without it, the browser's `form-action
  'self'` CSP may block the redirect to the app.

## 11. Still to do

- Live test with claude.ai, Claude Desktop, Claude Code and ChatGPT once migration + deploy are done.
- Privacy and sub-processor pages: name OpenAI (ChatGPT) alongside Anthropic as the owner's own assistant, and
  describe OAuth connections, service keys and the registration IP hash.
- Optional: CIMD support, a scheduled `oauth_cleanup` (Q-043), read-only tools for the plan and drafts (Q-039).

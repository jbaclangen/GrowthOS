# Braventa MCP server: developer guide

**Audience:** developers connecting an AI client, automation tool or script to Braventa. **Last reviewed:
2026-10-17.** Architecture and internals: [MCP_SERVER.md](../architecture/MCP_SERVER.md).

**Status.** Personal access keys work today. OAuth sign-in and service keys are built and go live once the
`20261017120000_mcp_oauth.sql` migration is applied and the release is deployed; until then `/oauth/*` and service
keys return errors. Braventa has no REST API: the MCP server is the only programmatic interface.

## 1. Endpoint

```
POST https://app.braventa.io/api/mcp
Content-Type: application/json
Accept: application/json, text/event-stream
Authorization: Bearer <credential>
MCP-Protocol-Version: 2025-06-18        (or 2025-03-26; optional)
```

MCP over Streamable HTTP, stateless: JSON responses only, no server-sent events, no `Mcp-Session-Id`. `GET` and
`DELETE` return 405. Methods: `initialize`, `ping`, `tools/list`, `tools/call`, and notifications (answered with
202). Batches of up to 10 messages; bodies up to 64 KB.

## 2. Authentication

Three credentials, all sent as `Authorization: Bearer …`. Never put one in a URL.

| | OAuth access token | Personal access key | Service key |
|---|---|---|---|
| Format | `brv_at_` + 43 chars | `brv_` + 43 chars | `brv_sk_` + 43 chars |
| Get it | OAuth 2.1 flow (below) | Settings → Integrations → Use an access key instead | Settings → Integrations → Service keys (owners) |
| Acts as | The user who approved, for one business | The user who created it, for their business | The business (no user) |
| Lifetime | 1 hour (refresh token: 30 days, rotating) | Until revoked | Until revoked or its expiry (30/90/365 days or none) |
| Scopes | Approved scopes (`onboarding`) | `onboarding` | `onboarding` |
| Use for | Interactive AI apps (claude.ai, ChatGPT, Claude Code) | A single person's desktop/CLI setup | n8n, Zapier, cron jobs, backends |

### 2.1 OAuth 2.1 (MCP authorization spec 2025-06-18)

MCP clients do this automatically. For your own client:

1. Call `/api/mcp` without a token. You get `401` and
   `WWW-Authenticate: Bearer resource_metadata="https://app.braventa.io/.well-known/oauth-protected-resource"`.
2. `GET /.well-known/oauth-protected-resource` (RFC 9728) → `resource` (`https://app.braventa.io/api/mcp`) and
   `authorization_servers` (`https://app.braventa.io`).
3. `GET /.well-known/oauth-authorization-server` (RFC 8414) → endpoints, `code_challenge_methods_supported: ["S256"]`.
4. Register (RFC 7591), once per installation:
   ```bash
   curl -s https://app.braventa.io/oauth/register -H 'Content-Type: application/json' \
     -d '{"client_name":"My tool","redirect_uris":["http://127.0.0.1:8765/callback"]}'
   # → 201 {"client_id":"brv_client_…","token_endpoint_auth_method":"none",…}
   ```
   Redirect URIs must be https, or http on `localhost` / `127.0.0.1` / `[::1]` (any port at authorization time).
   Send `"token_endpoint_auth_method":"client_secret_post"` (or `client_secret_basic`) to get a `client_secret`
   (shown once). Limits: 10 registrations per IP per hour (IPv6: per /64). From a browser, only localhost (such as
   MCP Inspector), Braventa and the supported AI clients may register; other origins get 403. A client that hasn't
   connected within 7 days is deleted, so register again if you get "isn't registered".
5. Send the user's browser to:
   ```
   https://app.braventa.io/oauth/authorize?response_type=code&client_id=brv_client_…
     &redirect_uri=http%3A%2F%2F127.0.0.1%3A8765%2Fcallback&code_challenge=<S256 of verifier>
     &code_challenge_method=S256&state=<random>&scope=onboarding
     &resource=https%3A%2F%2Fapp.braventa.io%2Fapi%2Fmcp
   ```
   The user signs in, chooses a business and approves. You receive `?code=brv_ac_…&state=…&iss=https://app.braventa.io`
   (or `?error=access_denied`). Check `state` and `iss`.
6. Exchange the code within 10 minutes (one use):
   ```bash
   curl -s https://app.braventa.io/oauth/token \
     -d grant_type=authorization_code -d client_id=brv_client_… -d code=brv_ac_… \
     -d code_verifier=<verifier> -d redirect_uri=http://127.0.0.1:8765/callback \
     -d resource=https://app.braventa.io/api/mcp
   # → {"access_token":"brv_at_…","token_type":"Bearer","expires_in":3600,"refresh_token":"brv_rt_…","scope":"onboarding"}
   ```
7. Refresh before or after expiry. Every refresh returns a **new** refresh token; store it and discard the old one.
   Presenting an old refresh token again disconnects the app (reuse detection) and the user must approve again.
   Exception: within 60 seconds of a refresh, and while the new refresh token is unused, the same client can send
   the old one again and gets another fresh pair (for two requests refreshing at once, or a lost response). A
   refresh refused for `invalid_scope` or `invalid_target` keeps the token. `scope` on a refresh may narrow the
   grant; scopes it wasn't granted are dropped, and the response's `scope` says what you got.
   ```bash
   curl -s https://app.braventa.io/oauth/token -d grant_type=refresh_token -d client_id=brv_client_… -d refresh_token=brv_rt_…
   ```
8. Revoke on sign-out (RFC 7009): `POST /oauth/revoke` with `token` and `client_id`. A refresh token ends the whole
   connection.

Token errors follow RFC 6749 §5.2: `invalid_client` (401, also for a malformed HTTP Basic header), `invalid_grant`,
`invalid_scope` (none of the requested scopes were granted), `invalid_target`,
`unsupported_grant_type`, `invalid_request` (400). Not supported: implicit and password grants, client credentials,
`plain` PKCE, CIMD client IDs, OpenID Connect.

### 2.2 Personal and service keys

```bash
curl -s https://app.braventa.io/api/mcp \
  -H "Authorization: Bearer $BRAVENTA_KEY" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Service keys are for automation: they act for the business, so rows they create (onboarding sessions, jobs) have no
`created_by` user. Store them in your tool's credential store (n8n credentials, Zapier connection, a secret manager),
never in code or a URL.

**n8n:** HTTP Request node, POST `https://app.braventa.io/api/mcp`, Authentication: Generic → Header Auth (name
`Authorization`, value `Bearer brv_sk_…`), JSON body as above. n8n's MCP Client node also works with the same header.

## 3. Tools

All tools need the `onboarding` scope. Results come back as `structuredContent` and as JSON text in `content[0].text`.
Tool-level problems (wrong step, validation, paused trial, rate limit) return `isError: true` with a message meant for
the assistant to relay; they are not JSON-RPC errors.

| Tool | Input | Output (main fields) |
|---|---|---|
| `braventa_start_onboarding` | `website` (required), `business_name`, `goal` (one of the listed goals or free text, ≤200), `service_area` (≤200), `tools` (≤15 strings) | `session_id`, `status: "discovering"`, `website`, `next_step`, `report_url` |
| `braventa_get_discovery_questions` | `session_id` | `question`, `how_to_answer`, `categories[{id,label,pain_points[{id,label}]}]` |
| `braventa_submit_discovery` | `session_id`, `pain_point_ids` (≤12), `statement` (≤1,000 chars) | `status: "reviewing"`, `candidates[{pain_point_id,label,source,confidence?,owner_words?}]`, `ignored_unknown_ids?`, `next_step` |
| `braventa_confirm_priorities` | `session_id`, `keep_pain_point_ids` (≥1), `priorities` (1–3, ordered) | `status: "following_up"` + `questions[]`, or `status: "completed"` + `report_url` |
| `braventa_get_follow_up_questions` | `session_id` | `status`, `questions[{question_id,about,question,why_we_ask,type,choices?|example?,max_characters?}]` |
| `braventa_answer_follow_up_questions` | `session_id`, `answers[{question_id,answer?,not_applicable?}]` (≤10), `finish` | Next round of `questions`, or `status: "completed"` |
| `braventa_get_status` | `session_id` (optional; latest by default) | `status` (`not_started`, `discovering`, `reviewing`, `following_up`, `building_plan`, `failed`, `ready`), `business`, `report_url`; when ready `growth_score`, `growth_score_note`, `top_priorities[{title,first_step}]`, `diagnosis_status` |

Exact JSON Schemas: call `tools/list`. Order of use: start → get discovery questions → submit discovery → confirm
priorities (after checking with the owner) → answer follow-ups → get status. Use only information the owner gave;
Braventa never publishes anything, and the owner confirms the diagnosis and approves drafts in the app.

## 4. Errors and limits

| HTTP | When | Body / header |
|---|---|---|
| 401 | No credential | JSON-RPC error; `WWW-Authenticate: Bearer resource_metadata="…"` |
| 401 | Bad, revoked or expired credential; token for another resource; user left the business | Same, plus `error="invalid_token"` and an ASCII `error_description`; the JSON-RPC body has the full message |
| 403 | Browser `Origin` not allowed (only claude.ai, claude.com, chatgpt.com, chat.openai.com and Braventa itself) | JSON-RPC error |
| 400 | Invalid JSON, not JSON-RPC 2.0, unsupported `MCP-Protocol-Version` | JSON-RPC error (-32700 / -32600) |
| 413 | Body over 64 KB | JSON-RPC error |
| 200 + `isError` | Trial ended without a plan; rate limit; tool validation | Message in `content[0].text` |

Rate limits: 30 tool calls per minute and 300 per hour per key or per OAuth connection; 10 new analyses or re-runs
per business per 24 hours (same as the app); 10 client registrations per IP (IPv6: per /64) per hour. Access: every plan during the
14-day trial, then Basic, Pro or Premium (D-036). `tools/list` keeps working while paused.

## 5. Testing

**MCP Inspector:** `npx @modelcontextprotocol/inspector`, transport "Streamable HTTP", URL
`https://app.braventa.io/api/mcp`. Either use its OAuth flow (it registers itself and opens Braventa's sign-in), or
add the header `Authorization: Bearer brv_…`.

**curl smoke test:**

```bash
B=https://app.braventa.io
curl -s $B/.well-known/oauth-protected-resource
curl -s $B/.well-known/oauth-authorization-server
curl -si -X POST $B/api/mcp -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | grep -i www-authenticate
curl -s -X POST $B/api/mcp -H "Authorization: Bearer $BRAVENTA_KEY" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"braventa_get_status","arguments":{}}}'
```

Local development: `npm run dev` in `web/`; the metadata then names `http://localhost:<port>`.

## 6. Security notes

- Every credential is shown once and stored as a SHA-256 hash; Braventa can't show it again. Revoke and replace a
  leaked one in Settings → Integrations.
- Prefer OAuth for anything a person uses: tokens expire, are tied to one app and can be disconnected per app.
- Give each automation its own service key with an expiry, so you can revoke one without breaking the others.
- Treat tool output as the owner's business data. Don't log it in shared systems.
- The consent screen shows the name your client registered and the host it returns to. Use your real product name.

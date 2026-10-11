# Braventa MCP server: the AI assistant connection

**Status / last reviewed: 2026-10-11.** Phase 1 built (founder decision D-036). Owners who already worked on their
business in Claude can let their assistant fill in Braventa's onboarding: website, discovery, priorities and
follow-up questions. The owner still confirms or corrects the diagnosis and approves posts in the app.

## 1. What's live and what isn't

| | Status |
|---|---|
| Claude Code (native HTTP MCP, header auth) | Live (phase 1) |
| Claude Desktop (through the `mcp-remote` bridge; needs Node.js) | Live (phase 1) |
| claude.ai custom connectors, ChatGPT connectors | **Planned (phase 2):** both need OAuth sign-in ("Sign in with Braventa") instead of a pasted key |
| Anything that changes the plan, approves posts or publishes | Not offered. Approval stays in the app (D-013) |

## 2. How it works

```
Owner: Braventa → Settings → AI assistant access → Create key (shown once)
       adds the server to Claude Code / Claude Desktop with "Authorization: Bearer brv_…"
Claude ──POST JSON-RPC──▶ app.braventa.io/api/mcp  (web/src/app/api/mcp/route.ts)
          1. Origin check (DNS rebinding), MCP-Protocol-Version check
          2. key → SHA-256 → mcp_access_keys (service client); revoked? owner still a member?
          3. plan check (lib/mcp/access.ts): tool calls refused with a clear message after the trial
          4. rate limit: 30 tool calls/minute, 300/hour per key (counted in mcp_tool_calls)
          5. tools (lib/mcp/tools.ts) → lib/onboarding/service.ts + start.ts — the same code as the web forms
          6. every tool call logged in mcp_tool_calls (tool, ok, short error)
```

- **Transport:** Streamable HTTP, stateless, JSON responses only (no server-sent events, no sessions). `GET` and
  `DELETE` return 405. Protocol versions `2025-06-18` and `2025-03-26`. Implemented directly in
  `lib/mcp/protocol.ts` (no SDK dependency): `initialize`, `ping`, `tools/list`, `tools/call`, notifications.
- **Auth:** personal access keys, `brv_` + 32 random bytes (base64url). Only the SHA-256 hash and a 10-character
  prefix are stored. Up to 5 active keys per owner. Revoking sets `revoked_at`; the key stops working on the next call.
- **Tenant isolation:** the route uses the service client, so every query is scoped to the key's organization:
  sessions are loaded with `loadSession(db, id, organizationId)`, the status tool checks the business's
  `organization_id`, and IDs from the assistant are never trusted otherwise.
- **Untrusted input:** text from the assistant is owner input, validated with the same limits as the forms
  (12 pain points, 1,000-character description, 500-character answers) and passed to models as quoted data.

## 3. Tools

| Tool | What it does |
|---|---|
| `braventa_start_onboarding` | Website (+ optional business name, goal, service area, tools). Starts the website evidence job and opens a discovery session. |
| `braventa_get_discovery_questions` | The pain-point catalog by category, plus the free-text question. |
| `braventa_submit_discovery` | Chosen pain point IDs + the owner's description. Returns candidates, including AI matches for the description (Haiku "extractor"). Unknown IDs are reported and ignored. |
| `braventa_confirm_priorities` | Kept candidates + top 1–3 priorities in order. Returns the first follow-up round, or finishes. |
| `braventa_get_follow_up_questions` | Pending follow-up questions (choice values or text). |
| `braventa_answer_follow_up_questions` | Answers (or `not_applicable`); `finish: true` skips the rest. Returns the next round or "completed" (the plan starts). |
| `braventa_get_status` | Where the session stands; when ready: growth score (with what it measures), top 3 plan items with first steps, report link. |

The server's `instructions` tell the assistant to use only what the owner said, skip rather than guess, and check
the priorities with the owner before confirming them.

## 4. Who can use it (D-036)

Every plan during the 14-day trial. When the trial ends, tool calls return "paused because the free trial has
ended" until the organization is on a plan (`organizations.plan` = basic, pro or premium, set by the Braventa team
while there's no billing). After the trial the Plans page offers "Talk to us about Basic" as well as Pro and Premium.

## 5. Token use

The owner's assistant does the reading and writing on the owner's own Claude plan. Braventa's own AI use is the same
as the web flow: the Haiku calls for matching the description and choosing follow-ups (~$0.0002 each), then the plan
build. Input limits keep prompts the same size as the web forms'.

## 6. Setup snippets (shown in Settings after creating a key)

Settings walks the owner through five steps: choose Claude Desktop or Claude Code, create a key, paste the
ready-made setup, check the connection (`keyLastUsed` reads the key's `last_used_at`), and ask Claude to set up the
business. An account without an organization can create a key: Settings asks for the business name and calls
`create_organization`, which also starts the trial. The dashboard and onboarding page link to it. Owner guide:
[CONNECT_YOUR_AI_ASSISTANT.md](../product/CONNECT_YOUR_AI_ASSISTANT.md).

Claude Code:

```bash
claude mcp add --transport http braventa https://app.braventa.io/api/mcp --header "Authorization: Bearer brv_…"
```

Claude Desktop (`claude_desktop_config.json`; the env variable avoids a Windows quoting problem with spaces):

```json
{ "mcpServers": { "braventa": { "command": "npx",
  "args": ["-y", "mcp-remote", "https://app.braventa.io/api/mcp", "--header", "Authorization:${BRAVENTA_AUTH}"],
  "env": { "BRAVENTA_AUTH": "Bearer brv_…" } } } }
```

## 7. Data

- `mcp_access_keys`: id, organization_id, user_id, name, key_prefix, key_hash (never readable from the browser),
  created_at, last_used_at, revoked_at. RLS: owners read, add and revoke their own keys.
- `mcp_tool_calls`: audit log and rate-limit source (organization_id, key_id, tool, ok, error, created_at). Members
  can read their organization's; only the server writes.
- Privacy: what the assistant sends is stored like form answers. The status summary goes back into the owner's
  assistant, whose provider processes it under the owner's own account; that provider isn't a Braventa
  sub-processor for it. Disclosed on braventa.io/legal/privacy.

## 8. Phase 2 (not built)

OAuth 2.1 authorization (dynamic client registration, PKCE) so claude.ai and ChatGPT connectors can connect without a
pasted key; possibly read-only tools for the plan and drafts. Tracked in OPEN_QUESTIONS Q-039.

---
type: process
universe: live
status: verified
verified: 2026-10-24
commit: 2214b05
consumes: ["[[mcp-access-key]]", "[[oauth-token]]", "[[oauth-grant]]", "[[organization]]", "[[membership]]", "[[member-role]]", "[[plan-tier]]", "[[discovery-catalog]]"]
produces: ["[[mcp-tool-call]]", "[[onboarding-session]]", "[[onboarding-response]]", "[[onboarding-follow-up]]", "[[business-profile]]", "[[ai-job]]"]
---

# mcp-onboarding

An AI client (Claude Code/Desktop, claude.ai, ChatGPT, a script) runs Braventa's onboarding for one organization through seven `braventa_*` tools on `POST /api/mcp`.

## Input → Movement → Output

Input: a JSON-RPC 2.0 request with a bearer credential (personal key, service key or OAuth access token). Movement: origin and protocol checks, credential → principal, trial gate, rate limit, then each tool calls the same `lib/onboarding` functions the web forms call. Output: onboarding rows and queued jobs identical to the web path, plus an `mcp_tool_calls` row per call.

## Why this shape

The tools wrap the existing onboarding service instead of adding a second write path, so the session status machine and the plan trigger stay single-sourced (`web/src/lib/mcp/tools.ts:197,267,309-311,376-379`), down to the permission each write needs (`tools.ts:18-19,41-42`). Every query is scoped to the credential's organization, never one the client names (`web/src/app/api/mcp/route.ts:13,77-84`). The connect step is skipped because connections are authorised only in Braventa (`web/src/app/onboarding/[sessionId]/connect/page.tsx:22`; `tools.ts:86-89`).

## Steps

1. Origin check (own origin or known AI clients; CLIs send none) → 403 — `web/src/app/api/mcp/route.ts:37-44`; unsupported `MCP-Protocol-Version` → 400 — `:48-51`.
2. `authenticateMcp` (service client): `classifyBearer` → key row by hash (kind, revoked, expiry, owner still a member) or OAuth token → grant → membership; a personal key or sign-in carries the member's role, a service key none; bumps `last_used_at` — `:53-60`; `web/src/lib/mcp/auth.ts:13-82` (role `:32-42,70-72`; `web/src/lib/mcp/principal.ts:10-12,54-57`). Failure answers 401 with `WWW-Authenticate` pointing at "Sign in with Braventa" — `route.ts:55-60`.
3. Body ≤ 64 KB, 1–10 JSON-RPC messages — `:63-74`.
4. Trial gate `mcpAccess` (`hasSubscription`): `tools/call` gets the paused message as an error result; `tools/list` still works — `:76,100-105`; `web/src/lib/mcp/access.ts:13-15`.
5. Rate limit 30/min and 300/h per key or grant, counted in `mcp_tool_calls` — `route.ts:20-21,106-114`.
6. `handleMessage`: `initialize`, `ping`, `tools/list` filtered by scope, `tools/call` with scope check, then the tool's `permission` for the caller (`principalCan`), then zod args; every call logged — `web/src/lib/mcp/protocol.ts:44-118` (permission `:92-96`; `web/src/lib/mcp/principal.ts:59-63`; caller `route.ts:82-83`); `route.ts:87-96`. Matrix: [member-role](../objects/tenancy/member-role.md).
7. Tools, all scope `onboarding` (`tools.ts:160`): `braventa_start_onboarding` → `createOnboarding` (`:162,197`, the same function as [start-analysis](start-analysis.md); permission `analysis.run` `:164`); `braventa_get_discovery_questions` (`:215`); `braventa_submit_discovery` → `saveDiscovery` + `reviewCandidates` (`:244,267-269`; `profile.edit` `:246`); `braventa_confirm_priorities` → `saveReview` then `continueFollowUps` (`:285,309-311`; `profile.edit` `:287`); `braventa_get_follow_up_questions` (`:316`); `braventa_answer_follow_up_questions` → `saveFollowUps`, `finish: true` → `completeSession` (`:338,376-379`; `profile.edit` `:340`); `braventa_get_status` (`:387`, latest session by default `:402-410`). The `get` tools carry no permission (`:217,318,389`).
8. Not exposed: skip discovery, re-run, diagnosis correction, plan item status, post approval. The tool list ends with `braventa_get_status`, whose description says the owner does those in Braventa (`:387-392`).
9. `maxDuration` 300 s because the follow-up tools call the extractor model — `route.ts:16-18`.

## Human gate

Credential creation: a member makes a personal key in Settings (`web/src/app/settings/actions.ts:15`, no role check; service keys: owner only, `web/src/app/settings/integrations-actions.ts:25`) or approves the consent page at `/oauth/authorize`. After that the client acts with that member's role, or for the business with a service key (`web/src/lib/mcp/principal.ts:59-63`), without a per-call approval; confirming the diagnosis and approving posts still happen only in the app (`tools.ts:392`).

## If you change this

- **Hits:** [mcp-access-key](../objects/access/mcp-access-key.md), [mcp-tool-call](../objects/access/mcp-tool-call.md), [oauth-token](../objects/access/oauth-token.md), [discovery-and-review](discovery-and-review.md), [follow-up-questions](follow-up-questions.md), [member-role](../objects/tenancy/member-role.md) (a tool's `permission` mirrors its web action), `docs/architecture/MCP_SERVER.md` §2 and §5, `docs/architecture/ROLES_AND_PERMISSIONS.md` §5
- **Does not hit:** the web forms' own actions, the job step machine, [ask-braventa](ask-braventa.md)

## Surfaces

| Surface | Role |
|---|---|
| AI client (Claude, ChatGPT, n8n) | calls tools |
| `POST /api/mcp` | auth, gate, limit, log, dispatch |
| `web/src/lib/onboarding/*` | shared writes |
| Member (owner for service keys) | creates the key or consents; finishes in the app |

## See

- Objects: [[mcp-access-key]], [[mcp-tool-call]], [[oauth-grant]], [[onboarding-session]]
- Source: `web/src/app/api/mcp/route.ts`, `web/src/lib/mcp/tools.ts`

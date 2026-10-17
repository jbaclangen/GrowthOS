# Security and privacy

This document records how Braventa protects tenant data today, where the protections stop, and what must be
in place before specific features ship. It covers tenant isolation, the admin client, authentication,
secrets, connected-account credentials, prompt injection, the approval default, data sent to model
providers, retention and deletion, logging, and email consent. It ends with a checklist for reviewing any
new feature. It describes current behaviour; anything not built is marked **Not implemented** or
**Planned**. Related: [DATA_MODEL.md](DATA_MODEL.md), [AI_ROUTING_AND_COSTS.md](AI_ROUTING_AND_COSTS.md),
[INTEGRATIONS.md](INTEGRATIONS.md), [../decisions/DECISION_LOG.md](../decisions/DECISION_LOG.md),
[../decisions/OPEN_QUESTIONS.md](../decisions/OPEN_QUESTIONS.md).

**Status / last reviewed: 2026-10-11.** No external security review or penetration test has been done.

---

## 1. Threat model in one paragraph

Braventa is multi-tenant: one Supabase database holds every customer's business profile, generated
strategy, drafts, and (later) CRM data and OAuth tokens. The main risks are (a) one tenant reading or
changing another tenant's data, (b) leaked server secrets (the Supabase secret key bypasses all RLS),
(c) untrusted third-party content (customer websites, later CRM notes and uploads) manipulating model output
or the server, (d) runaway AI spend, and (e) publishing or sending something on a client's behalf that they
did not approve.

## 2. Tenant isolation and RLS

- Every tenant table carries `organization_id` and has RLS enabled. Policies call
  `public.is_member(organization_id)` (membership or platform admin) or `public.is_org_admin(...)`.
  Full catalogue: [DATA_MODEL.md](DATA_MODEL.md#4-tables).
- Helper functions are `security definer` with `search_path = ''`, executable by `authenticated` only
  (advisor-fix migration), so policies cannot recurse and `anon` cannot call them.
- Server components and server actions use `createSupabaseServerClient()` — the signed-in user's session —
  so RLS applies. Example: `/analysis/[id]` reads a profile by id; another tenant's id simply returns no row.
- Writes to server-owned ledgers (`ai_usage`, `integrations`, `subscriptions`) have no user write policy;
  only the admin client can write them.

- **Content approval is enforced in the database** (migration `20261010121043_content_approval_guard.sql`,
  D-018). A `before insert or update` trigger on `content_items` applies to the `authenticated` role (app
  server actions and direct Data API calls alike): inserts must start as `brief`/`draft`; status may only
  move between `needs_approval`, `approved` and `rejected`; `approved_by`/`approved_at` are always set by the
  trigger (`auth.uid()`, `now()` on approval, cleared otherwise) and client values are ignored. `scheduled`
  and `published` can only be set by the secret-key client. `setContentStatus` keeps working unchanged.
  Applied to the remote project 2026-10-10 and verified there in a rolled-back test as a real member:
  forged approver/time replaced, approve/undo/reject work, `published` (update or insert) and
  `brief`→`approved` blocked, `service_role` unrestricted. Security advisors report nothing new.

Current gaps:
- **Members can still write the other M-all tables directly** through the Supabase Data API with the
  publishable key, bypassing server-action logic: e.g. edit `ai_jobs.status`/`output`, `reports`, or
  `content_items` text fields (including text of an approved item, without resetting approval). Since D-042 a
  member could also rewrite a pending analysis step's stored inputs (e.g. the page digest), which the next step
  feeds to a model: same organization only, and that text is already treated as untrusted. Harmless
  while one user = one org; must be tightened (role checks, or moving writes behind server actions only)
  before multi-user organizations or any real publishing.
- **Platform admins see every tenant** through RLS. There is no audit of their access.
- No automated RLS tests. Recommended: a SQL test (pgTAP or a script) that signs in as two users and asserts
  zero cross-tenant reads/writes for every table, run after each migration.

## 3. Admin (secret-key) client rules

`createSupabaseAdminClient()` (`web/src/lib/supabase/server.ts`) uses `SUPABASE_SECRET_KEY` and bypasses
RLS. Rules:

1. Only in trusted server code (`server-only` modules): the AI router (budget + usage), the pipeline, the dev
   health route, and future webhook/n8n callbacks.
2. Never take an organization id from the request body or URL and use it with the admin client. Derive it
   from something RLS already vetted. The pipeline does this correctly: the `ai_jobs` row is inserted with
   the user client (RLS proves membership), and the pipeline then reads `organization_id` from that row.
3. Scope every admin write with `.eq("organization_id", org)` as defence in depth (the pipeline does this for
   tenant tables; status updates on `ai_jobs` filter by id only, which is acceptable because the id came from
   the vetted row).
4. Callback routes must authenticate the caller first (shared secret or signature), then load the related job
   and use its `organization_id`.

## 4. Authentication

- Supabase Auth, **email + password** (min 8 chars, zod) via `signIn` / `signUp` server actions
  (`web/src/app/login/actions.ts`). No OAuth/social login, no MFA, no magic links.
- Sign-up sends a confirmation email with `emailRedirectTo = {NEXT_PUBLIC_APP_URL}/auth/callback?next=/onboarding`.
  `/auth/callback` exchanges a PKCE `code` or verifies an OTP `token_hash`, then redirects to a same-origin
  path (`next` must start with `/` and not `//`; it is appended to the request origin, so open redirects are
  not possible). `/` forwards a stray `code` to the callback.
- `src/proxy.ts` refreshes the session cookie on each request (`getClaims()`) and redirects unauthenticated
  requests to `/login` except for `/`, `/login`, `/auth/*`, `/api/health/*`, `/api/mcp`, `/api/jobs/continue`. Pages
  and actions additionally call `requireUser()` (`supabase.auth.getUser()`, which validates with the Auth server).
- **Analysis step hand-off (D-042):** `/api/jobs/continue` is server-to-server only. It requires an HMAC-SHA256 of the
  job id and step (`JOB_CONTINUE_SECRET`, else a key derived from `SUPABASE_SECRET_KEY` with HKDF), compared in
  constant time. A valid token only lets the caller run that job's step if it is still pending; it reads and writes
  nothing else and returns no data. The server sends the token only to `NEXT_PUBLIC_APP_URL` (in development, its
  own port), never to an address taken from the request, so a forged Host header can't redirect it.
- Password policy, leaked-password protection, rate limits, and email confirmation requirement are set in the
  Supabase dashboard and are not verifiable from the repo; confirm them before launch.
- **MCP access keys (D-036):** `/api/mcp` accepts `Authorization: Bearer brv_…` personal access keys instead of a
  session. Keys are 256-bit random, shown once, stored as SHA-256 only, revocable, at most 5 active per owner; the key's
  owner must still be a member of the organization. The route uses the service client and scopes every query to the
  key's organization; it rejects foreign `Origin` headers and rate-limits tool calls (30/min, 300/hour per key), logging
  each in `mcp_tool_calls`. Details: [MCP_SERVER.md](MCP_SERVER.md).
- Not implemented: account deletion, password reset UI, session management UI, invitations to an org.

## 5. Secrets handling

- All secrets are read through `env()` in `web/src/lib/env.ts`, which imports `server-only` (a client
  import fails the build) and validates each variable lazily with zod.
- Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL` are
  public by design. Never prefix a secret with `NEXT_PUBLIC_`.
- Secrets live in `web/.env.local` (git-ignored) locally and in Vercel environment variables in production.
  `web/.env.example` lists names only. The founder pastes values; tools and agents do not handle them.
- `N8N_WEBHOOK_SECRET` must be at least 32 characters. `verifyCallback` compares it with `===`
  (`web/src/lib/integrations/n8n.ts:39`); switch to a constant-time comparison when the first callback route
  is built.
- The Google API key is restricted in GCP to PageSpeed only.
- Rotation procedure: **not documented**. Recommended: rotate the Supabase secret key, OpenRouter key and n8n
  key on any suspected leak and on staff changes; record in an ops runbook.

## 6. Connected-account credentials

- **Google Search Console (Pro)** is the first stored customer credential (once its migration is applied):
  a Google OAuth **refresh token** per organization in `integration_connections.refresh_token_ciphertext`.
  - Encrypted by the app with AES-256-GCM (`web/src/lib/integrations/secret-box.ts`, `node:crypto`), random
    96-bit IV per value, format `v1:iv:tag:ciphertext`. Key: `INTEGRATIONS_ENCRYPTION_KEY` (32 bytes, base64,
    server-only, in `env.ts`). Tampered values or a wrong key fail to decrypt; the connection then asks the owner
    to reconnect. Rotating the key makes stored tokens unreadable (owners reconnect); there is no re-encryption
    tool yet.
  - Clients can't read the column: the migration revokes table privileges from `authenticated`/`anon` and grants
    `select` on the non-secret columns only (same pattern as `mcp_access_keys`). All writes use the service
    client, scoped to an organization id already authorised through the user's RLS-checked membership.
  - **Access tokens are never stored**: each sync mints one from the refresh token and drops it. Tokens are never
    logged (only Google's error code is), never returned to the browser, and never put in a model prompt;
    `searchConsoleSummaryForPrompt` returns Search Console metrics only, without tokens or the account email.
  - OAuth: authorization code + PKCE S256; `state` is random and lives, with the verifier, user id and
    organization id, in an encrypted, httpOnly, SameSite=Lax, 10-minute cookie scoped to
    `/api/integrations/google`. The callback compares the state in constant time and requires the same signed-in
    user and organization (owner role, Pro access). Redirect URIs are limited to registered origins.
  - Least privilege: `webmasters.readonly` + `openid email`; no write scope. Search queries returned by Google are
    third-party data: treat them as untrusted input when they reach a prompt.
  - **Disconnect** revokes the token at Google, nulls the ciphertext (`status = 'revoked'`; a check constraint
    forbids a revoked row with a token), clears the account email and properties, and deletes the organization's
    `search_console_snapshots`. Reconnecting with a different Google account deletes the old snapshots.
  - After the Pro trial, on Basic, the connection is paused: the token and snapshots are kept, nothing is fetched.
- The foundation's `integrations` table (`vault_secret_id`, Supabase Vault) is still unused. Search Console chose
  app-level encryption to avoid a Vault dependency; HubSpot should follow the same pattern or this doc should
  record a different decision. Still missing for any integration: an audit log of connect/disconnect events.

## 7. Prompt-injection posture

Crawled website content is **untrusted input** fed directly to models. A site (including one a malicious user
points Braventa at) can contain text such as "ignore previous instructions and ...".

Current state:
- `siteDigest()` concatenates page titles, URLs, meta descriptions and visible text (bounded to 20,000
  chars) into the user message after the label `WEBSITE CONTENT:`. There is **no delimiting, no instruction to
  treat it as data, and no sanitisation.** Later steps re-send the model-generated profile, so injected text
  can propagate.
- Mitigations that exist by construction:
  - Models have **no tools** and cannot take actions; output only becomes database rows.
  - Every output is parsed and **validated with zod schemas** (fixed keys, enums for impact/effort, bounded
    scores), and the growth score is computed in code.
  - Generated content lands as `needs_approval`; nothing is published (no publishing integration exists).
  - React escapes all rendered text; the website link is always `http(s)` (from `normalizeUrl`), so model
    output cannot inject script or `javascript:` links.
  - Data written is scoped to the requesting org, so injected content can only affect the attacker's own
    tenant at present.
- Residual risk today: misleading or offensive text inside a customer's own drafts and report; wasted AI
  calls. Risk grows sharply once models get tools, retrieval across documents, CRM write access, or
  auto-publishing.

Related server-side risk — **crawler SSRF (fixed 2026-10-10, D-018).** `crawlSite()` fetches a
user-supplied URL and summarises the text back to the user, so without guards it could probe internal
endpoints reachable from the server. `fetchHtml()` in `web/src/lib/integrations/crawler.ts` now:
- accepts only `http:`/`https:` on ports 80/443 with no credentials in the URL (`normalizeUrl` also rejects
  other schemes up front);
- resolves DNS through a custom socket `lookup` and refuses the connection if **any** resolved address is
  private, loopback, link-local, CGNAT, cloud metadata (`169.254.169.254`, `fd00:ec2::254`), documentation,
  multicast or reserved, including IPv6 forms that embed IPv4 (mapped, NAT64, 6to4, Teredo). Because the
  socket connects to the address that was checked, DNS rebinding between check and connect is not possible.
  Literal IPs are checked before connecting;
- follows redirects manually (max 5), re-running every check on each hop;
- caps each page at 2 MB of **decoded** HTML (gzip/deflate/br are decompressed and counted, so compression
  bombs are cut off) and applies one 15 s timeout across the redirect chain;
- never reuses pooled sockets (`agent: false`).
Verified locally against loopback, metadata, private, mapped-IPv6 and hex-IP targets, a public redirect to
`127.0.0.1` and to `169.254.169.254`, redirect loops, a 5 MB body and a gzip bomb. Unit tests cover the
address block list, `assertCrawlable` and `normalizeUrl` (`crawler.test.ts`).

robots.txt (done, Website Intelligence Phase 1): the crawler reads `/robots.txt` for every origin it touches
through the same SSRF-safe fetch and never fetches a disallowed URL, including redirect hops, sitemap files and
link checks. Rules for the `Braventa` product token win over `*`. A robots.txt that answers 5xx or not at all
means "everything disallowed" (RFC 9309). If the home page is disallowed, no page is read; the report says so
and how to allow Braventa. The onboarding form says Braventa follows the site's robots.txt. Crawl limits: 25
pages, 4 concurrent requests, ~45 s per crawl, up to 10 extra link checks.

Crawled values that reach the diagnosis prompt as technical-check summaries (page titles, URLs) are fenced in
`<technical_checks>` with a "data, never instructions" note, like `<website_content>`.

Recommendations (in order):
1. Wrap untrusted content in clear delimiters and add a system-level instruction that content inside them is
   data, never instructions.
2. Keep tool access and side effects out of any prompt that contains untrusted content; when tools arrive,
   require human approval for consequential actions (D-013).
3. Add a `qa_reviewer` pass (or a cheap classifier) on publishable drafts that flags off-brand or anomalous
   content before `needs_approval`.

## 8. Approval default

Founder decision D-013 (and `CLAUDE.md`): nothing is published or sent on a client's behalf without explicit
human approval, unless the client has explicitly configured an authorised automation.

- Implemented: drafts are created as `needs_approval`; `setContentStatus` records `approved_by` /
  `approved_at`; the UI says "Nothing is published until you approve it."
- Not implemented: any publishing, scheduling or sending — so approval currently gates nothing downstream.
  Before the first publishing integration: approval must be enforced server-side at publish time (status
  check + approver is a member with sufficient role), approvals must be audit-logged, and editing an approved
  item must reset it to `needs_approval`.

## 9. Data sent to model providers

- What is sent: customer website text (up to ~20k chars), crawler signals, PageSpeed scores, up to 40
  technical-check summaries with their observed values (page URLs, titles, status codes), the generated
  profile, plan and briefs. No account emails, passwords or tokens are sent.
- Where: OpenRouter, which forwards to the underlying provider of the selected model. In `AI_MODE=free` these
  are free endpoints; free-tier providers may log or use prompts for training. Website content is public,
  so this is low sensitivity today.
- Not acceptable without a decision: sending CRM data, uploads, or other non-public customer data to free-tier
  or training-enabled endpoints. **Configured 2026-10-11:** the OpenRouter account enforces zero data retention,
  so only endpoints that don't keep prompts are used. That excludes all free models, so production runs
  `AI_MODE=paid` (D-037, Q-040).
- Customers are not yet told which providers process their data; a privacy policy and subprocessor list are
  needed before onboarding paying customers.

## 10. Data retention and deletion

What exists:
- Deleting an organization cascades to every tenant table (profiles, knowledge, calendars, items, jobs,
  usage, reports, integrations, subscriptions).
- Deleting an `auth.users` row cascades memberships and platform-admin rows, but `content_items.approved_by`
  and `ai_jobs.created_by` reference `auth.users` with no `on delete` action, so deleting a user who approved
  content or started a job **fails** until those references are cleared.

What is undecided / not implemented:
- No user-facing account or organization deletion, no data export.
- No retention period for crawled pages (`knowledge_documents` accumulate per content hash), re-run
  artefacts, AI job inputs/outputs, or `ai_usage`.
- `ai_jobs.output` (D-042): while an analysis runs, it holds copies of what later steps need: up to 20,000
  characters of crawled page text (the digest, until the profile step), the website evidence (home page signals,
  page list, PageSpeed scores, audit findings) and the owner's discovery answers (pain points, own-words
  statements, follow-up answers). A job that succeeds keeps only pointers, except the evidence job, which keeps the
  evidence for the plan job. A job that fails, at a step, at a hand-off or by the reaper, keeps at most its step
  name. Members of the organization can read the row (RLS).
- No retention rule for future CRM data. Search Console: 12 newest snapshots per organization; the token and all
  snapshots are deleted on disconnect; a paused (Basic) connection keeps both until disconnected.
- Supabase backups (point-in-time recovery) mean deleted data persists in backups for the plan's backup
  window.

## 11. Logging and audit

- `ai_usage`: one row per successful model call (org, job, worker, model, tokens, cost).
- `ai_jobs`: job input, step progress (`output.step`, `step_state`, `step_started_at`, `resent_at`), error text;
  while running, the step artifacts listed in §10; when done, output pointers (and the evidence, for evidence
  jobs).
- `content_items.approved_by/approved_at`: last approval only (overwritten on undo).
- Server `console.error` for failed jobs and failed usage inserts (Vercel function logs in production).
  Error messages can include upstream response bodies (e.g. OpenRouter errors) and are shown to the user on
  the analysis page.
- Not implemented: an audit log of sensitive operations (sign-in events beyond Supabase's own auth logs,
  membership/role changes, approvals history, integration connect/disconnect, platform-admin access,
  exports/deletions). Recommended: an `audit_events` table (M-read, admin-client writes) before multi-user
  orgs or integrations.

## 12. Email consent separation

Decision D-014: transactional/account email and marketing email are separate streams; creating an account
is not marketing consent.

- Today the only email sent is Supabase Auth's sign-up confirmation (transactional). Sign-up collects only
  email and password; there is no marketing opt-in and no marketing email.
- When marketing email is added: an explicit, unticked opt-in stored with timestamp and source; unsubscribe in
  every message; a separate provider list/audience from transactional mail; no use of customers' CRM contacts
  for Braventa's own marketing.

## 13. Abuse and cost controls

- Monthly AI budget per org (default $5) enforced before each call; ineffective in free mode (cost 0) and
  bypassable by creating more orgs. The check **fails closed**: if the org's budget or month-to-date spend
  can't be read, `runWorker` throws and no model is called. See [AI_ROUTING_AND_COSTS.md](AI_ROUTING_AND_COSTS.md#5-budget-enforcement-and-usage-logging).
- OpenRouter requests time out after 120 s (chat) / 15 s (key info) via `AbortSignal.timeout`, so a hung
  provider can't hold a job open indefinitely.
- Analysis rate limit: at most 10 analyses or re-runs per organization in 24 hours (counted from `ai_jobs`
  rows with worker `website_evidence` or `website_intel`), checked in `startAnalysis` and `rerunAnalysis` with a
  clear error. `rerunAnalysis` refuses while any job for the same business is queued or running. A new
  organization can still be created to get a fresh allowance (same gap as the AI budget).
- Each analysis makes up to ~40 requests to the customer's site (robots.txt, sitemaps, 25 pages, 10 link checks,
  2 variants) and 2 PageSpeed calls (25,000/day default quota).
- `/api/health/integrations` returns 404 when `NODE_ENV=production`; in development it is public and reports
  service status.

## 14. Feature security review checklist

Answer each before merging a feature that touches data, AI, or external services.

- [ ] Every new table has `organization_id`, an index on it, RLS enabled, and `is_member` / `is_org_admin`
      policies in the same migration; read-only vs read-write chosen deliberately.
- [ ] Cross-tenant access tested (user A cannot read or write user B's rows) for new tables and routes.
- [ ] Reads and writes use the user client unless there is a stated reason; any admin-client use derives the
      org id from an RLS-vetted row and scopes writes by it.
- [ ] No secret is read outside `env.ts`; no new `NEXT_PUBLIC_` variable holds a secret; no secret is logged,
      returned to the browser, or placed in a URL we control.
- [ ] All AI calls go through `runWorker` / `runWorkerJson` with an authorised `organizationId`, bounded input,
      explicit `maxTokens`, and schema-validated output.
- [ ] Untrusted content (websites, CRM, uploads, emails) is delimited in prompts and never given tool access or
      side effects without human approval.
- [ ] Any outbound fetch to a user-supplied URL blocks private/metadata addresses and caps size and redirects.
- [ ] Anything published or sent for a client requires recorded human approval (D-013), enforced server-side.
- [ ] New routes: decide whether they belong in `proxy.ts` `PUBLIC_PATHS`; public routes authenticate callers
      (shared secret with constant-time compare, or signature).
- [ ] OAuth tokens are stored encrypted (AES-256-GCM via `secret-box.ts`, or Vault), never selectable by clients;
      access tokens aren't stored; disconnect revokes and deletes.
- [ ] Personal or non-public data sent to model providers is minimised and only to providers allowed by the
      data-handling decision.
- [ ] Sensitive operations write an audit record (once the audit table exists).
- [ ] Retention and deletion behaviour for new data is stated (cascade from org at minimum).
- [ ] Marketing email only to explicitly opted-in recipients (D-014).
- [ ] Integration status and user-facing copy updated; nothing claims a capability that is not live
      ([INTEGRATIONS.md](INTEGRATIONS.md)).
- [ ] Supabase security and performance advisors run clean after the migration.

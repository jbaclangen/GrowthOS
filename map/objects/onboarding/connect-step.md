---
type: object
cluster: onboarding
universe: live
status: verified
verified: 2026-11-14
commit: 71a42e1
entity: web/src/lib/integrations/connect-step.ts
---

# Connect your tools (`connect-step.ts`)

The optional onboarding step between confirming priorities and the follow-up questions, where a Pro or trial owner can connect Google (one sign-in for Search Console and Google Analytics 4) and HubSpot; it has no table, column or status of its own.

## Why this shape

D-041 asks Pro owners to connect tools during discovery; D-054 built it without a new status: `following_up` with no pending question means the connect step comes next, and its Continue is what generates the follow-up round (`docs/decisions/DECISION_LOG.md:760-773`, `web/src/lib/onboarding/steps.ts:5-7,28-33`). The card rules are pure logic so the role, Pro, trial and Basic cases are unit-tested rather than buried in JSX (`web/src/lib/integrations/connect-step.ts:4-6`).

## Shape

- `SearchConsoleCardState` and `searchConsoleCardState` (not-configured, other-business, no-business, paused, connected, connectable, owner-only) — `web/src/lib/integrations/connect-step.ts:8-39`; the HubSpot card reuses the same rules as `connectionCardState` `:41-43`; connectable vs owner-only is `can(role, "integrations.connect")` `:38,77`; `canConnectSearchConsole` `:55-63`; `connectPlanLine` with the trial line `:48-50,68-80`.
- Page (what it offers: header comment `web/src/app/onboarding/[sessionId]/connect/page.tsx:23-28`): only in `following_up` `:55`; the session's own business and the user's role there (`getCurrentOrg(user.id, session.organization_id)`, D-062) `:57-60,70-73`; `configured` is Google or HubSpot set up on this deployment `:76-78`; the plan line `:79`; whether this user can connect either, via `searchConsoleAccess` / `hubspotAccess` `:80-84`; suggestions from confirmed pain points and BI-12 tools, no model call `:86-93`; the Search Console, Google Analytics and HubSpot cards `:94-96,121-142`; Coming soon cards `:97,145-151`; Continue → `continueAfterConnect` `:153`; `maxDuration = 300` `:33`.
- `continueAfterConnect`: needs `profile.edit` (`web/src/app/onboarding/[sessionId]/actions.ts:15-25,88`); pending questions → forward to `/questions`; else `continueFollowUps` — `:84-96`. The questions page forwards back here when nothing is pending — `web/src/app/onboarding/[sessionId]/questions/page.tsx:51-54`.
- MCP skips the step: `braventa_confirm_priorities` generates the round itself — `web/src/lib/mcp/tools.ts:310-312`, `web/src/app/onboarding/[sessionId]/connect/page.tsx:28`.
- Submitting the review redirects here — `web/src/app/onboarding/[sessionId]/actions.ts:78-79`.

Citations: `web/src/lib/integrations/connect-step.ts:4-80`; `web/src/app/onboarding/[sessionId]/connect/page.tsx:23-33,55-107,121-153`; `web/src/app/onboarding/[sessionId]/actions.ts:15-25,78-96`; `web/src/lib/onboarding/steps.ts:5-7,28-37`; `web/src/lib/mcp/tools.ts:310-312`; `web/src/lib/integrations/tool-catalog.ts:3-5`; `web/src/lib/integrations/return-to.ts:1-13`

## Connected to

- **owns:** nothing
- **owned-by:** [onboarding-session](onboarding-session.md) (lives inside `following_up`)
- **joins:** [integration-connection](../integrations/integration-connection.md) (the Search Console, Google Analytics and HubSpot cards, shared with Settings); [plan-tier](../tenancy/plan-tier.md) (Pro and trial only); [member-role](../tenancy/member-role.md) (`integrations.connect`, owner only; Continue needs `profile.edit`); [onboarding-follow-up](onboarding-follow-up.md) (Continue creates the round)
- **looks-like-but-is-not:** Settings → Connections — same card, no Continue, no session

## If you change this

- **Hits:** `followUpStep`/`followUpPath`, `continueAfterConnect`, the questions page's forward, the review redirect, `ONBOARDING_STEP_COUNT` and "Step 4 of 5" (`web/src/lib/onboarding/steps.ts:7`, page `web/src/app/onboarding/[sessionId]/connect/page.tsx:107`), MCP `braventa_get_status` wording, the return-to allowlist for the Google and HubSpot consent screens (`web/src/lib/integrations/return-to.ts:1-13`, `docs/decisions/DECISION_LOG.md:777-779`).
- **Does not hit:** [onboarding-session](onboarding-session.md) status values — by design none was added (D-054).

Ghost: every tool other than Search Console, Google Analytics 4 and HubSpot is a Coming soon card with no connect action — `web/src/lib/integrations/tool-catalog.ts:3-5` (`status: "coming_soon"`), `docs/decisions/DECISION_LOG.md:765-767` (D-054, written when GA4 and HubSpot were still Coming soon). HubSpot's counts are shown, not fed to the diagnosis or score (`web/src/app/onboarding/[sessionId]/connect/page.tsx:26-27`). Connecting for any business the user belongs to works since D-062 (the forms carry `organizationId`, `:70-71`; Q-047 resolved).

## Surfaces

| Surface | Role |
|---|---|
| `/onboarding/[sessionId]/connect` (`web/src/app/onboarding/[sessionId]/connect/page.tsx:45`) | reads session, organization, responses, profile |
| Continue → `continueAfterConnect` (`web/src/app/onboarding/[sessionId]/actions.ts:84`) | writes (follow-up round or session completed) |
| Google OAuth start/callback (`integrations.connect`: `web/src/app/api/integrations/google/start/route.ts:39`, `web/src/app/api/integrations/google/callback/route.ts:55`; Pro/trial) | writes `integration_connections` (one row per granted Google product) |
| HubSpot OAuth start/callback (`integrations.connect`: `web/src/app/api/integrations/hubspot/start/route.ts:38`, `web/src/app/api/integrations/hubspot/callback/route.ts:49`; Pro/trial; [connect-hubspot](../../processes/connect-hubspot.md)) | writes `integration_connections` (HubSpot row) |
| MCP tools | none (step skipped) |

## See

- Source: `web/src/lib/integrations/connect-step.ts`
- As built: `docs/decisions/DECISION_LOG.md` (D-054)

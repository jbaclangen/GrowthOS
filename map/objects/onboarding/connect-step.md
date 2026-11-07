---
type: object
cluster: onboarding
universe: live
status: verified
verified: 2026-11-08
commit: 1d58a87
entity: web/src/lib/integrations/connect-step.ts
---

# Connect your tools (`connect-step.ts`)

The optional onboarding step between confirming priorities and the follow-up questions, where a Pro or trial owner can connect Google (one sign-in for Search Console and Google Analytics 4); it has no table, column or status of its own.

## Why this shape

D-041 asks Pro owners to connect tools during discovery; D-054 built it without a new status: `following_up` with no pending question means the connect step comes next, and its Continue is what generates the follow-up round (`docs/decisions/DECISION_LOG.md:724-737`, `web/src/lib/onboarding/steps.ts:5-7,28-33`). The card rules are pure logic so the role, Pro, trial and Basic cases are unit-tested rather than buried in JSX (`web/src/lib/integrations/connect-step.ts:4-6`).

## Shape

- `SearchConsoleCardState` and `searchConsoleCardState` (not-configured, other-business, no-business, paused, connected, connectable, owner-only) — `web/src/lib/integrations/connect-step.ts:8-39`; connectable vs owner-only is `can(role, "integrations.connect")` `:38,73`; `canConnectSearchConsole` `:51-59`; `connectPlanLine` with the trial line `:44-46,64-76`.
- Page `web/src/app/onboarding/[sessionId]/connect/page.tsx`: only in `following_up` `:50`; role taken from the first membership only when it is this organization `:63-67`; `configured` `:70`; `allowed` via `searchConsoleAccess` `:77`; suggestions from confirmed pain points and BI-12 tools, no model call `:80-87`; the Search Console and Google Analytics cards `:88-89,111-125`; Coming soon cards `:90,128-134`; Continue → `continueAfterConnect` `:136`; `maxDuration = 300` `:28`. The page's header comment still says only Search Console can be connected (`:20-22`).
- `continueAfterConnect`: needs `profile.edit` (`web/src/app/onboarding/[sessionId]/actions.ts:15-25,88`); pending questions → forward to `/questions`; else `continueFollowUps` — `:84-96`. The questions page forwards back here when nothing is pending — `web/src/app/onboarding/[sessionId]/questions/page.tsx:51-54`.
- MCP skips the step: `braventa_confirm_priorities` generates the round itself — `web/src/lib/mcp/tools.ts:310-312`, `web/src/app/onboarding/[sessionId]/connect/page.tsx:24`.
- Submitting the review redirects here — `web/src/app/onboarding/[sessionId]/actions.ts:78-79`.

Citations: `web/src/lib/integrations/connect-step.ts:4-76`; `web/src/app/onboarding/[sessionId]/connect/page.tsx:20-29,51,64-91,112-137`; `web/src/app/onboarding/[sessionId]/actions.ts:15-25,78-96`; `web/src/lib/onboarding/steps.ts:5-7,28-37`; `web/src/lib/mcp/tools.ts:310-312`

## Connected to

- **owns:** nothing
- **owned-by:** [onboarding-session](onboarding-session.md) (lives inside `following_up`)
- **joins:** [integration-connection](../integrations/integration-connection.md) (the Search Console and Google Analytics cards, shared with Settings); [plan-tier](../tenancy/plan-tier.md) (Pro and trial only); [member-role](../tenancy/member-role.md) (`integrations.connect`, owner only; Continue needs `profile.edit`); [onboarding-follow-up](onboarding-follow-up.md) (Continue creates the round)
- **looks-like-but-is-not:** Settings → Connections — same card, no Continue, no session

## If you change this

- **Hits:** `followUpStep`/`followUpPath`, `continueAfterConnect`, the questions page's forward, the review redirect, `ONBOARDING_STEP_COUNT` and "Step 4 of 5" (`web/src/lib/onboarding/steps.ts:7`, page `:95`), MCP `braventa_get_status` wording, the return-to allowlist for Google's consent screen (`docs/decisions/DECISION_LOG.md:741-743`).
- **Does not hit:** [onboarding-session](onboarding-session.md) status values — by design none was added (D-054).

Ghost: every tool other than Search Console and Google Analytics 4 is a Coming soon card with no connect action — `web/src/lib/integrations/tool-catalog.ts` (`status: "coming_soon"`), `docs/decisions/DECISION_LOG.md:729-731` (D-054, written when GA4 was still Coming soon); connecting for a business that is not the user's first membership is open (Q-047) — `:745`.

## Surfaces

| Surface | Role |
|---|---|
| `/onboarding/[sessionId]/connect` (`web/src/app/onboarding/[sessionId]/connect/page.tsx:41`) | reads session, organization, responses, profile |
| Continue → `continueAfterConnect` (`web/src/app/onboarding/[sessionId]/actions.ts:84`) | writes (follow-up round or session completed) |
| Google OAuth start/callback (`integrations.connect`: `web/src/app/api/integrations/google/start/route.ts:36`, `web/src/app/api/integrations/google/callback/route.ts:51`; Pro/trial) | writes `integration_connections` (one row per granted Google product) |
| MCP tools | none (step skipped) |

## See

- Source: `web/src/lib/integrations/connect-step.ts`
- As built: `docs/decisions/DECISION_LOG.md` (D-054)

# Braventa — plans, tiers and the trial

**Status / last reviewed: 2026-10-17.** Tier structure and trial rules are a founder decision (D-030).
Prices are decided but not built (D-039: Basic $89, Pro $229, Premium from $599 a month; no billing yet, see
[PRICING_PROPOSAL.md](PRICING_PROPOSAL.md)). Card-required trial at public launch: D-040. The source of truth in code is
`web/src/lib/plans/tiers.ts`; this document must match it.

## 1. Tiers

| Tier | Promise | How changes happen |
|---|---|---|
| **Basic** | Business intelligence, a marketing audit, a prioritized plan, AI recommendations for actions | Braventa recommends; the owner carries out every change |
| **Pro** | Everything in Basic, plus a full marketing audit (website, SEO, search ads, social, email, video), connected tools, and AI agents that carry out recommended fixes | Agents act in connected tools, each action only after the owner approves it (D-013) |
| **Premium** | Everything in Pro, plus custom integrations (e-commerce, QuickBooks, Xero, other systems), scoped per customer | As Pro; integrations agreed per contract |

## 2. Trial

- Every new organization starts on `plan = 'trial'` with `trial_ends_at = now() + 14 days`.
- During the trial the organization has **Pro**. On day 15 it has **Basic** automatically; nothing is deleted.
- There is no billing yet (MVP_SCOPE §4, Q-010). An owner who wants Pro or Premium uses **Talk to us** on
  `/plans`, which stores an `upgrade_requests` row; the Braventa team follows up and can set `plan` or extend
  `trial_ends_at` with the admin client or SQL. Owners cannot change these columns themselves.

## 3. What each tier includes today

"Live" means the code does it now. Everything else is labelled **Coming soon** in the app and must be on any
public page (CLAUDE.md: never present planned features as live).

| Feature | Lowest tier | Status |
|---|---|---|
| Website analysis and business profile | Basic | Live |
| Guided discovery (pain points, follow-up questions) | Basic | Live |
| Growth score and diagnosis (confirm or correct) | Basic | Live |
| Prioritized growth plan (accept / dismiss / done) | Basic | Live |
| 30-day content plan and drafted posts with approval | Basic | Live |
| In-app AI assistant ("Ask Braventa" in the header): answers how Braventa works and about the business's latest report; read-only | Basic | Live (D-042) — every plan during the trial; paused after it until the business is on a plan (same rule as the MCP connection, gated by `assistantAccess`, not the tier); 40 questions per organization a day |
| Connect your AI assistant (MCP): Claude fills in onboarding (D-036) | Basic | Live — every plan during the trial; paused after it until the business is on a plan |
| Full marketing audit (SEO, search ads, social, email, video) | Pro | Coming soon |
| Google Search Console connection: read-only clicks, impressions, top queries and pages, shown on `/search` | Pro | Live in code (founder decision 2026-10-11) — the first live Pro feature; usable once the OAuth client and migration are set up ([SEARCH_CONSOLE_SETUP.md](../architecture/SEARCH_CONSOLE_SETUP.md)). Paused after the trial on Basic: data kept, nothing new fetched, resumes on Pro/Premium. Use in the diagnosis: coming soon |
| Analytics connections: GA4, Tag Manager | Pro | Coming soon |
| Creative tool connections: Canva, HeyGen, Higgsfield | Pro | Coming soon |
| Website and social connections: WordPress, social accounts | Pro | Coming soon |
| AI agents that carry out approved fixes (n8n workflows and/or Opus-assisted execution) | Pro | Coming soon |
| Custom integrations: e-commerce, QuickBooks, Xero | Premium | Coming soon |

**Consequence today:** the Google Search Console connection is the first Pro feature marked Live, so
`proHasLiveFeatures()` is true and the plans page and braventa.io pricing no longer show the "every plan has the same
tools" note. A trial has it; Basic after the trial has it paused (`lib/integrations/search-console-access.ts`).
Until the founder finishes [SEARCH_CONSOLE_SETUP.md](../architecture/SEARCH_CONSOLE_SETUP.md), Settings says the
connection isn't set up yet — keep the OAuth client and migration in place before promoting it publicly.

## 4. Rules for adding a Pro or Premium feature

1. Add or update its entry in `FEATURES` (`web/src/lib/plans/tiers.ts`) and flip `status` to `live` only in the
   PR that ships it.
2. Gate it on the server with `canUse(access.tier, featureId)` from `getOrgAccess()`, never only in the UI.
3. Any action an agent takes in a customer's tool needs the owner's explicit approval first (D-013), an audit
   record, and the scopes documented in `docs/architecture/INTEGRATIONS.md`.
4. Update this table, `MVP_SCOPE.md`, the support site's "What Braventa can and can't do", and the pricing page.

## 5. Proposed build order for Pro (not yet approved)

1. **Billing** (Stripe is the working assumption, Q-010) so a trial can convert.
2. **Google connections** (Search Console built 2026-10-11; GA4 next) — read-only, the audit gets real traffic and search data.
3. **WordPress connection + first agent**: approved website fixes (meta descriptions, alt text) applied as
   drafts the owner publishes; audit log per action.
4. **Social accounts** — publish approved drafts (CS-7 / publishing).
5. **Full audit** modules (search ads, email, video) as their data sources connect.
6. **Creative tools** (Canva, HeyGen, Higgsfield) for image and video drafts.
Premium integrations are scoped per customer after Pro is stable.

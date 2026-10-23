# Braventa — plans, tiers and the trial

**Status / last reviewed: 2026-10-18.** Tier structure and trial rules are a founder decision (D-030).
Prices are decided but not built (D-039: Basic $89, Pro $229, Premium from $599 a month; no billing yet, see
[PRICING_PROPOSAL.md](PRICING_PROPOSAL.md)). Card-required trial at public launch: D-040. Account types, seats and
roles, publishing and the module map are decided but not built (D-045 to D-047, D-049, D-051; §6). The source of truth
in code is `web/src/lib/plans/tiers.ts`; this document must match it.

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
| In-app AI assistant ("Ask Braventa" in the header): answers how Braventa works and about the business's latest report; read-only | Basic | Live (D-043) — every plan during the trial; paused after it until the business is on a plan (same rule as the MCP connection, gated by `assistantAccess`, not the tier); 40 questions per organization a day |
| Connect your AI assistant (MCP): Claude fills in onboarding (D-036) | Basic | Live — every plan during the trial; paused after it until the business is on a plan |
| Full marketing audit (SEO, search ads, social, email, video) | Pro | Coming soon |
| Google Search Console connection: read-only clicks, impressions, top queries and pages, shown on `/search` | Pro | Live (founder decision 2026-10-11) — the first live Pro feature; set up in production and first connected and synced on 2026-10-11 ([SEARCH_CONSOLE_SETUP.md](../architecture/SEARCH_CONSOLE_SETUP.md)). Paused after the trial on Basic: data kept, nothing new fetched, resumes on Pro/Premium. Connected in Settings, and also offered during setup on the optional "Connect your tools" step (owner only; Basic sees it paused; D-054). Since 2026-10-23 its latest snapshot feeds the diagnosis and the growth score as the Search visibility module (D-051 step 6, §6) |
| Analytics connections: GA4, Tag Manager | Pro | Coming soon |
| Creative tool connections: Canva, HeyGen, Higgsfield | Pro | Coming soon |
| Website and social connections: WordPress, social accounts | Pro | Coming soon |
| AI agents that carry out approved fixes (n8n workflows and/or Opus-assisted execution) | Pro | Coming soon |
| Custom integrations: e-commerce, QuickBooks, Xero | Premium | Coming soon |

**Consequence today:** the Google Search Console connection is the first Pro feature marked Live, so
`proHasLiveFeatures()` is true and the plans page and braventa.io pricing no longer show the "every plan has the same
tools" note. A trial has it; Basic after the trial has it paused (`lib/integrations/search-console-access.ts`).
The OAuth client and migration are set up in production. Before promoting the connection publicly, get Google's
verification of the OAuth client ([SEARCH_CONSOLE_SETUP.md](../architecture/SEARCH_CONSOLE_SETUP.md)).

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

## 6. Decided, not built (founder decisions 2026-10-18)

None of this is built. Nothing here appears in the app or on a public page as live; a `FEATURES` entry turns `live`
only in the PR that ships it (§4). Detail: [DECISION_LOG.md](../decisions/DECISION_LOG.md) and the
[research index](../research/README.md) §2.

### Account types (D-045)

- Basic, Pro and Premium stay the feature tiers. Each organization also gets an account type: **Brand** (one
  business) or **Agency/Organization** (many businesses, priced per extra brand).
- Planned build: one column, `organizations.account_type`. No copy changes now.
- Open: the per-brand price (the research example, +$59 / +$149 per brand by tier, is not decided) and Q-001.

### Seats and roles (D-046, D-047)

- Eight fixed roles: Owner, Admin, Marketing manager, Social media manager, Copywriter, Content creator, Analyst and
  Client approver, with fixed permissions and no custom roles in v1 (permissions:
  [SEATS_ROLES_MODULES_2026-10-17.md](../research/SEATS_ROLES_MODULES_2026-10-17.md) §2).
- No one approves their own work except the Owner, and every approval is recorded (D-013, D-018).
- Connecting and disconnecting integrations stays Owner-only, as in code today.
- Built 2026-10-23: the eight roles in `member_role`, the permission matrix (`web/src/lib/team/roles.ts` and
  `has_permission()`), the owner-only gates and the approval rule go through it, and Settings shows the user's role
  ([ROLES_AND_PERMISSIONS.md](../architecture/ROLES_AND_PERMISSIONS.md)). There are still no invitations, role
  changes or seat limits, so every member today is the owner who created the business.

| | Basic | Pro | Premium |
|---|---|---|---|
| Full seats included | 2 | 5 | 10 |
| Extra full seat | $29 a month | $39 a month | Quoted (target $35) |
| Analyst seats | Free, up to 5 | Free, up to 10 | Free, unlimited |
| Client approvers | Free, up to 3 | Free, up to 10 | Free, unlimited |

- Seat prices follow D-039: they stay off the site until checkout exists.
- A client approver uses a single-use, signed approval link, stored only as a hash, that expires after 7 days; every
  action through it is logged (D-047).
- Invitations and approval notifications need transactional email (Q-010); charging for seats needs Stripe.

### Publishing (D-049)

- Publishing approved posts is a **Pro** feature. Today Braventa drafts posts for approval and doesn't publish them;
  until publishing ships, copy must not claim it. It stays out of the MVP ([MVP_SCOPE.md](MVP_SCOPE.md) §4).
- Planned: Braventa builds the planner, calendar, approvals, revisions and audit trail; posts go out through a vendor
  (Outstand, after a one-week spike) behind a `Publisher` interface.
- Launch networks: Facebook Pages, Instagram, Google Business Profile and LinkedIn. Not X.
- An in-app scheduler (Supabase `pg_cron` calling a dispatch route) runs it, not n8n. This amends D-041 for publishing
  only (§5 step 4, Q-031).

### Modules by tier (D-051)

Built (2026-10-23, D-051 steps 1–6): the module registry (`web/src/lib/modules/registry.ts`), with the growth score a
renormalized weighted mean of the enabled modules that have evidence, shown as "Based on N modules" on the report's
score tile. The four Basic modules and Search visibility are live; a score without Search Console evidence is
unchanged, since the same parts feed it ([FEATURE_MODULES.md](../architecture/FEATURE_MODULES.md)). Modules can't be
switched on or off from the app yet.

| Lowest tier | Modules |
|---|---|
| Basic | Business intelligence; website and technical SEO; conversion and messaging; content studio |
| Pro | Search visibility; local SEO; social media; search ads; email marketing; video; CRM intelligence; analytics; automation |
| Premium | Custom integrations |

- The first new module, Search visibility, is live (2026-10-23): the latest Search Console snapshot goes to the
  diagnosis and adds a modest 0.10 to the growth score (about a tenth) for Pro, Premium and trial organizations with
  the connection active and data in the window ([FEATURE_MODULES.md](../architecture/FEATURE_MODULES.md) §9). Basic
  keeps the connection paused and its score as it was.
- Module names stay descriptive (D-010). The public growth score explanation (D-035) now says the score is based on
  the modules with evidence, named on the report.

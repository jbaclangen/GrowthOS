# Pricing and AI credit proposal (v2)

**Status:** prices and the 1.5× premium **decided by the founder (2026-10-12, D-039)**; credits, top-ups and the
card-required trial are the plan for the public launch (end of October 2026). Nothing here is built yet: no billing,
no credits, no card collection. Tiers are D-030.

**What changed from v1 (founder, 2026-10-12):** prices now cover fixed platform and maintenance costs, recover the
cost of free trials at launch, and carry a **1.5× premium** over market-comparable prices, because no direct
competitor combines website analysis, a confirmed diagnosis, a growth plan and drafted content. The premium is the
reserve for scaling (more AI use, support, infrastructure) as usage grows.

## 1. What it costs to run Braventa

### 1.1 Fixed monthly costs (estimates; confirm against the actual bills)

| Item | Monthly | Note |
|---|---|---|
| Vercel Pro (app + site) | $20 | **Required before charging customers:** the current Hobby plan doesn't allow commercial use |
| Supabase Pro + compute | $35 | Database, auth, backups |
| HubSpot Starter | ~$50 | Contact pipeline and marketing email; confirm the real seat price |
| Hostinger email (3 mailboxes) + domain | ~$11 | |
| n8n hosting share | ~$20 | Automations (planned) |
| Monitoring, backups, misc. | ~$25 | |
| **Tools subtotal** | **~$160** | |
| Maintenance and support allowance | **$1,000** | Founder sets this: developer/AI-tool time, fixes, updates, support |
| **Fixed total** | **~$1,160, plan for $1,200** | |

### 1.2 Cost per customer per month

| Item | Basic | Pro | Premium |
|---|---|---|---|
| AI (OpenRouter, zero data retention): about $0.29 per analysis, $0.45 regulated, $0.12 per correction | $2–4 | $6–12 | $20–40 |
| Card processing (2.9% + $0.30) | ~$2.90 | ~$7 | ~$18 |
| PageSpeed, Search Console | $0 | $0 | $0 |

### 1.3 Free trial cost at launch

A trial is capped at 500 credits, which is at most **$2.50 of AI** (typical use is $1–3). For a launch with
**30 trials**:

| | Amount |
|---|---|
| AI for 30 trials (worst case, every trial uses its full cap) | $75 |
| Paying customers at a 20% trial-to-paid rate | 6 |
| Trial cost per paying customer | ~$12.50, recovered in the first month (§3) |

The trial itself is cheap. The real upfront cost is the **fixed $1,200 a month** while there are few customers, so
the prices below are set to break even at **about 8 paying customers**.

## 2. Market comparison

| Product | Monthly price | What it is |
|---|---|---|
| General AI assistants (ChatGPT Plus, Claude Pro) | ~$20 | Do-it-yourself prompting |
| Jasper, AI marketing writers | ~$49–99 | Content drafting only |
| Moz Pro (entry) | from ~$49 | SEO tool |
| SE Ranking (Core) | ~$103–129 | SEO suite |
| Ahrefs (Lite / Standard) | ~$129 / ~$249 | SEO suite, no diagnosis or plan |
| Semrush (Pro / Guru) | ~$140 / ~$250 | SEO suite; local SEO is an add-on |
| Marketing agency retainer | typically $1,000–5,000 | Done-for-you service |

Prices are from public pricing roundups (2026) and vary by billing period; check vendor pages before publishing any
comparison. Braventa sits between the SEO suites (data, no plan) and an agency (plan and work, high cost).

## 3. Proposed prices

The **market baseline** is what a comparable tool charges; the **proposed price** applies the 1.5× premium and rounds
to a standard price point.

| Tier | Market baseline | **Proposed (1.5×)** | Yearly (2 months free) | Included AI credits / month |
|---|---|---|---|---|
| **Basic** | $59 | **$89/month** | $890/year | 1,500 (about 25 analyses) |
| **Pro** | $149 | **$229/month** | $2,290/year | 6,000 |
| **Premium** | from $399 | **from $599/month**, quoted | quoted | 20,000+, set per contract |
| **Trial** | free | **free, 14 days; card required at public launch (§5)** | — | 500 (about 8 analyses) |

Optional: a **one-time Premium setup fee from $1,500** for custom integrations, since each one is built per customer.

**Margins per customer** (price − AI − card fees): Basic ~$82 (92%), Pro ~$210 (92%), Premium ~$540 (90%).

**Break-even:** with a mix of 60% Basic, 35% Pro and 5% Premium, the average customer contributes ~$150 a month, so
**8 paying customers cover the $1,200 fixed costs**. From customer 9, the 1.5× premium ($30 per Basic, $80 per Pro
above baseline) builds the scaling reserve.

**30-trial launch example:** 6 paying customers (4 Basic, 2 Pro) bring $814 a month and contribute ~$750. That recovers
the $75 trial cost in month one and covers about 60% of fixed costs; 2–3 more customers reach break-even.

**Market fit check:** Basic at $89 sits below the SEO suites ($100–140) while adding the diagnosis, the plan and drafts.
Pro at $229 is level with Semrush Guru and Ahrefs Standard (~$250). Premium from $599 is well under an agency retainer.
Pro launches at **$229** (founder, 2026-10-12). Pro's live features today are the Search Console connection and the
full trial experience; the Pro integrations in [INTEGRATIONS_ROADMAP.md](INTEGRATIONS_ROADMAP.md) are what grow its value,
so site copy must keep marking the rest Coming soon until each ships.

## 4. AI credits

**Unit:** 1 credit = $0.01 of retail value, about 2× our AI cost. An analysis is about 60 credits (90 when regulated),
a correction about 25. Owners see "credits left (about N analyses)", never model cost.

**Rules**
- Included credits reset monthly and don't roll over. Purchased credits roll over for 12 months.
- Use included credits first, then purchased ones.
- At 80% used: in-app notice and email. At 100%: AI steps pause with the top-up options below; reports, plans,
  drafts, audit checks and Search Console keep working.
- Owners can set their own lower monthly limit.

**Top-ups** (carry the same 1.5× premium):

| Option | Price | Credits | Notes |
|---|---|---|---|
| Small pack | $25 | 1,700 | About 28 analyses |
| Large pack | $50 | 3,750 | 10% bonus |
| Auto-recharge | $25 each time | 1,700 | Charges the saved card when credits fall below 200, up to a **monthly cap the owner sets** (default $100). Off by default. |

Always keep an owner-set cap and email a receipt for every automatic charge; uncapped charging leads to disputes.

## 5. Trial with a card (public launch)

Founder decision (2026-10-12, D-040), **for the public launch only**; the private test period stays as it is.

- Sign-up asks for a card, even for the free 14-day trial. Nothing is charged during the trial.
- When the trial ends, the account **continues on Basic ($89/month) automatically** unless the owner opts out before
  it ends. Opting out is one click in Plans or the billing portal, with no call or email needed.
- Reminder emails **5, 3 and 1 day** before the trial ends, each with the date, the price, and a direct opt-out link.
- The sign-up page states this plainly next to the card field and the button: the trial length, that Basic starts
  automatically at $89/month, the reminder emails, and how to opt out. The owner ticks a box to agree.
- This is an automatic-renewal offer: US state auto-renewal laws (for example California's) require clear
  disclosure before purchase, affirmative consent, an acknowledgment email and easy online cancellation. Counsel
  reviews the sign-up text, Terms and emails before launch (Q-032).
- Needs: Stripe (SetupIntent at sign-up, subscription with `trial_end`), transactional email for the reminders and
  the acknowledgment (none is built today), and the opt-out flow.

**Until the public launch (now to end of October):** about 3 tester accounts from people the founder knows, invited
directly, no card, the current 14-day Pro trial. The Braventa team can extend a tester's trial or set their plan in
the database.

## 6. What it takes to build
1. **Vercel Pro** before the first paid customer (Hobby is non-commercial).
2. **Billing (Stripe):** Checkout for subscriptions, Customer Portal for card and cancellation, webhooks that set
   `organizations.plan`; off-session payments for auto-recharge.
3. **Credit ledger:** a `credit_grants` table (organization_id, source plan/pack/auto, credits, expires_at) and a
   balance view; `router.ts` checks the balance (keep `monthly_ai_budget_usd` as a safety net); `ai_usage` stays the
   source of spend.
4. **UI:** usage bar on Plans and Settings, 80% and 100% notices, top-up and auto-recharge settings.
5. **Legal:** Terms need billing, renewal, cancellation, refund and credit-expiry terms before charging (material
   change, needs counsel, Q-032).

## 7. Decisions
**Decided (founder, 2026-10-12):** the 1.5× premium applies to every tier; Basic $89, Pro $229 from launch (no lower
launch price), Premium from $599; card-required trial converting to Basic with 5/3/1-day reminders at public launch.

**Still open:**
1. Maintenance allowance of $1,000 a month in the cost base: right number?
2. Premium setup fee from $1,500?
3. Top-ups $25 / $50 and auto-recharge with an owner-set cap (default $100)?
4. Trial credit cap of 500 credits?

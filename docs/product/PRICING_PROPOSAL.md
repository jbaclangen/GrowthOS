# Pricing and AI credit proposal

**Status:** proposal for the founder (2026-10-11), answers Q-029 once approved. Nothing here is built or published;
prices stay open until a decision is logged. Tiers and trial rules are D-030.

## 1. What a customer costs us today

Measured from `ai_usage` and the model comparison (AI_ROUTING_AND_COSTS.md §4.1), paid lineup with zero data retention:

| Action | AI cost |
|---|---|
| Full analysis (profile, diagnosis, plan, 5 drafts) | about $0.29 (measured 2026-10-11: $0.037 + $0.124 + $0.090 + $0.038) |
| Full analysis, regulated business (Opus drafts) | about $0.45 |
| Owner correction → re-diagnosis | about $0.12 |
| Discovery matching and follow-up questions (Haiku) | under $0.01 |
| AI assistant connection (MCP) | no AI cost of its own; it triggers the same analysis |
| Website audit checks, PageSpeed, Search Console | no AI cost (deterministic code; Google APIs are free within quota) |

**A typical trial** (1–3 analyses, a few corrections) costs **$0.50–$1.50** in AI. A typical paying Basic customer
(1–2 re-runs a month, a few corrections) costs **$1–3 a month**. Fixed platform costs (Supabase Pro ~$25, Vercel Pro
~$20, OpenRouter fees) are shared across customers and matter only at very low customer counts. Card processing is
about 2.9% + $0.30 per charge, which is why very small top-ups don't make sense.

Today every organization has a hard AI cap, `organizations.monthly_ai_budget_usd` (default $5), enforced before every
AI call in `router.ts`. The credit system below builds on that instead of replacing it.

## 2. Suggested prices

| Tier | Monthly | Yearly (2 months free) | Who it's for | Included AI credits / month |
|---|---|---|---|---|
| **Basic** | **$49** | $490 | Owner who does the work themselves | 1,500 credits (about 25 analyses) |
| **Pro** | **$149** | $1,490 | Owner who wants connected data and, later, agents doing approved work | 6,000 credits |
| **Premium** | **from $499**, quoted | quoted | Multi-location or custom integrations | 20,000+ credits, set per contract |
| **Trial** | free, 14 days, no card | — | Everyone, with Pro features | 500 credits (about 8 analyses) |

Why these numbers:
- Basic at $49 sits below SEO suites (~$130–$140/month) and near local-marketing tools (~$40–$60), which fits a
  recommend-only product. AI cost is 2–6% of the price.
- Pro at $149 is justified by what's live in Pro (Search Console data, when built) plus what's coming (agents,
  connected tools). Until agents ship, keep Pro honest: sell it on connected data, or hold Pro's price until more of
  it is live.
- Premium is quoted because integrations differ per customer; start at $499 to cover setup time.
- No card for the trial keeps sign-up friction low; the 500-credit trial cap limits abuse to about $3 per account.

## 3. AI credits

**Unit:** 1 credit = $0.01 of retail value, priced at about 2× our AI cost to cover payment fees, retries and
platform costs. So an analysis is about 60 credits (90 when regulated), a correction about 25. Show owners
"credits left (about N analyses)", never dollars of model cost.

**Rules**
- Included credits reset monthly and don't roll over. Purchased credits roll over for 12 months.
- Use included credits first, then purchased credits.
- At 80% used: in-app notice and email. At 100%: AI steps pause with a clear message and the top-up options below;
  everything else (reports, plans, drafts, audit checks, Search Console) keeps working.
- Owners can set their own lower monthly limit.

**Top-ups when the limit is reached**

| Option | Price | Credits | Notes |
|---|---|---|---|
| Small pack | $25 | 2,500 | One-off, card on file |
| Large pack | $50 | 5,500 | 10% bonus |
| Auto-recharge | $25 each time | 2,500 | Charges the saved card when credits fall below 200, up to a **monthly cap the owner sets** (default $100). Off by default. |

"Open credit on their card" is the auto-recharge option. Always keep an owner-set monthly cap and email a receipt for
every charge; uncapped charging leads to disputes and chargebacks.

## 4. What it takes to build

1. **Billing (Stripe):** Checkout for subscriptions, Customer Portal for card and cancellation, webhooks that set
   `organizations.plan`. Off-session payments for auto-recharge.
2. **Credit ledger:** a `credit_grants` table (organization_id, source plan/pack/auto, credits, expires_at) and a
   balance view; `router.ts` checks the balance instead of `monthly_ai_budget_usd` (keep the dollar cap as a safety
   net), and `ai_usage` stays the source of spend.
3. **UI:** usage bar on Plans and Settings, the 80% and 100% notices, top-up and auto-recharge settings.
4. **Legal:** Terms need billing, renewal, cancellation, refund and credit-expiry terms before charging (material
   change, needs counsel, Q-032).

## 5. Decisions for the founder
1. Prices: Basic $49, Pro $149, Premium from $499?
2. Trial without a card, capped at 500 credits?
3. Credit unit and 2× markup; included credits per tier?
4. Top-up packs $25 / $50 and auto-recharge with an owner-set cap (default $100)?
5. Pro price now, or a lower launch price until agents are live?

# Team seats, roles and feature modules (research, 2026-10-17)
**Status:** research for founder decision; nothing here is built. Third-party figures are marked (3P).

I read the docs and code only and changed nothing. Prices were checked on 2026-10-17. Any figure marked **(3P)** comes from third-party roundups, not the vendor's own page. Check those before you publish them. Independent verifiers re-checked the key claims on 2026-10-17; the results are in "Verification (2026-10-17)" at the end.

## 0. What the repo has today
- **Roles:** the `member_role` enum has only `owner`, `admin` and `member` (`supabase/migrations/20261010061028_foundation.sql:18`; no migration changes it). There are `is_member()` and `is_org_admin()` helpers (`:35`, `:45`; `is_org_admin()` checks `owner` or `admin`). There is no invite flow and no seat limit in `web/src`, and no general or configurable per-feature permission system. There is one hard-coded role gate: only the owner can connect, choose a property for, or disconnect Google Search Console (`web/src/app/settings/connections-actions.ts:17`, `web/src/app/api/integrations/google/start/route.ts:31`, `web/src/app/api/integrations/google/callback/route.ts:43`; message in `web/src/app/settings/connection-notice.tsx:24`).
- **Score:** `computeGrowthScore()` (`web/src/lib/pipeline/website-intel.ts:64-78`) blends three AI-assessed scores (`content_clarity` 0.25, `conversion_readiness` 0.25, `online_presence` 0.15) with four mobile Lighthouse scores from PageSpeed (performance 0.15, SEO 0.12, accessibility 0.04, best practices 0.04). It already renormalizes the weights when PageSpeed is missing, which is the pattern a module-based score needs. The reweighting is all-or-nothing: it covers PageSpeed being absent, not a single missing metric (tests in `prompts.test.ts:14-27`).
- **Existing hooks for modules:**
  - `audit_findings.category` takes `indexability`, `technical`, `on_page`, `structured_data` or `performance`. A DB CHECK constraint (`20261011160802_website_audit.sql:43`) and the TS `Category` type (`web/src/lib/audit/checks.ts:15`) both enforce this.
  - A plan item's `area` (`growth_plan_items.area`) is unconstrained free text (`text not null default ''`, `20261010164133_diagnosis_and_plan.sql:59`). The plan prompt asks the model for one of `website`, `seo`, `content`, `conversion`, `social`, `crm`, `ads` or `operations` (`prompts.ts:299`), but nothing enforces it: the zod schema accepts any string and joins an array into one comma-separated string (`prompts.ts:62`). Stored values such as "seo, content", or values outside the list, are possible. Treat `area` as a soft label, not an enum.
  - `BUSINESS_METHODOLOGY.md` already names modules A to G. E appears there only as a bare letter; its name, "CRM Intelligence", is in `PRODUCT_OVERVIEW.md:114`.
- **Open questions:** Q-001 (is the first buyer an owner or an agency?) and Q-003 (for agencies: one org per client, or many businesses in one org?) are still open (`OPEN_QUESTIONS.md:13`, `:15`). Each has a working provisional default: Q-001 "Owner-operator first; keep agency use possible via multiple businesses per org", Q-003 "One org per agency for now; revisit with Q-001". Seats and account types depend on both.
- **Stale docs:**
  - `BUSINESS_METHODOLOGY.md:43` says the crawl covers up to 6 pages. CLAUDE.md and the code (`crawler.ts:86`, `MAX_PAGES = 25`) say 25. The same 6-page claim is in `WEBSITE_MESSAGING.md:43,65`, `SUPPORT_SITE.md:18`, `AI_ROUTING_AND_COSTS.md:188` and `WEBSITE_INTELLIGENCE_GAP_REPORT.md:89`.
  - `PRICING_PROPOSAL.md` §2 lists Semrush "Pro/Guru" (`:59`, repeated at `:89`). Semrush's pricing page now shows SEO $139, Starter $199, Pro+ $299 and Advanced (custom), billed monthly (annual billing saves up to 17%).

## 1. How competitors handle seats and roles

| Product | Plans (monthly) | Seats included / extra seat | Roles and approval |
|---|---|---|---|
| Hootsuite | Standard $99, Professional $199, Advanced $399 per user (annual billing; monthly costs more, not listed) | Every seat is paid; a 2nd user costs another $99 | Org roles Super Admin / Admin / Member plus team access to accounts (3P). Approval only on Advanced and up (official page) |
| Sprout Social | Essentials $79 annual / $99 monthly; Standard $199; Professional $299; Advanced $399 per seat (annual billing; monthly $249 / $399 / $499) | Per seat, no bundle | Roles carry an "Approve Others" permission; you need the Administration Permissions company permission to create approval workflows. Message approval on Professional and up; external approvers on Advanced and up (up to 3 on Advanced) |
| Agorapulse | Standard $79 / Professional $119 / Advanced $149 per user (annual; $99 / $149 / $199 monthly); Custom quoted | Per user | Org level, paid seats: Owner, Co-owner, Manager, Advanced Member (Member plus connect/remove social profiles), Member. Free seats: Profile Connector, Archie User. Per profile: Admin, Editor, Moderator (schedules but can't publish; must send for approval), Guest (view only). One-step approvals routed to teammates or clients on Professional+; multi-step approvals and custom roles only on Custom |
| Buffer | Team $10 per channel | Unlimited users | Per channel: Full posting (can approve), Requires approval, No access. Approval only on the Team plan |
| Later | Starter $18.75 / Growth $37.50 / Scale $82.50 (annual; $25 / $50 / $110 monthly) | 1 / 2 / 4 users; extra user **$3.75** annual ($5 monthly), Growth and Scale only; Starter is capped at 1 user | Custom roles and access groups. Only the Account Owner and the Reviewer role approve. Outside reviewers without an account can only **comment**, through a 7-day review link (Growth+); approval status doesn't block scheduled posts |
| Metricool | Starter from $20, Advanced from $53 (annual, USD; $25 / $67 monthly); priced by number of **brands** | Team users only on Advanced+ (unlimited) | Analyst, Editor, Manager/Admin, Content creator (always goes through approval), Client (approves); custom roles possible; outside reviewers by email, no account needed |
| GoHighLevel | Starter $97 (3 sub-accounts), Unlimited $297, Agency Pro $497 | Unlimited users | Agency admin/user plus sub-account admin/user (3P, unverified) |
| HubSpot | Seat-based | Core seat $20 Starter (monthly billing; $7 on annual billing, which third parties call a new-customer promo), $50 Pro, $75 Ent. Sales/Service seat $100 Pro / $150 Ent, not on Starter (Service Pro $90 annual). **View-only seats free and unlimited** on Starter, Pro and Enterprise. Marketing Pro $890 monthly / $800 annual includes 3 core seats, plus a one-time $3,000 onboarding fee; extra Pro core seats from $45 annual. Enterprise $3,600 includes 5 core seats | Seat type sets which tools a user gets (Core, Sales, Service, Revenue, Partner, Developer, View-only) |
| Semrush | SEO $139 / Starter $199 / Pro+ $299 (monthly) | Extra user from **$45** per month | Report sharing comes with paid report add-ons (Base $10, Pro $20 per month) |
| Canva | Business $25 per person per month ($250 a year) | Per seat, pay only for members who accept; Teams is closed to new sign-ups, so its old 3-seat minimum no longer applies to new buyers | Brand controls on Business; detailed roles unverified |

**What the market does:**
- **Two pricing models.** Social-first tools charge for every seat ($79 to $399). Collaboration tools bundle seats or sell them cheap ($4 to $50).
- **Approval is a paid feature.** It usually sits on the middle tier or higher.
- **The same role patterns recur:**
  - Owner/Admin
  - Manager who can approve
  - Editor or Creator whose drafts need approval
  - Analyst or Viewer
  - Outside client approver, often free or with no account
- **Free view seats are common; free no-account approval is rarer:** HubSpot's view-only seats are free and unlimited, and Agorapulse has free Profile Connector and Archie User seats. Of the tools checked, only Metricool lets outside reviewers approve without an account (Advanced+). Later's outside reviewers can only comment, and Sprout's external approvers need Advanced (up to 3).

## 2. Proposed roles and permissions

Each role gets a fixed set of permissions, with no per-user custom permissions in v1 (custom roles would come later, as Agorapulse and Metricool do on top plans). Three rules apply:
- **No one approves their own work.** Only the Owner may self-approve, so a one-person business still works.
- **Every approval is recorded** (D-013).
- **Least privilege:** each role only gets what it needs.

| Area | Owner (super user, 1) | Admin | Marketing manager / digital marketer | Social media manager | Copywriter | Content creator | Analyst (viewer) | Client approver (guest) |
|---|---|---|---|---|---|---|---|---|
| Billing, plan, credits, top-ups | Full | View | — | — | — | — | — | — |
| Team and seats (invite, change role) | Full; transfer ownership | Full (can't remove the Owner) | — | — | — | — | — | — |
| Integrations and OAuth (GSC, GA4, HubSpot) | Full | View; connect/disconnect only if the founder widens today's owner-only rule | View | — | — | — | — | — |
| Social accounts | Full | Full | View | Connect and reconnect assigned channels | — | — | — | — |
| API/MCP keys | Full; revoke anyone's | Full | Own key | Own key | — | — | — | — |
| Business profile and discovery | Edit | Edit | Edit | View | View | View | View | — |
| Run / re-run analysis (uses credits) | Yes | Yes | Yes | — | — | — | — | — |
| Diagnosis corrections | Yes | Yes | Yes | — | — | — | View | — |
| Growth plan items (accept / dismiss / done) | Yes | Yes | Yes | Mark own items done | Mark own items done | Mark own items done | View | View if shared |
| Content drafting | Yes | Yes | Yes | Yes | Yes | Yes | View | Comment |
| Content approval | Yes, including own drafts | Yes, not own | Yes, not own | Only with the approver toggle, not own | — (submit only) | — (submit only) | — | Approve or reject assigned items |
| Scheduling / publishing (future; approved items only) | Yes | Yes | Yes | Yes | — | — | — | — |
| Reports and export | Yes | Yes | Yes | Channel reports | — | — | View and export | Shared report only |
| AI assistant (coming soon; limited to the user's permissions; uses org credits) | Yes | Yes | Yes | Yes | Yes | Yes | Read-only Q&A | — |

**What changed (verification):** the code already limits Search Console connect, property choice and disconnect to the owner, so the Admin cell for integrations now keeps that rule by default instead of granting Admin full rights; widening it is a founder choice.

**Build notes:**
- Replace the `member_role` enum with these role ids.
- Keep the role-to-permission map in code: a pure, unit-tested file such as `web/src/lib/team/roles.ts`, following the `tiers.ts` pattern.
- Move the existing hard-coded owner-only Search Console checks (`connections-actions.ts:17`, `google/start/route.ts:31`, `google/callback/route.ts:43`) into that map as an `integrations.connect` permission, so behavior stays the same until the founder changes it.
- Add an SQL helper, `has_permission(org, perm)`, for RLS write policies. Check permissions on the server, as with `canUse`.
- Add a new `invitations` table with `organization_id`, RLS and an expiry.
- MCP keys get the same permissions as their user's role.

## 3. Seat pricing proposal

AI cost sits with the organization, not the user. Today `organizations.monthly_ai_budget_usd` (default $5) caps AI spend per organization, however many members it has (`web/src/lib/ai/router.ts:77-87`). `PRICING_PROPOSAL.md` plans the same for credits: included credits per tier (§3) and a `credit_grants` table keyed by `organization_id` (§6.3). That credit system is not built yet, and §7 still lists top-ups and the trial credit cap as open. The proposal never mentions seats, so "an extra seat costs Braventa almost nothing" is this doc's inference: extra users can use up the org's budget faster, but the cap and top-ups bound that. Seat prices should add revenue without discouraging people from adding approvers.

Tier prices below are founder-decided (D-039) but exist only in the docs (`DECISION_LOG.md:440-443`, `PLANS_AND_TIERS.md`, `PRICING_PROPOSAL.md`). No code holds them; the site's `/pricing` and the app's `/plans` say "Pricing to be announced" (Premium "Custom"). D-039 keeps prices off the site until checkout exists, and seat prices should follow the same rule.

| | Basic $89 | Pro $229 | Premium from $599 |
|---|---|---|---|
| Full seats included (Owner + editing roles) | 2 | 5 | 10, more by contract |
| Extra full seat | **$29/mo** | **$39/mo** | Quoted (target $35) |
| Analyst/viewer seats | Free, up to 5 | Free, up to 10 | Unlimited |
| Client approver (guest) | Free, up to 3 | Free, up to 10 | Unlimited |
| Roles available | Owner, Admin, Copywriter, Content creator, Analyst | All roles plus the approver toggle and client approvers | All roles plus custom roles later |

**Why these prices:**
- **Baseline:** HubSpot Starter's core seat is $20 on monthly billing ($7 on annual billing, which third parties call a new-customer promo) and Canva Business is $25 per person per month. Both are from the vendors' own pages.
- **The 1.5× premium (D-039)** gives $30 and $37.50, set at the standard price points $29 and $39, the same way `PRICING_PROPOSAL.md` sets tier prices ($59 to $89, $149 to $229, $399 to $599). D-039 itself covers tier prices and AI credits, not seats; applying the premium to seats is this doc's proposal and is not approved.
- **Against the market:** this is far below Hootsuite, Sprout or Agorapulse ($79 to $399 per user), level with HubSpot Pro core ($50 monthly, from $45 annual) and Semrush ($45), and above Later ($3.75 annual, $5 monthly).
- **Included seats** roughly match Later (2 / 4) and HubSpot Marketing Pro (3 core).
- **Abuse guard:** free seats can't draft, so they don't replace paid seats.
- **Client approvers on Basic:** keep them free, because owner sign-off is core to D-013. The market mostly keeps client approval on middle or upper tiers (Agorapulse Professional+, Sprout external approvers on Advanced, Metricool Advanced+), and only Metricool lets outside reviewers approve without an account. So approvals by outside clients could reasonably stay Pro-only. **That is a founder choice.** **What changed (verification):** Later's outside reviewers can only comment, not approve, so market support for free no-account approvers on a low tier is weaker than first stated, though the table still proposes free client approvers on Basic.

## 4. Plan names: a founder decision

The founder's names (Brand, Professional, Business, Organization) conflict with D-030 (Basic / Pro / Premium). Those names are already in `web/src/lib/plans/tiers.ts`, on the site's `/pricing` page and on the app's `/plans` page. The D-039 prices (Basic $89, Pro $229, Premium from $599) are decided but live only in the docs; neither page shows a price yet. Because there is no checkout yet and no page shows a price, renaming now costs less than it will after checkout ships; the recommendation stays Option A.

| Option | What it means | Cost | Risk |
|---|---|---|---|
| **A (recommended)** | Keep Basic / Pro / Premium as **feature tiers**. Add an **account type**: **Brand** (one business) or **Agency/Organization** (many businesses, priced per extra brand, e.g. +$59 or +$149 per brand by tier, *unvalidated*) | New `organizations.account_type`; no copy changes | Low. Also answers Q-001/Q-003 and fits their provisional defaults (agency use through many businesses in one org) |
| B | Rename the tiers: Brand = Basic, Professional = Pro, Business = Premium, plus Organization as a 4th, multi-business tier | Change `TIERS` labels only; ids stay | Site, docs and decisions need a new entry superseding the D-030 naming; a 4th price is needed |
| C | Use seat-type names (Brand seat, Professional seat) | — | Confusing, because "Brand" is also `brand_profiles` and Metricool's billing unit |

Whichever option is picked needs a new DECISION_LOG entry, and Q-001/Q-003 need answers.

## 5. Module catalog

The growth plan (module B, "Marketing strategy" in the methodology doc) is the **core that combines modules**, not a module itself. "Live" below means the code does it today.

| Module | Purpose | Live today | Later | Data and integrations | Tier | Sub-score |
|---|---|---|---|---|---|---|
| Business intelligence (A) | Shared business context | Profile from the website, owner inputs (goal, area, tools), pain-point discovery, follow-ups, regulated-industry detection, MCP fill-in | Profile editing, stored source labels, document uploads | Crawl, owner, MCP | Basic | Profile completeness (not part of the score) |
| Website and technical SEO (D) | Site health and indexability | Crawl of up to 25 pages (45 s time budget) with robots.txt respected, sitemap, canonical/noindex, redirects, on-page checks, structured data, PageSpeed mobile + desktop, CWV field data | Accessibility checks, more rules | Crawler, PageSpeed | Basic | Website health |
| Conversion and messaging | Clarity, CTAs, trust | AI scores for `content_clarity` and `conversion_readiness` | Form and journey checks | Crawl | Basic | Conversion readiness |
| Search visibility | Real search demand | GSC data shown on `/search` (not yet used in the diagnosis; `searchConsoleSummaryForPrompt` has no callers). Pro feature: on Pro, Premium and the trial; paused on Basic with data kept. The owner connects through Google OAuth | GSC in the diagnosis, keywords, content and search intent | GSC | Pro | Search visibility |
| Local SEO | Map and pack presence | — | Google Business Profile, NAP, LocalBusiness schema | GBP (D-041) | Pro | Local presence (only scored if the business has a service area) |
| Social media | Channel presence and consistency | Social links found; AI `online_presence` score | Account connections, posting cadence, performance | Social APIs | Pro | Social presence |
| Search ads | Spend efficiency | — | Google/Meta Ads, read-only | Ads APIs | Pro | Paid efficiency |
| Email marketing | List and nurture health | — | HubSpot/Mailchimp, read-only | ESP/CRM | Pro | Email health |
| Video | Video presence | — | YouTube, HeyGen/Higgsfield drafts | YouTube, creative tools | Pro | Video presence |
| Content studio (C) | Plan and drafts | 30-day plan, 5 drafts, approve/reject | Editing, more formats, Canva | AI, creative tools | Basic (creative tools on Pro) | Not scored (an output) |
| CRM intelligence (E) | Lead follow-up gaps | — | HubSpot read-only analysis, then tasks | HubSpot | Pro | Lead follow-up |
| Analytics and measurement (G) | Tracking and outcomes | — | GA4/GTM checks, planned vs actual | GA4, GTM | Pro | Measurement readiness |
| Automation and agents (F) | Carry out approved fixes | — | n8n, WordPress, publishing, each action approved | n8n, connected tools | Pro | Not scored (carries out plan items) |
| Custom integrations | Business systems | — | E-commerce, QuickBooks, Xero | Per contract | Premium | Per contract |

**How modules combine:**
- The growth score is a weighted mean of the sub-scores of modules that are **enabled and have evidence**. Weights are renormalized, as `computeGrowthScore` already does.
- Each score shows "based on N modules". It is stored with a `score_version` and the list of modules used, so an upgrade isn't mistaken for improvement.
- Each module emits findings with refs. The plan prompt receives findings only from enabled modules. New plan items store a `module_id` directly. Old items get one through a lookup from `area`, which is free text today (see §0), so the lookup must handle comma-joined and unknown values.

## 6. Module architecture sketch

```ts
// web/src/lib/modules/registry.ts — pure, unit-tested (like tiers.ts)
export type ModuleId = "business_intel" | "website_seo" | "conversion" | "search_visibility" | "local_seo"
  | "social" | "search_ads" | "email" | "video" | "content_studio" | "crm" | "analytics" | "automation";
export type ModuleDef = {
  id: ModuleId; label: string; featureId: FeatureId;      // tier + status come from FEATURES (single source)
  requires: IntegrationId[];                               // e.g. ["search_console"]
  scoreWeight: number | null;                              // null = not scored
  findingCategories: string[]; planAreas: string[];
};
// web/src/lib/modules/<id>/run.ts — server-only
export interface ModuleRunner {
  collect(ctx: OrgCtx): Promise<Evidence>;                 // crawl/API, untrusted content flagged
  check(e: Evidence): Finding[];                           // deterministic, versioned rules
  subScore(e: Evidence, f: Finding[]): number | null;
  promptFragment(e: Evidence, f: Finding[]): string;       // fed to runWorker via router.ts only
}
export const moduleEnabled = (access, overrides, id) =>
  canUse(access.tier, MODULES[id].featureId) && overrides[id]?.enabled !== false && integrationsConnected(id);
```

**Data:**
- New table `organization_modules` (organization_id, module_id, enabled, config jsonb) with RLS through `is_member`. Writes need `has_permission('integrations')`.
- New table `module_runs` (organization_id, audit_run_id, module_id, status, sub_score, rules_version).
- Add `module_id` to `audit_findings`, `diagnosis_findings` and `growth_plan_items`, with a CHECK (or a zod enum on write) limited to registry ids.

**UI:** the report page has one section per module. Modules that aren't live show a "Coming soon" card.

**Migration path (one small PR per step, no change in behaviour until step 6):**
1. Add the registry describing the current pipeline as three modules: `business_intel`, `website_seo`, `conversion`. Add a test that the registry and `FEATURES` agree.
2. Add `module_id` columns. Backfill `audit_findings` from `category` (a DB-checked enum, so a fixed map works). Backfill `growth_plan_items` from `area` through a normalizing lookup: take the first comma-separated value, map known values, and leave unknown or empty values null. Have the plan prompt's zod schema write `module_id` for new items. **What changed (verification):** `area` turned out to be unconstrained free text, so the backfill now needs a normalizing lookup with a null fallback instead of a direct one-to-one map.
3. Split `computeGrowthScore` into per-module sub-scores, with a snapshot test that the total is unchanged.
4. Split `prompts.ts` into module fragments; `prompts.test.ts` must show identical output.
5. Run the `website_evidence` job by looping over enabled modules. Add the `organization_modules` overrides table.
6. Add the first new module: GSC in the diagnosis (already planned). The others follow D-041's order.

## 7. How we research before building (reusable process)
1. **Brief:** the question, why now, the decision it feeds, and the docs and decisions it touches (CLAUDE.md "Read before you work"). One page at most.
2. **Read the repo first:** what the code really does, the related D- and Q- entries, and stale docs to flag.
3. **Look outside:** 5 to 10 competitors from their official pages. Record each fact with the date checked, and mark third-party figures as unverified.
4. **Options:** 2 or 3 options, each with cost, risk and reversibility, and a recommendation that follows MVP_SCOPE §6.
5. **Decide:** the founder picks. Log it as a DECISION_LOG entry (mark any superseded entry) and add leftovers to OPEN_QUESTIONS.
6. **Spec:** update the product, architecture and plan docs. Put data rules, RLS and the source of each data field into the spec.
7. **Build:** in small PRs, with tests, typecheck, lint, `tokens:check` and a run of the app. Mark features live only in the PR that ships them.
8. **Review after launch:** compare with testers' use and revisit at the next pricing review.

## Sources
- Hootsuite plans (per-user prices, annual billing, approval workflows): https://www.hootsuite.com/plans ; earlier third-party price roundups: https://www.socialpilot.co/insights/hootsuite-pricing , https://napoleoncat.com/blog/hootsuite-pricing/ ; roles (3P): https://www.stitchflow.com/user-management/hootsuite/manual
- Sprout Social: https://sproutsocial.com/pricing/ ; approvals: https://support.sproutsocial.com/hc/en-us/articles/205974715
- Agorapulse: https://www.agorapulse.com/pricing/ ; https://support.agorapulse.com/en/articles/9542481-team-settings-explained ; https://support.agorapulse.com/en/articles/8764534-agorapulse-permissions-matrix
- Buffer: https://buffer.com/pricing ; https://support.buffer.com/articles/adding-users-and-setting-up-permissions-ixjiLpe2fd
- Later: https://later.com/pricing/ ; approvals and external review: https://help.later.com/hc/en-us/articles/40954654500375-Team-Collaboration-and-Content-Approvals
- Metricool: https://metricool.com/pricing/ ; https://help.metricool.com/user-management-team-roles-and-permissions-in-metricool-ovjqe ; approvals: https://help.metricool.com/how-to-send-posts-for-review-with-metricools-approval-system-yvdr0
- GoHighLevel: https://www.gohighlevel.com/pricing ; roles (3P): https://consultevo.com/gohighlevel-admin-user-roles-permissions/
- HubSpot seats (official): https://legal.hubspot.com/hubspot-product-and-services-catalog ; https://www.hubspot.com/pricing/marketing/starter ; https://www.hubspot.com/pricing/marketing/professional ; https://www.hubspot.com/pricing/service/enterprise ; https://knowledge.hubspot.com/account-management/manage-seats ; earlier third-party roundups: https://www.landbase.com/blog/hubspot-pricing , https://www.mo.agency/pricing
- Semrush: https://www.semrush.com/prices/
- Canva (official page; plain HTTP fetches get 403, it loads in a browser): https://www.canva.com/en/pricing/?countryCode=us ; earlier third-party roundups: https://piktochart.com/blog/canva-pricing-2026-costs-raised/ , https://costbench.com/software/design/canva

**Repo sources added by verification:**
- Roles and the owner-only Search Console gate: `supabase/migrations/20261010061028_foundation.sql:18,35,45`; `web/src/app/settings/connections-actions.ts:17`; `web/src/app/api/integrations/google/start/route.ts:31`; `web/src/app/api/integrations/google/callback/route.ts:43`; `web/src/app/settings/connection-notice.tsx:24`
- Growth score: `web/src/lib/pipeline/website-intel.ts:64-78`; `web/src/lib/pipeline/prompts.test.ts:14-27`
- `category` and `area`: `supabase/migrations/20261011160802_website_audit.sql:43`; `web/src/lib/audit/checks.ts:15`; `supabase/migrations/20261010164133_diagnosis_and_plan.sql:59`; `web/src/lib/pipeline/prompts.ts:62,299`
- Open questions: `docs/decisions/OPEN_QUESTIONS.md:13,15` (open table), `:42-58` (Resolved table)
- Tier names and prices: `web/src/lib/plans/tiers.ts:8-27`; `site/src/app/pricing/page.tsx:70`; `web/src/app/plans/page.tsx:68`; `docs/decisions/DECISION_LOG.md:438-443`; `docs/product/PLANS_AND_TIERS.md:4`; `docs/product/PRICING_PROPOSAL.md:67-74,148`
- AI cost per organization: `web/src/lib/ai/router.ts:77-87`; `docs/product/PRICING_PROPOSAL.md:3-5,94-114,140-142,151-155`
- Search Console status: `web/src/lib/plans/tiers.ts:59-60`; `web/src/lib/integrations/search-console.ts:564-574`; `web/src/app/search/page.tsx:39,78`; `docs/product/PLANS_AND_TIERS.md:39`
- Live website module: `web/src/lib/integrations/crawler.ts:86`; `web/src/lib/integrations/google.ts:146`; `web/src/lib/audit/checks.ts:858`; `web/src/lib/pipeline/prompts.ts:26,295`; `web/src/lib/pipeline/website-intel.ts:66`; `web/src/lib/mcp/tools.ts:141`
- Stale docs: `docs/product/BUSINESS_METHODOLOGY.md:43`; `docs/product/PRODUCT_OVERVIEW.md:114`; `docs/product/PRICING_PROPOSAL.md:59,89`

**Repo files read:**
- `web/src/lib/plans/tiers.ts`
- `docs/product/PLANS_AND_TIERS.md`
- `docs/product/PRICING_PROPOSAL.md`
- `docs/product/BUSINESS_METHODOLOGY.md`
- `docs/product/GrowthOS_Product_Vision_and_Planning_Context.md` (§8–9)
- `docs/product/Braventa_Website_Intelligence_SEO_Audit_Blueprint.md` (outline)
- `docs/product/MVP_SCOPE.md` (outline)
- `supabase/migrations/20261010061028_foundation.sql`
- `supabase/migrations/20261011160802_website_audit.sql`
- `web/src/lib/pipeline/website-intel.ts`
- `web/src/lib/pipeline/prompts.ts`
- `web/src/lib/audit/checks.ts`
- `docs/decisions/OPEN_QUESTIONS.md` (Q-001, Q-003)
- `docs/decisions/DECISION_LOG.md` (D-030 to D-041)

## Verification (2026-10-17)

Independent verifiers re-checked the claims the recommendations rest on. "Corrected" claims are fixed in place above.

| id | claim (short) | result | source |
|---|---|---|---|
| seats-01 | `member_role` is owner/admin/member; no invites, seats or per-feature permissions | Corrected: no invites, seats or general permission system, but Search Console connect/disconnect is owner-only in code | `foundation.sql:18,35,45`; `connections-actions.ts:17`; `google/start/route.ts:31`; `google/callback/route.ts:43` |
| seats-02 | `computeGrowthScore` blends 3 AI + 4 PageSpeed scores and renormalizes without PageSpeed | Confirmed (mobile only; all-or-nothing) | `website-intel.ts:64-78`; `prompts.test.ts:14-27` |
| seats-03 | `category` and `area` value sets | Corrected: `category` is enforced; `area` is free text, values only suggested in the prompt | `website_audit.sql:43`; `diagnosis_and_plan.sql:59`; `prompts.ts:62,299` |
| seats-04 | Q-001 and Q-003 still open | Confirmed (both have provisional defaults) | `OPEN_QUESTIONS.md:13,15,42-58` |
| seats-05 | Basic/Pro/Premium and $89/$229/$599 in code, site and pricing | Corrected: names are in code and on site; prices are in docs only, site says "Pricing to be announced" | `tiers.ts:8-27`; `site/src/app/pricing/page.tsx:70`; `DECISION_LOG.md:440-443` |
| seats-06 | 1.5× on $20 and $25 gives $29 and $39 seats | Confirmed (D-039 doesn't cover seats; applying it is this doc's proposal) | `DECISION_LOG.md:438-442`; `PRICING_PROPOSAL.md:67-74`; hubspot.com/pricing/marketing/starter |
| seats-07 | Pooled org credits (§4) make an extra seat nearly free | Corrected: credits are per org but not built; §4 doesn't say "pooled" or mention seats; today a per-org AI budget caps spend | `PRICING_PROPOSAL.md:3-5,94-114,140-142`; `router.ts:77-87` |
| seats-08 | GSC live on `/search`, not in the diagnosis | Confirmed (Pro feature; owner connects) | `tiers.ts:59-60`; `search-console.ts:564-574`; `search/page.tsx:39,78` |
| seats-09 | Live website, business-intel, conversion and social capabilities | Confirmed (25 pages is a cap, with a 45 s budget) | `crawler.ts:86`; `google.ts:146`; `checks.ts:858`; `prompts.ts:26,295`; `mcp/tools.ts:141` |
| seats-10 | Methodology says 6 pages and names A to G; pricing proposal lists Semrush Pro/Guru | Confirmed (6 pages also in 4 other docs) | `BUSINESS_METHODOLOGY.md:43`; `PRICING_PROPOSAL.md:59` |
| seats-11 | Semrush $139/$199/$299, extra user from $45, paid report sharing | Confirmed | semrush.com/prices |
| seats-12 | HubSpot seat prices; view-only free; Marketing Pro includes 3 core seats | Corrected: figures are official, not 3P; Starter is $7 on annual billing, not $15 | legal.hubspot.com catalog; hubspot.com pricing pages; HubSpot KB manage-seats |
| seats-13 | Canva Business $25 per person; Teams 3-seat minimum gone | Confirmed on the official page | canva.com/en/pricing |
| seats-14 | Later prices, users, $3.75 extra user, no-account approvers | Corrected: extra users only on Growth/Scale ($5 monthly); outside reviewers comment, can't approve | later.com/pricing; help.later.com approvals article |
| seats-15 | Hootsuite $99/$199/$399 per user; approval on Advanced+ | Confirmed on the official page | hootsuite.com/plans |
| seats-16 | Sprout per-seat prices; "Approve Others"; admin creates workflows | Confirmed (higher tiers are annual prices; monthly $249/$399/$499) | sproutsocial.com/pricing; Sprout support 205974715 |
| seats-17 | Agorapulse prices, roles, client approvals, custom roles | Corrected: org roles also include Advanced Member (paid), Profile Connector and Archie User (free) | agorapulse.com/pricing; Agorapulse permissions matrix and team settings |
| seats-18 | Metricool per-brand pricing, Advanced+ teams, roles, email reviewers | Confirmed | metricool.com/pricing; Metricool help (roles, approvals) |

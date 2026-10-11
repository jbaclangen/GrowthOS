# Open questions

Unresolved decisions that materially affect the brand, product, or architecture. Each one has a
provisional default so work can continue, labelled as an assumption. When the founder answers, record
the answer in [`DECISION_LOG.md`](DECISION_LOG.md) and move the question to **Resolved** with the
decision ID.

Status / last reviewed: 2026-10-10. Priority: **P1** blocks taking paying customers; **P2** needed during
validation; **P3** can wait.

| ID | Pri | Question | Why it matters | Provisional default |
|---|---|---|---|---|
| Q-001 | P1 | Is the first paying buyer the business owner or an agency/consultant serving several businesses? | Decides the tenancy model, the pricing meter, and whether multi-client features matter now. | Owner-operator first; keep agency use possible via multiple businesses per org. |
| Q-002 | P1 | Which geography is the first market? | Sets spelling (D-016), email law (CAN-SPAM / CASL / GDPR / Spam Act), the postal address in marketing email, and posting time zones (posts are currently scheduled at ~9am Philippine time in code). | North America; US English. |
| Q-003 | P2 | For agencies: one organization per client, or one organization holding many businesses? | Today all businesses in an org share one AI budget and one member list. | One org per agency for now; revisit with Q-001. |
| Q-004 | P1 | Will the 3–4 minute analysis run fit Vercel's function-duration limit, or must it move to n8n / a queue? No `maxDuration` is set. | Blocks a reliable deploy to app.braventa.io. | Set `maxDuration` within plan limits, test on Vercel; move to n8n if it doesn't fit. See [`SYSTEM_ARCHITECTURE.md`](../architecture/SYSTEM_ARCHITECTURE.md). |
| Q-005 | P1 | When does `AI_MODE=paid` start, and what is the target AI cost per analysis run? | Free models are slow and rate-limited (~50 requests/day); margins and pricing depend on cost per run. | Switch to paid before the first paying customer; measure cost per run first. |
| Q-006 | P1 | Where is n8n hosted long-term? The brief says Oracle Cloud; the configured instance is `n8nautomations.pixelmarketingdesign.com`. | Client data shouldn't pass through infrastructure under another brand's domain without a decision. | Move to a Braventa-owned host (e.g. `n8n.braventa.io`) before n8n handles client data. |
| Q-007 | P1 | Which model providers may receive customer data, and are free endpoints that may train on inputs acceptable? | Privacy commitments, the Trust page, and the HubSpot design all depend on it. | No customer CRM data on free endpoints; website-only analysis acceptable on free tier during the proof of concept. |
| Q-008 | P1 | Data retention and deletion: how long are crawled content, drafts, and AI logs kept; how do account and org deletion work? | Required before paying customers and for the Trust page and support templates. | Undecided; document current behaviour in [`SECURITY_AND_PRIVACY.md`](../architecture/SECURITY_AND_PRIVACY.md). |
| Q-009 | P2 | Should there be a separate dev/staging Supabase project? Local dev currently writes to the production database. | Testing against production data is a real risk once customers exist. | Create a free-tier dev project before onboarding customers. |
| Q-010 | P1 | Which billing provider and which transactional email provider? | Schema assumes Stripe; only Supabase Auth emails can be sent today; braventa.io needs SPF/DKIM/DMARC. | Stripe; a transactional provider with a free tier. Not chosen. |
| Q-011 | P2 | Is a read-only HubSpot summary part of the MVP or the first Next-phase item? | Depends on how many early customers use HubSpot. | First Next-phase item ([`MVP_SCOPE.md`](../product/MVP_SCOPE.md)). |
| Q-012 | P2 | Comfortaa for all body/UI text (D-015): confirm after testing dense screens (calendar table, long drafts) with real users. | Comfortaa is a rounded display-leaning face with a small x-height; at small sizes and in long passages it reads slower than a neutral UI face. | Keep D-015 with the guardrails in D-015 (≥14px, weight 600 labels). If testing shows strain, consider Quicksand for UI text too. |
| Q-013 | P2 | Support and security email addresses, and social handles. | Email, community, and support templates reference them; handles must not add "AI" (D-002). | `support@braventa.io`, `security@braventa.io`; handles unverified. |
| Q-014 | P1 | Trademark clearance for "Braventa" and the B-dot mark (D-027). | No search has been performed; brand documents are not legal clearance. | Commission a search before significant spend on brand assets or launch. |
| Q-015 | P2 | Sign-off on the validation metric targets in [`MVP_SCOPE.md`](../product/MVP_SCOPE.md) §5. | They define what "the MVP works" means. | Use as assumptions until signed off. |
| Q-016 | P2 | Early-access offer and a booking link (for "Book a call"). | Pricing page and primary marketing CTAs depend on them. | "Join early access" + a booking link, once chosen. |
| Q-017 | P3 | Community platform. | Community guidelines assume one exists. | None until there are customers to gather. |
| Q-019 | P1 | Vercel Hobby is for non-commercial use. Upgrade to Pro before charging customers? | Terms-of-service compliance. | Upgrade when the first paying customer signs. |
| Q-020 | P3 | Should the internal n8n callback header `X-GrowthOS-Secret` be renamed? | Internal only; renaming needs a matching n8n change. | Leave until n8n workflows are built. |
| Q-026 | P2 | Re-running the analysis after a plan is confirmed creates a new proposed diagnosis; confirming it replaces the earlier plan, and its accept/dismiss/done statuses are not carried over. Carry statuses over to matching items, or have re-runs refresh only the evidence? | Spec §10: don't silently rewrite user-approved plans. Nothing changes until the owner confirms, but the old statuses are then lost. | Carry over statuses for items that address the same pain points, once owners use re-run. |
| Q-027 | P3 | Should owners be able to reorder plan items, not only accept, dismiss or complete them? | Spec §7 keeps a separate final priority; today it is computed from the owner's top three and the score. | Add ordering if design partners ask for it. |
| Q-028 | P3 | Apply the (declined) migration adding covering indexes for the composite (id, organization_id) foreign keys? | Supabase performance advisor, INFO level; no impact at MVP data volumes. | Apply before the first customers, after review. |
| Q-029 | P1 | Prices for Basic, Pro and Premium, and whether the trial needs a card. | D-030 fixes the tiers; D-012 still leaves prices open. Needed before the pricing page and billing. | Decide before building billing. |
| Q-030 | P2 | Who answers "Talk to us" upgrade requests, and how are they noticed? | Requests are stored in `upgrade_requests` with no notification (no email sending yet). | Check the table daily until transactional email exists. |
| Q-031 | P2 | Pro build order and the agent execution model (n8n workflows vs in-app Opus calls) for applying fixes. | D-030 names both; each needs approval UX, audit log and OAuth scopes. | See PLANS_AND_TIERS.md §5. |
| Q-032 | P1 | Legal documents (Terms, Privacy, Cookies, Sub-processors, AI disclosure, Acceptable use). | Needed before sign-up is public; must be drafted or reviewed by a lawyer. | Commission before launch. |
| Q-033 | P2 | Contact form spam protection beyond the honeypot (rate limit, CAPTCHA alternative such as Cloudflare Turnstile) and a notification when a request arrives. | The form is public once braventa.io is live; requests are only visible in Supabase. | **Partly resolved 2026-10-11 (D-034):** rate limit + timing check built; HubSpot notification live since the 2026-10-11 `pageUri` fix; replies sent from hello@braventa.io via Hostinger; HubSpot Marketing Hub Starter bought, braventa.io sending domain authenticated, email footer uses the Pixel Marketing Design address until the US LLC is registered; automatic reply live from hello@braventa.io ([CONTACT_PIPELINE.md](../marketing/CONTACT_PIPELINE.md)). |
| Q-024 | P3 | Should model IDs be configurable without a code change (env or database)? Vision §10. | Swapping a failing or retired model currently needs a deploy. | Not before paid mode; revisit when switching to `AI_MODE=paid`. |
| Q-034 | P1 | Is Basic after the trial free, or a paid plan? The code moves an ended trial to Basic automatically (D-030), but nothing says whether that Basic is charged. | The pricing page now says "the account moves to Basic" (it used to say "you keep Basic", which reads as free). Prices, billing copy and any rule that differs between "trial ended" and "subscribed to Basic" depend on it. | Decide with Q-029; then state it plainly on the pricing page. |
| Q-035 | P2 | The site's AI page and Sub-processors describe the paid model lineup (Anthropic, with OpenAI and Qwen as backups). Which `AI_MODE` will braventa.io describe at launch? | Under `AI_MODE=free` requests go to free NVIDIA models through OpenRouter, which the site doesn't list (see Q-005, Q-007). | Switch to paid before the site is indexed, or list the free models and their data terms. |
| Q-036 | P3 | Module names: the founder's Phase 1 brief (D-035) calls two areas "Automation & Workflow Intelligence" and "Analytics & Optimization"; D-010 names are "Automation" and "Analytics". Rename? | The brief also says not to rename anything, so the site keeps the D-010 names. | Keep D-010 names unless the founder confirms the longer ones. |
| Q-037 | P3 | The Basic tier summary in `tiers.ts` promises "a marketing audit". Today that is the website analysis, growth score and diagnosis. Keep the word "audit"? | D-030 uses it; Pro's "full marketing audit" is Coming soon, so "audit" in Basic can read as more than the website review. | Keep (founder wording) unless early customers misread it. |

## Resolved

| ID | Answer | Decision |
|---|---|---|
| Q-025 | Keep BRAVENTA.IO and the Violet dot, as in the founder's reference (founder: "proceed", 2026-10-10) | D-027 |
| — | Typography: Quicksand (headings, logo) + Comfortaa (other text) | D-015 |
| Q-021 | AI assistant is not in the MVP; committed for the Next phase | D-020 |
| Q-022 | Yes — optional guided onboarding questions are in the MVP (BI-12) | D-021 |
| Q-023 | Yes — opportunity tracking (MS-5) and "do this first" (UX-1) are in the MVP | D-022 |
| Q-018 | Yes — `advisor_fixes` is applied (remote version 20261010061126); local migration files renamed to match the recorded versions | — |
| Q-039 | P2 | When to build MCP phase 2: OAuth sign-in so claude.ai and ChatGPT connectors can connect, and whether to add read-only tools for the plan and drafts | Phase 1 (D-036) needs a pasted key and works only with Claude Code and Claude Desktop | Build after real owners use phase 1; keep keys for developer tools |

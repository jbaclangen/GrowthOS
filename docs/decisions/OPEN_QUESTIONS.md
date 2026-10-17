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
| Q-030 | P2 | Who answers "Talk to us" upgrade requests, and how are they noticed? | Requests are stored in `upgrade_requests` with no notification (no email sending yet). | Check the table daily until transactional email exists. |
| Q-031 | P2 | Pro build order and the agent execution model (n8n workflows vs in-app Opus calls) for applying fixes. | D-030 names both; each needs approval UX, audit log and OAuth scopes. | See PLANS_AND_TIERS.md §5. |
| Q-032 | P1 | Legal documents (Terms, Privacy, Cookies, Sub-processors, AI disclosure, Acceptable use). | Needed before sign-up is public; must be drafted or reviewed by a lawyer. | Commission before launch. |
| Q-033 | P2 | Contact form spam protection beyond the honeypot (rate limit, CAPTCHA alternative such as Cloudflare Turnstile) and a notification when a request arrives. | The form is public once braventa.io is live; requests are only visible in Supabase. | **Partly resolved 2026-10-11 (D-034):** rate limit + timing check built; HubSpot notification live since the 2026-10-11 `pageUri` fix; replies sent from hello@braventa.io via Hostinger; HubSpot Marketing Hub Starter bought, braventa.io sending domain authenticated, email footer uses the Pixel Marketing Design address until the US LLC is registered; automatic reply live from hello@braventa.io ([CONTACT_PIPELINE.md](../marketing/CONTACT_PIPELINE.md)). |
| Q-040 | P2 | Turn OpenRouter's zero-data-retention setting off to test (or use) free models? | With ZDR on, free models and Qwen are refused, so `AI_MODE=free` doesn't work and free can't be compared with paid (D-037). Off means owners' setup answers may be kept or used for training by free providers, which the Privacy and Sub-processors pages would have to say. | Keep ZDR on and stay on paid. If a free test is wanted, run the eval on public sites with sample answers, with ZDR off only for that run. |
| Q-041 | P3 | Should Ask Braventa (D-043) keep the questions people ask, to learn what's unclear in the app? | Today only who asked and when is stored (`assistant_usage`); question text would be useful product insight but is free text that can include personal data. | Don't store it. If wanted: a retention period (30–90 days), a way for users to delete it, and a privacy page update first. |
| Q-042 | P3 | Now that Postgres sends analysis hand-offs (`pg_net` + `pg_cron`, D-042 amended 2026-10-17), should the 10-minute stale-job reaper also run there? | The reaper only runs when the dashboard, the report page or a new run looks at the organization's jobs, so a job cut off while nobody has the app open stays "running" (and blocks re-runs) until someone does. The sweeper already fails jobs whose post was refused or failed 4 times; a step that died mid-run, or posts `pg_net` never sent, still wait for the reaper. | Leave it in the app; revisit if stuck jobs show up in `npm run health`. |
| Q-039 | P2 | Add read-only MCP tools for the plan and drafts (the reserved `read` scope)? OAuth sign-in and service keys are built (D-044, provisional until the founder confirms) | Owners could ask their assistant about the plan and drafts; it widens what a connected app can read | Not yet: wait until owners use the onboarding tools |
| Q-043 | P3 | Run `oauth_cleanup` on a schedule (Supabase pg_cron, installed since D-042 was amended) instead of after each client registration and code exchange? | Expired OAuth codes and tokens and unused clients are deleted only when someone registers or connects; quiet periods leave them in place longer | Keep the on-write cleanup; schedule it if registrations and new connections become rare |
| Q-024 | P3 | Should model IDs be configurable without a code change (env or database)? Vision §10. | Swapping a failing or retired model currently needs a deploy. | Not before paid mode; revisit when switching to `AI_MODE=paid`. |

## Resolved

| ID | Answer | Decision |
|---|---|---|
| Q-004 | It fits as a chain of steps: each analysis step runs in its own function invocation (about a minute; `maxDuration` 300), handed off through `/api/jobs/continue`, so no invocation reaches Vercel Hobby's 300 s limit (measured 2026-10-17). n8n or a queue stays the option for scheduling and step retries ([`SYSTEM_ARCHITECTURE.md`](../architecture/SYSTEM_ARCHITECTURE.md) §3) | D-042 |
| Q-029 | Basic $89, Pro $229, Premium from $599 a month (1.5× over market-comparable prices, all tiers); the trial needs a card at public launch and continues on Basic unless the owner opts out (founder, 2026-10-12) | D-039, D-040 |
| Q-035 | The site describes the paid lineup, which is what runs: the OpenRouter account enforces zero data retention, which blocks every free model, so production uses `AI_MODE=paid` (2026-10-11). Qwen (no ZDR endpoint) was replaced by GPT-5.6 Sol and removed from the site | D-037 |
| Q-034 | Basic after the trial is a **paid** subscription (founder, 2026-10-11). Billing isn't built yet, so continuing is arranged through "Talk to us" | D-035 |
| Q-036 | Keep the shorter module names (Automation, Analytics) (founder, 2026-10-11) | D-035 |
| Q-037 | Keep "a marketing audit" in Basic as the promise (founder, 2026-10-11) | D-035 |
| Q-038 | "On a plan" means organizations.plan is basic, pro or premium (Premium is the founder's "Custom"); built in the MCP access rule | D-036 |
| Q-025 | Keep BRAVENTA.IO and the Violet dot, as in the founder's reference (founder: "proceed", 2026-10-10) | D-027 |
| — | Typography: Quicksand (headings, logo) + Comfortaa (other text) | D-015 |
| Q-021 | AI assistant is not in the MVP; committed for the Next phase | D-020 |
| Q-022 | Yes — optional guided onboarding questions are in the MVP (BI-12) | D-021 |
| Q-023 | Yes — opportunity tracking (MS-5) and "do this first" (UX-1) are in the MVP | D-022 |
| Q-018 | Yes — `advisor_fixes` is applied (remote version 20261010061126); local migration files renamed to match the recorded versions | — |

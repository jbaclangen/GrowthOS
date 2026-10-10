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
| Q-018 | P2 | Has `supabase/migrations/20261010000001_advisor_fixes.sql` been applied to the remote project? It is uncommitted. | Schema docs describe it as part of the model. | Verify with the Supabase migration list before relying on it. |
| Q-019 | P1 | Vercel Hobby is for non-commercial use. Upgrade to Pro before charging customers? | Terms-of-service compliance. | Upgrade when the first paying customer signs. |
| Q-020 | P3 | Should the internal n8n callback header `X-GrowthOS-Secret` be renamed? | Internal only; renaming needs a matching n8n change. | Leave until n8n workflows are built. |
| Q-024 | P3 | Should model IDs be configurable without a code change (env or database)? Vision §10. | Swapping a failing or retired model currently needs a deploy. | Not before paid mode; revisit when switching to `AI_MODE=paid`. |

## Resolved

| ID | Answer | Decision |
|---|---|---|
| Q-025 | Keep BRAVENTA.IO and the Violet dot, as in the founder's reference (founder: "proceed", 2026-10-10) | D-027 |
| — | Typography: Quicksand (headings, logo) + Comfortaa (other text) | D-015 |
| Q-021 | AI assistant is not in the MVP; committed for the Next phase | D-020 |
| Q-022 | Yes — optional guided onboarding questions are in the MVP (BI-12) | D-021 |
| Q-023 | Yes — opportunity tracking (MS-5) and "do this first" (UX-1) are in the MVP | D-022 |

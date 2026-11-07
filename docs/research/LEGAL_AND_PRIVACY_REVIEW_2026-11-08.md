# Legal and privacy review, 2026-11-08

**Status:** Review and drafts for the founder and counsel (Q-032). This is not legal advice. Every legal page on
braventa.io stays a draft until a lawyer has reviewed it. Founder decisions taken during the review are recorded as
D-056.

Scope: the founder asked for four things.
- Read the Vercel, Supabase and Stripe terms.
- Add limitation of liability clauses that cap Braventa's financial exposure.
- Check the privacy policy against privacy law in the US, the UK, Australia, Canada and the EU, and against what the
  app actually does.
- Draft a Master Services Agreement, a DPA, a GDPR page, a Refund policy, and parked cyber insurance clauses.

## 1. Provider terms and what they mean for Braventa

| | Vercel ([terms](https://vercel.com/legal/terms)) | Supabase ([terms](https://supabase.com/terms)) | Stripe ([SSA](https://stripe.com/legal/ssa)) |
|---|---|---|---|
| Their liability cap to Braventa | Greater of US$100 or fees paid in the prior 6 months (§21.1) | Fees paid or payable in the prior 12 months (§11) | Fees paid in the prior 12 months (§8.4) |
| Excluded | Indirect and consequential loss, lost business, **data loss** | Consequential loss, lost profits, **data loss and data-security breaches** | Indirect loss, lost profits, data loss |
| Uptime | No commitment in the terms (§20.1) | No commitment; "commercially reasonable" support (§4) | n/a |
| Braventa owes them | Indemnity for its content and use (§16) | Indemnity for customer data and use (§10(b)); **own backups** (§7(b)) | Indemnity (§9.1); chargebacks, fraud losses, fines, taxes, negative balances (§3, §7) |
| Data processing | DPA incorporated (§11.1) | DPA incorporated (§7(b)) | DPA incorporated (§4.1); notify Stripe of incidents within 48 h (§4.3) |
| Law | California; JAMS arbitration (opt-out within 30 days) | California; ICC arbitration, seat Singapore for Asia (opt-out within 30 days) | Depends on the merchant's country: US is California, UK is England, Australia is NSW, Canada is Ontario |
| Watch-outs | **Hobby plan: personal or non-commercial use only (§4); Vercel may shut Hobby projects down without notice; Hobby content may be used to train AI and shared with third parties unless you opt out in Team settings (§3)** | Use limited to internal business purposes (§2(a)); no PHI or card data | **The Philippines isn't in the entity table: Stripe needs the US LLC.** Canada: the privacy policy must say data may be processed outside Canada (§13.4) |

What this means for Braventa:
- **Cap exposure.** Braventa's cap to its customers (greater of 6 months' fees or US$100) matches what Vercel owes
  Braventa. Braventa can't promise customers more than its providers would cover, unless it has insurance
  (`docs/legal/CYBER_INSURANCE_PARKED.md`).
- **Data loss.** Both Vercel and Supabase exclude it, so Braventa does too (Terms §12). The Terms and MSA also tell
  customers to keep their own copies.
- **Uptime.** No provider backs an SLA on Braventa's current plans. The MSA's 99.5% target therefore starts only with
  paid plans, credits are capped at 25% of the month's fee, and hosting and database outages count. Before billing
  launches, move to plans that back it (see §4).
- **Vercel Hobby.** Running a commercial product on Hobby breaches Vercel's §4, and its AI-training clause conflicts
  with the "no training" statements on the site. This was already noted as a risk in `SYSTEM_ARCHITECTURE.md` #11.

## 2. Privacy law: what applies, and the status after this change

Braventa sells to businesses (D-056), from the Philippines today and from a US LLC later, to customers in the US, the
UK, Australia and Canada, and possibly the EU. The privacy page is written to the GDPR and UK GDPR standard, which
covers most of what the other laws ask for.

| Law | Applies? | Key requirements | Status |
|---|---|---|---|
| **UK GDPR and DPA 2018, PECR** | Yes, when marketing to UK businesses (Art. 3(2)) | Art. 13 notice (identity, contact, purposes, legal bases, recipients, transfers, retention, rights, complaint to the ICO); Art. 28 processor terms; Art. 27 UK representative; breach notice within 72 h; consent for marketing email | Notice ✓ (privacy page); DPA ✓ (draft); **representative ✗ (Q-053)**; marketing opt-in ✓ (contact form) |
| **EU GDPR** | Only if Braventa targets EU customers | As for the UK, plus an EU representative and SCCs | Same as UK; GDPR page ✓; **EU representative ✗ before marketing in the EU** |
| **Australia: Privacy Act 1988 (APPs)** | Probably exempt as a small business (turnover under A$3M), but customers expect APP-level practice | APP 1 privacy policy (overseas disclosure and the countries, complaints handling); APP 8 cross-border; from **10 Dec 2026**, APP 1.7–1.9 disclose automated decisions that significantly affect individuals | Countries ✓; complaints ✓ (7 / 30 days); ADM statement ✓ (none made) |
| **Australian Consumer Law** | Yes for Australian customers, B2B included (contracts up to A$100k count as "consumer"; unfair contract terms in small-business contracts carry penalties since Nov 2023) | Consumer guarantees can't be excluded; one-sided terms risk being unfair | Terms §12 ACL carve-out ✓; Refund policy ✓; **counsel to test the 1-year claim limit and the indemnity for unfairness** |
| **Canada: PIPEDA (and Quebec Law 25)** | Yes for Canadian customers | Accountable privacy officer; consent; openness; access within 30 days; disclose processing outside Canada; Quebec: publish the privacy officer's title and contact | Privacy officer ✓ (by title); outside-Canada ✓; 30 days ✓ |
| **CASL / CAN-SPAM** | Yes for commercial email | Express consent (CASL), identification, postal address, unsubscribe | Opt-in ✓; **postal address is still Pixel Marketing Design's, and the HubSpot auto-reply is sent as a marketing email to everyone (gap)** |
| **US: CalOPPA** | Yes (any commercial site with California visitors) | Privacy policy with categories, sharing, how to review or correct, Do Not Track response, effective date | ✓ (Do Not Track section, date) |
| **US: CCPA/CPRA and other state laws** | Not yet: below the thresholds (about US$26.6M revenue, adjusted yearly, or 100k consumers) | Rights, "do not sell or share", GPC | Voluntary: rights offered to everyone ✓, no sale or sharing ✓, GPC statement ✓ |
| **COPPA** | No (not directed to children) | | 18+ ✓ |
| **Philippines: Data Privacy Act 2012** | **Yes: processing happens in the Philippines** | Transparency, security, breach notice to the NPC within 72 h, a DPO, NPC registration above thresholds | **Not covered: counsel to confirm the DPO and registration duties (Q-059)** |

## 3. How the documents fit together (recommended structure, now drafted)

| Page | Role | Accepted how |
|---|---|---|
| `/legal/terms` | The contract: use, acceptable use, disclaimers, **liability cap (§12)**, indemnity, law (Delaware) | Clickwrap at sign-up (**not built: Q-055**) |
| `/legal/msa` | What the service does and doesn't do, SLA (paid plans), support, incidents, **connected apps are the customer's responsibility** | Incorporated by the Terms |
| `/legal/dpa` | Processor terms (GDPR Art. 28, SCCs, UK Addendum, CCPA service provider) | Incorporated by the Terms; signed copy on request |
| `/legal/privacy` | Controller notice for all laws above | Linked at sign-up and in the footer |
| `/legal/gdpr` | Guide for EU and UK customers; points to privacy and the DPA | Information only |
| `/legal/refunds` | No partial refunds; exceptions; ACL carve-out | Incorporated by the Terms |
| `/legal/subprocessors`, `/legal/cookies` | Lists | Information; 30-day notice of new sub-processors |

Precedence: signed agreement, then DPA (for personal data), then MSA, then Terms, then policies. Liability lives in
one place (Terms §§11–13); the MSA and DPA refer to it. Keeping the cap in one place stops the documents drifting
apart.

## 4. Gaps: what the app or the business doesn't do yet

| # | Gap | Why it matters | Owner | When |
|---|---|---|---|---|
| 1 | Operator is "Braventa LLC [pending registration]": the entity doesn't exist yet (Q-052) | Every law above needs a real controller name and address; contracts with a non-existent party are weak | Founder | Before public sign-up |
| 2 | **Vercel Hobby for a commercial product; Hobby AI training on by default** (Q-054) | Breach of Vercel §4; conflicts with the "no training" statements | Founder: opt out of model training in Vercel Team settings now; move to Pro before launch | Opt out now |
| 3 | Sign-up has no agreement to the Terms and Privacy, and no 18+ or business-use confirmation (`web/src/app/login/auth-form.tsx`) (Q-055) | Without it the Terms may not bind users | Engineering: a required checkbox with links, once counsel approves the Terms | Before public sign-up |
| 4 | No Article 27 representative in the UK (or the EU) (Q-053) | Required when marketing to UK businesses | Founder (representative services are paid; compare providers) | Before UK marketing |
| 5 | Deleting a user fails if they approved content or started a job (`content_items.approved_by`, `ai_jobs.created_by` have no `on delete`) (Q-056) | Erasure requests can't be fully met | Engineering: migration to `on delete set null`, applied 2026-11-08 (`20261107224152_user_deletion_foreign_keys.sql`, Q-056 resolved) | Done |
| 6 | No retention periods for contact requests, crawled pages, job output, usage logs; expired invitations never deleted (Q-008) | GDPR Art. 5(1)(e) and APP 11.2 | Founder decides periods; engineering adds pg_cron cleanup | Before paying customers |
| 7 | No self-service export or deletion | Rights are handled by email within 30 days, which is lawful but manual | Engineering (later) | Later |
| 8 | Contact form stores only a `marketing_opt_in` boolean, not the wording or version | Proof of consent (GDPR Art. 7(1), CASL) | Engineering: store the consent text version and timestamp | Before marketing email |
| 9 | HubSpot auto-reply is sent as a "Marketing Information" email to everyone who submits the form (`CONTACT_PIPELINE.md`) | Marketing email without consent (CASL, PECR) | Founder: make it a transactional or one-to-one reply in HubSpot, or only send to opted-in contacts | Now |
| 10 | Postal address in emails is Pixel Marketing Design's | CAN-SPAM, CASL | Founder, with the LLC | With the LLC |
| 11 | Supabase region and plan not documented; backups not confirmed | Privacy says data is in "the United States and other countries"; MSA and DPA mention backups | Founder: check the dashboard and record it in `SYSTEM_ARCHITECTURE.md` | Now |
| 12 | OpenRouter's DPA and transfer terms not checked | The DPA relies on sub-processors' SCCs | Founder or engineering | Before EU or UK customers |
| 13 | No uptime monitoring, so the 99.5% can't be measured (Q-058) | MSA §5 needs measurements | Engineering: an external uptime monitor on `app.braventa.io` | Before billing |
| 14 | No incident or breach runbook; platform-admin access not audited | DPA breach duties (48 h to the customer, 72 h to regulators); insurance applications | Founder | Before launch |
| 15 | Philippines Data Privacy Act duties unknown (Q-059) | Processing happens in the Philippines | Counsel | Before launch |
| 16 | Billing: auto-renewal disclosures (state ARLs), tax, Stripe's merchant obligations | Refund policy and MSA §11 assume monthly renewal | Engineering and counsel with billing (Q-010) | With billing |
| 17 | `SYSTEM_ARCHITECTURE.md` says sign-up is invite-only, but the form allows open sign-up | Terms and site copy say early access is by invitation | Founder: confirm the Supabase Auth setting | Now |

## 5. Points for counsel

- Whether a 6-month cap, a 1-year claim limit and an uncapped customer indemnity survive the UK's Unfair Contract
  Terms Act reasonableness test and the Australian unfair contract terms regime for small businesses.
- Whether Delaware law and Delaware courts work for a Philippines-based operator before the LLC exists, and whether
  to add arbitration.
- Plain sentence case versus capitals for the disclaimer (conspicuousness under UCC §2-316). The draft uses bold.
- Whether to count hosting and database outages in the SLA (the draft does, with credits capped at 25%).
- The SCC module choices and the Irish law choice in DPA §4.

## Sources

- Vercel Terms of Service, read 2026-11-08: https://vercel.com/legal/terms; fair use guidelines:
  https://vercel.com/docs/limits/fair-use-guidelines
- Supabase Terms of Service, read 2026-11-08: https://supabase.com/terms
- Stripe Services Agreement, read 2026-11-08: https://stripe.com/legal/ssa
- Google API Services User Data Policy: https://developers.google.com/terms/api-services-user-data-policy
- OAIC APP 1 guidelines (ADM transparency from 10 Dec 2026):
  https://www.oaic.gov.au/privacy/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information/
- Unfair contract terms (Australia, from 9 Nov 2023):
  https://www.nsw.gov.au/legal-and-justice/consumer-rights-and-protection/guarantees-contracts-and-warranties/contracts/unfair-contract-terms
- CalOPPA Do Not Track disclosure: https://iapp.org/news/a/unpacking-the-california-ags-guide-on-caloppa
- App inventory: code at commit dbddb62 (the review's subagent pass, summarized in §4).

# Cyber liability insurance: parked clauses

**Status: Parked (founder, 2026-11-08, D-056).** Nothing here is published. Activate only when a policy is bound and
the certificate of insurance is in hand, and after counsel and the broker review the wording (Q-032, Q-057). Bracketed
values come from the policy. This is a draft, not legal or insurance advice.

## 1. Why it matters for Braventa

- The Terms cap Braventa's liability at the greater of 6 months' fees or US$100 (Terms §12). Larger customers and
  agencies will ask for a higher cap for data breaches. Insurance is what makes a higher "data protection cap"
  affordable.
- Braventa depends on Vercel, Supabase and OpenRouter. Their own terms cap what they owe Braventa at 6 to 12 months of
  fees and exclude data loss (`docs/research/LEGAL_AND_PRIVACY_REVIEW_2026-11-08.md` §1). If one of them causes an
  incident, Braventa can't recover much from them, so its own policy has to carry the cost.
- Braventa gives AI-generated recommendations. A claim that a recommendation caused a loss is a professional-liability
  (technology errors and omissions) claim, not a cyber claim. Buy both, often as one combined policy.

## 2. Coverage to ask the broker for

| Cover | What it pays for | Why Braventa needs it |
|---|---|---|
| Breach response (first party) | Forensics, legal advice, notifying people and regulators, credit monitoring, PR | Any breach of customer data, with notification duties in the UK, the EU, Australia, Canada and US states |
| Data restoration (first party) | Restoring or recreating lost or corrupted data | Database incidents; Supabase excludes data loss |
| Business interruption, including **dependent** (contingent) business interruption | Lost income during an outage, including one at a cloud provider | Braventa runs entirely on Vercel, Supabase and OpenRouter |
| Cyber extortion | Ransomware response and, where lawful, payments | Standard part of cyber cover |
| Privacy and network security liability (third party) | Defense and damages when customers or individuals claim after a breach | Customer claims under the DPA |
| Regulatory defense and penalties | Defense costs, and fines where insurable | ICO, OAIC, OPC and US state investigations |
| Technology errors and omissions | Claims that the service or its advice failed and caused a loss | AI recommendations, service failures, SLA disputes |
| Media liability | Defamation or IP claims over published content | Drafted posts (once publishing exists) |
| PCI | Card-brand assessments | Only once Stripe billing is live |

Starting point to discuss with the broker: **US$1,000,000** aggregate limit for cyber and for technology errors and
omissions. Raise it if a customer contract requires more. Check sublimits, especially for regulatory penalties and
dependent business interruption, and that cover is worldwide (US, UK, Australia, Canada).

## 3. What insurers will ask, and where Braventa stands today

| Insurer question | Braventa today | Action before applying |
|---|---|---|
| MFA on email, admin and cloud consoles | Unknown for the founder's accounts; the app offers no MFA to users | Turn on MFA for Google Workspace, Vercel, Supabase, GitHub, HubSpot, OpenRouter, the registrar |
| Backups, tested restores | Depends on the Supabase plan; never tested | Confirm the plan's backups and do one test restore |
| Incident response plan | None (`SECURITY_AND_PRIVACY.md` §5) | Write a one-page runbook: who, how to contain, whom to notify, in what time |
| Patching and dependency updates | Dependabot or manual; not documented | Record the routine |
| Access control and offboarding | One person; platform-admin access not audited | List who has production access; review it each quarter |
| Encryption | HTTPS everywhere; Google tokens encrypted; keys hashed | None |
| Security testing | No penetration test (`SECURITY_AND_PRIVACY.md` §1) | Optional before applying; often lowers the premium |
| Prior incidents | None known | None |

## 4. Clauses to activate once insured

### 4.1 Master Services Agreement: new section "Insurance" (after §10 Security)

> Braventa maintains cyber liability and technology errors and omissions insurance with a reputable insurer, with
> limits of at least [US$1,000,000] per claim and in the aggregate, for as long as it provides the service. We'll give
> you a certificate of insurance on request.

Ask the broker whether to publish the limit. Some insurers prefer that limits aren't advertised. In that case, keep
the first sentence without the figure and give the certificate only under NDA.

### 4.2 Terms of Service §12: a separate cap for data protection claims

Add after the "Cap" point:

> **Data protection claims.** For claims arising from Braventa's breach of its security or data protection
> obligations, including under the Data Processing Agreement, the cap in the point above is replaced by the greater of
> (a) [two times] the fees you paid Braventa in the 12 months before the event that gave rise to the liability, and
> (b) [US$250,000]. This is Braventa's total liability for all such claims.

Set (b) no higher than the policy's limit for third-party privacy claims, after deductible, and below the aggregate,
so that one customer can't use up the whole policy. Leave every other limit in §12 as it is.

### 4.3 Data Processing Agreement §3 "Breaches": add

> Where a personal data breach is caused by Braventa's failure to meet this DPA, Braventa will reimburse your
> reasonable, documented costs of notifying affected individuals and authorities as the law requires, within the data
> protection cap in the Terms of Service.

### 4.4 Trust and data page: one line

> Braventa carries cyber liability and technology errors and omissions insurance.

### 4.5 Internal notification rule (not public)

Most policies require notice to the insurer **as soon as practicable**, often before you admit anything or hire
vendors. Put the insurer's breach hotline and policy number in the incident runbook. Use the insurer's panel vendors
(forensics, breach counsel) where the policy requires it.

## 5. When activating

1. Bind the policy. Store the certificate and policy wording outside the repo.
2. Fill in the bracketed values and apply §4.1 to §4.4 in `site/src/app/legal/msa/page.tsx`, `terms/page.tsx`,
   `dpa/page.tsx` and `site/src/app/trust/page.tsx`. Update their "Last updated" dates.
3. Tell existing customers about the change as Terms §9 describes for material changes. This one favors them, but
   tell them anyway.
4. Record a decision in `docs/decisions/DECISION_LOG.md` that supersedes the "parked" part of D-056. Close Q-057.

# Legal acceptance: agreement checkboxes in the app

**Status:** Built 2026-11-08 (D-057); migration applied to production the same day. It follows the legal pages
(D-056) and the review in `docs/research/LEGAL_AND_PRIVACY_REVIEW_2026-11-08.md`. The documents remain drafts
pending counsel (Q-032).

## 1. Brief (D-052)

The founder asked for the legal pages to show up in the app's own steps: a checkbox at sign-up, when connecting an
app, when paying, and so on. Today sign-up shows no terms at all (gap 3 in the review, Q-055). So the Terms, MSA and DPA
may not bind anyone, and nothing records what a person confirmed. That matters for the liability cap, for
connected-app responsibility (MSA §8) and for the website-authorization rule (Terms §7).

## 2. Options considered

| Option | For | Against |
|---|---|---|
| Text only ("By signing up you agree…"), no checkbox | No friction | A browsewrap is weaker in court; nothing records consent |
| Checkbox; store acceptance in Supabase `user_metadata` | No migration | The user can change their own metadata; only one value; no per-step record |
| **Checkbox at each step; an append-only `legal_acceptances` table written by the server** | Clear clickwrap evidence: who, what version, which documents, when, about what | One table and migration |

Decision: the third option, because it's the evidence the cap and the indemnity rely on.

## 3. Where the app asks, and what it records

| Step | Where | Checkbox says (short) | Context | Documents | Subject |
|---|---|---|---|---|---|
| Sign-up | `web/src/app/login/auth-form.tsx`, `actions.ts` `signUp` | Agree to Terms, MSA, DPA; read Privacy; 18+; business use | `signup` | terms, msa, dpa, privacy | — |
| Existing accounts, and every new `LEGAL_VERSION` | Banner under the header, `components/legal/terms-banner.tsx` | Same sentence | `terms_update` | terms, msa, dpa, privacy | — |
| Start an analysis | `app/onboarding/start-form.tsx`, `app/analysis/actions.ts` `startAnalysis` | I own this website or may act for its business (Terms §7) | `website_authorization` | terms | website URL |
| Connect or reconnect Google Search Console | `components/connections/connect-form.tsx`; start route checks `agree=yes`; the callback records after Google approves | Authorized to connect; responsible for the account and its data (MSA §8); read Privacy | `search_console_connect` | msa, privacy | Google account email |
| Connect or reconnect HubSpot (D-048, D-059) | `HubSpotConnectForm` in `components/connections/connect-form.tsx`; the HubSpot start route checks `agree=yes`; the callback records after HubSpot approves | Authorized to connect the portal; responsible for it and its data (MSA §8); read Privacy | `hubspot_connect` (added by `20261108043117_hubspot_connection.sql`) | msa, privacy | Portal domain (or `portal <id>`) |
| Create a personal access key | `app/settings/key-form.tsx`, `actions.ts` `createAccessKey` | Keep it private; responsible for what uses it (Terms §3) | `access_key` | terms | key prefix |
| Create a service key (owner) | `app/settings/service-key-form.tsx`, `integrations-actions.ts` | Same | `access_key` | terms | key prefix |
| Approve an app's access (claude.ai, ChatGPT; OAuth) | `app/oauth/authorize/consent-form.tsx`, `actions.ts` | Responsible for what the app does; can remove it (Terms §3) | `assistant_oauth` | terms | OAuth client id |

Rules:
- Every checkbox is the shared `ConsentCheckbox` (`name="agree" value="yes"`, `required`). The server checks it again
  with `consentGiven()` before acting and returns a plain error if it's missing (`CONSENT_REQUIRED`).
- The documents link to braventa.io and open in a new tab, so a half-filled form isn't lost.
- Recording happens after the step succeeds and never blocks it. If the write fails it is logged, and the banner asks
  again later. If the table doesn't exist, the banner's read fails open, so no one is locked out.
- Steps that don't ask, and why: inviting a teammate (the inviter only shares an email address); approving a draft
  (nothing is published yet; add a checkbox when publishing ships, D-049); the AI assistant's MCP tools (the key or
  OAuth approval already covers them).

## 4. Data

`public.legal_acceptances` (`supabase/migrations/20261107224300_legal_acceptances.sql`) is append-only. Columns:
`user_id`, optional `organization_id`, `context`, `documents_version` (= `LEGAL_VERSION`), `documents[]`, `subject`,
`accepted_at`. RLS lets users read their own rows; there are no client writes. The server writes with the secret key
after authenticating the user. Rows are deleted with the user or the organization.

`LEGAL_VERSION` in `web/src/lib/legal/documents.ts` is the "Last updated" date on the Terms, MSA, DPA, Privacy and
Refund pages. When one of them changes materially:
1. Update the page and its date.
2. Change `LEGAL_VERSION` to the same date.
3. Deploy the app.

Every signed-in person then sees the banner until they accept. Terms §9 promises 30 days' notice of material changes,
so publish the page first and change the version on the day it takes effect.

## 5. Checkout (spec only: billing isn't built, Q-010)

When Stripe billing is built, the checkout step must include:
1. A clear summary before payment:
   - plan, price, billing frequency ("billed monthly until you cancel")
   - taxes
   - the date of the first charge
   - how to cancel (Settings, at any time; effective at the end of the paid month)

   This is required by US state automatic-renewal laws (for example California's) and Stripe's subscription rules.
2. A required checkbox: *"I agree to the Refund policy and authorize Braventa to charge [price] every month until I
   cancel."* Link the Refund policy and the Terms.
3. A new context `checkout` in `ACCEPTANCE_CONTEXTS` and in the migration's check constraint, recording documents
   `['terms', 'refunds']` and the price ID as subject.
4. After payment, a confirmation email repeating the terms, price, renewal and how to cancel. That needs transactional
   email (Q-010).
5. A cancellation path in the app that is as easy as signing up.

## 6. Deploying

1. Apply `20261107224300_legal_acceptances.sql` to the Supabase project before or with the deploy (done 2026-11-08). The app works
   without it, but records nothing and the banner stays hidden.
2. After deploy, check:
   - sign-up shows the checkbox and refuses without it
   - an existing account sees the banner; accepting hides it
   - each step refuses without its checkbox
   - rows appear in `legal_acceptances`

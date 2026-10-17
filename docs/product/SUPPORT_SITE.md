# support.braventa.io — information architecture

**Status / last reviewed: 2026-10-11.** Domain and purpose are a founder decision (D-031); the structure is
a recommendation from a review of HubSpot, Intercom, Stripe, Zapier, Semrush, Mailchimp, Notion, Supabase and
n8n help and developer centers. Nothing here is built yet. Writing rules: `docs/marketing/COMMUNITY_GUIDELINES.md`
§6 (task-first pages; planned features get one "Planned" callout, no steps or screenshots, `noindex` until live).

The founder's order of content: (1) how to use the app, (2) what it can and can't do, (3) integrations and
developer tools, (4) legal.

## 1. Sections

| Section | Example articles | Priority | Depends on unbuilt features |
|---|---|---|---|
| Get started | Create your account; Run your first analysis; What happens during the analysis; Resume an unfinished setup | Launch | No |
| Use Braventa | Choose your pain points; Answer follow-up questions; Understand your growth score; Confirm or correct your diagnosis; Work your growth plan; Use your 30-day plan; Approve drafted posts; Re-run an analysis; Plans and your trial | Launch | No |
| How the AI works | Measured, assessed and inferred; What we read from your website; Why nothing is published without approval (D-013); AI limits | Launch | No |
| What Braventa can and can't do | Capabilities today; Coming next by tier (PLANS_AND_TIERS.md); Known limitations (no JavaScript rendering, up to 25 pages, skips pages robots.txt blocks) | Launch | Must be kept current with every release |
| Account and data | Profile; Data export or deletion request; Delete your account | Launch | Deletion process to confirm |
| Troubleshooting and FAQ | Analysis stuck or failed; Site couldn't be read; Score seems wrong; Sign-in email didn't arrive | Launch | No |
| Plans and billing | Basic vs Pro vs Premium; The 14-day trial; Talk to us; Invoices | Soon | Billing (Q-010) |
| Integrations | Overview (Coming next); GA4; Search Console; Tag Manager; WordPress; Canva; HeyGen; Higgsfield; social accounts | Later | All except Search Console (live for Pro) |
| AI agents (Pro) | How approval-gated agents work; Audit log; Pause an agent | Later | All |
| Developers (`/developers`) | Overview; Authentication; API reference (OpenAPI); Webhooks (signing, retries, versioning); n8n nodes and templates; Rate limits; Developer changelog; `llms.txt` | Later | No public API, webhooks or `/api/n8n/*` routes exist |
| Release notes | Shipped changes only | Launch (light) | No |
| Trust and legal | Security overview; Privacy; Terms; Sub-processors; AI disclosure; Cookies | Launch (Terms, Privacy, AI disclosure, sub-processors) | No |
| Get help | Contact support; Status; Community (later) | Launch | Status and community later |

Page chrome: last-updated date, "Available on: Pro" badge once tiers gate features, "Was this helpful?" with an
optional comment, related articles. In-app `?` links deep-link from each screen through a stable slug map in code.
API versioning (later): dated versions, pinned per webhook endpoint (Stripe's model).

## 2. Platform

**Recommendation: Fumadocs** — free, MDX in this repo (docs change in the same PR as the feature), built for
Next.js 16 and Tailwind 4 so it uses `tokens.css` and the brand fonts, built-in search, and OpenAPI reference
generation for the developer section later. Trade-off: feedback widget and AI answers are ours to build.
Fallback if the developer portal becomes the priority and budget allows: Mintlify. Deploy as its own Vercel
project mapped to `support.braventa.io`.

## 3. Legal documents

A qualified lawyer must draft or review every one; this list is not legal advice.

| Document | Why | When |
|---|---|---|
| Terms of Service | Liability, trial and renewal terms, AI-output disclaimers | Launch |
| Privacy Policy | US state privacy laws; GDPR Art. 13/14 for EU/UK visitors | Launch |
| Cookie Policy and consent | ePrivacy, before non-essential cookies | Launch if analytics are used |
| Sub-processors list | Expected with a DPA | Launch |
| AI disclosure | FTC truth-in-advertising; EU AI Act transparency | Launch |
| Acceptable Use Policy | Needed once agents and publishing exist | Soon |
| DPA | GDPR Art. 28 for customer personal data (CRM) | Before CRM integrations |
| SLA | Premium contracts | Later |
| Security overview | Descriptive only, no certification claims | Launch |
| Third-party platform terms | Google API Services User Data Policy, Meta and LinkedIn app review | When OAuth integrations ship |

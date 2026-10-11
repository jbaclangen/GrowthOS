# braventa.io and subdomains — sitemap

**Status / last reviewed: 2026-10-11.** Domain plan is a founder decision (D-031). The page list is a
recommendation from a review of nine comparable SaaS sites (Semrush, HubSpot, Jasper, Mailchimp, Databox,
Owner.com, Localo, Copy.ai, HighLevel); page copy lives in [WEBSITE_MESSAGING.md](WEBSITE_MESSAGING.md).
**Built 2026-10-11 in `site/`** (Launch pages: Home, How it works, Product, For service businesses, Pricing, Trust, AI use, About, Contact, and draft legal pages: Terms, Privacy, Cookies, Sub-processors). Not deployed to braventa.io yet. Hidden from search engines until launch (`SITE_INDEXABLE=true` flips it; D-033). Copy on the built pages supersedes WEBSITE_MESSAGING where they differ (diagnosis and one plan instead of five opportunities; early-access CTA because sign-up is invite-only).

## 1. Domains

| Domain | Purpose | Built with | Status |
|---|---|---|---|
| `braventa.io` | Public marketing site: who we are, what Braventa does, pricing, trust, legal | Next.js in this repo, Vercel (D-031) | Planned |
| `app.braventa.io` | The product: sign-up, sign-in, onboarding, dashboard, plans | `web/` (this app), Vercel (D-011) | Built; not deployed |
| `support.braventa.io` | Help center, capabilities, integrations and developer docs, legal — see [SUPPORT_SITE.md](../product/SUPPORT_SITE.md) | Next.js + Fumadocs in this repo, Vercel (D-031) | Planned |
| `community.braventa.io` | User forum | Hosted forum platform (Q-017) | Future |
| `status.braventa.io` | Uptime and incidents | Hosted status tool | Before paying customers |

Hostinger stays the registrar and DNS for all of these.

## 2. braventa.io pages

Priority: **Launch** = before the first paying customers; **Soon** = shortly after; **Later**.

| Page | URL | Purpose | Priority | Honesty notes |
|---|---|---|---|---|
| Home | `/` | Category, problem, Growth Loop, start an assessment | Launch — **built** | Rewritten to discovery, diagnosis and one growth plan (ON-1–ON-8) |
| How it works | `/how-it-works` | Walkthrough of an analysis; "what we don't do yet" | Launch | Same rewrite |
| Product | `/product`, later `/product/{module}` | Modules with Live / Coming soon badges | Launch (overview) | Integrations, agents, CRM stay Coming soon |
| For service businesses | `/service-businesses` | Audience page | Launch | No vertical-specific feature claims |
| Pricing | `/pricing` | Basic / Pro / Premium, the 14-day Pro trial, FAQ | Launch | Pro and Premium features labelled Coming soon; no prices until decided (D-012); trial terms only as the code enforces them |
| Trust and data | `/trust` | Approval by default, tenant isolation, data handling | Launch | No SOC 2, ISO or "GDPR compliant" claims |
| AI use | `/trust/ai` | Which AI providers, what data they see, human approval | Launch | Name OpenRouter and the model providers; drafts are AI-assisted |
| About | `/about` | Story, mission, founder | Launch | No invented team size or customer counts |
| Contact / Book a call | `/contact` | Booking plus form | Launch | Marketing opt-in unticked (D-014) |
| Terms of Service | `/legal/terms` | Linked from sign-up | Launch | Lawyer drafts or reviews |
| Privacy Policy | `/legal/privacy` | Linked from sign-up | Launch | Lists the real processors |
| Cookie policy + banner | `/legal/cookies` | Consent before non-essential cookies; "Cookie settings" footer link | Launch | Banner defaults to declining |
| Acceptable use | `/legal/acceptable-use` | Limits on analysis and generated content | Launch | |
| Sub-processors | `/legal/subprocessors` | Supabase, Vercel, OpenRouter and model providers, Google | Launch | Must match what is used |
| DPA | `/legal/dpa` | Processor terms for business customers | Soon (before CRM integrations) | |
| Trial terms | `/legal/trial` | Trial and downgrade rules | With billing | |
| Accessibility statement | `/accessibility` | WCAG 2.2 AA commitment | Soon | Target, not certification |
| Changelog | `/changelog` | Shipped changes only | Soon | |
| Blog | `/blog` | Education and SEO | Soon | AI-assisted disclosure |
| Free website grader | `/free-tools/website-grader` | Lead magnet built on the live analysis | Soon | Rate-limited; shows only measured and assessed results |
| Integrations | `/integrations` | Directory | Later (when one is live) | A single labelled "Planned integrations" list is acceptable; no logo wall that reads as live |
| Customers | `/customers` | Case studies | Later | Real and permissioned only |
| Comparisons | `/compare/{x}` | Bottom-of-funnel SEO | Later | Factual and dated |
| Partners / affiliates | `/partners` | Agencies and referrals | Later | Needs program terms |
| Careers | `/careers` | | Later | |

**Navigation:** Product · How it works · For service businesses · Pricing · Resources (later); right side
`Sign in` and `Get your growth assessment` (both to app.braventa.io).
**Footer:** Product, How it works, Pricing, Trust, Changelog, Help (support.braventa.io), Status, About,
Contact; legal row: Terms, Privacy, Cookies, Cookie settings, Acceptable use, Sub-processors, AI use.

## 3. app.braventa.io (sign-up surface)

- Sign-up form: "By creating an account you agree to the Terms and Privacy Policy" (links to braventa.io/legal)
  and a separate, unticked marketing opt-in (D-014).
- Forgot-password flow (not built; needed before paying customers).
- Trial chip with days left, `/plans` with Talk to us (built, D-030).
- `noindex` on all app and auth pages.

## 4. SEO and conversion essentials

Unique title and meta description per page; one H1; canonical URLs; OG images generated from brand tokens;
`Organization` + `WebSite` schema on Home, `SoftwareApplication` without offers or ratings until real ones exist,
`FAQPage` where FAQs exist; `sitemap.xml` and `robots.txt` per site; optional `llms.txt`; analytics only after
consent; UTM parameters carried into sign-up; Core Web Vitals in the green (the product grades this, so the site
must pass its own test); self-hosted Quicksand and Comfortaa; one primary CTA per page; no fake proof.

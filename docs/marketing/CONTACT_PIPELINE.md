# braventa.io contact pipeline

**Status / last reviewed: 2026-10-11.** Founder decisions: contact form stored in Supabase (D-033); notifications,
CRM through the **Pixelmarketingdesign HubSpot portal** (Hub ID 247150427, D-034 amended), replies from hello@braventa.io; spam
protection by rate limit and
timing check (Q-033).

## 1. Flow

```
Visitor submits /contact
  → server action (site/src/app/contact/actions.ts)
      1. honeypot field filled?            → pretend success, store nothing
      2. signed render-time token: < 3 s or tampered/expired → pretend success, store nothing
      3. validate fields (zod)
      4. insert into Supabase contact_requests with ip_hash
         (DB trigger: ≤ 3 per visitor per hour, ≤ 5 per email per day → "Try again in an hour")
      5. after the response: submit to HubSpot Forms API (portal + form GUID, no secret)
  → HubSpot creates/updates the contact and emails the submission notification; the team replies from
    hello@braventa.io through the HubSpot CRM (sent via Hostinger SMTP)
```

Supabase is the system of record; a HubSpot failure is logged in Vercel and never loses a request.

## 2. Environment variables (Vercel project `braventa-site`, Production)

| Variable | Type | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Config | Insert into `contact_requests` (insert-only for the public) |
| `CONTACT_HASH_SALT` | **Secret** | ≥ 32 random characters. Signs the form token and salts the IP hash. **Without it the timing check and per-visitor rate limit are off** (the per-email limit and honeypot still apply) |
| `HUBSPOT_PORTAL_ID` | Config | The Braventa HubSpot account ID |
| `HUBSPOT_FORM_GUID` | Config | The "braventa.io contact" form's GUID. Without both HubSpot vars, nothing is sent to HubSpot |
| `HUBSPOT_ACCESS_TOKEN` | **Secret** | Optional: a HubSpot private-app token with the `forms` scope. When set, submissions use the authenticated endpoint. It does **not** avoid the spam block on its own (§5) |

## 3. HubSpot setup (Pixelmarketingdesign portal, Hub ID 247150427)

| Step | Status |
|---|---|
| Form **braventa.io contact** (GUID `ce8aca1a-3eee-4ce6-8201-8b2d1d46de4b`): First name, Last name, Email (required), Company name, Website URL, Message — default contact properties only | Done 2026-10-11 (created via the session API) |
| Submission notifications → jbaclangen@gmail.com (owner 97785306) | Done |
| `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_GUID` on Vercel `braventa-site` (Config, Production) | Done |
| `braventa.io` added to Settings → Tracking code → Advanced tracking → Additional site domains | Done |
| Server submissions accepted (not blocked as spam) | Fixed 2026-10-11 by sending no `pageUri` (see §5) |
| Mailboxes `admin@`, `hello@`, `support@braventa.io` on Hostinger Email; Hostinger added MX, SPF (`include:_spf.mail.hostinger.com`), 3 DKIM CNAMEs (`hostingermail-a/b/c._domainkey`) and DMARC `p=none` | Done 2026-10-11 |
| `hello@braventa.io` connected as a personal email in HubSpot (Settings → Email → IMAP+SMTP, `imap.hostinger.com:993` / `smtp.hostinger.com:465`, inbox automation off). One-to-one replies from the CRM are sent by Hostinger, so they pass SPF/DKIM for braventa.io | Done 2026-10-11 |
| HubSpot subscription | **Starter Customer Platform** (Marketing Hub Starter: marketing email, customizable forms) bought by the founder 2026-10-11, monthly |
| Branded HubSpot sending domain `braventa.io` (from `hello@braventa.io`): DKIM CNAMEs `hs1-247150427._domainkey` → `braventa-io.hs06a.dkim.hubspotemail.net`, `hs2-247150427._domainkey` → `braventa-io.hs06b.dkim.hubspotemail.net`; SPF merged to `v=spf1 include:_spf.mail.hostinger.com include:247150427.spf05.hubspotemail.net ~all` (one SPF record only); existing DMARC kept | Done 2026-10-11: HubSpot shows braventa.io as **Authenticated** |
| Custom contact properties `braventa_request_type` (Early access / Walkthrough / Question) and `braventa_product_updates` (Yes/No), added to the form as hidden fields and sent by `site/src/lib/hubspot.ts` | Done 2026-10-11 |
| Email footer (company name + postal address, required by HubSpot and anti-spam law for every marketing email) | Done 2026-10-11 as a placeholder: "Pixel Marketing Design, Unit B-C 205 Teachers Village Road, Baguio City, Benguet 2600, Philippines" (the address already in HubSpot). Replace with Braventa and the US LLC address once registered |
| Automatic "we got your message" email (copy in §6) | To do: form → Automation → send follow-up email from hello@braventa.io |

**Marketing consent:** the consent record for D-014 is `contact_requests.marketing_opt_in` in Supabase, mirrored to
HubSpot as `braventa_product_updates`. Newsletters and other marketing email go only to contacts where it is Yes; the
automatic reply to a request is sent to everyone who submits the form.

## 5. HubSpot spam check (resolved 2026-10-11)

HubSpot blocks Forms API submissions whose `pageUri` is on a domain without its tracking code (spam type
*Unregistered Site Domain*). Adding braventa.io to *Additional site domains* and switching to the authenticated
endpoint (`HUBSPOT_ACCESS_TOKEN`) both still got blocked; 9 test submissions sit in the form's Spam tab. braventa.io
deliberately runs no trackers, so the site now sends **no `pageUri`**, only `pageName` ("Contact · Braventa"), and
submissions arrive normally. Don't add a `pageUri` back unless the HubSpot tracking code is installed on the site
(which would need a cookie notice and privacy-page change).

## 4. Privacy

The raw IP is never stored: `ip_hash` is HMAC-SHA256(IP, `CONTACT_HASH_SALT`). HubSpot is listed on
`/legal/subprocessors`, and the privacy page says contact-form data is stored in Supabase and HubSpot.

## 6. Automatic reply copy

Founder chose "factual + what's live" (2026-10-11). Only describe what the app does today (CLAUDE.md "Live today");
no timelines or guarantees. Use HubSpot personalization tokens for the first name.

- **From:** Braventa <hello@braventa.io> · **Reply-to:** hello@braventa.io
- **Subject:** We got your message
- **Preview text:** Thanks for contacting Braventa. We'll reply by email.

> Hi {first name, default "there"},
>
> Thanks for contacting Braventa. We got your message and will reply by email from hello@braventa.io.
>
> While you wait, here's what Braventa does today:
>
> - Reads your website and asks a few questions about your business.
> - Gives you a growth score and a diagnosis you can confirm or correct.
> - Builds one prioritized growth plan, a 30-day plan and five drafted posts for you to approve.
>
> See how it works: https://braventa.io/how-it-works
>
> If you didn't contact us, you can ignore this email.
>
> The Braventa team

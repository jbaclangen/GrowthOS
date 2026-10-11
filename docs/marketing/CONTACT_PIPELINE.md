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
| Branded HubSpot sending domain (HubSpot-sent marketing/automated email from braventa.io) | **Not available:** needs Marketing Hub Professional; founder chose not to upgrade (2026-10-11) |
| Automatic "we got your message" email | Not built: needs the sending domain above, or the site sending through Hostinger SMTP (would need the mailbox password as a Vercel Secret) |

**No custom properties:** the free portal has used its 10 custom-property slots, so the request type and the
visitor's marketing choice are written at the top of the HubSpot *Message*. The consent record for D-014 is
`contact_requests.marketing_opt_in` in Supabase; marketing email only goes to contacts whose request says
"Product updates: yes".

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

# braventa.io contact pipeline

**Status / last reviewed: 2026-10-11.** Founder decisions: contact form stored in Supabase (D-033); notifications,
CRM and branded email through the **Pixelmarketingdesign HubSpot portal** (Hub ID 247150427, D-034 amended); spam
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
  → HubSpot creates/updates the contact, emails the submission notification, sends the branded follow-up
```

Supabase is the system of record; a HubSpot failure is logged in Vercel and never loses a request.

## 2. Environment variables (Vercel project `braventa-site`, Production)

| Variable | Type | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Config | Insert into `contact_requests` (insert-only for the public) |
| `CONTACT_HASH_SALT` | **Secret** | ≥ 32 random characters. Signs the form token and salts the IP hash. **Without it the timing check and per-visitor rate limit are off** (the per-email limit and honeypot still apply) |
| `HUBSPOT_PORTAL_ID` | Config | The Braventa HubSpot account ID |
| `HUBSPOT_FORM_GUID` | Config | The "braventa.io contact" form's GUID. Without both HubSpot vars, nothing is sent to HubSpot |
| `HUBSPOT_ACCESS_TOKEN` | **Secret** | Optional: a HubSpot private-app token with the `forms` scope. When set, submissions use the authenticated endpoint, which avoids the *Unregistered Site Domain* spam block (§5) |

## 3. HubSpot setup (Pixelmarketingdesign portal, Hub ID 247150427)

| Step | Status |
|---|---|
| Form **braventa.io contact** (GUID `ce8aca1a-3eee-4ce6-8201-8b2d1d46de4b`): First name, Last name, Email (required), Company name, Website URL, Message — default contact properties only | Done 2026-10-11 (created via the session API) |
| Submission notifications → jbaclangen@gmail.com (owner 97785306) | Done |
| `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_GUID` on Vercel `braventa-site` (Config, Production) | Done |
| `braventa.io` added to Settings → Tracking code → Advanced tracking → Additional site domains | Done |
| Server submissions accepted (not blocked as spam) | **Open:** test submissions are blocked as *Unregistered Site Domain* (see §5) |
| Branded sending domain: Settings → Content → Domains & URLs → Connect a domain → Email sending → `braventa.io`; add HubSpot's DKIM CNAMEs + SPF in Hostinger without touching existing records | To do — needs a braventa.io mailbox first (no MX records exist) to verify the from-address |
| Follow-up email from a braventa.io address confirming receipt | To do (after the sending domain) |
| Email footer and company details show Braventa | To do |

**No custom properties:** the free portal has used its 10 custom-property slots, so the request type and the
visitor's marketing choice are written at the top of the HubSpot *Message*. The consent record for D-014 is
`contact_requests.marketing_opt_in` in Supabase; marketing email only goes to contacts whose request says
"Product updates: yes".

## 5. Known issue: HubSpot spam check

HubSpot blocks server-side Forms API submissions whose `pageUri` domain it doesn't consider registered (spam type
*Unregistered Site Domain*). Adding braventa.io to *Additional site domains* did not clear it within minutes. Options:
1. Wait for HubSpot to pick up the domain, then re-test (cheapest).
2. **Built:** set `HUBSPOT_ACCESS_TOKEN` (private app → Scopes: `forms`) as a Vercel Secret; the site then uses the
   authenticated endpoint (`/submissions/v3/integration/secure/submit/…`), which HubSpot treats as trusted.
3. Release blocked submissions manually (form → Submissions → Spam) — not sustainable.
Until resolved, Supabase still stores every request; check `contact_requests` for new rows.
## 4. Privacy

The raw IP is never stored: `ip_hash` is HMAC-SHA256(IP, `CONTACT_HASH_SALT`). HubSpot is listed on
`/legal/subprocessors`, and the privacy page says contact-form data is stored in Supabase and HubSpot.

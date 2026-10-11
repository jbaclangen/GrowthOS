# braventa.io contact pipeline

**Status / last reviewed: 2026-10-11.** Founder decisions: contact form stored in Supabase (D-033); notifications,
CRM and branded email through a **separate Braventa HubSpot account** (D-034); spam protection by rate limit and
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

## 3. HubSpot setup (Braventa account, not the agency or client portals)

1. **Contact properties** (Settings → Properties → Contact → Create property):
   - `braventa_intent` — single-line text (values: Early access, Walkthrough, Question)
   - `braventa_marketing_opt_in` — single checkbox / boolean (D-014: only true when the visitor ticked the box)
   - `message` already exists on contacts in most portals; create it (multi-line text) if not.
2. **Form** (Marketing → Forms → Create → *Embedded form*, name "braventa.io contact"): fields First name, Last
   name, Email, Company name, Website URL, Message, `braventa_intent`, `braventa_marketing_opt_in`. Copy the form
   GUID (form URL / share options) and the portal ID (account menu).
3. **Notifications** (form → Options → *Send submission notifications to*): the people who should get each request.
4. **Branded sending domain** (Settings → Content → Domains & URLs → *Connect a domain* → Email sending domain →
   `braventa.io`): HubSpot shows DKIM CNAME records (and an SPF include) to add in Hostinger DNS; don't remove the
   existing records (`@` A, `www`, `app`, Google verification TXT).
5. **Follow-up email** (form → Automation / simple workflow): a short, plain reply from a braventa.io address
   confirming receipt. Marketing content only to contacts with `braventa_marketing_opt_in = true` (D-014).

## 4. Privacy

The raw IP is never stored: `ip_hash` is HMAC-SHA256(IP, `CONTACT_HASH_SALT`). HubSpot is listed on
`/legal/subprocessors`, and the privacy page says contact-form data is stored in Supabase and HubSpot.

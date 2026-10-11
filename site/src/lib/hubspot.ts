import "server-only";

// Sends contact requests to the HubSpot portal Braventa uses (Pixelmarketingdesign, Hub ID 247150427 — founder
// decision 2026-10-11, D-034 amended) through the Forms API, which
// needs no secret: only the portal ID and the form's GUID. HubSpot then creates or updates the contact, emails the
// submission notification, and can send the branded follow-up email. Supabase stays the system of record: a HubSpot
// failure is logged and never loses the request.
//
// Setup: in HubSpot create a form with the fields below, then set HUBSPOT_PORTAL_ID and HUBSPOT_FORM_GUID on the
// braventa-site Vercel project. Docs: docs/marketing/CONTACT_PIPELINE.md.

export type ContactPayload = {
  intent: "early_access" | "demo" | "question";
  name: string;
  email: string;
  business?: string;
  website?: string;
  message: string;
  marketing_opt_in: boolean;
};

export function hubspotConfigured() {
  return Boolean(process.env.HUBSPOT_PORTAL_ID && process.env.HUBSPOT_FORM_GUID);
}

// HubSpot field names for the form. braventa_request_type and braventa_product_updates are custom contact properties
// (hidden fields on the form) so the team can segment and filter; marketing email only goes to contacts with
// braventa_product_updates = true. Supabase (contact_requests.marketing_opt_in) stays the consent record for D-014.
export function toHubspotFields(c: ContactPayload) {
  const [first, ...rest] = c.name.trim().split(/\s+/);
  const fields = [
    { name: "firstname", value: first },
    { name: "lastname", value: rest.join(" ") },
    { name: "email", value: c.email },
    { name: "company", value: c.business ?? "" },
    { name: "website", value: c.website ?? "" },
    { name: "message", value: c.message.trim() },
    { name: "braventa_request_type", value: c.intent },
    { name: "braventa_product_updates", value: c.marketing_opt_in ? "true" : "false" },
  ];
  return fields.filter((f) => f.value !== "");
}

// HubSpot blocks submissions whose pageUri is on a domain without its tracking code as spam ("Unregistered Site
// Domain"), even on the authenticated endpoint. braventa.io deliberately has no trackers, so no pageUri is sent; the
// page name still shows as the conversion page. Verified 2026-10-11: with a pageUri every submission was blocked,
// without one they arrive as normal submissions. HUBSPOT_ACCESS_TOKEN (private-app token, `forms` scope, Vercel
// Secret) is optional and switches to the authenticated endpoint.
export async function sendToHubspot(c: ContactPayload) {
  if (!hubspotConfigured()) return { skipped: true as const };
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  const path = token ? "secure/submit" : "submit";
  const url = `https://api.hsforms.com/submissions/v3/integration/${path}/${process.env.HUBSPOT_PORTAL_ID}/${process.env.HUBSPOT_FORM_GUID}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        fields: toHubspotFields(c),
        context: { pageName: "Contact · Braventa" },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.error("HubSpot form submission failed", res.status, (await res.text()).slice(0, 300));
      return { ok: false as const };
    }
    return { ok: true as const };
  } catch (e) {
    console.error("HubSpot form submission failed", e instanceof Error ? e.message : e);
    return { ok: false as const };
  }
}

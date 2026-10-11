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

const INTENT_LABEL = { early_access: "Early access", demo: "Walkthrough", question: "Question" } as const;

export function hubspotConfigured() {
  return Boolean(process.env.HUBSPOT_PORTAL_ID && process.env.HUBSPOT_FORM_GUID);
}

// HubSpot field names for the form: default contact properties only (the portal has no free custom-property slots).
// The request type and the visitor's marketing choice lead the message so the team sees them in the notification;
// the opt-in itself is recorded in Supabase (contact_requests.marketing_opt_in), the consent record for D-014.
export function toHubspotFields(c: ContactPayload) {
  const [first, ...rest] = c.name.trim().split(/\s+/);
  const message = [
    `Request: ${INTENT_LABEL[c.intent]}`,
    `Product updates: ${c.marketing_opt_in ? "yes, opted in" : "no"}`,
    "",
    c.message,
  ].join("\n");
  const fields = [
    { name: "firstname", value: first },
    { name: "lastname", value: rest.join(" ") },
    { name: "email", value: c.email },
    { name: "company", value: c.business ?? "" },
    { name: "website", value: c.website ?? "" },
    { name: "message", value: message },
  ];
  return fields.filter((f) => f.value !== "");
}

// HubSpot marks unauthenticated server-side submissions from domains it doesn't consider registered as spam
// ("Unregistered Site Domain"). With HUBSPOT_ACCESS_TOKEN (a private-app token with the `forms` scope, stored as a
// Vercel Secret) the authenticated endpoint is used, which HubSpot treats as trusted.
export async function sendToHubspot(c: ContactPayload, context: { pageUri: string }) {
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
        context: { pageUri: context.pageUri, pageName: "Contact · Braventa" },
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

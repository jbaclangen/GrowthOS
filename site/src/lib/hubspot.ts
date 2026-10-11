import "server-only";

// Sends contact requests to Braventa's HubSpot account (founder decision 2026-10-11) through the Forms API, which
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

// HubSpot field names for the form. firstname/lastname/email/company/website/message are default contact
// properties; braventa_intent and braventa_marketing_opt_in are custom contact properties created in HubSpot.
export function toHubspotFields(c: ContactPayload) {
  const [first, ...rest] = c.name.trim().split(/\s+/);
  const fields = [
    { name: "firstname", value: first },
    { name: "lastname", value: rest.join(" ") },
    { name: "email", value: c.email },
    { name: "company", value: c.business ?? "" },
    { name: "website", value: c.website ?? "" },
    { name: "message", value: c.message },
    { name: "braventa_intent", value: INTENT_LABEL[c.intent] },
    { name: "braventa_marketing_opt_in", value: c.marketing_opt_in ? "true" : "false" },
  ];
  return fields.filter((f) => f.value !== "");
}

export async function sendToHubspot(c: ContactPayload, context: { pageUri: string }) {
  if (!hubspotConfigured()) return { skipped: true as const };
  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${process.env.HUBSPOT_PORTAL_ID}/${process.env.HUBSPOT_FORM_GUID}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

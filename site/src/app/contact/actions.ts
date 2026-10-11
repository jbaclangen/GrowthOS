"use server";

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { sendToHubspot } from "@/lib/hubspot";
import { SITE_URL } from "@/lib/site";
import { checkFormToken, visitorHash } from "@/lib/spam";

// Contact and early-access requests (D-033). Stored in contact_requests with the publishable key: the table allows
// anonymous inserts of the form fields only and no reads. Spam protection (Q-033): honeypot field, signed render-time
// token (too-fast submissions), and a database rate limit per visitor (salted IP hash) and per email address.
// Each stored request is then sent to Braventa's HubSpot for notification and follow-up (lib/hubspot.ts).

export type ContactState = { error?: string; sent?: boolean; name?: string } | undefined;

const schema = z.object({
  intent: z.enum(["early_access", "demo", "question"]).catch("question"),
  name: z.string().trim().min(1, "Enter your name").max(120, "Keep your name under 120 characters"),
  email: z.email("Enter a valid email address").max(254),
  business: z.string().trim().max(160, "Keep the business name under 160 characters").optional(),
  website: z.string().trim().max(300, "Keep the website under 300 characters").optional(),
  message: z.string().trim().min(1, "Tell us a little about what you need").max(2000, "Keep your message under 2,000 characters"),
  marketing_opt_in: z.boolean(),
});

// Bots get the same success message as people, so they learn nothing from the response.
const PRETEND_SENT: ContactState = { sent: true };

export async function sendContact(_: ContactState, formData: FormData): Promise<ContactState> {
  if (String(formData.get("company_url") ?? "")) return PRETEND_SENT;
  const token = checkFormToken(String(formData.get("ft") ?? ""));
  if (token === "too_fast" || token === "invalid") return PRETEND_SENT;

  const parsed = schema.safeParse({
    intent: formData.get("intent"),
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim(),
    business: String(formData.get("business") ?? "").trim() || undefined,
    website: String(formData.get("website") ?? "").trim() || undefined,
    message: formData.get("message"),
    marketing_opt_in: formData.get("marketing_opt_in") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { error: "The form isn't available right now. Try again later." };

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase
    .from("contact_requests")
    .insert({ ...parsed.data, ip_hash: visitorHash(await headers()) });
  if (error?.message.includes("rate_limited")) {
    return { error: "You've sent several messages recently. Try again in an hour." };
  }
  if (error) return { error: "Your message wasn't sent. Try again in a minute." };

  // Notify and add to the CRM after responding; a HubSpot failure never loses the stored request.
  after(() => sendToHubspot(parsed.data, { pageUri: `${SITE_URL}/contact` }));
  return { sent: true, name: parsed.data.name.split(" ")[0] };
}

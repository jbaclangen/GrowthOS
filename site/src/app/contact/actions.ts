"use server";

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Contact and early-access requests (founder decision 2026-10-11). Stored in contact_requests with the publishable
// key: the table allows anonymous inserts of the form fields only and no reads (migration 20261011055323).

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

export async function sendContact(_: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: real visitors never see or fill this field.
  if (String(formData.get("company_url") ?? "")) return { sent: true };

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
  const { error } = await supabase.from("contact_requests").insert(parsed.data);
  if (error) return { error: "Your message wasn't sent. Try again in a minute." };
  return { sent: true, name: parsed.data.name.split(" ")[0] };
}

"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { consentGiven } from "./documents";
import { recordAcceptance } from "./acceptances";

// The terms banner's "Accept" (D-057): records the current version for the signed-in user, then re-renders the layout
// so the banner goes away. The checkbox is required in the browser; without it nothing is recorded.
export async function acceptCurrentTerms(formData: FormData) {
  const user = await requireUser();
  if (!consentGiven(formData)) return;
  await recordAcceptance({ userId: user.id, context: "terms_update" });
  refresh();
}

import { connection } from "next/server";
import { getUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasAcceptedCurrentTerms } from "@/lib/legal/acceptances";
import { acceptCurrentTerms } from "@/lib/legal/actions";
import { ConsentCheckbox, CoreTermsSentence } from "./consent";

// Shown under the header to a signed-in person who hasn't accepted the current version of the Terms, MSA and DPA:
// accounts made before sign-up asked (D-057), and everyone after LEGAL_VERSION changes. Sign-up records the agreement,
// so new accounts never see it. Rendered inside <Suspense> in the root layout (per-request).
export async function TermsBanner() {
  await connection();
  const user = await getUser();
  if (!user) return null;
  if (await hasAcceptedCurrentTerms(await createSupabaseServerClient(), user.id)) return null;

  return (
    <div className="border-b border-warning bg-warning-soft" role="region" aria-label="Updated terms">
      <form action={acceptCurrentTerms} className="mx-auto w-full max-w-5xl space-y-3 px-4 py-3">
        <p className="text-sm font-semibold">We&apos;ve published our terms. Please review and accept them to keep using Braventa.</p>
        <ConsentCheckbox id="terms-update-agree">
          <CoreTermsSentence />
        </ConsentCheckbox>
        <button type="submit" className="btn-primary">
          Accept
        </button>
      </form>
    </div>
  );
}

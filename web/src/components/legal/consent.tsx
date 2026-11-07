import type { ReactNode } from "react";
import { CONSENT_FIELD, CONSENT_VALUE, LEGAL_DOCS, legalUrl, type LegalDoc } from "@/lib/legal/documents";

// The agreement checkbox every step uses (D-057). Required in the browser; the server checks it again with
// consentGiven(). No hooks, so server and client components can both render it.
export function ConsentCheckbox({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        name={CONSENT_FIELD}
        value={CONSENT_VALUE}
        required
        className="mt-1 h-4 w-4 shrink-0 accent-accent"
      />
      <span>{children}</span>
    </label>
  );
}

// A link to a legal page on braventa.io. Opens in a new tab so a half-filled form isn't lost.
export function LegalLink({ doc, hash, children }: { doc: LegalDoc; hash?: string; children?: ReactNode }) {
  return (
    <a
      href={legalUrl(doc, hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-accent underline underline-offset-2"
    >
      {children ?? LEGAL_DOCS[doc].label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

// The sentence used at sign-up and on the terms banner.
export function CoreTermsSentence() {
  return (
    <>
      I agree to the <LegalLink doc="terms" />, <LegalLink doc="msa" /> and <LegalLink doc="dpa" />, and I&apos;ve read
      the <LegalLink doc="privacy" />. I&apos;m 18 or older and I&apos;m using Braventa for a business.
    </>
  );
}

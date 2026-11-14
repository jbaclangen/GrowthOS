// Braventa's legal documents and the agreements the app asks for (D-057, docs/architecture/LEGAL_ACCEPTANCE.md).
// The documents live on the marketing site (site/src/app/legal/*). Pure and client-safe: the checkboxes import it, and
// the server records what was agreed in legal_acceptances (lib/legal/acceptances.ts).

export const LEGAL_SITE = "https://braventa.io";

// The "Last updated" date shown on the Terms, MSA, DPA, Privacy and Refund pages. Change it, and the pages' dates,
// whenever one of them changes materially: every signed-in user who hasn't accepted this version sees the banner.
export const LEGAL_VERSION = "2026-11-14";

export const LEGAL_DOCS = {
  terms: { label: "Terms of Service", path: "/legal/terms" },
  msa: { label: "Master Services Agreement", path: "/legal/msa" },
  dpa: { label: "Data Processing Agreement", path: "/legal/dpa" },
  privacy: { label: "Privacy policy", path: "/legal/privacy" },
  refunds: { label: "Refund policy", path: "/legal/refunds" },
} as const;

export type LegalDoc = keyof typeof LEGAL_DOCS;

export const legalUrl = (doc: LegalDoc, hash?: string) => `${LEGAL_SITE}${LEGAL_DOCS[doc].path}${hash ? `#${hash}` : ""}`;

// Where in the app someone agrees to something. Must equal the latest legal_acceptances context check in the
// migrations (documents.test.ts). Checkout isn't here: billing isn't built (spec: LEGAL_ACCEPTANCE.md §5).
export const ACCEPTANCE_CONTEXTS = [
  "signup",
  "terms_update",
  "website_authorization",
  "search_console_connect",
  "access_key",
  "assistant_oauth",
  "hubspot_connect",
] as const;

export type AcceptanceContext = (typeof ACCEPTANCE_CONTEXTS)[number];

// The documents each agreement covers. Privacy is "read", not agreed to, but recording that it was shown matters.
const CORE: LegalDoc[] = ["terms", "msa", "dpa", "privacy"];
export const CONTEXT_DOCUMENTS: Record<AcceptanceContext, LegalDoc[]> = {
  signup: CORE,
  terms_update: CORE,
  website_authorization: ["terms"],
  search_console_connect: ["msa", "privacy"],
  access_key: ["terms"],
  assistant_oauth: ["terms"],
  hubspot_connect: ["msa", "privacy"],
};

// Every agreement checkbox posts this name and value; the server accepts nothing else.
export const CONSENT_FIELD = "agree";
export const CONSENT_VALUE = "yes";

export function consentGiven(formData: Pick<FormData, "get">, field: string = CONSENT_FIELD): boolean {
  return formData.get(field) === CONSENT_VALUE;
}

// What a missing checkbox says, per step (shown as the form's error; browsers also block it with `required`).
export const CONSENT_REQUIRED: Record<AcceptanceContext, string> = {
  signup: "To create an account, agree to the terms and confirm you're 18 or older and using Braventa for a business.",
  terms_update: "Tick the box to accept the updated terms.",
  website_authorization: "Confirm that you own this website or are authorized to act for the business that does.",
  search_console_connect: "Confirm that you're authorized to connect this Google account and responsible for it.",
  access_key: "Confirm that you'll keep the key private and are responsible for what uses it.",
  assistant_oauth: "Confirm that you're responsible for what this app does with access to your business.",
  hubspot_connect: "Confirm that you're authorized to connect this HubSpot portal and responsible for it.",
};

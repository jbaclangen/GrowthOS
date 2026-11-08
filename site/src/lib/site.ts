// Site-wide constants for braventa.io (D-031). Copy rules: docs/brand/VOICE_AND_MESSAGING.md;
// page list and priorities: docs/marketing/SITEMAP.md.

export const SITE_URL = "https://braventa.io";
export const APP_URL = "https://app.braventa.io";
export const SIGN_IN_URL = `${APP_URL}/login`;

// Sign-up is invite-only during early access, so the primary call to action is a request, not a sign-up.
export const PRIMARY_CTA = { label: "Request early access", href: "/contact?intent=early_access" } as const;

export const NAV = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Product", href: "/product" },
  { label: "For service businesses", href: "/service-businesses" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
] as const;

export const FOOTER = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Product", href: "/product" },
      { label: "Pricing", href: "/pricing" },
      { label: "For service businesses", href: "/service-businesses" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Trust and data", href: "/trust" },
      { label: "AI use", href: "/trust/ai" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Master Services Agreement", href: "/legal/msa" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Data Processing Agreement", href: "/legal/dpa" },
      { label: "GDPR", href: "/legal/gdpr" },
      { label: "Refund policy", href: "/legal/refunds" },
      { label: "Cookies", href: "/legal/cookies" },
      { label: "Sub-processors", href: "/legal/subprocessors" },
    ],
  },
] as const;

// The tagline (D-005). Used verbatim; never reworded.
export const TAGLINE = "Run your growth as one system.";

// The reference sentence for what works today (VOICE_AND_MESSAGING §5), updated for ON-1–ON-8, D-029, D-058 (one
// Google sign-in for Search Console and GA4, Pro) and D-059 (HubSpot counts only, not in the diagnosis yet).
export const LIVE_TODAY =
  "Today Braventa reads up to 25 pages of your website and checks it with Google PageSpeed, asks what's holding your business back and follows up on your answers, builds a profile of your business, and gives you a growth score with a diagnosis you confirm or correct. It turns that into one prioritized growth plan, plans 30 days of content, and drafts your first five posts for you to approve. On Pro and during the trial, it also reads your Google Search Console and Google Analytics 4 data for your diagnosis and score, and shows your HubSpot contacts and deals as counts. It doesn't publish, send email, run automations, or use your CRM data in the diagnosis yet.";

// Prices (founder decision D-039). There is no checkout yet, so the site shows them with "Talk to us", never a buy
// button. Yearly billing and extra-seat prices stay off the site until checkout exists (D-039, D-046).
export const PRICES = { basic: "$89", pro: "$229", premium: "From $599" } as const;

// Seats per plan. Mirrors SEAT_ALLOWANCES in web/src/lib/team/seats.ts (D-046); change both together. It isn't
// imported because that file resolves the app's "@/" alias, which points at site/src here.
export const SEATS = {
  basic: "2 full seats and up to 5 analysts",
  pro: "5 full seats and up to 10 analysts",
  premium: "10 full seats and unlimited analysts",
} as const;

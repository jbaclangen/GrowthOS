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
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Cookies", href: "/legal/cookies" },
      { label: "Sub-processors", href: "/legal/subprocessors" },
    ],
  },
] as const;

// The reference sentence for what works today (VOICE_AND_MESSAGING §5), updated for ON-1–ON-8 and D-029.
export const LIVE_TODAY =
  "Today Braventa reads your website and checks it with Google PageSpeed, asks what's holding your business back and follows up on your answers, builds a profile of your business, and gives you a growth score with a diagnosis you confirm or correct. It turns that into one prioritized growth plan, plans 30 days of content, and drafts your first five posts for you to approve. It doesn't publish, send email, or connect to your CRM or analytics yet.";

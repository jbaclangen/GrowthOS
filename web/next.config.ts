import type { NextConfig } from "next";

// Where forms may lead. The "Connect Google" and "Connect HubSpot" forms (components/connections/connect-form.tsx)
// GET a start route that answers 303 to the provider's consent screen, and form-action also applies to redirects after
// a form submits: without these origins the browser silently stays on the page (seen in production 2026-11-08). They
// must cover GOOGLE_AUTH_URL and HUBSPOT_AUTH_URL (lib/integrations/csp.test.ts checks it).
const FORM_ACTION = ["'self'", "https://accounts.google.com", "https://*.hubspot.com"];

// Sent on every response. The app is private (noindex, nofollow) and must not be framed by other sites.
const securityHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Script and style sources are left to Next.js defaults; this restricts framing, plugins, base URLs and
  // where forms may post.
  { key: "Content-Security-Policy", value: `frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action ${FORM_ACTION.join(" ")}` },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

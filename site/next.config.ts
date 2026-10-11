import { join } from "node:path";
import type { NextConfig } from "next";
import { INDEXABLE } from "./src/lib/indexing";

// braventa.io (D-031). Until launch the whole site is hidden from search engines (founder decision 2026-10-11):
// set SITE_INDEXABLE=true in the deployment to allow indexing.
const headers = [
  ...(INDEXABLE ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" }]),
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers }];
  },
  // The pricing page reads the tier list straight from the app (web/src/lib/plans/tiers.ts) so the two can't drift;
  // that file lives outside this project, so Turbopack and file tracing start at the repository root.
  outputFileTracingRoot: join(__dirname, ".."),
  turbopack: {
    root: join(__dirname, ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

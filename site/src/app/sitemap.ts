import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public pages (docs/marketing/SITEMAP.md). Crawlers only use it once robots.ts allows indexing.
const PATHS = [
  "",
  "/how-it-works",
  "/product",
  "/service-businesses",
  "/pricing",
  "/about",
  "/contact",
  "/trust",
  "/trust/ai",
  "/legal/terms",
  "/legal/privacy",
  "/legal/cookies",
  "/legal/subprocessors",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.6 }));
}

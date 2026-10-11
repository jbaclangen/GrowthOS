import type { MetadataRoute } from "next";
import { INDEXABLE } from "@/lib/indexing";
import { SITE_URL } from "@/lib/site";

// Until launch nothing may be crawled (founder decision 2026-10-11); at launch set SITE_INDEXABLE=true.
export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL };
}

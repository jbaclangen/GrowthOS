import type { MetadataRoute } from "next";

// app.braventa.io is the private product, not a public site: no crawler may index any of it.
// The public marketing site (braventa.io, D-031) has its own robots rules.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}

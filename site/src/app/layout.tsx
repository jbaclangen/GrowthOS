import type { Metadata } from "next";
import { Comfortaa, Quicksand } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { INDEXABLE } from "@/lib/indexing";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Founder decision D-015: Quicksand for headings and the logo, Comfortaa for everything else.
const quicksand = Quicksand({ variable: "--font-quicksand", subsets: ["latin"] });
const comfortaa = Comfortaa({ variable: "--font-comfortaa", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Braventa — Run your growth as one system", template: "%s · Braventa" },
  description:
    "Braventa is a business growth system for service businesses. Know what to do next, then get it done — with you approving everything.",
  applicationName: "Braventa",
  openGraph: { siteName: "Braventa", type: "website" },
  // Hidden from search engines until launch; see src/lib/indexing.ts.
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${quicksand.variable} ${comfortaa.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 btn-primary">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { DraftNotice } from "@/components/ui";

export const metadata: Metadata = { title: "Cookies", description: "The cookies Braventa uses. Draft pending legal review." };

// The marketing site has no analytics or trackers, so no consent banner is needed. Add one (declining non-essential
// by default) before adding any analytics (SITEMAP.md §4).
export default function Cookies() {
  return (
    <>
      <h1 className="text-4xl">Cookies</h1>
      <DraftNotice>Plain-language summary pending legal review.</DraftNotice>
      <h2>braventa.io</h2>
      <p>This website sets no cookies and uses no analytics, advertising or tracking tools.</p>
      <h2>app.braventa.io</h2>
      <p>
        The app uses only strictly necessary cookies: our authentication provider stores your sign-in session so you stay
        signed in. They aren&apos;t used for tracking or advertising.
      </p>
      <p>If we add analytics, we&apos;ll ask for your consent first and update this page.</p>
    </>
  );
}

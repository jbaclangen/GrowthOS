import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sub-processors",
  description: "The third-party providers that process data for Braventa.",
};

// Must match what the product actually uses (docs/architecture/INTEGRATIONS.md). Update before adding a provider.
const VENDORS = [
  { name: "Supabase", purpose: "Database and sign-in for all customer data", data: "Account, setup answers, analysis results, contact requests, and, if you connect Google Search Console, the connected Google account email, the encrypted Google token and copies of your search data; if you connect Google Analytics 4, copies of your analytics totals (sessions, key events, channels, landing pages and devices, no individual visitors); if you connect HubSpot, the encrypted HubSpot token, your portal's ID and domain and copies of your CRM counts" },
  { name: "Vercel", purpose: "Hosting for braventa.io and app.braventa.io", data: "Requests passing through the site and app" },
  { name: "OpenRouter", purpose: "Routes requests to AI models", data: "Website text, setup answers and business profile for each task; with Google Search Console or Google Analytics 4 connected, a summary of that data for the diagnosis; and questions asked in the in-app assistant with a summary of the account" },
  { name: "Anthropic Claude (via OpenRouter; served by Anthropic, Google Cloud or Amazon Web Services)", purpose: "AI models that analyze, plan and draft, with zero data retention", data: "As above, for the task at hand" },
  { name: "OpenAI GPT (via OpenRouter; served by Microsoft Azure)", purpose: "Backup AI model, used only when the first-choice model is unavailable, with zero data retention", data: "As above, for the task at hand. Never used for the diagnosis, so it isn't sent your Google Search Console or Google Analytics summary. It can still receive text that mentions your search or analytics data: your growth plan's actions when it builds your 30-day content plan, and, as the backup for the in-app assistant, which Search Console and Google Analytics properties are connected, your Search visibility and Analytics scores, your diagnosis and your growth plan" },
  { name: "HubSpot", purpose: "Our CRM: receives contact-form requests, notifies our team and sends our replies", data: "What you send through the contact form" },
  { name: "Google (PageSpeed Insights API)", purpose: "Measures the speed and quality of the website you analyze", data: "The public website address" },
];

export default function Subprocessors() {
  return (
    <>
      <h1 className="text-4xl">Sub-processors</h1>
      <DraftNotice>
        Last updated November 2026. We&apos;ll update this list at least 30 days before adding or replacing a provider
        (see our <Link href="/legal/dpa">Data Processing Agreement</Link>).
      </DraftNotice>
      <div className="not-prose overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-2 pr-4 font-semibold">Provider</th>
              <th className="py-2 pr-4 font-semibold">Purpose</th>
              <th className="py-2 font-semibold">Data involved</th>
            </tr>
          </thead>
          <tbody>
            {VENDORS.map((v) => (
              <tr key={v.name} className="border-t border-border align-top">
                <td className="py-3 pr-4 font-semibold">{v.name}</td>
                <td className="py-3 pr-4">{v.purpose}</td>
                <td className="py-3">{v.data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        If you connect your own AI assistant to Braventa (for example, Claude Desktop), its provider processes what your
        assistant receives under your own account and terms. It acts for you and isn&apos;t a Braventa sub-processor. See{" "}
        <Link href="/legal/privacy">Privacy</Link>.
      </p>
      <p>
        If you connect Google Search Console or Google Analytics 4, Braventa reads that data from Google with the
        read-only access you granted. Google holds that data under your own Google account and terms; it isn&apos;t a Braventa sub-processor
        for it. See <Link href="/legal/privacy">Privacy</Link>.
      </p>
      <p>
        If you connect HubSpot, Braventa reads your CRM records from your own HubSpot portal with the read-only access you
        granted and keeps only counts and totals. HubSpot holds your CRM data under your own account and terms; it
        isn&apos;t a Braventa sub-processor for it. (Braventa&apos;s own HubSpot portal, listed above, is separate: it
        handles contact-form requests sent to us.) See <Link href="/legal/privacy">Privacy</Link>.
      </p>
    </>
  );
}

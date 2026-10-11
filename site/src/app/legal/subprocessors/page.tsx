import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sub-processors",
  description: "The third-party providers that process data for Braventa.",
};

// Must match what the product actually uses (docs/architecture/INTEGRATIONS.md). Update before adding a provider.
const VENDORS = [
  { name: "Supabase", purpose: "Database and sign-in for all customer data", data: "Account, setup answers, analysis results, contact requests" },
  { name: "Vercel", purpose: "Hosting for braventa.io and app.braventa.io", data: "Requests passing through the site and app" },
  { name: "OpenRouter", purpose: "Routes requests to AI models", data: "Website text, setup answers and business profile for each task" },
  { name: "Anthropic (via OpenRouter)", purpose: "AI models that analyze, plan and draft", data: "As above, for the task at hand" },
  { name: "OpenAI and Alibaba Qwen (via OpenRouter)", purpose: "Backup AI models, used only when the first-choice model is unavailable", data: "As above, for the task at hand" },
  { name: "HubSpot", purpose: "Our CRM: receives contact-form requests, notifies our team and sends our replies", data: "What you send through the contact form" },
  { name: "Google (PageSpeed Insights API)", purpose: "Measures the speed and quality of the website you analyze", data: "The public website address" },
];

export default function Subprocessors() {
  return (
    <>
      <h1 className="text-4xl">Sub-processors</h1>
      <DraftNotice>Last updated October 2026. We&apos;ll update this list before adding a new provider.</DraftNotice>
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
    </>
  );
}

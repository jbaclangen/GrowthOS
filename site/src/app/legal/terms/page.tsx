import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "@/components/ui";

export const metadata: Metadata = { title: "Terms of Service", description: "Braventa's Terms of Service are being prepared." };

export default function Terms() {
  return (
    <>
      <h1 className="text-4xl">Terms of Service</h1>
      <DraftNotice>
        Our Terms of Service are being prepared with legal counsel and will be published here before Braventa opens to
        the public. During early access, accounts are by invitation and use is agreed with each business directly.
      </DraftNotice>
      <h2>What we can say today</h2>
      <ul>
        <li>Braventa drafts and recommends. Nothing is published or changed for your business without your approval.</li>
        <li>AI-generated analysis and drafts can be wrong; check them before you act on or approve them.</li>
        <li>We don&apos;t promise specific results such as revenue, leads or rankings.</li>
        <li>
          If you connect an AI assistant, keep its access key private and revoke it in the app if it may have been
          exposed. An assistant can fill in your setup, but it can&apos;t publish anything or approve work for you.
        </li>
      </ul>
      <p>
        Questions about the terms of your early access? <Link href="/contact">Contact us</Link>.
      </p>
    </>
  );
}

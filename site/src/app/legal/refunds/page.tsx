import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Refund policy",
  description: "How cancellations and refunds work on Braventa's paid plans. Draft pending legal review.",
};

// Draft pending counsel (Q-032). Founder decision 2026-11-08 (D-056): monthly plans, cancel anytime, no refunds for
// partial periods, with exceptions for billing errors, ending the service without cause, and what the law requires.
// Billing isn't built (Q-010), so the page says nothing is charged today. Before billing launches, counsel checks it
// against auto-renewal laws (D-039, Q-032).
export default function RefundPolicy() {
  return (
    <>
      <h1 className="text-4xl">Refund policy</h1>
      <DraftNotice>
        This policy is a draft being reviewed with legal counsel. Braventa doesn&apos;t charge anything yet; this policy
        will apply once paid plans launch. Last updated November 14, 2026.
      </DraftNotice>

      <h2>The trial</h2>
      <p>
        Each account gets one 14-day Pro trial at no cost. When it ends, its businesses continue on Basic. Nothing is
        charged today, and we&apos;ll ask you to agree before we ever charge you.
      </p>

      <h2>Paid plans and cancelling</h2>
      <ul>
        <li>Paid plans are billed monthly in advance and renew each month until you cancel.</li>
        <li>
          You can cancel at any time. Your plan stays active until the end of the month you&apos;ve paid for, and you
          won&apos;t be charged again.
        </li>
        <li>
          We don&apos;t give refunds or credits for partial months, unused time, unused seats, or moving to a lower plan.
        </li>
      </ul>

      <h2>When we do refund</h2>
      <ul>
        <li>
          <strong>Billing mistakes:</strong> if we charge you the wrong amount or charge you twice, we refund the difference.
        </li>
        <li>
          <strong>If we end the service without cause:</strong> if we close your account when you haven&apos;t broken our
          terms, or stop offering Braventa, we refund the unused part of the period you&apos;ve paid for.
        </li>
        <li>
          <strong>Sub-processor objections:</strong> if you end a service because of an objection we can&apos;t resolve
          under our <Link href="/legal/dpa">Data Processing Agreement</Link>, we refund the unused part of the period
          you&apos;ve paid for.
        </li>
        <li>
          <strong>Where the law requires it:</strong> for example, under the Australian Consumer Law our services come with
          guarantees that can&apos;t be excluded, and you&apos;re entitled to a refund or other remedy for a major failure.
          Nothing in this policy limits rights like these.
        </li>
      </ul>
      <p>
        Service credits for downtime on paid plans are covered by our{" "}
        <Link href="/legal/msa">Master Services Agreement</Link>, not by refunds.
      </p>

      <h2>How to ask for a refund</h2>
      <ul>
        <li>
          Email hello@braventa.io or use our <Link href="/contact">contact form</Link> within 30 days of the charge, with
          your business name and the charge in question.
        </li>
        <li>
          Approved refunds go back to the original payment method, usually within 10 business days. Your bank may take
          longer to show it.
        </li>
        <li>
          Please contact us before disputing a charge with your bank, so we can sort it out quickly.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>
        We may update this policy. Changes apply to charges made after the update, and we&apos;ll tell you about material
        changes before they take effect.
      </p>
    </>
  );
}

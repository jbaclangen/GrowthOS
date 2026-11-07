import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "@/components/ui";

export const metadata: Metadata = {
  title: "GDPR",
  description: "How Braventa handles personal data for customers in the European Union and the United Kingdom. Draft pending legal review.",
};

// Draft pending counsel (Q-032, D-056). A guide for EU and UK customers that points to the Privacy policy and DPA
// rather than restating them. No "GDPR compliant" or certification claims (docs/marketing/SITEMAP.md). The Article 27
// representatives aren't appointed yet (Q-053): say so until they are.
export default function Gdpr() {
  return (
    <>
      <h1 className="text-4xl">GDPR</h1>
      <DraftNotice>
        This page is a draft being reviewed with legal counsel and will be finalized before Braventa opens to the public.
        Last updated November 8, 2026.
      </DraftNotice>
      <p>
        This page is for businesses in the European Union and the United Kingdom, where the GDPR and the UK GDPR apply.
        It explains how Braventa fits into those laws and where to find the details.
      </p>

      <h2>Our two roles</h2>
      <ul>
        <li>
          <strong>Controller:</strong> for data we use to run Braventa itself, such as your account, security records and
          messages you send us. Our <Link href="/legal/privacy">Privacy policy</Link> explains what we collect, our legal
          bases, how long we keep it and your rights.
        </li>
        <li>
          <strong>Processor:</strong> for personal data we process on your behalf in providing the service, such as your
          team members&apos; details and personal information that appears on websites you ask us to analyze. Our{" "}
          <Link href="/legal/dpa">Data Processing Agreement</Link> sets out our obligations under Article 28 and applies
          automatically when you accept the <Link href="/legal/terms">Terms of Service</Link>.
        </li>
      </ul>

      <h2>Transfers outside the EU and the UK</h2>
      <p>
        Braventa is not established in the EU or the UK: our team works from the Philippines, and our providers process
        data in the United States and other countries. The Data Processing Agreement incorporates the EU Standard
        Contractual Clauses and the UK International Data Transfer Addendum to cover these transfers. Our{" "}
        <Link href="/legal/subprocessors">Sub-processors</Link> page lists every provider and what it receives.
      </p>

      <h2>Representatives in the EU and the UK</h2>
      <p>
        Because Braventa isn&apos;t established in the EU or the UK, Article 27 of the GDPR and of the UK GDPR requires us
        to appoint a representative in each. We&apos;re appointing them and will name them here. Until then, contact us
        directly at hello@braventa.io.
      </p>

      <h2>Data protection officer</h2>
      <p>
        Braventa doesn&apos;t carry out large-scale monitoring or process special category data, so it isn&apos;t required
        to appoint a data protection officer. Our privacy officer, Braventa&apos;s founder, handles data protection
        questions at hello@braventa.io.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to access, correct, delete or receive a copy of your personal data, object to or restrict how we use
        it, and withdraw consent. Email hello@braventa.io or use our <Link href="/contact">contact form</Link>; we respond
        within one month. If we process the data for one of our customers, we&apos;ll pass your request to that customer
        and help them answer it. You can also complain to the data protection authority where you live or work, or in
        the UK to the <a href="https://ico.org.uk/make-a-complaint/">Information Commissioner&apos;s Office</a>.
      </p>

      <h2>AI and automated decisions</h2>
      <p>
        Braventa uses AI to analyze businesses and their websites and to draft plans and posts. It doesn&apos;t make
        decisions about people that have legal or similarly significant effects under Article 22, and a person reviews
        and approves what it produces. Our AI providers keep no data after answering; see{" "}
        <Link href="/trust/ai">How Braventa uses AI</Link>.
      </p>

      <h2>Security and breaches</h2>
      <p>
        The security measures we apply are listed in Annex 2 of the Data Processing Agreement. If a breach affects
        personal data we process for you, we&apos;ll tell you without undue delay so you can meet your own 72-hour
        notification duty, and we&apos;ll notify authorities and individuals ourselves where we&apos;re the controller.
      </p>

      <h2>What we don&apos;t claim</h2>
      <p>
        Braventa doesn&apos;t hold security or privacy certifications, and no authority has approved or certified it.
        This page describes how we work; it isn&apos;t legal advice about your own obligations.
      </p>
    </>
  );
}

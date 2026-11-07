import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Data Processing Agreement",
  description: "How Braventa processes personal data on behalf of its business customers. Draft pending legal review.",
};

// Draft pending counsel (Q-032, D-056). Processor terms under GDPR Art. 28 / UK GDPR, with the EU SCCs and UK Addendum
// incorporated by reference, plus US state-law service-provider terms. Annex 2 lists only measures the code has
// (docs/architecture/SECURITY_AND_PRIVACY.md); don't add one that isn't built. Sub-processors: /legal/subprocessors.
export default function DataProcessingAgreement() {
  return (
    <>
      <h1 className="text-4xl">Data Processing Agreement</h1>
      <DraftNotice>
        This agreement is a draft being reviewed with legal counsel and will be finalized before Braventa opens to the
        public. Last updated November 8, 2026.
      </DraftNotice>

      <h2>1. What this agreement covers</h2>
      <p>
        This Data Processing Agreement (&quot;DPA&quot;) is part of the agreement between Braventa LLC [pending
        registration] (&quot;Braventa&quot;) and the business that uses Braventa (&quot;you&quot;), made up of our{" "}
        <Link href="/legal/terms">Terms of Service</Link> and <Link href="/legal/msa">Master Services Agreement</Link>.
        It applies when Braventa processes personal data on your behalf in providing the service (&quot;customer personal
        data&quot;) and that processing is covered by data protection law, including the GDPR, the UK GDPR, the Swiss
        Federal Act on Data Protection, US state privacy laws such as the CCPA, the Australian Privacy Act and Canada&apos;s
        PIPEDA. It takes effect when you accept the Terms of Service. If you need a signed copy, contact us.
      </p>

      <h2>2. Roles</h2>
      <ul>
        <li>
          For customer personal data, you are the controller (or a processor acting for your own clients), and Braventa
          is your processor (or sub-processor).
        </li>
        <li>
          For data we use to run our own business, such as your account details, security records and messages you send
          us, Braventa is the controller, as described in our <Link href="/legal/privacy">Privacy policy</Link>.
        </li>
        <li>
          You&apos;re responsible for having a lawful basis, and any notices or consents needed, for the personal data you
          give Braventa, including personal information that appears on websites you ask us to analyze.
        </li>
      </ul>

      <h2>3. Braventa&apos;s obligations as processor</h2>
      <ul>
        <li>
          <strong>Instructions.</strong> We process customer personal data only on your documented instructions: this
          agreement and how you use and configure the service. If we think an instruction breaks data protection law,
          we&apos;ll tell you. If the law requires us to process data in another way, we&apos;ll tell you first unless the
          law forbids it.
        </li>
        <li>
          <strong>Confidentiality.</strong> Everyone we authorize to process customer personal data is bound by
          confidentiality.
        </li>
        <li>
          <strong>Security.</strong> We apply the technical and organizational measures in Annex 2, and keep them
          appropriate to the risk.
        </li>
        <li>
          <strong>Sub-processors.</strong> You authorize us to use the sub-processors on our{" "}
          <Link href="/legal/subprocessors">Sub-processors</Link> page. We&apos;ll update that page at least 30 days before
          adding or replacing one. You may object on reasonable data protection grounds within that time; if we can&apos;t
          resolve your objection, you may end the affected service and we&apos;ll refund any prepaid fees for the unused
          period. We bind each sub-processor to data protection terms at least as protective as this DPA and remain
          responsible for its performance as the law requires.
        </li>
        <li>
          <strong>Requests from individuals.</strong> We help you respond to requests to exercise data protection rights.
          If we receive a request about customer personal data, we&apos;ll pass it to you and won&apos;t answer it
          ourselves unless you ask us to.
        </li>
        <li>
          <strong>Breaches.</strong> If we become aware of a personal data breach affecting customer personal data,
          we&apos;ll tell you without undue delay, and where feasible within 48 hours, with the information you need to
          meet your own obligations, and we&apos;ll update you as we learn more.
        </li>
        <li>
          <strong>Assessments.</strong> We give you reasonable help with data protection impact assessments and with
          consultations with authorities about the service.
        </li>
        <li>
          <strong>Deletion.</strong> When the agreement ends, or when you ask, we delete customer personal data within 30
          days, unless the law requires us to keep it. Copies in our database provider&apos;s backups are overwritten on
          that provider&apos;s schedule. We can give you a copy of your data before deletion if you ask.
        </li>
        <li>
          <strong>Audits.</strong> We make available the information needed to show we meet this DPA, including answers to
          a reasonable security questionnaire once a year. Where the law or an authority requires an audit, we&apos;ll
          allow one with at least 30 days&apos; notice, during business hours, under confidentiality and at your cost.
          Braventa doesn&apos;t hold security certifications yet.
        </li>
      </ul>

      <h2>4. International transfers</h2>
      <ul>
        <li>
          Braventa&apos;s team works from the Philippines, and our sub-processors process data in the United States and
          other countries. Customer personal data may therefore be transferred out of the European Economic Area, the
          United Kingdom, Switzerland, Canada and Australia.
        </li>
        <li>
          Where the GDPR requires a transfer safeguard, the EU Standard Contractual Clauses (Commission Decision (EU)
          2021/914) are incorporated into this DPA: Module 2 where you are a controller and Module 3 where you are a
          processor. For them: Clause 7 doesn&apos;t apply; under Clause 9, option 2 (general authorization) applies, with
          the notice period in section 3; the optional wording in Clause 11 doesn&apos;t apply; Clauses 17 and 18 choose
          the law and courts of Ireland; and Annexes 1 to 3 of this DPA complete their annexes.
        </li>
        <li>
          For transfers from the United Kingdom, the UK International Data Transfer Addendum to those clauses is
          incorporated. For transfers from Switzerland, the clauses apply with references to the GDPR read as references
          to the Swiss Federal Act on Data Protection.
        </li>
        <li>We apply equivalent protection to transfers of personal data from Canada and Australia.</li>
      </ul>

      <h2>5. US state privacy laws</h2>
      <p>
        Where the CCPA or a similar US state law applies, Braventa acts as your service provider or processor. We
        won&apos;t sell or share customer personal data; won&apos;t keep, use or disclose it for any purpose other than
        providing the service, or outside our direct business relationship with you; won&apos;t combine it with personal
        data from other sources except as those laws allow; and will tell you if we can no longer meet our obligations
        under them. You may take reasonable steps to stop and fix any unauthorized use.
      </p>

      <h2>6. Liability and precedence</h2>
      <ul>
        <li>
          Each party&apos;s liability under this DPA is subject to the limits in the Terms of Service, to the extent the
          law allows. Nothing in this DPA limits any party&apos;s liability to individuals under the Standard Contractual
          Clauses.
        </li>
        <li>
          For personal data, if this DPA conflicts with the Terms of Service or the Master Services Agreement, this DPA
          applies. If the Standard Contractual Clauses conflict with this DPA, the clauses apply.
        </li>
      </ul>

      <h2>Annex 1: Details of the processing</h2>
      <ul>
        <li>
          <strong>Data subjects:</strong> your staff and team members on Braventa; people whose information appears on
          websites you ask us to analyze; people who use the Google account you connect.
        </li>
        <li>
          <strong>Personal data:</strong> names, email addresses and roles; business contact details; text from public web
          pages; your answers during setup; the email address of a connected Google account; Search Console data, which
          is mostly aggregated (search queries can sometimes contain personal information).
        </li>
        <li>
          <strong>Sensitive data:</strong> none intended. You agree not to enter special category or other sensitive data.
        </li>
        <li>
          <strong>Nature and purpose:</strong> hosting, storing, analyzing (including with AI models), displaying and
          deleting data, to provide the service described in the Master Services Agreement.
        </li>
        <li>
          <strong>Frequency and duration:</strong> continuous, for as long as you use Braventa, plus the deletion period in
          section 3.
        </li>
        <li>
          <strong>Competent supervisory authority (SCCs):</strong> the authority of the EU member state where you are
          established or, if you are not established in the EU, where your representative is.
        </li>
      </ul>

      <h2>Annex 2: Security measures</h2>
      <ul>
        <li>All traffic to braventa.io and app.braventa.io is encrypted in transit (HTTPS with HSTS).</li>
        <li>
          Database row-level security keeps each business&apos;s data separate; the key that bypasses it is used only by
          server code, scoped to a business already authorized.
        </li>
        <li>Passwords are held only as hashes by our authentication provider.</li>
        <li>Google tokens are encrypted (AES-256-GCM); access keys and connection tokens are stored only as one-way hashes.</li>
        <li>Secrets are kept on the server and never sent to the browser.</li>
        <li>Eight fixed roles control what each team member can do; only the owner can connect tools.</li>
        <li>
          AI requests go only to providers that keep no data after answering (zero data retention), and website text is
          treated as untrusted input to the models.
        </li>
        <li>Rate and usage limits protect the service from abuse.</li>
        <li>Access to production systems is limited to the people who need it.</li>
        <li>Our database provider keeps backups.</li>
      </ul>

      <h2>Annex 3: Sub-processors</h2>
      <p>
        The current list is on our <Link href="/legal/subprocessors">Sub-processors</Link> page.
      </p>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Master Services Agreement",
  description: "What Braventa provides, its service levels, and what happens when something goes wrong. Draft pending legal review.",
};

// Draft pending counsel (Q-032). Founder decisions 2026-11-08 (D-056): 99.5% monthly uptime target on paid plans once
// billing launches, service credits capped at 25% of the month's fee as the only remedy; none in early access or the
// trial. Liability lives in the Terms (§§11-13), not here. The service description must match what is live
// (CLAUDE.md "Live today", web/src/lib/plans/tiers.ts); never list a Coming soon feature as included.
export default function MasterServicesAgreement() {
  return (
    <>
      <h1 className="text-4xl">Master Services Agreement</h1>
      <DraftNotice>
        This agreement is a draft being reviewed with legal counsel and will be finalized before Braventa opens to the
        public. Its service levels apply only once paid plans launch. Last updated November 8, 2026.
      </DraftNotice>

      <h2>1. How our agreements fit together</h2>
      <p>
        This Master Services Agreement (&quot;MSA&quot;) explains what Braventa provides, what you can expect from it,
        the service levels for paid plans, and what happens when something goes wrong. It is part of your agreement with
        Braventa LLC [pending registration], together with our <Link href="/legal/terms">Terms of Service</Link>,{" "}
        <Link href="/legal/dpa">Data Processing Agreement</Link>, <Link href="/legal/privacy">Privacy policy</Link> and{" "}
        <Link href="/legal/refunds">Refund policy</Link>. Accepting the Terms of Service means accepting this MSA.
        Where documents conflict, a written agreement signed by both of us applies first, then the Data Processing
        Agreement (for personal data), then this MSA, then the Terms of Service.
      </p>

      <h2>2. What Braventa does today</h2>
      <ul>
        <li>
          <strong>Website analysis:</strong> technical checks of up to 25 public pages of your website, respecting its
          robots.txt, plus Google PageSpeed results for mobile and desktop.
        </li>
        <li>
          <strong>Discovery and profile:</strong> questions about what&apos;s holding your business back, with follow-ups,
          turned into a profile of your business.
        </li>
        <li>
          <strong>Growth score and diagnosis:</strong> a score and a diagnosis that you confirm or correct.
        </li>
        <li>
          <strong>Growth plan:</strong> one prioritized plan whose items you accept, dismiss or mark done, a 30-day content
          plan, and five drafted posts for you to approve or reject.
        </li>
        <li>
          <strong>Ask Braventa:</strong> an in-app assistant that answers questions about how Braventa works and about your
          latest report. It can&apos;t make changes.
        </li>
        <li>
          <strong>AI assistant connection:</strong> lets Claude Desktop or Claude Code fill in your setup with a personal
          access key you create and can revoke.
        </li>
        <li>
          <strong>Google Search Console:</strong> on Pro, Premium and the trial, a read-only connection whose data is shown
          in Braventa and used in your diagnosis and growth score.
        </li>
        <li>
          <strong>Google Analytics 4:</strong> on Pro, Premium and the trial, a read-only connection, through the same
          Google sign-in as Search Console, whose data is shown in Braventa and used in your diagnosis and growth score.
        </li>
        <li>
          <strong>HubSpot:</strong> on Pro, Premium and the trial, a read-only connection that shows counts of your
          contacts, companies and deals in Braventa. It isn&apos;t used in your diagnosis or growth score yet.
        </li>
        <li>
          <strong>Team:</strong> fixed member roles, invitations by a link you share, and seat limits per plan.
        </li>
      </ul>
      <p>
        What each plan includes is shown on our <Link href="/pricing">Pricing</Link> page. Each account gets one
        14-day Pro trial, shared by the businesses it adds while the trial runs; then they continue on Basic.
      </p>

      <h2>3. What Braventa doesn&apos;t do</h2>
      <ul>
        <li>
          It doesn&apos;t publish, post or send anything for you, and it doesn&apos;t change your website or any connected
          tool.
        </li>
        <li>
          It doesn&apos;t include a CRM, email sending, automation, reports on results over time or billing yet. Features
          marked Coming soon aren&apos;t part of the service until they&apos;re released.
        </li>
        <li>
          It doesn&apos;t guarantee results such as revenue, leads, rankings or traffic, and it has no influence over how
          search engines rank your website.
        </li>
        <li>It doesn&apos;t give legal, financial, tax or other professional advice.</li>
      </ul>

      <h2>4. What you can expect</h2>
      <ul>
        <li>
          Much of what Braventa produces is generated by AI and can be incomplete or wrong. Each finding shows its evidence
          and confidence, and nothing is used for your business until you confirm or approve it.
        </li>
        <li>
          An analysis runs in steps and usually finishes within minutes. Its speed depends on your website, Google and our
          AI providers.
        </li>
        <li>Each business can run up to 10 analyses or re-runs in any 24 hours.</li>
        <li>We may improve, change or replace features. We won&apos;t remove a core feature of a paid plan during a period you&apos;ve paid for.</li>
      </ul>

      <h2>5. Service levels for paid plans</h2>
      <p>
        This section applies to Basic, Pro and Premium once paid plans launch and you&apos;re paying for one. It
        doesn&apos;t apply during early access or the trial.
      </p>
      <h3>Uptime target</h3>
      <p>
        We aim for the Braventa app (app.braventa.io: signing in, viewing your reports and plans, and approving drafts) to
        be available at least <strong>99.5% of each calendar month</strong>.
      </p>
      <ul>
        <li>
          Monthly uptime is the minutes in the month, minus downtime, divided by the minutes in the month. Downtime is a
          period of at least 5 consecutive minutes in which our monitoring finds the app can&apos;t be reached or returns
          server errors for most requests.
        </li>
        <li>
          Downtime doesn&apos;t include: scheduled maintenance we announce at least 24 hours ahead (no more than 4 hours a
          month); urgent security fixes; problems with your own systems, devices or internet connection; tools you connect,
          such as Google Search Console or an AI assistant; delays in analyses caused by AI model providers; features in
          beta or marked Coming soon; suspension under the Terms of Service; and events described in section 14 of the
          Terms of Service, except outages of our hosting and database providers, which do count.
        </li>
      </ul>
      <h3>Service credits</h3>
      <div className="not-prose overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-2 pr-4 font-semibold">Monthly uptime</th>
              <th className="py-2 font-semibold">Credit (share of that month&apos;s fee)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border align-top">
              <td className="py-3 pr-4">99.0% to under 99.5%</td>
              <td className="py-3">5%</td>
            </tr>
            <tr className="border-t border-border align-top">
              <td className="py-3 pr-4">95.0% to under 99.0%</td>
              <td className="py-3">10%</td>
            </tr>
            <tr className="border-t border-border align-top">
              <td className="py-3 pr-4">Under 95.0%</td>
              <td className="py-3">25%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul>
        <li>
          To get a credit, ask us within 30 days after the end of the month, with the dates and times you were affected.
        </li>
        <li>
          Credits are applied to future fees for the same business. They have no cash value, can&apos;t be transferred,
          and are capped at 25% of the month&apos;s fee.
        </li>
        <li>
          <strong>Service credits are your only remedy for the app being unavailable.</strong>
        </li>
      </ul>

      <h2>6. Support</h2>
      <ul>
        <li>
          Contact us at hello@braventa.io or through our <Link href="/contact">contact form</Link>. We aim to reply within
          two business days.
        </li>
        <li>Report a suspected security issue at any time, and we&apos;ll look at it as soon as we can.</li>
      </ul>

      <h2>7. When something breaks</h2>
      <ul>
        <li>We investigate and work to restore the service as quickly as we reasonably can.</li>
        <li>
          If an incident significantly affects your business, we&apos;ll tell you what happened and what we&apos;re doing
          about it. If it affects personal data, we&apos;ll also follow our Data Processing Agreement and Privacy policy.
        </li>
        <li>
          If an analysis fails, you can re-run it in the app, within the limit in section 4, or ask us to look at it.
        </li>
        <li>
          If data is lost, we may restore it from our database provider&apos;s backups. Changes made since the last
          backup may be lost, so keep your own copies of anything important.
        </li>
        <li>
          Apart from service credits, Braventa&apos;s liability for anything that goes wrong is limited as set out in
          sections 11 to 13 of the <Link href="/legal/terms">Terms of Service</Link>: no liability for indirect losses,
          and total liability capped at the greater of the fees you paid in the six months before the event and US$100,
          except where the law doesn&apos;t allow those limits.
        </li>
      </ul>

      <h2>8. Apps and systems you connect</h2>
      <ul>
        <li>
          You decide whether to connect an app, account or AI assistant to Braventa. You&apos;re responsible for the
          account you connect, the permissions you grant, the security of your own systems and credentials, and the data
          in them.
        </li>
        <li>
          Today, connections are read-only (Google Search Console, Google Analytics 4, HubSpot) or send information into
          Braventa (your AI assistant).
          Braventa doesn&apos;t change data in any connected tool.
        </li>
        <li>
          If we add actions that change data in a connected tool, each one will run only after you approve it, and
          you&apos;ll be responsible for the actions you approve.
        </li>
        <li>
          <strong>
            To the extent the law allows, Braventa isn&apos;t liable for loss, corruption, disclosure or change of data, or
            damage to systems, in a connected app or in your own systems, including anything caused by the app&apos;s
            provider, your settings, or credentials you share.
          </strong>{" "}
          The only exception is harm directly caused by Braventa breaking this agreement, and then only within the limits
          in the Terms of Service.
        </li>
        <li>
          The provider of each connected app sets its own terms, and you agree to them, not us. You can disconnect at any
          time; what happens to stored data then is described in our <Link href="/legal/privacy">Privacy policy</Link>.
        </li>
      </ul>

      <h2>9. Your responsibilities</h2>
      <ul>
        <li>Give us accurate information, and only ask us to analyze websites you own or are authorized to act for.</li>
        <li>Keep passwords and access keys secure, and manage who is on your team and their roles.</li>
        <li>Review what Braventa produces before you rely on it, and make sure anything you publish follows the law.</li>
        <li>Keep your own copies of anything important.</li>
        <li>
          Don&apos;t enter sensitive information into Braventa, such as health information, payment card or bank account
          numbers, government ID numbers, or information about children.
        </li>
      </ul>

      <h2>10. Security</h2>
      <p>
        We protect your data as described in our <Link href="/legal/dpa">Data Processing Agreement</Link> (Annex 2) and
        on <Link href="/trust">Trust and data</Link>. Braventa doesn&apos;t hold security certifications such as SOC 2 or
        ISO 27001 yet.
      </p>

      <h2>11. Fees</h2>
      <ul>
        <li>
          We don&apos;t charge anything today. When paid plans launch, their prices will be on our{" "}
          <Link href="/pricing">Pricing</Link> page, and we&apos;ll ask you to agree before we charge you.
        </li>
        <li>
          Paid plans renew each month until you cancel. Prices don&apos;t include taxes. We&apos;ll give you at least 30
          days&apos; notice of a price change.
        </li>
        <li>
          Refunds follow our <Link href="/legal/refunds">Refund policy</Link>.
        </li>
      </ul>

      <h2>12. Term and ending</h2>
      <p>
        This MSA applies for as long as you use Braventa. Either of us can end it as described in section 10 of the Terms
        of Service. When it ends, we delete your data as described in our Data Processing Agreement and Privacy policy.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about this agreement? <Link href="/contact">Contact us</Link> or email hello@braventa.io.
      </p>
    </>
  );
}

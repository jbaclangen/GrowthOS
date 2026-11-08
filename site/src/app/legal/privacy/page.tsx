import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Braventa collects, why, who processes it and your rights. Draft pending legal review.",
};

// Facts only, matching the code and docs/architecture/SECURITY_AND_PRIVACY.md. Final text needs a lawyer (Q-032).
// Written to the GDPR / UK GDPR standard, with the Australian Privacy Principles, PIPEDA and US state rules (CalOPPA)
// in mind: docs/research/LEGAL_AND_PRIVACY_REVIEW_2026-11-08.md §2 maps each section to the law and lists the gaps.
// Operator per D-056: Braventa LLC (pending registration).
export default function Privacy() {
  return (
    <>
      <h1 className="text-4xl">Privacy</h1>
      <DraftNotice>
        This is a draft of our privacy policy. It describes how Braventa handles data today and is being reviewed with
        legal counsel before Braventa opens to the public. Last updated November 8, 2026.
      </DraftNotice>

      <h2>Who we are</h2>
      <p>
        Braventa is operated by Braventa LLC [pending registration] (&quot;Braventa&quot;, &quot;we&quot;,
        &quot;us&quot;). We decide how and why the personal data described here is used, so under laws such as the GDPR
        and UK GDPR we are its controller. Our privacy officer is Braventa&apos;s founder. To reach us about privacy,
        email hello@braventa.io or use our <Link href="/contact">contact form</Link>.
      </p>
      <p>
        This policy covers braventa.io and app.braventa.io. Braventa is a service for businesses: it applies to the
        people who use Braventa for a business and to anyone who contacts us.
      </p>

      <h2>What we collect</h2>
      <h3>On this website (braventa.io)</h3>
      <ul>
        <li>What you send through the contact form: name, email, business name, website and message, and whether you asked for product updates. It is stored in our database and in our CRM (HubSpot) so we can reply.</li>
        <li>A one-way, salted code derived from your IP address, used only to limit how often the form can be sent. We don&apos;t store the IP address itself.</li>
        <li>This site sets no cookies and uses no analytics or advertising trackers.</li>
      </ul>
      <h3>In the app (app.braventa.io)</h3>
      <ul>
        <li>Your account: your email address and password. The password is held only as a secure hash by our authentication provider (Supabase); no one at Braventa can see it.</li>
        <li>
          Your team: the email address and role of each person invited to your business, and a record of who invited,
          joined, changed roles or was removed, and when. Everyone in a business can see the email addresses of its
          members.
        </li>
        <li>
          The website you ask us to analyze: text from up to 25 of its public pages and its Google PageSpeed scores. That
          text can include personal information about other people, such as staff names or contact details shown on the
          site.
        </li>
        <li>What you tell us during setup: goals, service area, tools, the problems you pick or describe, and your answers to follow-up questions.</li>
        <li>What Braventa produces for you: business profile, diagnosis, growth plan, content plan and drafts, and your approvals.</li>
        <li>A log of AI usage (which task, which model, tokens and cost) so we can enforce usage limits.</li>
        <li>If you connect an AI assistant: your access keys, stored only as a one-way hash, when each was last used, and a record of which actions it ran.</li>
        <li>
          A record of each time you agree to our terms or give a confirmation they require, such as that you may act for
          the website you analyze or that you&apos;re responsible for a tool you connect: what you agreed to, the version
          and when.
        </li>
        <li>
          If you use the in-app assistant (Ask Braventa): a record that you asked a question and when, to apply its daily
          limit. We don&apos;t store your questions or the answers. Each question is sent, with a short summary of your
          account and latest report, to our AI providers to write the answer.
        </li>
      </ul>
      <h3>If you connect an AI assistant (optional)</h3>
      <ul>
        <li>
          You can let an AI assistant you already use fill in your Braventa setup for you. Today this works with Claude
          Desktop and Claude Code. You create a personal access key in the app (Settings → AI assistant access) and add
          Braventa&apos;s connection to your assistant.
        </li>
        <li>
          Each key is shown once and stored only as a one-way hash, never the key itself. The app shows when each key was
          last used, and you can revoke a key at any time.
        </li>
        <li>
          What your assistant sends — your website, goal, service area and tools, the problems you pick or describe, your
          priorities and your answers to follow-up questions — is stored the same way as answers you type into the app.
        </li>
        <li>
          When your assistant checks progress, Braventa sends back a short summary: your growth score, your top priorities
          and a link to your report. That summary is then processed by your assistant&apos;s provider (for example,
          Anthropic) under your own account and that provider&apos;s terms. For this, the provider acts for you; it
          isn&apos;t one of Braventa&apos;s sub-processors.
        </li>
        <li>
          An assistant can&apos;t publish anything. You still confirm or correct the diagnosis and approve posts in the
          app.
        </li>
      </ul>
      <h3>If you connect Google Search Console (optional)</h3>
      <ul>
        <li>
          On the Pro and Premium plans and during the 14-day Pro trial, the owner of a business can connect its Google
          Search Console account, in Settings → Connections or during setup. Only the owner can connect or disconnect it.
        </li>
        <li>
          Braventa asks Google for read-only access to your Search Console data and for the email address of the Google
          account you connect, to show which account it is. Braventa can&apos;t change anything in Search Console or in
          your Google account.
        </li>
        <li>
          What we store: the email address of the connected Google account; the token Google issues so Braventa can read
          your data, stored encrypted; the list of Search Console properties that account can see and the one you chose; and a
          copy of your search data each time it&apos;s fetched. Each copy holds clicks, impressions, click-through rate and
          average position for the last 28 days and the 28 days before; your top 25 search queries and top 25 pages;
          the same figures by device; your sitemaps and the errors and warnings Google reports for them; and Google&apos;s indexing
          report for your home page (URL Inspection). We keep the 12 most recent copies.
        </li>
        <li>
          Braventa fetches new data only when the owner connects or chooses a property, or when someone in your business
          refreshes it, at most once every 10 minutes. Nothing is fetched in the background.
        </li>
        <li>
          People in your business on Braventa can see this data on the Search performance page and which Google account
          is connected.
        </li>
        <li>
          We use it to show your search performance in the app, and in your diagnosis, growth plan and growth score
          (Search visibility). For the diagnosis, a summary of the latest copy is sent to our AI providers: the property
          name, totals for the last 28 days against the 28 before, your top 10 search queries and pages, clicks and
          impressions by device, sitemap status, and whether your home page is indexed. The summary never includes the
          token or your Google account email, and our AI providers keep nothing after answering.
        </li>
        <li>
          The in-app assistant (Ask Braventa) is told whether Search Console is connected, which property, and your
          Search visibility score. It isn&apos;t sent the search data itself, though your diagnosis, which it does see,
          may mention it.
        </li>
        <li>
          We don&apos;t sell this data, use it for advertising, or share it with anyone other than the providers that run
          Braventa for us. Braventa&apos;s use and transfer of information received from Google APIs follows the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </li>
        <li>
          Braventa staff don&apos;t read your Search Console data unless you ask us to (for example, for support), or when
          it&apos;s needed for security or to comply with the law.
        </li>
        <li>
          After the trial, on Basic, the connection is paused: data already fetched is kept and shown, but nothing new is
          fetched and it isn&apos;t used in new analyses until the business moves to Pro or Premium.
        </li>
        <li>
          The owner can disconnect in Settings → Connections at any time. Braventa then revokes its access at Google and
          deletes the token, the Google account email and all stored search data. Connecting a different Google account
          also deletes the data fetched with the old one. You can remove Braventa&apos;s access in your{" "}
          <a href="https://myaccount.google.com/connections">Google Account</a> too; Braventa then can&apos;t fetch new
          data, and data already fetched stays until the owner disconnects in Braventa.
        </li>
      </ul>
      <h3>If you connect HubSpot (optional)</h3>
      <ul>
        <li>
          On the Pro and Premium plans and during the 14-day Pro trial, the owner of a business can connect its HubSpot
          portal, in Settings → Connections or during setup, by installing Braventa&apos;s app there. Only the owner can
          connect or disconnect it.
        </li>
        <li>
          Braventa asks HubSpot for read-only access to contacts, companies and deals. It can&apos;t create, change or
          delete anything in HubSpot.
        </li>
        <li>
          Braventa reads those records to count them, but it doesn&apos;t keep them. What we store: the token HubSpot
          issues, encrypted; your portal&apos;s ID and domain; and, each time counts are fetched, a copy of the counts and
          totals: contacts in total, by lifecycle stage and without an owner; new contacts in the last 28 days and the 28
          before, by original source, and how many have no logged sales activity; the number of companies; and open, won
          and lost deals with their total amounts, stale open deals and your win rate, by pipeline stage. The copy holds
          the names of your own lifecycle stages, sources and pipeline stages, but no names, email addresses, phone
          numbers, deal names or record IDs. We keep the 12 most recent copies.
        </li>
        <li>
          Braventa fetches new counts only when the owner connects or when someone in your business refreshes them, at
          most once every 10 minutes. Nothing is fetched in the background.
        </li>
        <li>
          People in your business on Braventa can see the counts and which portal is connected. Today the counts are
          shown only in the app: they aren&apos;t sent to our AI providers or the in-app assistant, and they aren&apos;t
          used in your diagnosis or growth score.
        </li>
        <li>
          We don&apos;t sell this data, use it for advertising, or share it with anyone other than the providers that run
          Braventa for us. Braventa staff don&apos;t look at it unless you ask us to (for example, for support), or when
          it&apos;s needed for security or to comply with the law.
        </li>
        <li>
          After the trial, on Basic, the connection is paused: counts already fetched are kept and shown, but nothing new
          is fetched until the business moves to Pro or Premium.
        </li>
        <li>
          The owner can disconnect in Settings → Connections at any time. Braventa then uninstalls its app from your
          portal (HubSpot emails your portal&apos;s admins), revokes its token and deletes the stored counts and portal
          details. Connecting a different portal also deletes the counts from the old one. If you uninstall the app in
          HubSpot instead, Braventa can&apos;t fetch new counts; the ones already fetched stay until the owner disconnects
          in Braventa.
        </li>
      </ul>

      <h2>How we use it, and our legal bases</h2>
      <p>
        Laws such as the GDPR and UK GDPR require a legal basis for each use of personal data. Ours are:
      </p>
      <ul>
        <li>
          <strong>To provide the service you ask for</strong> (your account, the analysis, plans and drafts, your team and
          the tools you connect): to perform our contract with you or your business.
        </li>
        <li>
          <strong>To reply to messages you send us</strong>: our legitimate interest in answering inquiries, or steps you
          asked for before a contract.
        </li>
        <li>
          <strong>To send occasional product updates</strong>, only if you opted in: your consent, which you can withdraw
          at any time with the unsubscribe link in each email.
        </li>
        <li>
          <strong>To keep the service secure and within its usage limits</strong>, including rate limits and records of
          team changes and assistant actions: our legitimate interest in protecting the service and the businesses that
          use it.
        </li>
        <li>
          <strong>To comply with the law and enforce our terms</strong>: legal obligations, and our legitimate interest in
          defending our rights.
        </li>
      </ul>
      <p>
        We don&apos;t sell personal information, we don&apos;t share it for cross-context behavioral advertising, and we
        don&apos;t use it for advertising.
      </p>
      <p>
        We don&apos;t use personal information to make automated decisions that have legal or similarly significant
        effects on people. Braventa&apos;s AI assesses businesses and their websites, and a person reviews and approves
        what it produces.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li>
          The providers that run Braventa for us, under contracts that limit what they may do with it; see{" "}
          <Link href="/legal/subprocessors">Sub-processors</Link>. Text sent to AI models is limited to what a task needs;
          see <Link href="/trust/ai">How Braventa uses AI</Link>.
        </li>
        <li>The other members of your business on Braventa, as described above.</li>
        <li>Tools you choose to connect, which act for you under their own terms.</li>
        <li>Authorities or others when the law requires it, or when needed to protect people&apos;s safety or our rights.</li>
        <li>A buyer or successor if Braventa is reorganized, merged or sold. We&apos;ll tell you before your data becomes subject to a different privacy policy.</li>
      </ul>

      <h2>Where your data is processed</h2>
      <p>
        Braventa&apos;s team works from the Philippines, and our providers store and process data in the United States
        and other countries (see <Link href="/legal/subprocessors">Sub-processors</Link>). Your personal data may
        therefore be processed outside your own country, including outside Canada, the United Kingdom, the European Union
        and Australia, where privacy laws may differ. Where the law requires it, we rely on the safeguards in our
        providers&apos; data processing terms, such as the EU Standard Contractual Clauses and the UK addendum to them.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          Account and business data, including analyses, drafts, team records and usage logs: while your account is
          active. When you ask us to delete your account or business, we delete it, except anything the law requires us
          to keep.
        </li>
        <li>Google Search Console data: the 12 most recent copies, deleted when the owner disconnects.</li>
        <li>HubSpot counts: the 12 most recent copies, deleted when the owner disconnects.</li>
        <li>
          Contact form messages: until you ask us to delete them. We&apos;re setting a fixed retention period and will
          update this page when we do.
        </li>
        <li>Expired sign-in codes and tokens for connected assistants: deleted automatically, after a day.</li>
        <li>
          Backups: deleted data can remain in our database provider&apos;s backups for a limited period before
          they&apos;re overwritten.
        </li>
      </ul>

      <h2>How we protect it</h2>
      <p>
        All traffic to braventa.io and app.braventa.io is encrypted (HTTPS). Google tokens are encrypted, and access keys
        are stored only as one-way hashes. Database rules keep each business&apos;s data separate, and access to our
        systems is limited to the people who need it. No system is perfectly secure: if a breach affects your personal
        data, we&apos;ll tell you, and the authorities, as the law requires.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access your personal data, correct it, delete it, receive
        a copy in a portable format, object to or restrict how we use it, and withdraw consent you gave. Wherever you
        live, you can ask us to do any of these: email hello@braventa.io or use our{" "}
        <Link href="/contact">contact form</Link>. We may need to confirm your identity first. We&apos;ll respond within
        30 days, and we won&apos;t treat you differently for using your rights. We&apos;re building a self-service option
        for copies and deletion.
      </p>
      <p>
        If you have a complaint, contact us first: we&apos;ll acknowledge it within 7 days and aim to resolve it within 30
        days. You can also complain to a data protection authority: in the UK, the{" "}
        <a href="https://ico.org.uk/make-a-complaint/">Information Commissioner&apos;s Office</a>; in Australia, the{" "}
        <a href="https://www.oaic.gov.au/privacy/privacy-complaints">Office of the Australian Information Commissioner</a>;
        in Canada, the <a href="https://www.priv.gc.ca/en/report-a-concern/">Office of the Privacy Commissioner</a>; in the
        European Union, the authority where you live or work; in the United States, your state&apos;s attorney general.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can correct your setup answers in the app at any time.</li>
        <li>You choose whether to connect an AI assistant, and you can revoke its access key in the app at any time.</li>
        <li>
          The owner chooses whether to connect Google Search Console and can disconnect it at any time, which deletes
          the stored search data.
        </li>
        <li>
          The owner chooses whether to connect HubSpot and can disconnect it at any time, which deletes the stored
          counts.
        </li>
        <li>You can unsubscribe from product updates at any time.</li>
      </ul>

      <h2>Cookies and Do Not Track</h2>
      <p>
        braventa.io sets no cookies. The app uses only strictly necessary cookies; see{" "}
        <Link href="/legal/cookies">Cookies</Link>. Neither tracks you across other websites, and no third party tracks
        you on them, so they work the same whether or not your browser sends a Do Not Track or Global Privacy Control
        signal.
      </p>

      <h2>Children</h2>
      <p>
        Braventa is for businesses and isn&apos;t directed to children. Everyone who uses it must be 18 or older. We
        don&apos;t knowingly collect personal information from children; if you think we have, contact us and we&apos;ll
        delete it.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We&apos;ll post changes here and update the date at the top. If a change is significant, we&apos;ll tell you in
        the app or by email before it takes effect, and where the law requires it, for example before a new use of data
        we receive from Google, we&apos;ll ask for your consent.
      </p>
    </>
  );
}

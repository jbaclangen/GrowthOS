import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Braventa collects, why, and who processes it. Draft pending legal review.",
};

// Facts only, matching the code and docs/architecture/SECURITY_AND_PRIVACY.md. Final text needs a lawyer (Q-032).
export default function Privacy() {
  return (
    <>
      <h1 className="text-4xl">Privacy</h1>
      <DraftNotice>
        This is a plain-language summary of how Braventa handles data today. Our full Privacy Policy is being prepared
        with legal counsel and will replace this page before Braventa opens to the public.
      </DraftNotice>

      <h2>What we collect</h2>
      <h3>On this website (braventa.io)</h3>
      <ul>
        <li>What you send through the contact form: name, email, business name, website and message, and whether you asked for product updates. It is stored in our database and in our CRM (HubSpot) so we can reply.</li>
        <li>A one-way, salted code derived from your IP address, used only to limit how often the form can be sent. We don&apos;t store the IP address itself.</li>
        <li>This site sets no cookies and uses no analytics or advertising trackers.</li>
      </ul>
      <h3>In the app (app.braventa.io)</h3>
      <ul>
        <li>Your account: email address and a password (held by our authentication provider; we never store it ourselves).</li>
        <li>The website you ask us to analyze: text from its public pages and its Google PageSpeed scores.</li>
        <li>What you tell us during setup: goals, service area, tools, the problems you pick or describe, and your answers to follow-up questions.</li>
        <li>What Braventa produces for you: business profile, diagnosis, growth plan, content plan and drafts, and your approvals.</li>
        <li>A log of AI usage (which task, which model, tokens and cost) so we can enforce usage limits.</li>
        <li>If you connect an AI assistant: your access keys, stored only as a one-way hash, and when each was last used.</li>
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

      <h2>Why we use it</h2>
      <ul>
        <li>To provide the analysis, plan and drafts you ask for.</li>
        <li>To reply to your messages and, only if you opted in, to send occasional product updates.</li>
        <li>To keep the service secure and within its usage limits.</li>
      </ul>
      <p>We don&apos;t sell your data, and we don&apos;t use it for advertising.</p>

      <h2>Who processes it</h2>
      <p>
        A small number of providers process data for us; see <Link href="/legal/subprocessors">Sub-processors</Link>.
        Text sent to AI models is limited to what a task needs; see <Link href="/trust/ai">How Braventa uses AI</Link>.
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
          To get a copy of your data or have it deleted, <Link href="/contact">contact us</Link>. We&apos;re building a
          self-service option.
        </li>
      </ul>
    </>
  );
}

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
          To get a copy of your data or have it deleted, <Link href="/contact">contact us</Link>. We&apos;re building a
          self-service option.
        </li>
      </ul>
    </>
  );
}

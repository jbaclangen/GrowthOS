import type { Metadata } from "next";
import { Band, CtaRow, PageHero, SectionIntro, StatusBadge, type Status } from "@/components/ui";
import { SEATS, TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Product",
  description:
    "Your website, your answers and your connected tools in one system: business profile, growth score, diagnosis, one growth plan, content and drafts, team access and help.",
};

// Module names: D-010. Status must match docs/product/MVP_SCOPE.md, web/src/lib/plans/tiers.ts and
// web/src/lib/modules/registry.ts. notYet names the gaps of a Live or Limited module, so a label never claims more
// than the code does.
const MODULES: { name: string; status: Status; summary: string; today: string[]; notYet?: string; why: string }[] = [
  {
    name: "Business Intelligence",
    status: "live",
    summary: "A profile of your business, built from your website and your answers.",
    today: [
      "Reads up to 25 public pages of your website",
      "Your services, customers, locations, brand voice, strengths, gaps and likely competitors",
      "Guided discovery: pick common problems or describe them in your own words, choose your top three, and answer a few follow-up questions chosen for your answers",
    ],
    why: "Everything Braventa recommends or drafts starts from this profile, so it's about your business, not a template.",
  },
  {
    name: "Marketing Strategy",
    status: "live",
    summary: "A growth score, a diagnosis you confirm, and one prioritized growth plan.",
    today: [
      "A growth score from 0 to 100, with the parts it's based on named in your report",
      "Findings marked Verified, From you, or Inferred, with how sure Braventa is",
      "Mark any finding wrong, say what's true, and the diagnosis and plan are rebuilt",
      "One plan: your priorities first, each action with a first step and a way to measure it",
      "Accept, dismiss or mark each action done",
    ],
    why: "A short, ranked answer to “what should we work on?” — and you decide what's right.",
  },
  {
    name: "Content Studio",
    status: "live",
    summary: "A 30-day content plan and drafted posts in your brand voice.",
    today: ["Goal, audience, content pillars and channels for the next 30 days", "Five drafted posts with image ideas", "Approve or reject each draft"],
    notYet: "The rest of the 30-day plan stays as topics, and drafts can't be edited or published from Braventa yet.",
    why: "From plan to usable work in one sitting, without starting from a blank page.",
  },
  {
    name: "Website Intelligence",
    status: "partial",
    summary: "Speed, SEO basics and conversion gaps from your own site.",
    today: [
      "A technical check of up to 25 public pages, respecting your robots.txt",
      "Google PageSpeed mobile and desktop scores",
      "Signals such as contact forms, phone numbers, meta descriptions and image alt text",
    ],
    notYet: "No search or traffic data unless you connect Google on Pro.",
    why: "Your website is often your first salesperson. Fix what's costing you inquiries first.",
  },
  {
    name: "Analytics",
    status: "partial",
    summary: "Your real search and website numbers, in your diagnosis and score.",
    today: [
      "On Pro: Google Search Console clicks, impressions, top searches and pages, shown in Braventa and counted in your score",
      "On Pro: Google Analytics 4 visits, engagement, key events, traffic channels and landing pages, used in your diagnosis and score",
      "Both through one Google sign-in, read-only",
    ],
    notYet: "Reports on what your actions achieved over time are coming soon.",
    why: "Your plan starts from what's really happening on your website, not only from what can be seen from outside.",
  },
  {
    name: "CRM Intelligence",
    status: "partial",
    summary: "Your HubSpot pipeline at a glance.",
    today: [
      "On Pro: connect HubSpot, read-only",
      "Contacts by lifecycle stage, new contacts, and open, won and lost deals, shown as counts in Settings",
      "Braventa stores counts and totals, not names or email addresses",
    ],
    notYet: "Your HubSpot numbers aren't used in the diagnosis or the growth score yet.",
    why: "Braventa is designed to make your CRM more useful, not replace it.",
  },
  {
    name: "Automation",
    status: "next",
    summary: "Agents and workflows that carry approved work into your tools.",
    today: [],
    why: "Each change will need your approval first, with a log of what ran. You'll decide what runs.",
  },
];

// Mirrors TOOLS in web/src/lib/integrations/tool-catalog.ts and FEATURES in web/src/lib/plans/tiers.ts.
const TOOLS: { name: string; status: Status; body: string }[] = [
  { name: "Google Search Console", status: "live", body: "How people find you on Google Search. Pro, read-only." },
  { name: "Google Analytics 4", status: "live", body: "Which visits turn into inquiries. Pro, read-only, same Google sign-in." },
  { name: "HubSpot", status: "live", body: "Contacts and deals as counts. Pro, read-only." },
  { name: "Google Business Profile", status: "next", body: "How your listing does in Search and Maps." },
  { name: "Facebook, Instagram and LinkedIn", status: "next", body: "Your social accounts." },
  { name: "Canva and HeyGen", status: "next", body: "Creative tools for your drafts." },
];

const TEAM = [
  {
    title: "Invite by link",
    body: "Pick a role, copy the invite link and send it however you like. Links expire after 7 days.",
  },
  {
    title: "Fixed roles",
    body: "Invite an admin, marketing manager, social media manager, copywriter, content creator or analyst. Each role has fixed permissions, and you can change or remove people below your own role. A client approver role is coming soon.",
  },
  {
    title: "A second pair of eyes",
    body: "No one approves their own draft except the owner. Only the owner connects tools or removes the business.",
  },
  {
    title: "Seats per plan",
    body: `Basic: ${SEATS.basic}. Pro: ${SEATS.pro}. Premium: ${SEATS.premium}.`,
  },
];

const HELP = [
  {
    title: "Ask Braventa",
    body: "Ask how something works or what your report means, from the bar at the top of the app. It answers from your latest report; it can't change anything, and its answers can be wrong.",
  },
  {
    title: "Work from Claude",
    body: "If you use Claude Desktop or Claude Code, it can fill in your setup and discovery with a personal access key. You still confirm the diagnosis and approve posts in Braventa. Connectors for claude.ai and ChatGPT are coming soon.",
  },
  {
    title: "Clear agreements",
    body: "When you sign up, start an analysis, connect a tool or create an access key, Braventa shows what you're agreeing to and keeps a record.",
  },
  {
    title: "Several businesses, one account",
    body: "Own up to 2 businesses on Basic, 4 on Pro and 8 on Premium, and switch between them from the app header. Removing one frees its place. Need more? Talk to us about a custom plan.",
  },
  {
    title: "Remove a business",
    body: "The owner can remove a business from Settings by typing DELETE APPROVED. Its data is deleted at once and can't be recovered, and Braventa's access to Google and HubSpot is revoked.",
  },
];

export default function Product() {
  return (
    <>
      <PageHero eyebrow="Product" title="Everything your growth needs, in one system.">
        Braventa reads your website, hears what&apos;s hard, and pulls in the tools you connect. Every part works from the
        same picture of your business, so your diagnosis, your plan and your drafts all agree.
      </PageHero>

      <Band labelledBy="modules-title">
        <SectionIntro head="Modules" title="Seven modules. One picture of your business." id="modules-title">
          Live modules work today. Limited ones work with the gaps we name. The rest are labelled Coming soon.
        </SectionIntro>
        <div className="mt-12 space-y-6">
          {MODULES.map((m) => (
            <article key={m.name} className="card grid gap-6 md:grid-cols-[1fr_1.2fr]" aria-labelledby={`m-${m.name}`}>
              <div>
                <StatusBadge status={m.status} />
                <h2 id={`m-${m.name}`} className="mt-3 text-2xl">
                  {m.name}
                </h2>
                <p className="mt-2 text-muted">{m.summary}</p>
              </div>
              <div>
                {m.today.length > 0 ? (
                  <>
                    <p className="eyebrow">What it does today</p>
                    <ul className="mt-3 space-y-2">
                      {m.today.map((t) => (
                        <li key={t} className="flex gap-3 text-sm">
                          <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="eyebrow">Planned</p>
                )}
                {m.notYet && (
                  <p className="mt-3 text-sm text-muted">
                    <span className="font-semibold text-foreground">Not yet: </span>
                    {m.notYet}
                  </p>
                )}
                <p className="mt-4 text-sm text-muted">
                  <span className="font-semibold text-foreground">Why it matters: </span>
                  {m.why}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Band>

      <Band tone="surface" labelledBy="tools-title">
        <SectionIntro head="Connected tools" title="Your tools feed the same plan." id="tools-title">
          Connect them in Settings or during setup. One Google sign-in covers Search Console and Analytics, and you can
          untick either. Braventa only reads; it can&apos;t change anything in your tools. Disconnecting deletes the data
          Braventa kept from that tool.
        </SectionIntro>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <li key={t.name} className={`card ${t.status === "next" ? "" : "bg-background"}`}>
              <StatusBadge status={t.status} />
              <h3 className="mt-3 text-lg">{t.name}</h3>
              <p className="mt-2 text-sm text-muted">{t.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">
          Connected tools are on Pro and the 14-day trial. On Basic, a connection pauses and its data is kept.
        </p>
      </Band>

      <Band labelledBy="team-title">
        <SectionIntro head="Your team" title="Everyone works from the same plan." id="team-title">
          Bring in the people who help you grow, with access that fits their job.
        </SectionIntro>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((t) => (
            <li key={t.title} className="card">
              <h3 className="text-lg">{t.title}</h3>
              <p className="mt-2 text-sm text-muted">{t.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">
          Invitations aren&apos;t emailed yet, and extra seats can&apos;t be bought online yet.
        </p>
      </Band>

      <Band tone="surface" labelledBy="help-title">
        <SectionIntro head="Help and control" title="Answers when you need them. Control when it matters." id="help-title" />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {HELP.map((h) => (
            <li key={h.title} className="card bg-background">
              <StatusBadge status="live" />
              <h3 className="mt-3 text-lg">{h.title}</h3>
              <p className="mt-2 text-sm text-muted">{h.body}</p>
            </li>
          ))}
        </ul>
      </Band>

      <Band tone="ink" labelledBy="cta-title">
        <SectionIntro head="Early access" title={TAGLINE} id="cta-title" invert>
          Start with your website. Add your team and your tools when you&apos;re ready.
        </SectionIntro>
        <div className="mt-8">
          <CtaRow secondary={{ label: "See how it works", href: "/how-it-works" }} />
        </div>
      </Band>
    </>
  );
}

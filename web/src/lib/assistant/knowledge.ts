import { FEATURES, TIERS, TRIAL_DAYS, type Tier } from "@/lib/plans/tiers";
import { PROVENANCE_LABEL } from "@/lib/plan/priority";
import { VIEWS } from "@/app/analysis/[id]/views";
import { TOOLS } from "@/lib/integrations/tool-catalog";
import { ASSISTANT_LIMITS } from "./access";

// The in-app assistant's help knowledge base ("Ask Braventa", D-043). THIS FILE IS THE SOURCE: docs/help/APP_GUIDE.md
// is generated from it (`npm run help:doc`), and a unit test fails when the two differ or when a page route under
// web/src/app is missing from APP_ROUTES. Parts come straight from code (FEATURES, VIEWS, provenance labels) so they
// can't drift. Keep every sentence true of the current code: never describe a planned feature as live.
// Links are relative app routes; the assistant repeats them as markdown links.

export const KNOWLEDGE_VERSION = "2026-10-18";

// The tools on "Connect your tools" that can't be connected yet, from the same catalog the page uses.
const COMING_SOON_TOOLS = TOOLS.filter((t) => t.status === "coming_soon").map((t) => t.name);
const comingSoonToolList = `${COMING_SOON_TOOLS.slice(0, -1).join(", ")} and ${COMING_SOON_TOOLS.at(-1)}`;

export type RouteEntry = {
  // The filesystem route (folders under web/src/app that contain a page.tsx), e.g. "/analysis/[id]".
  route: string;
  title: string;
  purpose: string;
  howToGetThere: string;
};

export const APP_ROUTES: RouteEntry[] = [
  {
    route: "/",
    title: "Home",
    purpose: "Sends you to your dashboard when you're signed in, or to sign in when you're not.",
    howToGetThere: "Open app.braventa.io.",
  },
  {
    route: "/login",
    title: "Sign in",
    purpose:
      "Sign in with your email and password, or create an account. New accounts get a confirmation email first. When an AI app sent you here to connect to Braventa, you go on to its approval screen after signing in.",
    howToGetThere: "Open app.braventa.io when you're signed out, or select Sign out in the header.",
  },
  {
    route: "/dashboard",
    title: "Dashboard",
    purpose:
      "Your businesses. The most recently analyzed one opens as a one-screen summary (infographic) of its latest report; every business has a tile with its growth score and status (Analyzing, Waiting for your answers, Last analysis failed, or the date it was analyzed). Start a new analysis with Analyze a website.",
    howToGetThere: "Select the Braventa logo in the header.",
  },
  {
    route: "/onboarding",
    title: "Analyze your business (step 1 of 5)",
    purpose:
      "Enter a website address and, optionally, the business name, your main goal for the next few months, where you serve customers and the tools you already use. Braventa starts reading the website and opens discovery.",
    howToGetThere: "Select Analyze a website on the dashboard.",
  },
  {
    route: "/onboarding/[sessionId]",
    title: "Discovery (step 2 of 5)",
    purpose:
      "Pick what's making it hardest for the business to grow right now from a list of common problems, and describe it in your own words if you like. The website analysis keeps running in the background.",
    howToGetThere: "Comes right after step 1. To resume an unfinished setup, open the business from the dashboard and select the continue button.",
  },
  {
    route: "/onboarding/[sessionId]/review",
    title: "Confirm your priorities (step 3 of 5)",
    purpose: "Check the problems Braventa understood, keep the ones that apply and put your top three in order.",
    howToGetThere: "Comes after discovery.",
  },
  {
    route: "/onboarding/[sessionId]/connect",
    title: "Connect your tools (step 4 of 5)",
    purpose: `Optional. Today only Google Search Console can be connected here, as in Settings: it's a Pro feature included in the Pro trial, and only the business owner can connect it. On Basic it shows as paused. Its data appears on Search performance; it isn't used in your diagnosis yet. Other tools are marked Coming soon, with nothing to connect yet: ${comingSoonToolList}. Tools that fit your answers are marked Suggested, with the reason. Select **Continue** to go on, whether or not you connected anything, or **Change your priorities** to go back.`,
    howToGetThere:
      "Comes after confirming your priorities. To resume an unfinished setup, open the business from the dashboard and select the continue button. An AI assistant connected to Braventa skips this step: only the owner can connect tools, in Braventa.",
  },
  {
    route: "/onboarding/[sessionId]/questions",
    title: "A few more questions (step 5 of 5)",
    purpose:
      "Up to four short follow-up questions about your top priorities, such as how soon something needs attention. You can skip any of them. When you finish, Braventa builds your plan.",
    howToGetThere: "Comes after Connect your tools.",
  },
  {
    route: "/analysis/[id]",
    title: "Report (growth assessment)",
    purpose:
      "The full report for one business: Do this first, the growth score, the diagnosis to confirm or correct, the growth plan, technical checks, your answers, the business profile, the 30-day content plan and the drafted posts. Each tile opens its section; Re-run analysis starts a fresh analysis.",
    howToGetThere: "Select a business on the dashboard, or Open full report under the latest report.",
  },
  {
    route: "/plans",
    title: "Plans",
    purpose:
      "Compares Basic, Pro and Premium with each feature marked Live or Coming soon, shows your current plan or trial, and has Talk to us buttons to ask the Braventa team about a plan.",
    howToGetThere: "Select the plan chip in the header (for example Pro trial · 9 days left).",
  },
  {
    route: "/search",
    title: "Search performance",
    purpose:
      "Read-only Google Search Console data for your website: clicks, impressions, top search queries and pages, and Google's indexing verdicts. Empty until Search Console is connected (in Settings or on the Connect your tools setup step).",
    howToGetThere: "Settings → Connections → Google Search Console, once connected.",
  },
  {
    route: "/settings",
    title: "Settings",
    purpose:
      "Integrations: connect Claude or ChatGPT to Braventa (step-by-step setup with the server URL, or a personal access key instead), Connected apps (see and disconnect apps approved with Sign in with Braventa), Service keys for automation tools (owners only) and Google Search Console, followed by the tools that are coming soon.",
    howToGetThere:
      "Select Settings in the header. Direct sections: /settings#ai-assistant, /settings#connected-apps, /settings#service-keys and /settings#connections.",
  },
  {
    route: "/oauth/authorize",
    title: "Connect an app (Sign in with Braventa)",
    purpose:
      "The approval screen an AI app (claude.ai, Claude Desktop, Claude Code or ChatGPT) opens when you connect it to Braventa. It shows the app's name, where you go back to after approving, and what the app can and can't do. Choose the business, then select Approve, or Cancel.",
    howToGetThere:
      "Your AI app opens it when you connect Braventa; you don't open it yourself. Start from the setup steps in Settings → Integrations.",
  },
];

export type Section = { id: string; title: string; body: string };

const TIER_ORDER: Tier[] = ["basic", "pro", "premium"];

function featuresSection(): string {
  const lines: string[] = [];
  for (const tier of TIER_ORDER) {
    lines.push(`**${TIERS[tier].label}** — ${TIERS[tier].summary}`);
    for (const f of FEATURES.filter((x) => x.minTier === tier)) {
      lines.push(`- ${f.label} (${f.status === "live" ? "Live" : "Coming soon"}): ${f.detail}`);
    }
    lines.push("");
  }
  lines.push(
    "Not available today on any plan: CRM connections, publishing or scheduling posts, sending email, automations, analytics reports from GA4, billing in the app, team invitations, editing or regenerating drafts, editing the business profile Braventa wrote from your website (services, customers, strengths, gaps and brand voice) or the business name, password reset in the app, and a REST API (automation tools can use Braventa's MCP server with a service key instead). Your main goal, service area and tools can be changed: see What you told us in the report.",
  );
  return lines.join("\n");
}

function reportSection(): string {
  const views = Object.entries(VIEWS)
    .map(([key, title]) => `- ${title} (\`?view=${key}\`)`)
    .join("\n");
  const provenance = Object.values(PROVENANCE_LABEL).join(", ");
  return `The report page for a business (open it from the dashboard) starts with **Do this first**: the top open item in your growth plan with its first step, how many drafts are waiting for your approval, and one button for the next step. Until the diagnosis is confirmed, that button is **Check the diagnosis and confirm your plan**. After that, it's **Review … drafts waiting for your approval** while drafts are waiting, then **Start on:** followed by the top open plan item. Below it, tiles open these sections:
${views}

Top 5 opportunities only appears on older reports from before the single growth plan.

**Growth score (0–100).** A weighted blend: content clarity 25%, conversion readiness 25% and online presence 15% are Braventa's AI assessment of your website; Google PageSpeed (mobile) performance 15%, SEO 12%, accessibility 4% and best practices 4% are measured. When PageSpeed doesn't respond, the score uses the assessed parts only. The score is built from feature modules: the assessed parts belong to Conversion and messaging and the PageSpeed parts to Website and technical SEO, and the score tile says which modules it is based on (two, or one when PageSpeed didn't respond). The score ring is colored by range (70 and above, 45–69, below 45), and the number is always shown.It's a guide to where to focus, not a Google ranking or a guarantee of results; the assessed parts are judgments, and a Lighthouse SEO score isn't a ranking score.

**Diagnosis ("What's holding the business back").** Up to six findings, each labeled by where it comes from: ${provenance}. Verified means it cites a measured check (technical checks T1, T2…, PageSpeed); From you means you said it; Inferred means it's Braventa's AI assessment and worth confirming. For each finding select That's right or Not right (with a short correction). Then Confirm diagnosis and plan, or Update the plan with my corrections (takes about a minute; the 30-day plan and drafts stay as they are).

**Growth plan.** Up to seven recommended actions, each with why it matters, a first step, effort and impact. Order: your own priorities first, then a calculated score (impact × urgency × confidence ÷ effort) that never overrides yours. Until you confirm the diagnosis and plan, the plan is a proposal and its items have no buttons. Once it's confirmed, each open item has I'll do this (then shown as You're on it, with Mark done) and Not for us (Dismissed); Undo returns an item to open.

**What you told us.** Your discovery answers, and **Your goal and context**: your main goal, where you serve customers and the tools you use. To change these, select **Edit answers** (or **Add answers**), then **Save answers**. Changes apply to the next analysis: select **Re-run analysis** to update the plan and drafts. The problems you picked during discovery can't be edited here.

**Technical checks.** Braventa reads up to 25 pages of your website (from the sitemap and links), respects robots.txt (user agent Braventa) and runs Google PageSpeed for mobile and desktop. Each check has a severity and a label: Fix first, Improve next or Monitor. It doesn't run JavaScript, so content that only appears after scripts run can be missed.

**30-day content plan and drafted posts.** A plan of posts by channel and date, and five drafted posts in your brand voice. Each draft shows Needs approval until you select Approve or Reject. Braventa doesn't publish anything: copy approved drafts into your own tools. Editing or regenerating a draft isn't available yet.

**Re-run analysis.** Starts a fresh analysis with your latest answers. Not available while an analysis is running. At most 10 analyses or re-runs per business account in 24 hours. An analysis takes about 3–4 minutes; the page updates on its own.`;
}

export function knowledgeSections(): Section[] {
  return [
    {
      id: "about",
      title: "What Braventa is",
      body: `Braventa is a business growth system for small and mid-sized service businesses. Today it reads your website, asks what's holding the business back, and gives you a growth score, a diagnosis you confirm or correct, one prioritized growth plan, a 30-day content plan and five drafted posts for your approval. Braventa recommends; you carry out the changes. Nothing is published or sent for you.`,
    },
    {
      id: "app-map",
      title: "Where things are",
      body: APP_ROUTES.map((r) => `- **${r.title}** — \`${r.route}\`. ${r.purpose} How to get there: ${r.howToGetThere}`).join("\n"),
    },
    {
      id: "getting-started",
      title: "Getting started: analyze your business",
      body: `1. On the [dashboard](/dashboard), select **Analyze a website** ([start here](/onboarding)). Enter the website and, optionally, your goal, service area and tools.
2. **Discovery:** pick the problems holding the business back, or describe them in your own words.
3. **Confirm your priorities:** keep what applies and choose your top three in order.
4. **Connect your tools** (optional): the business owner can connect Google Search Console on Pro or Premium, or during the trial; other tools are coming soon. Select **Continue** whether or not you connect anything.
5. **A few more questions:** up to four follow-ups. Skip any you like.
Braventa reads the website while you answer. Once you finish and the website analysis is done, it builds the plan (about 3–4 minutes). The report then opens with Do this first. You can leave and come back; an unfinished setup can be resumed from the business's tile on the dashboard.
To change your goal, service area or tools later, open the report's **What you told us** section, select **Edit answers**, save, then select **Re-run analysis**.`,
    },
    { id: "report", title: "Your report", body: reportSection() },
    {
      id: "assistant",
      title: "Ask Braventa (this assistant)",
      body: `Open it from **Ask Braventa…** in the header (the search icon on small screens), or press Ctrl+K (Cmd+K on a Mac). It answers questions about how Braventa works and about your own businesses and latest report. It's read-only: it can't change your plan, approve drafts, start analyses or contact anyone. It can be wrong, so check important details in the report. Limits: ${ASSISTANT_LIMITS.perOrgPerDay} questions per business account per day, and ${ASSISTANT_LIMITS.perUserPerMinute} per person per minute. Available during the ${TRIAL_DAYS}-day trial and on any plan (Basic, Pro or Premium); after a trial ends without a plan, it pauses until you choose one. The conversation stays in your browser tab: it's gone when you reload the page or select Clear conversation.`,
    },
    {
      id: "connect-claude",
      title: "Connect Claude or ChatGPT (AI assistant connection)",
      body: `If you've already worked on your business with Claude or ChatGPT, your assistant can answer Braventa's setup questions for you. It works with **claude.ai**, **Claude Desktop**, **Claude Code** and **ChatGPT** (plans with Developer mode). [Settings → Integrations](/settings#ai-assistant) has the server URL to copy and step-by-step setup for each app. Menu names in the apps change now and then.

**Sign in with Braventa (recommended, no key to keep safe):**
- **claude.ai and Claude Desktop:** in Claude, open Customize → Connectors (on some versions, Settings → Connectors), select + Add, then Add custom connector. Name it Braventa, paste the server URL, leave authentication on sign-in (OAuth) and select Add. Then select Connect, and in a chat turn Braventa on from + → Connectors. Claude Desktop uses the same connectors as claude.ai. On Claude Team and Enterprise plans, an owner adds the connector under Organization settings → Connectors first.
- **Claude Code:** run the command shown in Settings (\`claude mcp add --transport http braventa\` followed by the server URL) in a terminal, start Claude Code, type /mcp, choose braventa and select Authenticate.
- **ChatGPT:** needs a plan with Developer mode (Plus, Pro, Business, Enterprise or Edu). In ChatGPT, open Settings → Apps → Advanced settings and turn on Developer mode. Choose Create, name it Braventa, paste the server URL and choose OAuth. In a new chat, turn Braventa on from the + menu; ChatGPT asks before each action that changes something.
Each app then opens a Braventa window ([Connect an app](/oauth/authorize)): sign in, choose your business and select **Approve**. Only approve a connection you started yourself. Approve turns on after a moment once the window is in front.

**Use an access key instead** (Claude Desktop config file or Claude Code, for example when the app can't open a browser): in Settings, open **Use an access key instead**, choose Claude Desktop or Claude Code, name the key and select **Create key**. The key is shown once, already placed in the setup you need; copy it before leaving the page. Claude Desktop (needs Node.js): Settings → Developer → Edit config, add the setup Braventa showed, save, then fully quit and reopen Claude Desktop. Claude Code: paste the command Braventa showed into a terminal, start Claude Code and type /mcp to see Braventa listed. Then ask Claude "Check my Braventa status" and select **Check connection** in Settings. claude.ai and ChatGPT don't take keys: use sign-in.

**Then ask your assistant** to set up your business from what it knows. It can start the analysis, answer discovery and follow-up questions, confirm priorities and report your growth score. It can't confirm the diagnosis, accept plan items, approve drafts, publish or connect your tools: only the owner can connect tools, in Braventa, so the assistant skips the Connect your tools step.

**Connected apps** in Settings lists each app approved with Sign in with Braventa, the business, and when it was last used. **Disconnect** stops an app right away; the person who connected it or the business owner can do it. An app that isn't used for 30 days shows Signed out: connect it again from the app.
Access keys work like a password: up to 5 active keys per person; revoke one in Settings if you no longer use it or think someone else has it. Braventa stores only a one-way hash of each key. Available to everyone during the trial, then on any plan; after a trial ends without a plan the connection pauses (connections, keys and data are kept). Limits: 30 requests a minute and 300 an hour per key or connected app.`,
    },
    {
      id: "service-keys",
      title: "Service keys (automation)",
      body: `Service keys let automation tools and scripts (n8n, Zapier, your own code) use Braventa's MCP server without a person signing in. Only the business owner can create and revoke them, in [Settings → Integrations → Service keys](/settings#service-keys).
1. Name the key after what uses it (for example "n8n onboarding workflow").
2. Choose when it expires: in 30 days, in 90 days, in 1 year, or never.
3. Select **Create service key**. The key (it starts with brv_sk_) is shown once, with the header to send on every request to the server URL: \`Authorization: Bearer\` followed by the key. Copy it before leaving the page.
A service key belongs to the business, not to a person: it keeps working if the owner who created it leaves, until it's revoked or expires. It can do the same setup and status steps as a connected AI assistant, and nothing more: it can't confirm the diagnosis, accept plan items, approve drafts or publish. Up to 10 active service keys per business; expired keys don't count, and you can still revoke them to tidy the list. Treat a service key like a password and revoke it when you stop using the tool. The same trial and plan rule and the same limits apply as for the AI assistant connection.`,
    },
    {
      id: "search-console",
      title: "Connect Google Search Console",
      body: `A Pro feature (included in the ${TRIAL_DAYS}-day Pro trial). Open [Settings → Connections](/settings#connections) and select **Connect Google Search Console**, then sign in with the Google account that manages your website in Search Console and choose the property. You can also connect it during setup, on the optional **Connect your tools** step. Only the business owner can connect it. Access is read-only. Braventa then shows clicks, impressions, top search queries and pages on [Search performance](/search). Using this data in your diagnosis is coming soon. On Basic the connection is paused: data already fetched is kept, nothing new is fetched, and it resumes on Pro or Premium. If Settings says the connection isn't set up yet, the Braventa team hasn't turned it on for the app yet. Analyze a website first so Braventa knows which website to match.`,
    },
    {
      id: "plans",
      title: "Plans and the trial",
      body: `Every new account starts with a ${TRIAL_DAYS}-day Pro trial. When it ends, the account has Basic features; nothing is deleted. There's no billing in the app yet and prices aren't shown in the app: to choose or change a plan, use **Talk to us** on [Plans](/plans) and the Braventa team follows up. You can't change the plan or trial yourself. The plan chip in the header shows your plan and the days left in a trial. Features marked Coming soon aren't available on any plan yet.`,
    },
    { id: "features", title: "What's live and what's coming soon", body: featuresSection() },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      body: `- **Analysis stuck or failed:** the report says "The last analysis didn't finish". Wait a minute and select Re-run analysis. Analyses that run longer than the hosting limit are marked failed automatically.
- **Website couldn't be read:** your robots.txt may block Braventa. Allow \`User-agent: Braventa\` and re-run. Pages that only show content after JavaScript runs can't be read.
- **Speed and SEO scores missing:** Google PageSpeed didn't respond; the rest of the analysis is complete. Re-run later to get them.
- **Re-run not available:** an analysis is still running, or the account reached 10 analyses or re-runs in 24 hours.
- **Monthly AI usage limit reached:** new analyses and assistant answers pause until next month, or contact us to raise the limit.
- **Score seems wrong:** check the findings marked Inferred and correct them with Not right; confirmed corrections update the plan.
- **Sign-in email didn't arrive:** check your spam folder. If it still hasn't arrived, contact us. Password reset isn't available in the app yet; contact us for help.
- **Claude or ChatGPT connection problems:** see Connect Claude or ChatGPT. If the Braventa window says the app isn't registered or the return address isn't recognized, remove the connector in your app and add it again. If your app says it was disconnected or asks you to sign in again, connect it again from the app. If your assistant says the key isn't valid, the key may be revoked, expired or mistyped: create a new one.
For anything else, contact the Braventa team through the contact page on braventa.io (braventa.io/contact).`,
    },
    {
      id: "privacy",
      title: "Privacy basics",
      body: `- Everything you see is limited to your own business account; other customers can't see your data, and this assistant only sees yours.
- Braventa reads only public pages of your website and respects robots.txt.
- AI requests only go to models with zero data retention: they don't store your prompts or train on them.
- Questions you ask this assistant are sent, with a summary of your account and latest report, to the AI model that writes the answer. Braventa doesn't store the questions or answers; it records only who asked and when, to apply the limits.
- Nothing is published, posted or emailed for you; you approve drafts and carry out changes yourself.
- Search Console access is read-only. Access keys, service keys and connected apps' sign-ins are stored only as a one-way hash; revoke a key or disconnect an app in Settings any time.
- To ask about your data or deleting it, contact the Braventa team through braventa.io/contact.`,
    },
  ];
}

// The knowledge base as one block for the model's system context.
export function knowledgeForPrompt(): string {
  return knowledgeSections()
    .map((s) => `## ${s.title}\n${s.body}`)
    .join("\n\n");
}

// docs/help/APP_GUIDE.md, the user-facing help article set (support.braventa.io later).
export function renderGuide(): string {
  const sections = knowledgeSections();
  return `<!-- GENERATED from web/src/lib/assistant/knowledge.ts by \`npm run help:doc\` (in web/). Do not edit by hand. -->
# Braventa app guide

**Audience:** business owners using app.braventa.io. **Version:** ${KNOWLEDGE_VERSION}. The in-app assistant
("Ask Braventa") answers from the same content. Links are app routes (relative to app.braventa.io).

${sections.map((s) => `- [${s.title}](#${s.id})`).join("\n")}

${sections.map((s) => `<a id="${s.id}"></a>\n\n## ${s.title}\n\n${s.body}`).join("\n\n")}
`;
}

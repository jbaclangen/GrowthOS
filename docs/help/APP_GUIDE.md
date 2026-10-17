<!-- GENERATED from web/src/lib/assistant/knowledge.ts by `npm run help:doc` (in web/). Do not edit by hand. -->
# Braventa app guide

**Audience:** business owners using app.braventa.io. **Version:** 2026-10-17. The in-app assistant
("Ask Braventa") answers from the same content. Links are app routes (relative to app.braventa.io).

- [What Braventa is](#about)
- [Where things are](#app-map)
- [Getting started: analyze your business](#getting-started)
- [Your report](#report)
- [Ask Braventa (this assistant)](#assistant)
- [Connect Claude (AI assistant access)](#connect-claude)
- [Connect Google Search Console](#search-console)
- [Plans and the trial](#plans)
- [What's live and what's coming soon](#features)
- [Troubleshooting](#troubleshooting)
- [Privacy basics](#privacy)

<a id="about"></a>

## What Braventa is

Braventa is a business growth system for small and mid-sized service businesses. Today it reads your website, asks what's holding the business back, and gives you a growth score, a diagnosis you confirm or correct, one prioritized growth plan, a 30-day content plan and five drafted posts for your approval. Braventa recommends; you carry out the changes. Nothing is published or sent for you.

<a id="app-map"></a>

## Where things are

- **Home** — `/`. Sends you to your dashboard when you're signed in, or to sign in when you're not. How to get there: Open app.braventa.io.
- **Sign in** — `/login`. Sign in with your email and password, or create an account. New accounts get a confirmation email first. How to get there: Open app.braventa.io when you're signed out, or select Sign out in the header.
- **Dashboard** — `/dashboard`. Your businesses. The most recently analyzed one opens as a one-screen summary (infographic) of its latest report; every business has a tile with its growth score and status (Analyzing, Waiting for your answers, Last analysis failed, or the date it was analyzed). Start a new analysis with Analyze a website. How to get there: Select the Braventa logo in the header.
- **Analyze your business (step 1 of 4)** — `/onboarding`. Enter a website address and, optionally, the business name, your main goal for the next few months, where you serve customers and the tools you already use. Braventa starts reading the website and opens discovery. How to get there: Select Analyze a website on the dashboard.
- **Discovery (step 2 of 4)** — `/onboarding/[sessionId]`. Pick what's making it hardest for the business to grow right now from a list of common problems, and describe it in your own words if you like. The website analysis keeps running in the background. How to get there: Comes right after step 1. To resume an unfinished setup, open the business from the dashboard and select the continue button.
- **Confirm your priorities (step 3 of 4)** — `/onboarding/[sessionId]/review`. Check the problems Braventa understood, keep the ones that apply and put your top three in order. How to get there: Comes after discovery.
- **A few more questions (step 4 of 4)** — `/onboarding/[sessionId]/questions`. Up to four short follow-up questions about your top priorities, such as how soon something needs attention. You can skip any of them. When you finish, Braventa builds your plan. How to get there: Comes after confirming your priorities.
- **Report (growth assessment)** — `/analysis/[id]`. The full report for one business: Do this first, the growth score, the diagnosis to confirm or correct, the growth plan, technical checks, your answers, the business profile, the 30-day content plan and the drafted posts. Each tile opens its section; Re-run analysis starts a fresh analysis. How to get there: Select a business on the dashboard, or Open full report under the latest report.
- **Plans** — `/plans`. Compares Basic, Pro and Premium with each feature marked Live or Coming soon, shows your current plan or trial, and has Talk to us buttons to ask the Braventa team about a plan. How to get there: Select the plan chip in the header (for example Pro trial · 9 days left).
- **Search performance** — `/search`. Read-only Google Search Console data for your website: clicks, impressions, top search queries and pages, and Google's indexing verdicts. Empty until Search Console is connected in Settings. How to get there: Settings → Connections → Google Search Console, once connected.
- **Settings** — `/settings`. AI assistant access (create and revoke access keys that let Claude fill in the setup) and Connections (Google Search Console). How to get there: Select Settings in the header. Direct sections: /settings#ai-assistant and /settings#connections.

<a id="getting-started"></a>

## Getting started: analyze your business

1. On the [dashboard](/dashboard), select **Analyze a website** ([start here](/onboarding)). Enter the website and, optionally, your goal, service area and tools.
2. **Discovery:** pick the problems holding the business back, or describe them in your own words.
3. **Confirm your priorities:** keep what applies and choose your top three in order.
4. **A few more questions:** up to four follow-ups. Skip any you like.
Braventa reads the website while you answer. Once you finish and the website analysis is done, it builds the plan (about 3–4 minutes). The report then opens with Do this first. You can leave and come back; an unfinished setup can be resumed from the business's tile on the dashboard.
To change your goal, service area or tools later, open the report's **What you told us** section, select **Edit answers**, save, then select **Re-run analysis**.

<a id="report"></a>

## Your report

The report page for a business (open it from the dashboard) starts with **Do this first**: the top open item in your growth plan with its first step, how many drafts are waiting for your approval, and one button for the next step. Until the diagnosis is confirmed, that button is **Check the diagnosis and confirm your plan**. After that, it's **Review … drafts waiting for your approval** while drafts are waiting, then **Start on:** followed by the top open plan item. Below it, tiles open these sections:
- Growth score (`?view=scores`)
- What's holding the business back (`?view=diagnosis`)
- Growth plan (`?view=plan`)
- Technical checks (`?view=technical`)
- What you told us (`?view=answers`)
- Business profile (`?view=profile`)
- 30-day content plan (`?view=content`)
- Drafted posts (`?view=drafts`)
- Top 5 opportunities (`?view=opportunities`)

Top 5 opportunities only appears on older reports from before the single growth plan.

**Growth score (0–100).** A weighted blend: content clarity 25%, conversion readiness 25% and online presence 15% are Braventa's AI assessment of your website; Google PageSpeed (mobile) performance 15%, SEO 12%, accessibility 4% and best practices 4% are measured. When PageSpeed doesn't respond, the score uses the assessed parts only. The score ring is colored by range (70 and above, 45–69, below 45), and the number is always shown.It's a guide to where to focus, not a Google ranking or a guarantee of results; the assessed parts are judgments, and a Lighthouse SEO score isn't a ranking score.

**Diagnosis ("What's holding the business back").** Up to six findings, each labeled by where it comes from: Verified, From you, Inferred. Verified means it cites a measured check (technical checks T1, T2…, PageSpeed); From you means you said it; Inferred means it's Braventa's AI assessment and worth confirming. For each finding select That's right or Not right (with a short correction). Then Confirm diagnosis and plan, or Update the plan with my corrections (takes about a minute; the 30-day plan and drafts stay as they are).

**Growth plan.** Up to seven recommended actions, each with why it matters, a first step, effort and impact. Order: your own priorities first, then a calculated score (impact × urgency × confidence ÷ effort) that never overrides yours. Until you confirm the diagnosis and plan, the plan is a proposal and its items have no buttons. Once it's confirmed, each open item has I'll do this (then shown as You're on it, with Mark done) and Not for us (Dismissed); Undo returns an item to open.

**What you told us.** Your discovery answers, and **Your goal and context**: your main goal, where you serve customers and the tools you use. To change these, select **Edit answers** (or **Add answers**), then **Save answers**. Changes apply to the next analysis: select **Re-run analysis** to update the plan and drafts. The problems you picked during discovery can't be edited here.

**Technical checks.** Braventa reads up to 25 pages of your website (from the sitemap and links), respects robots.txt (user agent Braventa) and runs Google PageSpeed for mobile and desktop. Each check has a severity and a label: Fix first, Improve next or Monitor. It doesn't run JavaScript, so content that only appears after scripts run can be missed.

**30-day content plan and drafted posts.** A plan of posts by channel and date, and five drafted posts in your brand voice. Each draft shows Needs approval until you select Approve or Reject. Braventa doesn't publish anything: copy approved drafts into your own tools. Editing or regenerating a draft isn't available yet.

**Re-run analysis.** Starts a fresh analysis with your latest answers. Not available while an analysis is running. At most 10 analyses or re-runs per business account in 24 hours. An analysis takes about 3–4 minutes; the page updates on its own.

<a id="assistant"></a>

## Ask Braventa (this assistant)

Open it from **Ask Braventa…** in the header (the search icon on small screens), or press Ctrl+K (Cmd+K on a Mac). It answers questions about how Braventa works and about your own businesses and latest report. It's read-only: it can't change your plan, approve drafts, start analyses or contact anyone. It can be wrong, so check important details in the report. Limits: 40 questions per business account per day, and 5 per person per minute. Available during the 14-day trial and on any plan (Basic, Pro or Premium); after a trial ends without a plan, it pauses until you choose one. The conversation stays in your browser tab: it's gone when you reload the page or select Clear conversation.

<a id="connect-claude"></a>

## Connect Claude (AI assistant access)

If you've already worked on your business with Claude, Claude can answer Braventa's setup questions for you. It works with **Claude Desktop** and **Claude Code**; claude.ai and ChatGPT are coming soon.
1. Open [Settings → AI assistant access](/settings#ai-assistant).
2. Choose Claude Desktop or Claude Code, give the key a name and select **Create key**. The key is shown once, already placed in the setup you need; copy it before leaving the page.
3. Claude Desktop (needs Node.js): Settings → Developer → Edit config, add the setup Braventa showed, save, then fully quit and reopen Claude Desktop. Claude Code: paste the command Braventa showed into a terminal, start Claude Code and type /mcp to see Braventa listed.
4. Ask Claude "Check my Braventa status", then select **Check connection** in Settings.
5. Ask Claude to set up your business. It can start the analysis, answer discovery and follow-up questions, confirm priorities and report your growth score. It can't confirm the diagnosis, accept plan items, approve drafts or publish.
Keys work like a password: up to 5 active keys per person; revoke one in Settings if you no longer use it or think someone else has it. Braventa stores only a one-way hash of each key. Available to everyone during the trial, then on any plan; after a trial ends without a plan the connection pauses (keys and data are kept). Limits: 30 requests a minute and 300 an hour per key.

<a id="search-console"></a>

## Connect Google Search Console

A Pro feature (included in the 14-day Pro trial). Open [Settings → Connections](/settings#connections) and select **Connect Google Search Console**, then sign in with the Google account that manages your website in Search Console and choose the property. Only the business owner can connect it. Access is read-only. Braventa then shows clicks, impressions, top search queries and pages on [Search performance](/search). Using this data in your diagnosis is coming soon. On Basic the connection is paused: data already fetched is kept, nothing new is fetched, and it resumes on Pro or Premium. If Settings says the connection isn't set up yet, the Braventa team hasn't turned it on for the app yet. Analyze a website first so Braventa knows which website to match.

<a id="plans"></a>

## Plans and the trial

Every new account starts with a 14-day Pro trial. When it ends, the account has Basic features; nothing is deleted. There's no billing in the app yet and prices aren't shown in the app: to choose or change a plan, use **Talk to us** on [Plans](/plans) and the Braventa team follows up. You can't change the plan or trial yourself. The plan chip in the header shows your plan and the days left in a trial. Features marked Coming soon aren't available on any plan yet.

<a id="features"></a>

## What's live and what's coming soon

**Basic** — Business intelligence, a marketing audit and a prioritized plan. Braventa recommends; you carry out the changes.
- Website analysis and business profile (Live): Reads your website and Google PageSpeed scores.
- Guided discovery (Live): Pick what's holding the business back and answer a few follow-up questions.
- Growth score and diagnosis (Live): Findings marked by evidence, which you confirm or correct.
- Prioritized growth plan (Live): Recommended actions with first steps; accept, dismiss or mark done.
- 30-day content plan and drafted posts (Live): Drafts in your brand voice for you to approve or reject. Braventa doesn't publish them.
- In-app AI assistant (Live): Ask how Braventa works and about your latest report, from the search bar in the header. Answers only; it can't make changes for you. Paused after the trial until you choose a plan.
- Connect your AI assistant (Live): Let Claude answer the setup questions from what it already knows about your business (Claude Code and Claude Desktop). Paused after the trial until you choose a plan.

**Pro** — Everything in Basic, plus your Google Search Console data in Braventa. Coming soon: a full marketing audit, more connected tools and AI agents that carry out approved changes for you.
- Full marketing audit (Coming soon): SEO, search ads, social media, email and video.
- Google Search Console connection (Live): Read-only clicks, impressions, top search queries and pages for your website, shown in Braventa. Using them in your diagnosis is coming soon.
- Analytics connections (Coming soon): Google Analytics 4 and Tag Manager.
- Creative tool connections (Coming soon): Canva, HeyGen and Higgsfield.
- Website and social connections (Coming soon): WordPress and your social media accounts.
- AI agents that carry out fixes (Coming soon): Agents apply recommended changes in your connected tools, each one only after you approve it.

**Premium** — Everything in Pro, plus custom integrations with the systems your business runs on (coming soon).
- Custom integrations (Coming soon): E-commerce platforms, QuickBooks, Xero and other systems, scoped with you.

Not available today on any plan: CRM connections, publishing or scheduling posts, sending email, automations, analytics reports from GA4, billing in the app, team invitations, editing or regenerating drafts, editing the business profile Braventa wrote from your website (services, customers, strengths, gaps and brand voice) or the business name, password reset in the app, and a public API. Your main goal, service area and tools can be changed: see What you told us in the report.

<a id="troubleshooting"></a>

## Troubleshooting

- **Analysis stuck or failed:** the report says "The last analysis didn't finish". Wait a minute and select Re-run analysis. Analyses that run longer than the hosting limit are marked failed automatically.
- **Website couldn't be read:** your robots.txt may block Braventa. Allow `User-agent: Braventa` and re-run. Pages that only show content after JavaScript runs can't be read.
- **Speed and SEO scores missing:** Google PageSpeed didn't respond; the rest of the analysis is complete. Re-run later to get them.
- **Re-run not available:** an analysis is still running, or the account reached 10 analyses or re-runs in 24 hours.
- **Monthly AI usage limit reached:** new analyses and assistant answers pause until next month, or contact us to raise the limit.
- **Score seems wrong:** check the findings marked Inferred and correct them with Not right; confirmed corrections update the plan.
- **Sign-in email didn't arrive:** check your spam folder. If it still hasn't arrived, contact us. Password reset isn't available in the app yet; contact us for help.
- **Claude connection problems:** see Connect Claude; create a new key if Claude says the key isn't valid.
For anything else, contact the Braventa team through the contact page on braventa.io (braventa.io/contact).

<a id="privacy"></a>

## Privacy basics

- Everything you see is limited to your own business account; other customers can't see your data, and this assistant only sees yours.
- Braventa reads only public pages of your website and respects robots.txt.
- AI requests only go to models with zero data retention: they don't store your prompts or train on them.
- Questions you ask this assistant are sent, with a summary of your account and latest report, to the AI model that writes the answer. Braventa doesn't store the questions or answers; it records only who asked and when, to apply the limits.
- Nothing is published, posted or emailed for you; you approve drafts and carry out changes yourself.
- Search Console access is read-only, and Claude access keys are stored only as a one-way hash and can be revoked any time.
- To ask about your data or deleting it, contact the Braventa team through braventa.io/contact.

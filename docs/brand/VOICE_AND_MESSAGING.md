# Braventa voice and messaging

This document is the working reference for how Braventa sounds and what it says: voice principles, word lists, claim rules, the messaging hierarchy, audience-specific value propositions, objection handling, calls to action, short-form profile copy, and product UI microcopy rules. Use it whenever you write anything a customer, prospect, partner, or community member will read — in the app, on braventa.io, in email, in social posts, or in docs. Strategy and positioning come from [`BRAND_POSITIONING.md`](BRAND_POSITIONING.md); the master reference is [`BRAND_BIBLE.md`](BRAND_BIBLE.md); canonical lines are fixed by D-005 in [`../decisions/DECISION_LOG.md`](../decisions/DECISION_LOG.md); feature status comes from [`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md).

**Status / last reviewed: 2026-10-10** · Provisional (follows D-005; awaiting founder confirmation)

---

## 1. Voice in one line

Braventa sounds like **a knowledgeable growth and systems consultant explaining complex technology in clear business language** — specific, calm, direct, and honest about what is and is not done yet.

## 2. Voice principles

| Principle | What it means | Example |
|---|---|---|
| **Lead with the business outcome** | Say what changes for the customer before how it works. | "See the five things worth your time this month" rather than "Our AI analyzes 40 signals". |
| **Be specific** | Name the thing: the score, the page, the step, the number of drafts. Vague claims read as hype. | "A 30-day plan and five drafted posts" rather than "Tons of content". |
| **Short, confident declaratives** | One idea per sentence. Active voice. No hedging stacks ("may potentially help"). | "Braventa reads your website. Then it tells you what to fix first." |
| **Honest status** | Live features are stated plainly; planned ones are labelled. Never imply autonomy. | "Today you approve every draft. Publishing connections are coming next." |
| **Explain the why** | Every recommendation gets a reason a non-specialist understands. | "Your contact page has no phone number above the fold, so mobile visitors leave before calling." |
| **Respect the reader's time** | Owners read on their phone between jobs. Front-load the point; cut warm-up sentences. | Start emails with the result, not "I hope this finds you well." |
| **Human in control** | Copy reinforces that the customer decides what goes out. | "Nothing is published until you approve it." |

### Display voice (marketing surfaces only)
Section heads on braventa.io may be short uppercase lines set in Quicksand headings (see [`VISUAL_IDENTITY.md`](VISUAL_IDENTITY.md) for specifics) in the spirit of an accountable operator: two to six words, no punctuation except a full stop, no exclamation marks. Examples: `ONE SYSTEM. EVERY STEP.` · `CONTEXT FIRST.` · `YOU APPROVE. ALWAYS.` · `FROM INSIGHT TO ACTION.` Never use uppercase section heads in the app UI or in body copy.

## 3. Do and don't

| Don't | Do | Why |
|---|---|---|
| "Braventa's revolutionary AI supercharges your marketing." | "Braventa reads your website and tells you the five changes most likely to bring in more enquiries." | Specific outcome, no hype words. |
| "Effortless growth on autopilot." | "Braventa drafts the work. You approve it in a few clicks." | No autonomy, no "effortless". |
| "Get 10x more leads guaranteed." | "Find the gaps that are costing you enquiries, and a first step for each." | No guarantees or invented multipliers. |
| "AI-powered growth platform." | "A business growth system." | Category, not mechanism, leads. |
| "Our cutting-edge LLM pipeline leverages multi-model orchestration." | "Braventa uses a mix of AI models, chosen for each task, with a monthly usage limit you control." (technical audiences only) | Plain language; detail only where wanted. |
| "Braventa posts to your social channels and updates HubSpot." | "Today Braventa drafts posts for your approval. HubSpot and publishing connections are coming next." | Never present planned as live. |
| "Oops! Something went wrong 😢" | "The analysis didn't finish because the AI service was busy. Try again in a minute." | Errors say what happened and what to do. No emojis. |
| "Unleash your business's full potential!" | "Know what to do next. Then get it done." | Use the canonical line. |
| "Hi there!!! Welcome aboard the Braventa family!" | "Welcome to Braventa, {{first_name}}. Here's how to get your first growth assessment." | No artificial enthusiasm. |
| "Users can leverage the dashboard to facilitate approvals." | "Approve or reject each draft from your dashboard." | Short verbs, second person. |

## 4. Word list

### Banned (do not use in any public or product copy)
| Word or phrase | Use instead |
|---|---|
| revolutionary, game-changing, groundbreaking, disruptive | describe the specific change |
| effortless, on autopilot, set and forget, hands-free | "drafts for your approval", "saves you the first draft" |
| 10x, 100x, skyrocket, explode (growth) | a real, sourced number, or no number |
| guaranteed (results, leads, rankings, revenue) | "designed to", "aims to", or describe the method |
| unleash, unlock your potential, supercharge, turbocharge | "help you", "show you", plain verbs |
| magic, magical, AI magic | describe what happens |
| Braventa AI | Braventa (D-002) |
| GrowthOS (in public copy) | Braventa (D-001) |
| robot, brain (as metaphors) | system, plan, profile |
| "the AI will do it for you" | "Braventa drafts it for your approval" |

### Caution (allowed only with care)
| Word | Rule |
|---|---|
| AI-powered, AI-driven | Never as the lead claim or headline. Acceptable as a descriptive detail ("AI-assisted drafts"). Prefer "AI-assisted". |
| automate, automation | Only for capabilities that exist, or clearly labelled as planned. Automation always implies approval steps. |
| intelligent, smart | Once per page at most; show the intelligence instead. |
| seamless, integrated | Only when an integration is actually live. |
| optimize | Fine when specific ("optimize your contact page"); avoid as a vague benefit. |
| leverage, synergy, solution, empower, robust | Prefer plain verbs: use, help, fix, build. |
| growth score | Always explain it is a blend of measured site quality and assessed marketing readiness; never present it as a prediction of revenue. |
| competitors | The app lists "likely competitors" inferred from the website. Do not present them as verified. |

## 5. Claim rules (live vs planned)

1. **Present tense means it works today.** "Braventa drafts five posts" is acceptable only because it is live.
2. **Live capabilities may be introduced with "Today Braventa…".** Use this whenever a sentence sits near a planned capability.
3. **Planned capabilities use "Coming next…", "Planned:", or "We're building…"** and never sit in a bullet list of live features without a label.
4. **Never imply autonomy.** Braventa recommends, plans, and drafts; the customer approves. Even when automation ships, describe it as "approved workflows" or "workflows you switch on".
5. **No outcome guarantees.** No guaranteed revenue, leads, rankings, traffic, or savings.
6. **No invented proof.** No customer counts, testimonials, logos, ratings, or statistics until they exist and are verified. Use `[Proof point — add when available]`.
7. **Attribute measured data.** PageSpeed-derived scores are labelled as coming from Google. AI-assessed scores are described as assessments.
8. **Distinguish information types** (brief §2.1): verified, customer-provided, inferred, and AI-recommended. "Likely competitors" and brand voice are inferred.
9. **Copy that depends on an unbuilt feature** is marked in source docs as `(use once {{feature}} ships)` and is not published until then.
10. **Time claims are factual:** an analysis takes about 3–4 minutes today. Do not promise "instant" or "seconds".

### What is live today (the reference sentence)
> Today Braventa reads your website and checks it with Google PageSpeed, asks what's holding your business back and follows up on your answers, builds a profile of your business, and gives you a growth score with a diagnosis you confirm or correct. It turns that into one prioritized growth plan, plans 30 days of content, and drafts your first five posts for you to approve.

(Updated 2026-10-11 for the diagnosis and growth plan, D-028/D-035; the site's copy is `LIVE_TODAY` in `site/src/lib/site.ts`. The short and long descriptions in §7 still describe "five opportunities" — use [`WEBSITE_MESSAGING.md` §0](../marketing/WEBSITE_MESSAGING.md#0-phase-1-messaging-current-d-035) instead until they are rewritten. Status badges: Live · Limited · Coming soon.)

### What is not live (never imply otherwise)
HubSpot or any CRM connection · publishing or scheduling to any channel · sending email on the customer's behalf · running automations · analytics and results reporting · team accounts/roles beyond the current organization model · pricing and plans.

## 6. Spelling and style conventions

- **Spelling: US English** for all public and product copy (the initial market is assumed to be North America; confirm with the founder). Examples: analyze, organization, optimize, color, prioritize, enroll.
- **Harmonize the app:** the UI was moved from UK spellings ("Analyse") to US forms on 2026-10-10 (D-016). Internal docs written earlier in UK English do not need rewriting, but new public copy uses US English.
- **Sentence case** for headings, buttons, labels, and email subjects. Uppercase only for marketing section heads and small eyebrow labels.
- **Numbers:** numerals for all quantities in UI and marketing ("5 opportunities", "30-day plan"); spell out only at the start of a sentence in long-form prose.
- **Serial comma:** yes.
- **Dashes:** em dash without spaces in body copy is acceptable; D-005 lines keep their spaced em dash exactly as written.
- **Product name:** Braventa. Module names are capitalized as proper nouns (Content Studio, Website Intelligence). Feature nouns are lowercase (growth score, business profile, 30-day plan).
- **Contractions:** yes ("you'll", "didn't") — they keep the tone human.
- **Emojis:** none in product UI, transactional email, or docs. At most one, sparingly, in community or social replies where the platform norm expects it.

## 7. Messaging hierarchy

### Tagline (D-005)
**Run your growth as one system.**

### Homepage headline (D-005)
**Know what to do next. Then get it done.**

### One-liner (D-005)
Braventa connects your website, marketing, CRM, and content into one growth system that shows you what to do next — and helps you get it done.

### Short description (~50 words)
Braventa is a business growth system for service businesses. It learns how your business works from your website, scores where you stand, picks the five opportunities that matter most, and turns them into a 30-day plan with drafted content for your approval. Connections to the tools you already use are coming next.

### Long description (~150 words)
Most small businesses run growth through disconnected pieces: a website from one vendor, posts from another, a CRM nobody updates, and reports that explain the past but never say what to do next. Braventa brings those pieces into one system.

Start with your website. In about four minutes, Braventa reads your site and checks it with Google PageSpeed, then builds a profile of your business — services, customers, locations, brand voice, strengths, and gaps. It gives you a growth score, the five opportunities most worth your time with a first step for each, a 30-day content plan, and five drafted posts in your voice. Nothing goes out without your approval.

Next, Braventa will connect to the tools you already use, starting with HubSpot, so the plan can move into action and results can feed back into what you do next. One system, with you in control.

### Elevator pitch (~30 seconds, spoken)
"You know how most small businesses have a website from one person, social posts from another, a CRM nobody updates, and no idea which of those things is actually worth their time? Braventa fixes that. You give it your website, and in a few minutes it builds a profile of your business, scores where you stand, tells you the five things worth doing first, plans your next month of content, and drafts the first posts for you to approve. We're building the connections to tools like HubSpot next, so the plan turns into action and the results come back. One system, and you stay in control of everything that goes out."

### Value proposition
**Braventa tells you what to work on next and helps you get it done — grounded in how your business actually works, with you approving everything that goes out.**

Supporting benefits:
- **Clarity:** a ranked shortlist instead of a to-do list of everything.
- **Context:** every recommendation and draft starts from your business profile.
- **Momentum:** a 30-day plan and first drafts in one sitting.
- **Control:** approval by default; nothing is published automatically.

### Messaging pillars

| Pillar | Message | Proof points (live) | Proof points (planned — label when used) |
|---|---|---|---|
| **1. Know your business** | Braventa starts by understanding your business, so nothing it produces is generic. | Website crawl; business profile with services, customers, locations, brand voice, strengths, gaps, likely competitors | Business knowledge base; customer-supplied sources |
| **2. Know what to do next** | A clear, ranked answer to "what should we work on?" | Growth score 0–100 with sub-scores (content clarity, conversion readiness, online presence) and Google PageSpeed measures; top 5 opportunities with impact, effort, and first step | Next-best-action recommendations from results |
| **3. Get it done** | From plan to drafted work in one sitting. | 30-day content plan (goal, audience, pillars, channels); 5 drafted social posts in your brand voice with image ideas | Blog, email, and video script drafts; execution through connected tools (use once integrations ship) |
| **4. Stay in control** | You approve everything. Your data stays yours. | Every draft marked "Needs approval"; approve, reject, or undo; data isolated per organization; monthly AI usage limit | Approval steps and logs on workflows; usage dashboard |

## 8. Audience-specific value propositions and voice shifts

| Audience | Value proposition | Voice shift | Avoid |
|---|---|---|---|
| **Business owners** | "Stop guessing which marketing is worth your time. Braventa shows you the five things to do first and drafts the work." | Plainest language; outcomes and time saved; short sentences; one clear next step. | Marketing jargon (funnels, MQLs), technical detail. |
| **Marketing managers** | "Go from a blank page to a prioritized 30-day plan and first drafts in one sitting, all in the brand's voice." | Peer-to-peer; can use pillars, channels, CRO, brand voice; emphasize consistency and speed. | Implying Braventa replaces their judgment or job. |
| **Sales / CRM teams** | (use once CRM Intelligence ships) "Braventa reads your pipeline and tells you which leads need follow-up today." Today: "Braventa is building HubSpot support first; your website opportunities already show where enquiries are lost." | Practical, pipeline language; follow-up, data quality. | Claiming any live CRM capability. |
| **Technical administrators** | "Tenant-isolated data, server-side secrets, a per-organization AI budget, and human approval before anything is published." | Precise and factual; name the mechanisms (row-level security, server-only keys); no marketing adjectives. | Vague "bank-grade security" claims; certifications we do not hold. |
| **Agency partners** | (future) "Run a consistent growth process across every client, with approval and context built in." Today: invite conversations, not commitments. | Business-partner tone; margin, consistency, client reporting. | Promising partner programs, white-labeling, or multi-client features that do not exist. |
| **Developers** | (future) "Clear APIs and webhooks to connect Braventa to your stack." Today: architecture notes only. | Concise, technical, accurate; link to docs; code over adjectives. | Announcing an API before one exists. |
| **Community members** | "Learn how other service businesses run growth as a system, and help shape what Braventa builds next." | Warm, conversational, open about the roadmap and limits; thank people. | Sales pitches in community spaces. |
| **Existing customers** | "Here's what changed, what it means for your business, and the one thing to do next." | Familiar and direct; reference their business and score; respect their time. | Re-selling basics they already know; surprise upsells. |

## 9. Objection handling

Format: acknowledge, answer with a fact, offer a next step.

| Objection | Response |
|---|---|
| **"Is this just ChatGPT?"** | "General AI chat starts from a blank prompt every time. Braventa starts from your business: it reads your website, builds a profile, scores where you stand, and decides what matters before it writes anything. The drafts follow a plan, not a one-off prompt. Run an analysis on your site and compare." |
| **"I already have HubSpot."** | "Good — Braventa isn't a CRM and won't replace it. HubSpot is the first integration we're building, so Braventa can make the CRM you already pay for more useful. Today, Braventa works from your website, so you can start without connecting anything." |
| **"AI content is generic."** | "It usually is, because it doesn't know the business. Braventa drafts from a profile of your services, customers, locations, and brand voice, and from a plan with a clear goal. You reject anything that isn't right — nothing goes out without your approval." |
| **"I don't have time."** | "That's the point. One analysis takes about four minutes of machine time and a few minutes of yours to review. You get a ranked shortlist and drafted posts, so the time you do spend goes on the work that matters." |
| **"Will it post without me?"** | "No. Every draft is marked 'Needs approval'. Braventa doesn't publish to any channel today, and when publishing arrives, approval stays the default." |
| **"Is my data safe?"** | "Your data is stored in a database that isolates each organization from every other one, secret keys stay on our servers, and we only send AI models what a task needs. We don't publish or send anything on your behalf. [Link to data handling page — add when available]." |
| **"What does it cost?"** | "Pricing isn't final yet. During the early access phase we're working closely with a small number of businesses. Book a call and we'll walk you through it." (Do not quote prices — D-012.) |
| **"We tried an agency and it didn't work."** | "Agencies often work in silos and the knowledge leaves when they do. Braventa keeps your business profile, plan, and drafts in one place you own, and shows why each recommendation matters. If you want hands-on help later, that can sit on top of the system rather than replace it." |
| **"How accurate is the growth score?"** | "Part of it is measured — mobile speed, SEO basics, and accessibility come from Google PageSpeed. The rest is an assessment of your content clarity, conversion readiness, and online presence. It's a starting point for priorities, not a forecast of revenue." |
| **"Our website is small / outdated."** | "That's fine. Braventa works with what's there, and a thin website usually means the opportunities are clearer. If the site can't be read, you'll see why and what to try." |

## 10. Calls to action

| Context | Primary | Secondary |
|---|---|---|
| Marketing site (early access) | **Get your growth assessment** | Book a call · See how it works |
| Marketing site (alternative) | **Analyze my website** | Talk to us |
| In-app, no businesses yet | **Analyze your first website** | — |
| In-app, analysis complete | **Review drafts** | Re-run analysis |
| Email, analysis complete | **See your results** | — |
| Email, drafts waiting | **Review drafts** | — |
| Sales | **Book a 20-minute walkthrough** | Send me the overview |
| Community | **Join the conversation** | Read the release notes |

CTA rules: verbs first; say what happens next; no "Click here", "Submit", or "Learn more" alone; one primary CTA per screen or email.

## 11. Short-form profile copy

| Placement | Limit | Copy |
|---|---|---|
| **LinkedIn tagline** | 220 chars | Business growth system for service businesses. Know what to do next. Then get it done. |
| **LinkedIn About (opening)** | 2,000 chars | Braventa is a business growth system for service businesses. It reads your website, builds a profile of your business, scores where you stand, finds the five opportunities worth your time, plans 30 days of content, and drafts the first posts for your approval. Connections to the tools you already use, starting with HubSpot, are coming next. Run your growth as one system. braventa.io |
| **X bio** | 160 chars | Business growth system for service businesses. Know what to do next. Then get it done. You approve everything. braventa.io (≈ 110 chars) |
| **Instagram bio** | 150 chars | Run your growth as one system. Growth plans and drafted content for service businesses, built from your own website. (≈ 115 chars) |
| **Facebook short description** | 255 chars | Braventa is a business growth system for service businesses. It shows you what to work on next, plans your content, and drafts it for your approval. Run your growth as one system. |
| **App listing (short, 80 chars)** | 80 chars | Know what to do next for your business. Then get it done. |
| **App listing (long)** | ~600 chars | Braventa is a business growth system for service businesses. Enter your website and Braventa builds a profile of your business, gives you a growth score with five prioritized opportunities, plans 30 days of content, and drafts your first posts in your brand voice. You approve or reject every draft — nothing is published automatically. Coming next: connections to the tools you already use, starting with HubSpot. |
| **Email signature** | 2 lines | {{sender_name}} · {{sender_title}}, Braventa / Run your growth as one system. · braventa.io |
| **Community page blurb** | ~300 chars | The Braventa community is where service business owners and marketers share how they run growth as a system, get help with Braventa, and shape what we build next. Ask questions, share what worked, and read release notes first. |

Do not add "AI" to any profile name or handle (D-002). Social handles: confirm availability; see open questions.

## 12. Product UI microcopy

### Rules
1. **Sentence case** everywhere: headings, buttons, tabs, labels. ("Growth score", not "Growth Score".)
2. **Buttons are verbs** that name the result: "Analyze website", "Approve", "Re-run analysis". Not "OK", "Submit", "Yes".
3. **Errors say what happened and what to do**, in that order. No blame, no codes as the only message, no raw system errors shown to users.
4. **Empty states give the next step** with one primary action.
5. **Loading states set expectations**: what is happening and how long it takes.
6. **Status is explicit and consistent**: Planned · Needs approval · Approved · Rejected (content); Queued · Running · Complete · Failed (analysis). Use the same words everywhere, including emails.
7. **Explain AI outputs**: label assessments vs measurements; show a reason with each recommendation.
8. **No emojis, no exclamation marks**, no "Oops".
9. **Second person** ("your website"), and "we" only for Braventa as a company in support contexts.
10. **US spelling** (see §6).

### Empty states
| Screen | Heading | Body | Action |
|---|---|---|---|
| Dashboard, no businesses | No businesses yet | Add a website to get a growth score, five opportunities, and a 30-day plan. | Analyze your first website |
| Drafts, none | No drafts yet | Drafts appear here when an analysis finishes. | — |
| Drafts, all reviewed | All drafts reviewed | You've approved or rejected every draft in this batch. | Re-run analysis |
| Opportunities missing (partial run) | Opportunities aren't ready | The analysis stopped before this step. Run it again to finish. | Re-run analysis |
| (use once integrations ship) Integrations | No tools connected | Connect HubSpot so Braventa can use your pipeline in its recommendations. | Connect HubSpot |

### Errors
| Situation | Message |
|---|---|
| Invalid URL | That doesn't look like a website address. Try something like example.com. |
| Site unreachable | We couldn't reach {{website}}. Check the address is correct and the site is online, then try again. |
| AI service busy / rate-limited | The analysis didn't finish because the AI service was busy. Try again in a minute. |
| Monthly AI budget reached | Your organization has reached its monthly AI usage limit. New analyses will be available on {{reset_date}}, or contact us to raise the limit. |
| PageSpeed unavailable | Google PageSpeed didn't respond, so speed and SEO scores are missing from this run. The rest of the analysis is complete. |
| Sign-in failed | That email and password don't match. Try again or reset your password. |
| Password too short | Use at least 8 characters for your password. |
| Generic fallback | Something went wrong on our side. Try again; if it keeps happening, contact support at {{support_email}}. |

### Loading states
| Situation | Copy |
|---|---|
| Analysis running | Analyzing your business… About 3–4 minutes. You can leave this page and come back. |
| Pipeline steps | Reading the website · Understanding the business · Scoring growth and finding opportunities · Building the 30-day plan · Drafting your first posts |
| Button pending | Starting… · Saving… · Signing in… |
| Page loading | Loading… |

### Notifications (in-app toasts/banners)
| Event | Copy |
|---|---|
| Analysis complete | Your analysis of {{business_name}} is ready. Review the opportunities and drafts. |
| Draft approved | Draft approved. It won't be published until publishing is connected. (Remove the second sentence once publishing ships.) |
| Draft rejected | Draft rejected. Undo |
| Analysis failed | The analysis of {{business_name}} didn't finish. See why |
| Usage near limit | You've used {{percent}}% of this month's AI usage. |

### Onboarding screens
| Element | Copy |
|---|---|
| Sign-in heading | Welcome to Braventa |
| Sign-in subhead | Enter your website and get a growth score, five opportunities, a 30-day plan, and your first drafts. |
| Sign-up confirmation | Check your email for a confirmation link, then come back and sign in. |
| Onboarding heading | Analyze your business |
| Onboarding body | Braventa reads your website, builds a business profile, scores your growth potential, finds the five most valuable opportunities, plans 30 days of content, and drafts your first posts for your approval. |
| Field: website | Website · placeholder: example.com |
| Field: business name | Business name (optional) · placeholder: We'll detect it from your website |
| Helper | Takes about 3–4 minutes. You can leave the page and come back. |
| Button | Analyze website |

### Approval states
| State | Label | Helper / actions |
|---|---|---|
| Planned (brief only) | Planned | Topic and brief in the calendar; not drafted yet. |
| Needs approval | Needs approval | Approve · Reject |
| Approved | Approved | Undo. Helper: "Approved. Nothing is published automatically." |
| Rejected | Rejected | Undo |
| Section reminder | — | Nothing is published until you approve it. |
| (use once publishing ships) Scheduled | Scheduled | Will publish to {{channel}} on {{date}}. Cancel |

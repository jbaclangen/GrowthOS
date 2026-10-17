# Pro integrations roadmap: connect during discovery, then act in connected tools

**Status:** plan (founder, 2026-10-12, D-041). Build starts the weekend of 2026-10-17. Amended by the founder on
2026-10-18: HubSpot read-only is the first CRM (D-048), publishing runs through a vendor and an in-app scheduler
(D-049), Search Console data reaches the diagnosis as the first new module (D-051), and provider applications start
now (D-053). Only the Google Search Console connection is live (PR #23), and its data isn't used in the diagnosis yet;
everything else here is **Coming soon** and must stay labeled that way in the app and on braventa.io until it ships.

## 1. What the founder wants

During discovery, Braventa asks a Pro owner (and anyone in the Pro trial) to connect the tools the business already
uses, the same way it asks about pain points. Connected data makes the diagnosis and plan specific to the business.
For Pro, the same connections later let Braventa **create, publish and manage content** in those tools, using the
recommended solutions from the growth plan, with the owner approving each action (D-013).

Basic accounts see the step too, but with the connections marked Pro and paused, the same way the Search Console
connection behaves after the trial (data kept, nothing new fetched).

## 2. The discovery step: "Connect your tools" (optional)

Placed after the pain points and before the follow-up questions (`/onboarding/[sessionId]` → new step), and repeated
in Settings → Connections.

1. Braventa suggests connections based on what the owner picked and the tools they named (BI-12 "tools" field), for
   example: "You said leads go cold → connect HubSpot so we can see where."
2. Each card says what Braventa reads, what it can never do, and that disconnecting deletes the stored data.
3. **Read-only first.** The discovery step only asks for read scopes. Write and publish scopes are requested later,
   one tool at a time, when the owner turns on an action that needs them (incremental authorization). The owner can
   skip every connection and still get a plan.
4. Connected data goes into the diagnosis as its own evidence type ("From your tools"), cited like audit findings
   (D-038), never mixed with website observations.
5. The AI assistant connection (MCP) gets a matching tool later, so an owner's assistant can suggest which tools to
   connect, but only the owner can authorize a connection, in Braventa.

## 3. Integrations, scopes and purpose

Scopes are the expected ones as of October 2026. **Check each provider's current documentation before building**;
several need the provider's app review before real customers can connect.

| Tool | Auth | Read scopes (discovery, analysis) | Write scopes (Pro actions, later) | Provider approval |
|---|---|---|---|---|
| Google Search Console | Google OAuth | `webmasters.readonly` (**live**) | none planned | Google verification before 100 users |
| Google Analytics 4 | Google OAuth | `analytics.readonly` | none planned | Google verification |
| Google Business Profile | Google OAuth | `business.manage` (no read-only scope exists) | posts, replies to reviews (owner-approved) | Business Profile API access request |
| HubSpot | HubSpot OAuth, per tenant, over the REST API (not HubSpot's MCP server); an unlisted marketplace app on platform 2026.09, API version `2026-09` (D-048) | contacts, companies, deals, lists: read (`crm.objects.contacts.read`, `crm.objects.companies.read`, `crm.objects.deals.read`, `crm.lists.read`); not `forms` or `content`, since neither is read-only | create/update contacts and tasks, draft marketing emails (`crm.objects.contacts.write`, …) only after the owner enables an action | None while unlisted (up to 25 installs; sign the Acceptable Use Policy before installing outside test accounts); a marketplace listing and HubSpot's review beyond 25 |
| Canva | Canva Connect API OAuth | `design:meta:read`, `design:content:read`, `asset:read`, `brandtemplate:meta:read` | `design:content:write`, `asset:write`; brand-template autofill needs Canva Enterprise on the customer's side | Canva integration review |
| HeyGen | API key from the customer's account (encrypted like OAuth tokens) | list avatars/videos | create avatar videos from approved scripts | none; usage billed to the customer's HeyGen account |
| Higgsfield | API key (confirm a public API exists for customers) | — | generate video/image from approved prompts | confirm terms allow use on behalf of customers |
| Facebook Pages + Instagram (Meta) | Meta OAuth | `pages_show_list`, `pages_read_engagement`, `instagram_business_basic` (Instagram Login; `instagram_basic` with Facebook Login), insights | `pages_manage_posts`, `instagram_business_content_publish` (Facebook Login: `instagram_content_publish`) | Meta App Review + business verification |
| LinkedIn (company page) | LinkedIn OAuth | `r_organization_social` | `w_organization_social` | Community Management API approval |
| YouTube | Google OAuth | `youtube.readonly` | `youtube.upload` | Google verification (sensitive) |
| TikTok | TikTok OAuth | `user.info.basic`, `video.list` | `video.publish` (Content Posting API) | TikTok app audit; unaudited apps post privately only |
| X (Twitter) | X OAuth 2 | `tweet.read`, `users.read` | `tweet.write` | Developer console; pay-per-use API ($0.015 a post, $0.20 with a link) |

For publishing (D-049, §4), Outstand's managed keys cover Facebook, Instagram and LinkedIn, so those networks need no
developer app of Braventa's own at first. The social scopes above are for Braventa's own apps: read data for the
diagnosis, and direct connectors later. Google Business Profile needs Braventa's own Google app on every route. X is
skipped at launch.

## 4. How it's built (reuse what Search Console proved)

- **Storage:** `integration_connections` (extend the `provider` check list) and AES-256-GCM token encryption with
  `INTEGRATIONS_ENCRYPTION_KEY` (`lib/integrations/secret-box.ts`). API keys (HeyGen, Higgsfield) are stored the same
  way as refresh tokens. One row per organization per provider; `scopes` records what was granted.
- **OAuth:** the same pattern as `api/integrations/google/{start,callback}`: PKCE, state bound to user + organization,
  owner only, plan check with the user's client, errors logged without secrets. One generic route per provider.
- **Plan gate:** a Pro feature per connection in `tiers.ts`, checked like `searchConsoleAccess`; paused after the trial
  on Basic.
- **Data:** per-provider snapshot tables (like `search_console_snapshots`) with `organization_id` + RLS, deleted on
  disconnect; compact summaries go into the diagnosis prompt as untrusted data.
- **Actions (Pro, later):** every write is a drafted action the owner approves in Braventa before it runs (D-013);
  n8n executes it and calls back to `/api/n8n/*` (CLAUDE.md architecture rule). Each action logs what was sent where.
  Publishing is the exception: an in-app scheduler runs it (D-049, below).
- **Privacy and legal:** each new connection updates the Privacy Policy, Sub-processors list and the in-app
  explanation before it goes live; Google connections also follow the Google API Services User Data Policy (Limited
  Use). CRM data is personal data: before the HubSpot connection ships, it also needs retention rules, and
  disconnecting deletes it (D-048).

### Publishing (planned, D-049)

Not built, and out of the MVP (MVP_SCOPE.md §4): until it ships, nothing in the app or on braventa.io may say
Braventa publishes. Publishing is a Pro feature (D-030, D-041).

- **Braventa builds the planner first:** calendar, per-network variants, media library, internal and client approval
  (D-047), comments, revisions and an audit trail, without publishing.
- **Executor:** an in-app scheduler, not n8n. Supabase Cron (`pg_cron`) calls a dispatch route in the app with a
  secret, the way Postgres already sends job hand-offs to `/api/jobs/continue` in production (D-042). This amends
  D-041's "executed by n8n" for publishing only; n8n can take over later.
- **Vendor:** Outstand, confirmed after a one-week spike, behind a `Publisher` interface so the vendor can change.
  Zernio and Ayrshare are the fallbacks. High-volume networks move to direct connectors later.
- **Launch networks:** Facebook Pages, Instagram, Google Business Profile and LinkedIn. Facebook, Instagram and
  LinkedIn go through Outstand's managed keys; Google Business Profile follows once Google approves API access, and
  must not block the launch. X is skipped. TikTok, YouTube Shorts, Pinterest, Threads and Bluesky come later.
- **Safeguards:** a variant publishes only if its approved revision is the current one, enforced in the database
  (D-013). Tokens Braventa stores are encrypted with `secret-box.ts`, scopes are minimal, and access can be revoked.
  An idempotency key, and a check with the provider before any retry, keep a timeout from causing a double post.
- **Needs:** team roles (D-046) for approvals; transactional email (Q-010) for notifications. Touches Q-031 (agent
  execution model) and Q-006 (n8n host).

## 5. Suggested order (from the weekend of 2026-10-17)

1. Discovery step "Connect your tools" with Search Console (already built) and the Pro gate.
2. Search visibility, the first new module (D-051): Search Console data in the diagnosis
   (`searchConsoleSummaryForPrompt`, written but not yet called). The module registry comes first (D-051 steps 1–5,
   no change in behavior), so this isn't written twice.
3. GA4 (same Google client; add the scope and verification).
4. HubSpot read-only (D-048): the unlisted HubSpot app, a wider `integration_connections` provider check, OAuth start
   and callback routes, a CRM snapshot table and a `tiers.ts` gate entry. GoHighLevel replaces it if the testers turn
   out to be agency-managed. Salesforce and Keap ingestion are deferred. D-048 also names a zero-build path for Claude
   users: connecting Claude to both Braventa's MCP server and the vendor's official one.
5. Canva and HeyGen read + draft actions (approval-gated).
6. Social accounts: the planner first, then publishing (D-049, §4) to Facebook Pages, Instagram and LinkedIn, and
   Google Business Profile once Google approves (Meta Business Verification and Google Business Profile API access
   have no stated time, so apply early: §7).
7. Higgsfield, then TikTok, YouTube Shorts, Pinterest, Threads and Bluesky after their API terms are confirmed. X is
   skipped (D-049).

## 6. Open items
- Which tools do the first testers actually use? Build those first. In particular, ask whether an agency runs their
  marketing: GoHighLevel replaces HubSpot as the first CRM if so (D-048).
- Outstand is confirmed only after the one-week spike (D-049); the vendors are small and reprice often, so keep the
  `Publisher` adapter thin.
- Provider approvals can be slow, so start the applications before the code is finished (§7). Meta says App Review
  decisions come within a week. Meta Business Verification and Google Business Profile API access have no stated time
  (Google said in September 2026 that processing is delayed). LinkedIn, TikTok and Google verification can take weeks.
- Costs: X's pay-per-use API ($0.015 a post, $0.20 with a link; the legacy Basic and Pro plans moved to it), if X is
  added after launch (D-049); HeyGen and Higgsfield usage billed to the customer's own account or to Braventa?

## 7. Provider applications to start now (D-053)

Provider reviews drive the timeline more than code does. The founder decided to apply now under Pixel Marketing
Design rather than wait for the US LLC, because Meta Business Verification and LinkedIn's Community Management API
need a registered legal organization. Before each application, check the provider's rules for moving an app to
another business; plan to transfer the apps to the Braventa LLC once it's registered. Requirements and sources:
[research README](../research/README.md) §3.

| Application | Needs a registered organization | Why now | Notes |
|---|---|---|---|
| Google Business Profile API ("Application for Basic API Access") | No | Critical path for publishing: every route, Outstand included, needs Braventa's own Google app; local SEO needs it too | Needs a Business Profile verified and active for 60+ days that lists a website, and the Google Cloud project number. Quota is 0 until approved |
| Meta Business Verification, then App Review | Yes | Read scopes for social connections, a hedge against the vendor, and direct connectors later | One Meta app for the Facebook and Instagram permissions. Start Business Verification now; submit App Review once the connect flow works |
| LinkedIn Community Management API | Yes | Company-page reads and posting with Braventa's own app (`r_organization_social`, `w_organization_social`) | A dedicated app with no other API products; personal posting needs a separate app |
| HubSpot developer app | No | The first CRM (D-048) | Unlisted, platform 2026.09. Sign the Acceptable Use Policy before installing outside test accounts |
| TikTok app shell | No | A later network | Create the app now; the Content Posting API audit comes later. Unaudited apps post privately only |

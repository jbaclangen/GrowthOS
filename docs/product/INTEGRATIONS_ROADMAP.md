# Pro integrations roadmap: connect during discovery, then act in connected tools

**Status:** plan (founder, 2026-10-12, D-041). Build starts the weekend of 2026-10-17. Only the Google Search Console
connection is live (PR #23); everything else here is **Coming soon** and must stay labelled that way in the
app and on braventa.io until it ships.

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
| HubSpot | HubSpot public app OAuth | contacts, companies, deals, lists: read (`crm.objects.contacts.read`, `crm.objects.companies.read`, `crm.objects.deals.read`, `crm.lists.read`); not `forms` or `content`, since neither is read-only | create/update contacts and tasks, draft marketing emails (`crm.objects.contacts.write`, …) only after the owner enables an action | HubSpot app listing review for the marketplace (not needed for private testing) |
| Canva | Canva Connect API OAuth | `design:meta:read`, `design:content:read`, `asset:read`, `brandtemplate:meta:read` | `design:content:write`, `asset:write`; brand-template autofill needs Canva Enterprise on the customer's side | Canva integration review |
| HeyGen | API key from the customer's account (encrypted like OAuth tokens) | list avatars/videos | create avatar videos from approved scripts | none; usage billed to the customer's HeyGen account |
| Higgsfield | API key (confirm a public API exists for customers) | — | generate video/image from approved prompts | confirm terms allow use on behalf of customers |
| Facebook Pages + Instagram (Meta) | Meta OAuth | `pages_show_list`, `pages_read_engagement`, `instagram_basic`, insights | `pages_manage_posts`, `instagram_content_publish` | Meta App Review + business verification |
| LinkedIn (company page) | LinkedIn OAuth | `r_organization_social` | `w_organization_social` | Community Management API approval |
| YouTube | Google OAuth | `youtube.readonly` | `youtube.upload` | Google verification (sensitive) |
| TikTok | TikTok OAuth | `user.info.basic`, `video.list` | `video.publish` (Content Posting API) | TikTok app audit; unaudited apps post privately only |
| X (Twitter) | X OAuth 2 | `tweet.read`, `users.read` | `tweet.write` | Developer console; pay-per-use API ($0.015 a post, $0.20 with a link) |

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
- **Privacy and legal:** each new connection updates the Privacy Policy, Sub-processors list and the in-app
  explanation before it goes live; Google connections also follow the Google API Services User Data Policy (Limited
  Use).

## 5. Suggested order (from the weekend of 2026-10-17)

1. Discovery step "Connect your tools" with Search Console (already built) and the Pro gate.
2. Wire Search Console data into the diagnosis (`searchConsoleSummaryForPrompt`, already written).
3. GA4 (same Google client; add the scope and verification).
4. HubSpot read-only (needs a HubSpot public app).
5. Canva and HeyGen read + draft actions (approval-gated).
6. Social accounts (Meta, LinkedIn, Google Business Profile first; Meta Business Verification and Google Business
   Profile API access have no stated time, so apply early).
7. Higgsfield, YouTube, TikTok, X after their API terms are confirmed.

## 6. Open items
- Which tools do the first testers actually use? Build those first.
- Provider approvals can be slow, so start the applications before the code is finished. Meta says App Review
  decisions come within a week. Meta Business Verification and Google Business Profile API access have no stated time
  (Google said in September 2026 that processing is delayed). LinkedIn, TikTok and Google verification can take weeks.
- Costs: X's pay-per-use API ($0.015 a post, $0.20 with a link; the legacy Basic and Pro plans moved to it); HeyGen
  and Higgsfield usage billed to the customer's own account or to Braventa?

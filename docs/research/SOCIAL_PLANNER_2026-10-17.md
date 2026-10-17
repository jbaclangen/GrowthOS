# Social planner research (2026-10-17)
**Status:** research for founder decision; nothing here is built. Unverified facts are marked [U]. Key claims were checked on 2026-10-17; see "Verification" at the end.

**Bottom line:** Build the planner, calendar, approvals and audit trail yourself. Those are the product and fit D-013. Buy publishing from a unified API at first. Use Outstand as the main option: its plans include managed keys, so FB, IG and LinkedIn need no developer app of Braventa's own. Keep Zernio (formerly Late) and Ayrshare as fallbacks. Keep it behind a `Publisher` interface so you can move to direct APIs per network later. Launch with Facebook Pages, Instagram, Google Business Profile and LinkedIn. GBP needs Braventa's own Google app and Basic API Access on every route, so apply now. Skip X at launch.

*Changed after verification: Zernio moved from co-main option to fallback, because its new per-account pricing costs about $138/mo at 10 customers against Outstand's $19, and Outstand's managed keys turned out to be included rather than a $69/mo add-on.*

Repo context: `docs/product/INTEGRATIONS_ROADMAP.md` already plans Meta, LinkedIn and GBP first among social accounts (step 6 of 7 in its suggested order), with scopes `pages_manage_posts`, `instagram_content_publish` and `w_organization_social`. It also notes that app reviews take weeks. This research agrees, with one nuance: Meta says App Review decisions come within a week, and the longer waits are Business Verification, GBP access and the other networks.

"[U]" marks a fact that is unverified: third-party or competitor sources only, or sources that conflict.

## 1. Feature matrix

| Feature | Metricool | GHL Social Planner | Buffer/Hootsuite/Sprout/Agorapulse | Braventa |
|---|---|---|---|---|
| Networks | FB, IG, TikTok, X, LinkedIn, YouTube, Pinterest, GBP, Threads, Bluesky, Twitch [U, partly] | GBP, FB, IG, LinkedIn (profile + page), X, TikTok, YouTube, Pinterest, Threads, Bluesky, GHL Community [U, from a job post] | Similar breadth | **MVP:** FB, IG, GBP, LinkedIn. **Later:** the rest |
| Post types: feed, carousel, reels, stories, shorts, pins, GBP posts, threads | Yes | Yes (TikTok video only per one review [U]) | Yes | **MVP:** feed, carousel, GBP update. **Later:** reels, shorts, stories, pins |
| Calendar views (month/week/list) | Yes; shareable public view-only link (Studio) | Yes | Yes | **MVP:** month + list |
| Best time to post | Yes; needs 100+ followers | Partial [U] | Yes | Later (needs analytics) |
| Queues, time slots, evergreen | Autolists (rotating sets, built from CSV/RSS) | Content categories / evergreen slots [U] | Buffer queues; Hootsuite autoschedule | Later |
| Recurring posts | Via autolists | Yes (help article exists; contents not confirmed) | Some | Later |
| Bulk CSV upload | Yes (into autolists) | Yes; Basic + Advanced CSV, no hard cap per official help | Yes | Later. The AI already makes posts in batches |
| Drafts | Yes | Yes | Yes | **MVP** (exists: `needs_approval`; the `content_status` enum also has `scheduled` and `published`) |
| Internal reviewer approval | Yes, Advanced and Custom plans | Yes, opt-in per post ("Scheduled for Approval"); reviewer gets email and an Approval tab. Not enforceable: a Dec 2024 user comment on the 2022 "Approval Flow" request called it a "courtesy notice," and the Aug 2023 request to require approval is still under review [U] | All four | **MVP, enforced** |
| Client approval via link (no login) | Yes, per-post approval; Advanced and Custom plans | Yes, "magic links" (valid 30 days, optional password): approve with notes, reject with feedback, reschedule, approve all / reject all. No separate "request changes" action | Sprout: up to 3 external approvers on Advanced, no extra cost (Link Sharing must be on) | **MVP** (signed link) |
| Multi-step approvals | No evidence found | No | Sprout, Hootsuite Advanced/Enterprise [U] | Later |
| Comments, version history | Comments on rejection | Rejection comment | Planable has version history | **MVP:** comments + revision snapshot |
| Notifications | Yes | Email | Yes | **MVP:** email (needs email sending, not live today) |
| Team roles in the planner | Users from Advanced [U] | GHL user permissions | Custom roles on top tiers | **MVP:** owner / editor / approver / client |
| Media library | Yes | Yes | Yes | **MVP:** basic (Supabase Storage) |
| Link in bio | Yes (SmartLinks) [U] | Not found | Later, Hootsuite | Skip |
| First comment | Yes (help article exists) | Yes; FB, IG, LinkedIn, YouTube | Yes | Later |
| Hashtags (suggestions/groups) | Yes | Yes | Yes | **MVP:** in the AI draft |
| AI captions | Yes | Yes | Yes | **MVP** (already live) |
| Post analytics | Core strength | Basic | Yes | Later (read scopes) |
| RSS auto-post | Autolists via RSS | Unverified | Some | Skip |
| Unified inbox / comments | Yes | Partial; reviews disagree | Yes | **Out of scope** |

## 2. Connectors

| Network | Official publish API | Native scheduling? | Key scopes | Review / timeline | Limits, constraints, cost | Gotchas |
|---|---|---|---|---|---|---|
| Facebook Pages | Graph `/{page-id}/feed`, photos, videos; Reels Publishing API | **Yes**: `published=false` + `scheduled_publish_time`. Window is 10 min to 30 days per the Posts guide, 10 min to 75 days per the Page Feed reference (Meta's docs conflict). Reels: `video_state=SCHEDULED`, 10 min to 29 days. Stories: no scheduling documented | `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` | Meta App Review (Advanced Access) + Business Verification. Meta says App Review decisions come within a week. It gives no time for Business Verification; third-party reports say days to about 30 days [U] | Free. Reels: 30 API-published per rolling 24 h | `published` defaults to `true` (publish immediately). Third-party blogs say sending the time without `published=false` posts at once [U]; always send it. Read the post back afterwards |
| Instagram (professional: Business/Creator) | Container then `media_publish` (feed, carousel, reels, stories) | **No**: no scheduling parameter; Braventa calls `media_publish` at the scheduled time | IG Login: `instagram_business_basic` + `instagram_business_content_publish`. FB Login: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` (+ `ads_management`/`ads_read` if the Page role comes through Business Manager) | Same Meta app; one App Review submission can include FB and IG permissions (Meta doesn't say outright that one review covers both) | 100 API posts per 24 h per the guide's rate-limit section; the `content_publishing_limit` endpoint, the `media_publish` reference and the guide's carousel section say 50 (docs conflict). A carousel counts as one post. Read `quota_total` from the endpoint | Professional account only. FB-Login path needs a linked Page and a Page access token; IG-Login path needs no Page. Media must be on a public server at publish time |
| LinkedIn company page | Posts API | **No** | `w_organization_social` (Community Management API) | Dev tier: verified business email, org, website/domain, and an app verified by the org's Page; registered legal orgs with commercial use only. Standard tier: form + screen recording of each use case + test credentials; discretionary, can be refused. A rejected app means a new app to reapply | Dev tier: 500 calls/app/day, 100/member/day; no BATCH_GET; build and test within 12 months | Community Management API needs a dedicated app (a new app with no other API products) |
| LinkedIn personal | Posts API via "Share on LinkedIn" | No | `w_member_social` | Self-serve: add the "Share on LinkedIn" product | Free; 150 requests/member/day, 100,000/app/day | Adding it to an app blocks a later Community Management request on that app, so use a separate app |
| X | v2 `POST /2/tweets` + media upload | No | `tweet.read`, `tweet.write`, `users.read`, `media.write`; `offline.access` for refresh tokens (access tokens expire after 2 h without it) | Developer console | Pay-per-use only, no subscriptions: $0.015/post, **$0.20 if the post has a URL** (up from $0.01 on Apr 20, 2026), $0.010 per summoned reply. Legacy Basic and Pro were deprecated and moved to pay-per-use (Basic after Jun 1, Pro after Sep 1, 2026); Enterprise is the only alternative | Costs per post; local businesses rely on links |
| TikTok | Content Posting API (Direct Post) | No | `video.publish` | Audit 2–6 wks [U] (TikTok gives no duration) | Unaudited: posts are private (`SELF_ONLY`), the posting account must be private, max 5 users per 24 h. About 15 posts/day per creator, shared across all Direct Post clients | Must show creator info (nickname), a privacy-level dropdown with nothing preselected, interaction toggles, commercial-content disclosure, consent text and a preview |
| YouTube Shorts | Data API `videos.insert` | **Yes**: upload private + `status.publishAt` | `youtube.upload` | Compliance audit, plus Google OAuth verification for sensitive scopes | Upload quota: 1,600 units, or a separate 100 uploads/day bucket (conflicting [U]) | Unverified projects can upload private only |
| Pinterest | v5 `POST /pins` | No | `pins:write`, `boards:read` | Trial then Standard; demo video; days to weeks, often stuck [U] | Trial: writes blocked or pins private [U] | Rejected if the demo skips OAuth |
| Google Business Profile | My Business v4 `accounts.locations.localPosts` (still v4; only `localPosts.reportInsights` is deprecated) | No | `business.manage` (`plus.business.manage` also accepted) | GBP API contact form, "Application for Basic API Access", with the Cloud project number. Google gives no review time, and said on Sep 15, 2026 that processing is delayed (reported by SERoundtable); "days to weeks" is a third-party estimate [U]. Quota is 0 QPM until approved | 300 QPM once approved | Profile must be verified and active for 60+ days and list a business website; the request email must be an owner/manager |
| Threads | Threads API (container then publish) | No | `threads_basic`, `threads_content_publish` | Meta review per permission; 2 days to 4 wks [U] | 250 posts per 24 h | Testers can publish before review |
| Bluesky | AT Protocol `createRecord` (from training knowledge, not re-checked this session [U]) | No | OAuth (atproto) or app password | None | Free; 300 chars, 4 images [U] | Easiest; low value for local SMBs |

### MCP servers for social posting
- **Official:** Ayrshare Action MCP (`https://api.ayrshare.com/mcp`, Streamable HTTP, account API key as a Bearer token, no OAuth; profiles need the Business plan or Enterprise), Buffer (GraphQL API announced May 27, 2026, with an MCP server, a CLI and managed OAuth), and Metricool MCP. Metricool's MCP works on every plan, including Free (plan limits still apply); its REST API needs Advanced or Custom, from €43/mo billed annually (€54 billed monthly).
- **Open source:** Postiz (self-hostable, about 18 channels, MCP), Publer MCP (community wrapper), postforme-mcp-pro (MIT, very early).
- **Use for Braventa:** low. Publishing must sit behind Braventa's approval gate (D-013). Use MCP for operator workflows, or expose Braventa's own approved queue via `/api/mcp` later.

### Unified APIs (buy option)

| Vendor | Pricing (Oct 2026) | Notes |
|---|---|---|
| Ayrshare | Premium $149 (1 profile), Launch $299 (up to 10 profiles), Business $599 (30 profiles included; $499 base billed annually), then $8.99 per profile for 31–100 and $3.49 for 101–500, up to 300 profiles; Enterprise from 300, custom. These are monthly-billing prices; third-party trackers list Premium $129 and Launch $249 billed annually [U] | Mature, white-label OAuth, official MCP. Most expensive per customer. The 300-profile Business ceiling dates from early Jul 2026 per PricingSaaS [U]; the official calculator still shows a 500+ tier |
| Zernio (formerly Late) | Per connected account since May 6, 2026: first 2 free, $6 each for 3–10, $3 for 11–100, $1 for 101–2,000, custom above. Unlimited posts within per-account caps; all features included; X API calls passed through at cost | Cheap for a few accounts, dearer than Outstand at Braventa's volumes (4 accounts per customer). 16 platforms per its docs, 17 per its homepage |
| Outstand | Pay as you go $19/mo incl. 3,000 posts, then $0.007/post up to 10,000 and $0.005 above. Business $129/mo incl. 50,000 posts, then $0.005/post. Managed Keys included in both, no add-on | Managed keys cover LinkedIn, Instagram, Facebook, Threads, TikTok, YouTube, Pinterest and Bluesky. X, GBP, Vimeo and Reddit need Braventa's own app and the platform's review |
| Publer API | Business plan only (~$10/mo plus ~$7 per account [U]) | Built for one team's own workspaces, not resale |
| Buffer API | GraphQL; API key is personal (own workflows). Third-party OAuth is live: App Clients with OAuth 2.0 + PKCE, without the `insightsRead` scope. Legacy REST retires **Feb 1, 2027** | App Clients act for other Buffer users, so each client would need a Buffer account. Not a resale backend |
| Metricool API | Needs Advanced or Custom | Built for agencies using Metricool itself |

## 3. Recommended architecture

### Data model
All tables get `organization_id` and RLS via `is_member()`.
- **`social_accounts`**
  - Columns: network, external id, display name, scopes, status, `token_ref`, expires_at.
  - Token storage: keep tokens in Supabase Vault or encrypt them in the app (pgsodium/KMS). Never store plaintext.
- **`media_assets`**: storage path, mime type, dimensions, duration, checksum.
- **`posts`**: brief, origin, `status`, current_revision_id, created_by.
- **`post_revisions`**: immutable snapshots. Every edit adds one, which gives the version history.
- **`post_variants`**: one row per post and account.
  - Content: caption, media ids, post type, first_comment.
  - Schedule: scheduled_at.
  - Result: `publish_status`, external_post_id, attempt_count, last_error, idempotency_key.
- **`approval_requests`**: post_id, revision_id, step, approver_role or email, token_hash, expires_at.
- **`approvals`**: request_id, actor (user or external email), decision, comment, at.
- **`post_events`**: append-only audit trail of who did what, when, and from which IP for external links.

### States
`draft → in_review → changes_requested → (edit) in_review → approved → scheduled → publishing → published | failed`.
- Any edit after approval creates a new revision and resets the post to `in_review`, so approval is tied to a revision id.
- `failed` can be retried by hand.
- Publishing only accepts variants whose approved revision equals the current revision. This enforces D-013 in the database, not only in the UI.

### Client approval link
- Single-use signed token. Store only its SHA-256 hash, expire it after 7 days, and limit it to one post or batch.
- No login needed. Approve, request changes and comment happen through rate-limited server actions.
- Log every action to `post_events`.

### Scheduler
- **Vercel Hobby** cron runs at most once a day, and only to the hour (±59 min). Not usable for this.
- **Vercel Pro** allows per-minute cron.
- **Recommended: Supabase Cron (pg_cron).** It runs every minute, or every 1–59 seconds (needs Postgres 15.1.1.61 or later). Supabase recommends at most 8 concurrent jobs, each running under 10 minutes. It calls `pg_net` (`net.http_post`) to hit `/api/social/dispatch` with a secret, or queues work with `pgmq.send`. It is close to the data. Supabase has no Cron line item, but the work it triggers is billed as usual: database compute, `pg_net` egress, and each dispatch call (a Vercel function invocation here; Edge Functions would count against 500K/month on Free and 2M on Pro). Free projects pause after a week of inactivity.
- **n8n** can take over execution later, per the architecture rule. Supabase stays the system of record either way.

### Publishing worker
1. Claim due variants with `UPDATE … SET publish_status='publishing' WHERE scheduled_at<=now() AND publish_status='scheduled' … FOR UPDATE SKIP LOCKED`.
2. Retry with exponential backoff, at most 5 attempts, retrying only on 429/5xx.
3. Use the idempotency key `variant_id:revision_id`. Before any retry, check `external_post_id` or ask the provider whether the post already went out, so a timeout never causes a double post.
4. Use native scheduling where it exists (FB feed and Reels, YouTube) only as an optimization. Keep one code path at first.
5. Refresh tokens ahead of expiry. When an account needs reconnecting, set it to `reauth_required` and notify the owner.
6. Fit the hosting time limit (see #31): upload large videos asynchronously, and poll IG and TikTok containers on later ticks.

### Launch order and why
- **Facebook + Instagram:** where local service businesses are. One Meta app can request both networks' permissions in one App Review submission (Meta doesn't say outright that one review covers both).
- **Google Business Profile:** local search value. The form is short, but Google gives no review time, said in Sep 2026 that processing is delayed, and Outstand has no managed keys for GBP. Apply now, and don't let GBP block the launch. *Changed after verification: GBP access was called quick; it is now treated as the least predictable approval.*
- **LinkedIn:** for B2B services. Company pages need Community Management approval, so start with personal posting if that is slow. Use a separate app for personal posting, because adding "Share on LinkedIn" blocks a later Community Management request on the same app.
- **Later:** TikTok and YouTube Shorts (need video and an audit), Pinterest, Threads, Bluesky.
- **Skip X at launch:** $0.20 per post with a link, low SMB value, and Outstand needs Braventa's own X app.

### Buy vs build
Assumption: 1 customer = 1 profile, 4 networks (4 Zernio accounts), about 120 posts/month. Ayrshare figures use monthly billing.

| Customers | Ayrshare | Zernio | Outstand (managed keys included) | Build direct |
|---|---|---|---|---|
| 10 | $299/mo (Launch) | ~$138/mo (40 accounts) | $19/mo (1,200 posts, within the included 3,000) | ~$0 API cost; 4–8 dev-weeks + reviews |
| 100 | $599 + 70 × $8.99 ≈ $1,230/mo (≈ $1,060 billed annually) | ~$618/mo (400 accounts) | $19 + $49 + $10 ≈ $78/mo (12,000 posts) | ~$0 (+X if used) |
| 1,000 | Enterprise, custom (Business tops out at 300 profiles) | Custom (over 2,000 accounts) | Business: $129 + 70,000 × $0.005 ≈ $479/mo (120,000 posts) | ~$0 API cost, ongoing maintenance as APIs change |

*Changed after verification: Outstand's managed keys are included (not a $69/mo add-on), so its figures dropped from about $88/$165/$740 to $19/$78/$479, and Ayrshare's 100-customer figure dropped from $1.5–3k to about $1,230.*

## Phased plan
- **Phase 0 (now, in parallel):**
  - Apply for GBP Basic API Access first. Launch depends on it, because Outstand has no managed keys for GBP and Google gives no review time. *Changed after verification: GBP was one of three equal applications; it is now on the critical path.*
  - Apply for Meta App Review + Business Verification and LinkedIn Community Management, for direct connectors later and as a hedge against the vendor.
  - Start TikTok and Pinterest applications.
  - Pick a unified-API vendor after a 1-week spike.
- **MVP:**
  - Data model + RLS, calendar (month/list), editing variants for each network, and a media library.
  - Internal approval + client magic link, comments, revisions and audit trail.
  - Scheduler (pg_cron) + worker publishing to FB, IG and GBP (+ LinkedIn) through a `Publisher` interface.
  - Notifications need email sending first, which is not live today.
- **Later:**
  - Best time, queues and evergreen, CSV upload, first comment, multi-step approvals, analytics.
  - Reels, Shorts and TikTok; Pinterest, Threads, Bluesky.
  - Direct connectors for the highest-volume networks, to cut vendor cost.
- **Skip:** link in bio, RSS auto-post, inbox.

## Risks
- **Timelines:** app reviews can be refused or slow. Meta says App Review decisions come within a week, but Business Verification has no stated time [U]. Google gives no GBP review time and reported delays in Sep 2026. LinkedIn Standard tier is discretionary, and Pinterest trial access stalls. This drives the timeline more than code does.
- **Vendor risk:** pricing churns. PricingSaaS logs about six Ayrshare pricing or packaging changes in 2026 [U], and Zernio dropped its tiers for per-account pricing in May 2026. These are small companies (Outstand, Zernio). Keep the adapter layer thin.
- **Meta doc conflicts:** Meta's docs disagree on the Instagram limit (100 vs 50) and on the Facebook scheduling window (30 vs 75 days). Read `quota_total` from the limit endpoint instead of hard-coding it, and use the shorter Facebook window (30 days; 29 for Reels).
- **Doc impact:** publishing is a new capability. Before building, update `MVP_SCOPE.md`, `PLANS_AND_TIERS.md` (Pro vs Basic) and `DECISION_LOG.md`. Until then, copy must not claim publishing.
- **Token security:** a token leak means posting as the client. Encrypt tokens, request only the scopes needed, and allow revoking.
- **Double posts on timeouts:** idempotency and checking the provider before a retry are mandatory.
- **Untrusted content:** text from approval-link comments must stay out of model prompts, the same as crawled content.

## Sources
- Meta Pages posts (scheduling, 10 min to 30 days; v25.0, no update date shown): https://developers.facebook.com/docs/pages-api/posts
- Instagram content publishing: https://developers.facebook.com/documentation/instagram-platform/content-publishing
- Threads overview: https://developers.facebook.com/docs/threads/overview
- TikTok content sharing guidelines: https://developers.tiktok.com/doc/content-sharing-guidelines
- TikTok Direct Post: https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post
- LinkedIn increasing access: https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access
- GBP prerequisites: https://developers.google.com/my-business/content/prereqs
- YouTube quota: https://developers.google.com/youtube/v3/determine_quota_cost
- Pinterest trial/standard (forum): https://community.pinterest.biz/t/update-developer-app-approvals/45527
- X pricing (third-party, 2026): https://www.postproxy.dev/blog/x-api-pricing-2026/ ; https://opentweet.io/x-api-pricing
- Vercel cron limits (updated Jul 15, 2026): https://vercel.com/docs/cron-jobs/usage-and-pricing
- Metricool approval: https://help.metricool.com/it/collaboration-approval-dsf9b
- Metricool scheduling: https://help.metricool.com/content-planning-full-guide-faqs-qc5e1
- Metricool MCP/API plans: https://help.metricool.com/mcp-limits-and-plan-requirements-h72jg.md ; https://help.metricool.com/plans-add-ons-and-api-access-explained-xux1u.md
- GHL magic-link approvals: https://ideas.gohighlevel.com/changelog/social-planner-share-approve-posts-via-magic-links
- GHL "Approval Flow" request (2022, completed Jan 2023; "courtesy notice" comment Dec 23, 2024): https://ideas.gohighlevel.com/social-planner/p/approval-flow
- GHL CSV: https://help.gohighlevel.com/support/solutions/articles/155000005542
- Sprout external approvers: https://support.sproutsocial.com/hc/en-us/articles/205974715
- Approval tool comparison (competitor): https://www.cloudcampaign.com/smm-tips/which-social-media-tools-include-approval-workflows
- Ayrshare Documentation MCP (read-only docs server, not the posting server): https://www.ayrshare.com/docs/additional/mcp-server
- Ayrshare pricing history (third-party): https://pricingsaas.com/companies/ayrshare ; https://www.blotato.com/blog/ayrshare-pricing
- Late/Zernio (old tier pricing, superseded May 2026): https://getlate.dev/social-media-api ; https://zernio.com/changelog/simplified-pricing-plans-for-late-api-users
- Outstand (competitor-sourced, outdated): https://postproxy.dev/compare/outstand/ ; https://trustmrr.com/startup/outstand-so
- Publer API: https://publer.com/help/en/article/how-to-access-the-publer-api-1w08edo.md
- Buffer GraphQL API / REST retirement: https://buffer.com/resources/legacy-rest-api-retired/ ; https://developers.buffer.com/guides/introduction.md
- Open-source MCP list: https://opentweet.io/best-mcp-servers-for-social-media ; https://cursor.directory/mcp/postiz
- Meta Reels publishing (scheduling, 30 per 24 h): https://developers.facebook.com/docs/video-api/guides/reels-publishing
- Meta Page Feed reference (10 min to 75 days): https://developers.facebook.com/docs/graph-api/reference/page/feed/
- Meta Page Stories API (no scheduling): https://developers.facebook.com/docs/page-stories-api
- Meta App Review submission guide: https://developers.facebook.com/docs/app-review/submission-guide
- Instagram Platform overview: https://developers.facebook.com/documentation/instagram-platform/overview ; https://developers.facebook.com/docs/instagram-platform/overview
- Instagram publishing references: https://developers.facebook.com/docs/instagram-platform/content-publishing ; https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit ; https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media_publish ; https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
- LinkedIn Community Management app review and overview: https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review ; https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview
- LinkedIn Share on LinkedIn (self-serve): https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- X pricing (official): https://docs.x.com/x-api/getting-started/pricing
- X legacy plans moved to pay-per-use: https://devcommunity.x.com/t/important-update-legacy-x-api-basic-plans-are-moving-to-pay-per-use-ppu/266305 ; https://devcommunity.x.com/t/important-update-legacy-x-api-pro-plans-are-moving-to-pay-per-use-ppu/273255 ; https://devcommunity.x.com/t/announcing-the-launch-of-x-api-pay-per-use-pricing/256476
- X scopes: https://docs.x.com/x-api/posts/create-post ; https://docs.x.com/x-api/media/upload-media ; https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- X URL price change (Apr 2026): https://techcrunch.com/2026/04/22/x-makes-it-more-expensive-to-post-links-through-its-api/
- GBP localPosts and sunset dates: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts/create ; https://developers.google.com/my-business/content/sunset-dates
- GBP application delays (Sep 2026): https://www.seroundtable.com/google-business-profile-api-application-delays-42085.html
- TikTok Direct Post reference: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- Supabase Cron: https://supabase.com/docs/guides/cron ; https://supabase.com/docs/guides/cron/quickstart ; https://supabase.com/modules/cron
- Supabase pricing and Queues: https://supabase.com/pricing ; https://supabase.com/docs/guides/queues
- Outstand (official): https://www.outstand.so/ ; https://www.outstand.so/docs
- Ayrshare pricing (official): https://www.ayrshare.com/pricing/ ; https://www.ayrshare.com/pricing.md ; https://www.ayrshare.com/docs/multiple-users/business-launch-overview
- Ayrshare 300-profile change (third-party): https://pricingsaas.com/companies/ayrshare/diffs/2026W28
- Zernio pricing (official): https://changelog.zernio.com/blog/pay-per-account-pricing ; https://docs.zernio.com/pricing ; https://zernio.com/pricing ; https://zernio.com/social-media-api
- Ayrshare Action MCP: https://www.ayrshare.com/docs/additional/mcp-action-connect ; https://www.ayrshare.com/docs/additional/mcp-action-server
- Metricool pricing: https://metricool.com/pricing/
- Metricool approval system: https://help.metricool.com/en/article/how-to-send-posts-for-review-with-metricools-approval-system-1hlft5g/
- Buffer API (official): https://buffer.com/resources/buffer-api-is-here/ ; https://developers.buffer.com/guides/authentication.html ; https://developers.buffer.com/guides/rest-migration.md ; https://developers.buffer.com/guides/building-apps.html ; https://buffer.com/developers/legacy-api ; https://support.buffer.com/articles/how-to-create-your-buffer-api-key-ShIgYVwM6j.md
- GHL approval help: https://help.gohighlevel.com/support/solutions/articles/155000007623-external-link-approval-flow-in-social-planner ; https://help.gohighlevel.com/support/solutions/articles/48001229834
- GHL "Require Approval For Social Planner" request (Aug 2023, under review): https://ideas.gohighlevel.com/social-planner/p/require-approval-for-social-planner
- Repo: `docs/product/INTEGRATIONS_ROADMAP.md` (lines 47–48, 77, 82); `supabase/migrations/20261010061028_foundation.sql` (lines 177–178); `web/src/lib/pipeline/jobs.ts` (lines 4–7, #31)

## Verification (2026-10-17)

| id | claim (short) | result | source |
|---|---|---|---|
| social-01 | FB native scheduling 10 min–30 days; not Reels/Stories; time without `published=false` posts now | Corrected: window 30 days (Posts guide) vs 75 days (Feed ref); Reels schedulable (10 min–29 days); Stories not; "posts now" is third-party only | https://developers.facebook.com/docs/video-api/guides/reels-publishing |
| social-02 | IG has no native scheduling; 100 vs 50 limit conflict; professional accounts; public media URL | Confirmed | https://developers.facebook.com/docs/instagram-platform/content-publishing |
| social-03 | IG scopes per login path; Page needed on FB Login; one Meta review; weeks | Corrected: scopes right; one submission can hold both; App Review ~1 week per Meta; BV time unstated | https://developers.facebook.com/docs/app-review/submission-guide |
| social-04 | LinkedIn CM: dedicated app, Dev tier limits, discretionary Standard; personal self-serve | Confirmed ([U] removed) | https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access |
| social-05 | X $0.015/post, $0.20 with URL; Basic/Pro closed to signups; `tweet.write`, `media.write` | Corrected: prices right (Apr 20, 2026); Basic/Pro deprecated and migrated; more scopes needed | https://docs.x.com/x-api/getting-started/pricing |
| social-06 | GBP v4 `localPosts`, `business.manage`, access form, 0/300 QPM, ~60 days | Corrected: v4 and quotas confirmed; 60+ days active + website needed; no Google review time, delays reported | https://developers.google.com/my-business/content/prereqs |
| social-07 | TikTok unaudited private, 5 users/24 h; audit 2–6 wks; UX rules | Confirmed (audit time stays [U]; account must be private; ~15 posts/day cap) | https://developers.tiktok.com/doc/content-sharing-guidelines |
| social-08 | Vercel Hobby cron daily, loose timing; Pro per-minute | Confirmed (page updated Jul 15, 2026) | https://vercel.com/docs/cron-jobs/usage-and-pricing |
| social-09 | pg_cron every minute or seconds, pg_net/pgmq, costs nothing extra | Corrected: 1–59 s confirmed; triggered work still billed | https://supabase.com/docs/guides/cron/quickstart |
| social-10 | Outstand $19 + overage; Managed Keys $69/mo add-on | Corrected: managed keys included; X, GBP, Vimeo, Reddit need own app | https://www.outstand.so/docs |
| social-11 | Ayrshare $129–149 / $249–299 / ~$599, hard cap 300 since Jun 2026, three changes in 2026 | Corrected: $149/$299/$599 monthly; 300 is a Business ceiling; ~six changes [U] | https://www.ayrshare.com/pricing/ |
| social-12 | Zernio free tier, Build $19, Unlimited $666; 13 platforms | Corrected: per-account pricing since May 6, 2026; 16–17 platforms | https://docs.zernio.com/pricing |
| social-13 | Ayrshare MCP at `api.ayrshare.com/mcp`, API key, Business plan for profiles | Confirmed (cited page was the docs MCP; source fixed) | https://www.ayrshare.com/docs/additional/mcp-action-connect |
| social-14 | Metricool MCP on every plan; API needs Advanced (from €43/mo) or Custom | Confirmed (€43 billed annually, €54 monthly) | https://help.metricool.com/mcp-limits-and-plan-requirements-h72jg.md |
| social-15 | Buffer GraphQL + MCP May 2026; third-party OAuth conflict; REST retires Feb 1, 2027 | Corrected: OAuth App Clients live (no `insightsRead`); announced May 27, 2026 | https://developers.buffer.com/guides/authentication.html |
| social-16 | GHL magic links approve/request changes; 2024 "courtesy" request; Metricool Advanced+; Sprout 3 approvers | Corrected: no "request changes" action; quote is a Dec 2024 comment on a 2022 request; enforcement still under review [U]; Metricool and Sprout confirmed | https://help.gohighlevel.com/support/solutions/articles/155000007623-external-link-approval-flow-in-social-planner |
| social-17 | Roadmap plans Meta, LinkedIn, GBP first with listed scopes; reviews take weeks | Confirmed (first among social accounts, step 6 of 7) | `docs/product/INTEGRATIONS_ROADMAP.md:47-48,77,82` |
| social-18 | Drafts use `needs_approval`; no email sending; #31 time limit applies | Confirmed (enum also has `scheduled`, `published`) | `supabase/migrations/20261010061028_foundation.sql:177-178` |

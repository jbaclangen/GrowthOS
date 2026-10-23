# Graph Report - Growth OS  (2026-10-23)

## Corpus Check
- 311 files · ~336,463 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .ico 2, .css 2)

## Summary
- 3364 nodes · 7914 edges · 146 communities (136 shown, 10 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 401 edges (avg confidence: 0.88)
- Token cost: 1,159,677 input · 0 output

## Community Hubs (Navigation)
- Website crawler and robots
- Social planner research
- Brand bible and founder brief
- Decision log: team, seats, integrations
- Analysis start and owner inputs
- Website messaging and module catalog
- Onboarding pages and actions
- MCP route and server metadata
- AI routing, costs and security docs
- System architecture and pipeline docs
- OAuth grants and tokens
- Visual identity and logo
- Open questions and handover
- Decision log: brand and vision
- Pipeline prompts and model comparison
- Brand asset generator
- Search Console client
- Pipeline and hand-off tests
- Site package manifest
- Feature modules and data model docs
- Plan tiers and access
- Sitemap, campaigns and domains
- Google OAuth routes
- Supabase clients and Settings actions
- Foundation schema
- Audit checks
- PageSpeed and report data
- Website-intel scoring step
- Design tokens and component guidelines
- MCP developer docs
- Site page primitives
- Pipeline steps and claims
- Search Console and connections docs
- Product vision and assessment
- Integrations roadmap
- Env, admin client and OpenRouter
- Follow-up question bank
- CLAUDE.md repo guide
- Job dispatch and continue token
- Discovery catalog and classification
- CRM and MCP research
- OAuth consent page
- App guide and demo flow
- Site layout and brand components
- Health checks and dispatch health
- Connect your tools step
- OAuth scopes and consent rules
- MVP scope and next steps
- Product requirements
- Fake Supabase query engine
- Report and dashboard pages
- Module registry
- OAuth server docs
- Website intelligence blueprint
- OAuth token and revoke routes
- OAuth client registration
- Seats, roles and modules research
- Business methodology
- Pricing proposal
- Site contact form
- Map schema and templates
- Voice and messaging
- Plans, tiers and roadmap
- Jobs, hand-off and claims
- Search performance page
- Access key settings
- Growth score computation
- App guide: live capabilities
- AI-assisted onboarding spec
- Product requirements modules
- Report sections and score badge
- MCP authentication
- Plan priority and findings
- Requirements and MVP cross-refs
- Website intelligence gap report
- MCP access and OAuth schema
- Search Console card components
- App layout and logo
- Tenancy and RLS docs
- Web package dependencies
- Plan actions and controls
- Technical checks section
- Plans page and MCP access
- Roadmap and user journeys
- Pipeline test fixtures
- Site tsconfig
- Assistant UI
- Assistant handler and limits
- Web tsconfig
- Job dispatches schema
- Security review and planned CRM
- Growth score and provenance docs
- AI router and assistant route
- Connect your AI assistant docs
- Token build script
- Report infographic
- Login and auth callback
- Diagnosis and plan schema
- Assistant knowledge base
- Contact pipeline docs
- npm scripts
- Plan and diagnosis sections
- Connection actions and return paths
- Assistant prompt builder
- MCP server and keys docs
- Brand asset inventory
- Legal pages
- Onboarding service
- Email templates
- Onboarding sessions schema
- Growth score and MCP tools guide
- Search Console schema
- Web dev dependencies
- Content items and approval docs
- Product overview and audience
- Proposed API objects
- How it works page
- Site home page
- Environments and domains
- Community guidelines
- Web dependencies
- Markdown renderer
- Crawler and SEO module docs
- Email infrastructure
- Lifecycle email templates
- Site indexing config
- Contact requests schema
- Website audit schema
- Assistant usage schema
- Feature modules schema
- Contact form data rules
- Support site plan
- Proxy and Supabase browser client
- Site pricing page
- ESLint config
- Secret box encryption
- Onboarding follow-ups schema
- Migrations catalogue
- MCP config
- Discovery questions tool

## God Nodes (most connected - your core abstractions)
1. `createSupabaseServerClient()` - 67 edges
2. `Decision log` - 59 edges
3. `requireUser()` - 51 edges
4. `Open questions` - 51 edges
5. `MVP scope` - 45 edges
6. `Visual identity` - 44 edges
7. `createSupabaseAdminClient()` - 41 edges
8. `vitest` - 37 edges
9. `Founder brief 2026-10-10: brand system, product blueprint and project memory` - 32 edges
10. `Braventa voice and messaging` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Usage limit reached template (BudgetExceededError)` --references--> `BudgetExceededError`  [INFERRED]
  docs/marketing/EMAIL_TEMPLATES.md → web/src/lib/ai/router.ts
- `moduleEnabled = canUse(tier, featureId) && override not false && integrations connected` --references--> `canUse()`  [EXTRACTED]
  docs/research/SEATS_ROLES_MODULES_2026-10-17.md → web/src/lib/plans/tiers.ts
- `npm run health (web/scripts/health-check.mts)` --semantically_similar_to--> `npm commands in web/ (dev, build, lint, tokens, tokens:check)`  [INFERRED] [semantically similar]
  .claude/agents/braventa-health-check.md → CLAUDE.md
- `Basic plan features` --semantically_similar_to--> `Live capabilities today`  [INFERRED] [semantically similar]
  docs/help/APP_GUIDE.md → CLAUDE.md
- `Not available today on any plan` --semantically_similar_to--> `Not built yet (CRM/HubSpot, publishing, email, automation, analytics, billing)`  [INFERRED] [semantically similar]
  docs/help/APP_GUIDE.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MCP onboarding tool flow (start -> discovery -> priorities -> follow-ups -> status)** — docs_developers_mcp_and_api_tool_start_onboarding, docs_developers_mcp_and_api_tool_get_discovery_questions, docs_developers_mcp_and_api_tool_submit_discovery, docs_developers_mcp_and_api_tool_confirm_priorities, docs_developers_mcp_and_api_tool_get_follow_up_questions, docs_developers_mcp_and_api_tool_answer_follow_up_questions, docs_developers_mcp_and_api_tool_get_status [EXTRACTED 1.00]
- **Guided onboarding steps 1-5 ending in the report** — docs_help_app_guide_onboarding_route, docs_help_app_guide_discovery_route, docs_help_app_guide_review_route, docs_help_app_guide_connect_route, docs_help_app_guide_questions_route, docs_help_app_guide_report_route [EXTRACTED 1.00]
- **Feature modules blended into the growth score** — docs_help_app_guide_growth_score, docs_help_app_guide_conversion_and_messaging_module, docs_help_app_guide_website_and_technical_seo_module, docs_help_app_guide_search_visibility_module, claude_feature_modules, claude_compute_growth_score [INFERRED 0.95]
- **Tenant tables protected by is_member RLS** — docs_architecture_data_model_is_member, docs_architecture_data_model_organizations, docs_architecture_data_model_memberships, docs_architecture_data_model_business_profiles, docs_architecture_data_model_brand_profiles, docs_architecture_data_model_knowledge_documents, docs_architecture_data_model_knowledge_chunks, docs_architecture_data_model_campaigns, docs_architecture_data_model_content_calendars, docs_architecture_data_model_content_items, docs_architecture_data_model_integrations, docs_architecture_data_model_integration_connections, docs_architecture_data_model_search_console_snapshots, docs_architecture_data_model_ai_jobs, docs_architecture_data_model_ai_usage, docs_architecture_data_model_reports, docs_architecture_data_model_onboarding_sessions, docs_architecture_data_model_onboarding_responses, docs_architecture_data_model_onboarding_follow_ups, docs_architecture_data_model_diagnoses, docs_architecture_data_model_audit_runs, docs_architecture_data_model_audit_findings, docs_architecture_data_model_diagnosis_findings, docs_architecture_data_model_growth_plan_items, docs_architecture_data_model_organization_modules, docs_architecture_data_model_module_runs, docs_architecture_data_model_upgrade_requests, docs_architecture_data_model_mcp_access_keys, docs_architecture_data_model_mcp_tool_calls, docs_architecture_data_model_oauth_grants, docs_architecture_data_model_oauth_tokens, docs_architecture_data_model_assistant_usage, docs_architecture_data_model_subscriptions [EXTRACTED 1.00]
- **Analysis step hand-off flow (D-042)** — docs_architecture_system_architecture_startjob, docs_architecture_system_architecture_runanalysisjob, docs_architecture_system_architecture_dispatchstep, docs_architecture_system_architecture_api_jobs_continue, web_src_lib_pipeline_continue_token, docs_architecture_data_model_job_dispatches, docs_architecture_data_model_job_dispatches_send, docs_architecture_data_model_post_job_dispatch, docs_architecture_data_model_sweep_job_dispatches, docs_architecture_data_model_resend_job_dispatch, docs_architecture_data_model_job_dispatch_failed, docs_architecture_system_architecture_failstalejobs, docs_architecture_system_architecture_autorefresh, docs_architecture_ai_routing_and_costs_step_chaining, docs_architecture_ai_routing_and_costs_job_dispatch_modes, docs_architecture_security_and_privacy_job_continue_hmac [EXTRACTED 1.00]
- **MCP tools under the onboarding scope** — docs_architecture_mcp_server_scopes, web_src_lib_mcp_tools, docs_architecture_mcp_server_tool_start_onboarding, docs_architecture_mcp_server_tool_get_discovery_questions, docs_architecture_mcp_server_tool_submit_discovery, docs_architecture_mcp_server_tool_confirm_priorities, docs_architecture_mcp_server_tool_get_follow_up_questions, docs_architecture_mcp_server_tool_answer_follow_up_questions, docs_architecture_mcp_server_tool_get_status [EXTRACTED 1.00]
- **D-005 canonical messaging lines (tagline, headline, one-liner, category)** — docs_decisions_decision_log_d_005, docs_brand_brand_bible_tagline, docs_brand_brand_bible_homepage_headline, docs_brand_brand_bible_one_liner, docs_brand_brand_bible_category_business_growth_system, docs_brand_brand_positioning_canonical_lines, docs_brand_voice_and_messaging_messaging_hierarchy [EXTRACTED 1.00]
- **Braventa brand colour palette (Ink, Paper, Cobalt, Volt, Violet)** — docs_brand_visual_identity_ink, docs_brand_visual_identity_paper, docs_brand_visual_identity_cobalt, docs_brand_visual_identity_volt, docs_brand_visual_identity_violet, docs_decisions_decision_log_d_006, docs_decisions_decision_log_d_027, docs_brand_visual_identity_semantic_colour_roles [EXTRACTED 1.00]
- **Logo decision lineage: Waypoint -> lowercase Quicksand -> Monolith/Syncopate -> B-dot** — docs_decisions_decision_log_d_008, docs_decisions_decision_log_d_017, docs_decisions_decision_log_d_026, docs_decisions_decision_log_d_027, docs_decisions_decision_log_d_015, docs_decisions_decision_log_d_025, docs_brand_visual_identity_b_dot_mark, docs_brand_visual_identity_wordmark [EXTRACTED 1.00]
- **The three 2026-10-17 research docs feed founder decisions 1-8 (recorded as D-045 to D-052)** — docs_research_crm_mcp_and_data_model_2026_10_17, docs_research_seats_roles_modules_2026_10_17, docs_research_social_planner_2026_10_17, docs_research_readme_decision_1_plan_names_and_account_types, docs_research_readme_decision_2_seat_roles_and_prices, docs_research_readme_decision_3_client_approvers_on_basic, docs_research_readme_decision_4_first_crm, docs_research_readme_decision_5_social_publishing_buy_or_build, docs_research_readme_decision_6_public_api_read_only_v1, docs_research_readme_decision_7_module_architecture, docs_research_readme_decision_8_research_before_building, docs_research_readme_founder_decisions_d_045_to_d_053 [EXTRACTED 1.00]
- **Social planner approval-enforced publishing flow (revision-bound approval before any publish)** — docs_research_social_planner_2026_10_17_posts_table, docs_research_social_planner_2026_10_17_post_revisions_table, docs_research_social_planner_2026_10_17_post_variants_table, docs_research_social_planner_2026_10_17_approval_requests_table, docs_research_social_planner_2026_10_17_approvals_table, docs_research_social_planner_2026_10_17_post_events_table, docs_research_social_planner_2026_10_17_post_state_machine, docs_research_social_planner_2026_10_17_approval_tied_to_revision, docs_research_social_planner_2026_10_17_client_approval_link, docs_research_social_planner_2026_10_17_publishing_worker [EXTRACTED 1.00]
- **Live-only claims discipline across marketing surfaces (say only what the code does; label the rest)** — docs_marketing_campaign_guidelines_claims_and_compliance_checklist, docs_marketing_community_guidelines_labelling_planned_features, docs_marketing_email_templates_shared_rules, docs_marketing_sitemap_launch_pages, docs_marketing_website_messaging_status_labels, docs_marketing_website_messaging_proof_point_placeholder, docs_marketing_contact_pipeline_automatic_reply_email [INFERRED 0.85]
- **Braventa Growth Loop: the nine steps** — docs_product_business_methodology_step_1_understand_the_business, docs_product_business_methodology_step_2_identify_opportunities, docs_product_business_methodology_step_3_set_priorities, docs_product_business_methodology_step_4_build_action_plan, docs_product_business_methodology_step_5_create_assets, docs_product_business_methodology_step_6_execute_workflows, docs_product_business_methodology_step_7_measure_results, docs_product_business_methodology_step_8_learn_from_outcomes, docs_product_business_methodology_step_9_improve_strategy [EXTRACTED 1.00]
- **AI assistant connection to Braventa (MCP server, keys and OAuth sign-in)** — docs_product_mvp_scope_mcp_server_connection, docs_product_connect_chatgpt_mcp_phase_2_oauth, docs_product_connect_chatgpt_chatgpt_connector, docs_product_connect_your_ai_assistant_sign_in_with_braventa, docs_product_connect_your_ai_assistant_access_keys, docs_product_connect_your_ai_assistant_service_keys, docs_product_connect_your_ai_assistant_mcp_server_url, docs_product_connect_your_ai_assistant_access_rule [INFERRED 0.85]
- **Pro integrations roadmap catalog (connect during discovery, act later)** — docs_product_integrations_roadmap_google_search_console, docs_product_integrations_roadmap_google_analytics_4, docs_product_integrations_roadmap_google_business_profile, docs_product_integrations_roadmap_hubspot, docs_product_integrations_roadmap_canva, docs_product_integrations_roadmap_heygen, docs_product_integrations_roadmap_higgsfield, docs_product_integrations_roadmap_meta_facebook_instagram, docs_product_integrations_roadmap_linkedin, docs_product_integrations_roadmap_youtube, docs_product_integrations_roadmap_tiktok, docs_product_integrations_roadmap_x_twitter [EXTRACTED 1.00]
- **Basic, Pro, Premium tiers with the trial and decided prices** — docs_product_plans_and_tiers_basic_tier, docs_product_plans_and_tiers_pro_tier, docs_product_plans_and_tiers_premium_tier, docs_product_plans_and_tiers_trial_14_day_pro, docs_product_pricing_proposal_basic_price, docs_product_pricing_proposal_pro_price, docs_product_pricing_proposal_premium_price [EXTRACTED 1.00]
- **Search Console connection feeding the diagnosis and score as the Search visibility module** — docs_product_plans_and_tiers_google_search_console_connection, docs_product_plans_and_tiers_search_visibility_module, docs_product_plans_and_tiers_module_registry, docs_product_product_requirements_wi_6_search_console_ga4, docs_product_roadmap_connected_tools_read_only, docs_product_website_intelligence_gap_report_phase_2_search_console [INFERRED 0.95]
- **Seven capability areas mapped onto the Growth Loop** — docs_product_product_overview_business_intelligence, docs_product_product_overview_marketing_strategy, docs_product_product_overview_content_studio, docs_product_product_overview_website_intelligence, docs_product_product_overview_crm_intelligence, docs_product_product_overview_automation, docs_product_product_overview_analytics_and_optimization, docs_product_product_overview_growth_loop [EXTRACTED 1.00]

## Communities (146 total, 10 thin omitted)

### Community 0 - "Website crawler and robots"
Cohesion: 0.06
Nodes (55): RFC-9309, rules(), assertCrawlable(), BLOCKED, BlockedUrlError, collectTypes(), CrawledPage, crawlSite() (+47 more)

### Community 1 - "Social planner research"
Cohesion: 0.06
Nodes (63): Apply now regardless of the decisions (provider reviews drive the timeline more than code), Decision 5: social publishing buy or build, and launch networks, Google Business Profile API 'Application for Basic API Access' (critical path; quota 0 until approved, then 300/min), Google OAuth verification for the existing Search Console client (plan GA4 and Business Profile scopes together), HubSpot developer app on platform 2026.09 (unlisted marketplace OAuth app), LinkedIn Community Management API application (separate app from Share on LinkedIn), Meta Business Verification then App Review for Facebook and Instagram permissions, Pinterest trial then Standard access (demo video showing OAuth) (+55 more)

### Community 2 - "Brand bible and founder brief"
Cohesion: 0.05
Nodes (49): Braventa Brand Bible, Category: Business growth system, The Braventa Growth Loop, Homepage headline: Know what to do next. Then get it done., Identity at a glance, What we can truthfully say today (MVP 2026-10-10), One-liner: Braventa connects your website, marketing, CRM, and content into one growth system, Personality (X not Y pairs) (+41 more)

### Community 3 - "Decision log: team, seats, integrations"
Cohesion: 0.07
Nodes (41): Q-001 First buyer: owner or agency?, Q-003 (resolved) One organization holding many businesses, Q-010 Billing and transactional email providers, Q-011 (resolved) First CRM, Q-029 (resolved) Prices, Q-031 Pro build order and agent execution model (n8n vs in-app), Q-032 Legal documents, Q-045 Price per extra brand on Agency accounts (+33 more)

### Community 4 - "Analysis start and owner inputs"
Cohesion: 0.07
Nodes (45): OwnerInputsState, rerunAnalysis(), RerunState, saveOwnerInputs(), setContentStatus(), startAnalysis(), startSchema, StartState (+37 more)

### Community 5 - "Website messaging and module catalog"
Cohesion: 0.05
Nodes (47): Doc intro template (title, one-line purpose, Before you start, Time), Documentation writing guidelines, Status vocabulary: Live, Planned, Future vision (internal), Coming next (public-facing), Free website grader lead magnet (/free-tools/website-grader, Soon), braventa.io website messaging, About page copy foundations (brand story, mission, values, founder bio placeholder), Analytics module - Coming soon, Automation module (approved workflows) - Coming soon (+39 more)

### Community 6 - "Onboarding pages and actions"
Cohesion: 0.11
Nodes (42): continueAfterConnect(), continueFollowUps(), Db, FormState, loadSession(), Session, skipDiscovery(), skipFollowUps() (+34 more)

### Community 7 - "MCP route and server metadata"
Cohesion: 0.07
Nodes (43): Streamable HTTP transport (stateless, JSON only), Copy rules for 'connect your AI assistant' (MCP, /api/mcp), corsFor(), json(), maxDuration, OPTIONS(), POST(), RFC-9728 (+35 more)

### Community 8 - "AI routing, costs and security docs"
Cohesion: 0.06
Nodes (48): AI_MODE (free vs paid), AI router (lib/ai/router.ts), ai_usage per-call logging, Brief section 7 principles vs implementation, Monthly AI budget enforcement, Known budget limitations, BudgetExceededError, chat() retries and timeouts (+40 more)

### Community 9 - "System architecture and pipeline docs"
Cohesion: 0.09
Nodes (46): JOB_DISPATCH modes (database, direct), Step chaining (D-042), Table ai_jobs, Function cleanup_job_dispatches, Enum job_status, Function job_dispatch_failed, Function job_dispatch_health, Table job_dispatches (+38 more)

### Community 10 - "OAuth grants and tokens"
Cohesion: 0.09
Nodes (30): RFC-7636, exchangeCode(), GrantReason, inReuseGrace(), issueCode(), issueTokens(), later(), NewToken (+22 more)

### Community 11 - "Visual identity and logo"
Cohesion: 0.08
Nodes (36): Visual identity summary, Accessibility requirements (WCAG 2.2 AA), App vs marketing surfaces, Imagery to avoid, The B-dot mark, Clear space and minimum size, Cobalt #2340F5 (action), Colour proportion 70/20/8/2 (+28 more)

### Community 12 - "Open questions and handover"
Cohesion: 0.07
Nodes (36): Assets not yet produced, Braventa (the brand), Banned words, Caution words, Short-form profile copy (LinkedIn, X, Instagram, app listing, signature), Brand identity (name, domain, category, business model), Requires external credentials or human action, Handover 2026-10-10: brand system, product blueprint and project memory (+28 more)

### Community 13 - "Decision log: brand and vision"
Cohesion: 0.08
Nodes (20): Comfortaa (body and UI), Type scale, The 'what is live today' reference sentence, Spelling and style conventions, Decision log, Brand identity and visual design system requirements, Final brand decisions as of the handover, Q-002 First market geography (+12 more)

### Community 14 - "Pipeline prompts and model comparison"
Cohesion: 0.08
Nodes (37): currentYear, MODELS, outDir, sites, Step, summary, parseJsonLoose(), systemPrompt() (+29 more)

### Community 15 - "Brand asset generator"
Cohesion: 0.09
Nodes (36): appIcon(), APPS, BRAND, c(), glyph(), graphTexture(), HEADLINE(), horizontal() (+28 more)

### Community 16 - "Search Console client"
Cohesion: 0.10
Nodes (36): addDays(), DateRange, dateRanges(), Db, describeError(), fetchSnapshot(), gsc(), homeUrlFor() (+28 more)

### Community 17 - "Pipeline and hand-off tests"
Cohesion: 0.06
Nodes (31): deliver(), EVIDENCE, fetchMock, INTEL, post(), REF, reposted, runWorkerJson (+23 more)

### Community 18 - "Site package manifest"
Cohesion: 0.05
Nodes (39): dependencies, next, react, react-dom, server-only, @supabase/supabase-js, zod, description (+31 more)

### Community 19 - "Feature modules and data model docs"
Cohesion: 0.08
Nodes (39): Table audit_findings, Table audit_runs, Table brand_profiles, Table business_profiles, Table diagnoses, Table diagnosis_findings, Domain module_id, Table growth_plan_items (+31 more)

### Community 20 - "Plan tiers and access"
Cohesion: 0.09
Nodes (32): jobLabel(), loadBusinessSummary(), planLabel(), describeSearchConsole(), canConnectSearchConsole(), connectPlanLine(), NON_OWNER_LINE, OTHER_BUSINESS_LINE (+24 more)

### Community 21 - "Sitemap, campaigns and domains"
Cohesion: 0.07
Nodes (32): Product and business model (customer journey, revenue streams), Q-017 Community platform, Braventa campaign guidelines, Campaign brief template, Channel rules (LinkedIn, Facebook/Instagram, X, Email, Google Business Profile), Copy bank of short display lines for images and covers, Measurement basics (reach, engagement, acquisition, activation, value, retention, email), Messaging pillars (Know your business / Know what to do next / Get it done / Stay in control) (+24 more)

### Community 22 - "Google OAuth routes"
Cohesion: 0.11
Nodes (34): GET(), maxDuration, toOutcome(), GET(), toOutcome(), ALLOWED_ORIGINS, appRedirectUri(), buildAuthUrl() (+26 more)

### Community 23 - "Supabase clients and Settings actions"
Cohesion: 0.13
Nodes (30): revokeAccessKey(), createServiceKey(), CreateServiceKeyState, disconnectApp(), EXPIRY_DAYS, revokeServiceKey(), servicePrefix(), ConnectedApps() (+22 more)

### Community 24 - "Foundation schema"
Cohesion: 0.11
Nodes (31): ai_jobs_org_idx, ai_usage_org_month_idx, brand_profiles_org_idx, business_profiles_org_idx, campaigns_org_idx, content_calendars_org_idx, content_items_calendar_idx, content_items_org_idx (+23 more)

### Community 25 - "Audit checks"
Cohesion: 0.11
Nodes (35): AUDIT_VERSION, comparable(), Confidence, CONFIDENCE_WEIGHT, CRUX_SEVERITY, Ctx, CWV, Draft (+27 more)

### Community 26 - "PageSpeed and report data"
Cohesion: 0.08
Nodes (26): sites, AuditRunRow, ContentItem, Issue, Opportunity, ReportData, StoredCoverage, Strategy (+18 more)

### Community 27 - "Website-intel scoring step"
Cohesion: 0.13
Nodes (34): runWorkerJson(), coverageLine(), promptFindings(), summarizeCoverage(), conversionEvidence(), scoreEvidence(), searchVisibilityEvidence(), websiteSeoEvidence() (+26 more)

### Community 28 - "Design tokens and component guidelines"
Cohesion: 0.09
Nodes (30): Brand asset generator (design-system/scripts/build-brand-assets.mjs), Copy rules, Read-before-you-work table, AI-specific conventions, Button conventions, Cards and lists, Component guidelines, Data display (tables, tabular-nums, charts per VISUAL_IDENTITY section 10) (+22 more)

### Community 29 - "MCP developer docs"
Cohesion: 0.10
Nodes (31): MCP server /api/mcp (D-036), /.well-known/oauth-authorization-server (RFC 8414), /oauth/authorize (PKCE S256, scope onboarding, resource parameter), /oauth/register dynamic client registration (RFC 7591), HTTP errors and rate limits, Braventa MCP server developer guide, POST /api/mcp (MCP over Streamable HTTP, stateless), n8n HTTP Request / MCP Client node usage with a service key (+23 more)

### Community 30 - "Site page primitives"
Cohesion: 0.14
Nodes (26): About(), metadata, VALUES, HowItWorks(), LegalLayout(), NotFound(), Home(), Pricing() (+18 more)

### Community 31 - "Pipeline steps and claims"
Cohesion: 0.11
Nodes (26): args, db, Final, originAt, runOne(), Snapshot, QueuedPlan, startPlanIfReady() (+18 more)

### Community 32 - "Search Console and connections docs"
Cohesion: 0.10
Nodes (33): Worker crm_analyst, Table integration_connections, Table integrations, Table search_console_snapshots, searchConsoleSummaryForPrompt(db, organizationId), summarizeSnapshot, Google Analytics 4 (configured only), Google Search Console integration (Pro) (+25 more)

### Community 33 - "Product vision and assessment"
Cohesion: 0.09
Nodes (17): Capability 8.1 Business profile and intelligence, Capability 8.5 CRM intelligence (HubSpot first candidate), GrowthOS Product Vision and Planning Context (founder, 2026-10-10), Intended audience (SMB, owner-operated service businesses; candidate verticals home/trade, solar, construction, professional services), Open questions to validate (first niche, anchor workflow, trial, tiers, billing, integrations, automation vs approval), Technical direction discussed (Next.js, Supabase, n8n on Oracle free tier, OpenRouter, Hostinger, HubSpot, WordPress, Canva), Capability 8.2 Website intelligence and audit, Alignment table (D-004 loop, stack, principles, D-001 naming, CRM read-only, D-012 pricing) (+9 more)

### Community 34 - "Integrations roadmap"
Cohesion: 0.13
Nodes (28): Analytics and business outcomes (Google Analytics, CRM; later), Google Search Console integration (optional, authorized), Canva Connect API, Connect your tools onboarding step (D-054; /onboarding/[sessionId]/connect), Pro integrations roadmap (D-041; amended by D-048, D-049, D-051, D-053), From your tools evidence type, Google Analytics 4 (analytics.readonly; Coming soon), Google Business Profile (business.manage; Basic API Access application) (+20 more)

### Community 35 - "Env, admin client and OpenRouter"
Cohesion: 0.14
Nodes (26): Check, expectContinueRoute(), GET(), jobHandoffCheck(), searchConsoleCheck(), env(), envConfigured(), schema (+18 more)

### Community 36 - "Follow-up question bank"
Cohesion: 0.14
Nodes (26): followUpQuestions(), getPainPoint(), answerLabel(), Candidate, candidateId(), candidateQuestions(), Choice, fallbackSelection() (+18 more)

### Community 37 - "CLAUDE.md repo guide"
Cohesion: 0.10
Nodes (26): braventa-health-check agent, Deploy status check (gh api commit statuses, gh pr list), Health report by area, npm run health (web/scripts/health-check.mts), Supabase advisors and migration comparison, Braventa (codename GrowthOS), npm commands in web/ (dev, build, lint, tokens, tokens:check), design-system/ (tokens.json single token source, docs, asset generator) (+18 more)

### Community 38 - "Job dispatch and continue token"
Cohesion: 0.15
Nodes (23): bodySchema, maxDuration, POST(), continueKey(), deriveContinueKey(), signContinue(), key, verifyContinue() (+15 more)

### Community 39 - "Discovery catalog and classification"
Cohesion: 0.12
Nodes (25): Availability, BY_ID, CATALOG_VERSION, catalogForPrompt(), CATEGORIES, CategoryId, isActivePainPointId(), PAIN_POINTS (+17 more)

### Community 40 - "CRM and MCP research"
Cohesion: 0.12
Nodes (25): CRM integration and AI-ready data model (research, 2026-10-17), Close CRM (mcp.close.com/mcp, OAuth read/write/destructive levels), CRM comparison (official MCP, auth, read/write, community servers, REST scopes, rate limits, marketplace review), GoHighLevel (CRM vendor; OAuth MCP endpoints, 100 req/10 s and 200k/day per location), HubSpot (CRM vendor), HubSpot date-based API version 2026-09 (Current since 2026-09-08; support until about March 2028), INTEGRATIONS_ROADMAP lists forms and content among HubSpot read scopes, but neither is read-only, HubSpot data model principles worth copying (uniform object model, activities as objects, typed properties, first-class associations, search, batch, pipelines, webhooks, date-based versioning, per-object scopes) (+17 more)

### Community 41 - "OAuth consent page"
Cohesion: 0.14
Nodes (21): ConsentState, decideAuthorization(), ConsentForm(), Org, PausedNote(), Authorize(), AuthorizePage(), metadata (+13 more)

### Community 42 - "App guide and demo flow"
Cohesion: 0.16
Nodes (27): diagnosis_update job, MVP demo flow, onboarding_sessions row (startAnalysis), website_evidence job, website_intel job (re-run), website_plan job (startPlanIfReady), braventa_get_discovery_questions tool, braventa_start_onboarding tool (+19 more)

### Community 43 - "Site layout and brand components"
Cohesion: 0.13
Nodes (19): comfortaa, metadata, quicksand, RootLayout(), PATHS, LOCKUP, SYMBOL, WORDMARK (+11 more)

### Community 44 - "Health checks and dispatch health"
Cohesion: 0.12
Nodes (23): add(), ai(), emailDns(), env(), google(), order, Result, results (+15 more)

### Community 45 - "Connect your tools step"
Cohesion: 0.14
Nodes (19): ContinueButton(), ContinuePendingNote(), Connect(), ConnectPage(), maxDuration, metadata, ConnectionsSection(), SearchConsoleCard() (+11 more)

### Community 46 - "OAuth scopes and consent rules"
Cohesion: 0.11
Nodes (24): RFC-9700, AuthorizeCheck, AuthorizeRequest, checkAuthorizeRequest(), ClientInfo, errorRedirect(), MAX_STATE_LENGTH, successRedirect() (+16 more)

### Community 47 - "MVP scope and next steps"
Cohesion: 0.13
Nodes (25): D-028 (discovery alongside analysis; diagnosis plan replaces the five opportunities; new value test), Capability 8.8 AI business assistant, Implemented and working (auth, RLS, pipeline, approval guard D-018, AI router, Braventa UI), Recommended next steps (verify migrations, provenance labels, copy/export, profile edit, readiness), AI routing, budget, usage log (router.ts, ai_usage, ai_spend_mtd), Approve, reject, undo (setContentStatus), Brand rename completion (D-003; Supabase Auth email templates remain), Copy and export approved drafts (CS-7; not built) (+17 more)

### Community 48 - "Product requirements"
Cohesion: 0.11
Nodes (21): Credit ledger (credit_grants), Act stage, G Analytics and Optimization, F Automation, C Content Studio, Braventa Growth Loop (D-004), Improve stage, Product requirements (+13 more)

### Community 49 - "Fake Supabase query engine"
Cohesion: 0.15
Nodes (5): compare(), parseTerm(), Query, read(), splitTop()

### Community 50 - "Report and dashboard pages"
Cohesion: 0.13
Nodes (16): nextConfig, securityHeaders, AutoRefresh(), Analysis(), AnalysisPage(), maxDuration, metadata, Progress() (+8 more)

### Community 51 - "Module registry"
Cohesion: 0.14
Nodes (21): code, dir, files, BY_ID, enabledModuleIds(), getModule(), isModuleId(), liveModules() (+13 more)

### Community 52 - "OAuth server docs"
Cohesion: 0.15
Nodes (25): Table oauth_authorization_codes, Function oauth_cleanup, Table oauth_clients, Trigger oauth_clients_rate_limit, Table oauth_grants, Table oauth_tokens, GET /.well-known/oauth-authorization-server (RFC 8414), Client ID Metadata Documents (not built) (+17 more)

### Community 53 - "Website intelligence blueprint"
Cohesion: 0.11
Nodes (15): Audit data model (website_audit_runs, website_audit_pages, website_audit_findings, search_console_snapshots, seo_recommendations), Content quality and search intent (AI editorial assessment), Website Intelligence and SEO audit blueprint, Links and off-page signals (later, provider-dependent), Local SEO (conditional; Google Business Profile), On-page SEO checks, Performance and page experience (Core Web Vitals, PageSpeed lab vs field), Recommendation JSON shape (finding_id, evidence, severity, confidence, business_relevance, recommended_action, verification_method) (+7 more)

### Community 54 - "OAuth token and revoke routes"
Cohesion: 0.17
Nodes (21): OPTIONS, POST(), RFC-7009, OPTIONS, POST(), ipBucket(), CodeRow, GrantRow (+13 more)

### Community 55 - "OAuth client registration"
Cohesion: 0.14
Nodes (22): RFC-8252, allowedOrigin(), OPTIONS(), POST(), RFC-7591, AUTH_METHODS, AuthMethod, cleanText() (+14 more)

### Community 56 - "Seats, roles and modules research"
Cohesion: 0.13
Nodes (21): Product modules and status, Product blueprint: modules A–G, Q-048 Who may switch a feature module off, and where does online presence live, Growth score explanation (0-100 renormalized mean over modules with evidence), Search visibility adds 0.10 to the score on Pro, Premium and trial with Search Console connected (D-051 step 6), Decision 7: module architecture via the six-step path; first new module Search visibility, audit_findings.category (DB CHECK and TS Category type: indexability, technical, on_page, structured_data, performance), computeGrowthScore today (3 AI scores + 4 mobile Lighthouse scores, all-or-nothing renormalization when PageSpeed is missing) (+13 more)

### Community 57 - "Business methodology"
Cohesion: 0.11
Nodes (12): Business methodology (Braventa Growth Loop), Module C Content Studio, Module E CRM Intelligence, Module F Automation, Module G Analytics and Optimization, Capability 8.7 Analytics and optimization, Capability 8.6 Automation and workflow intelligence (n8n), Capability 8.4 Content Studio (+4 more)

### Community 58 - "Pricing proposal"
Cohesion: 0.13
Nodes (21): Premium tier, Pricing and AI credit proposal (v2), AI credits, Auto-recharge, Basic $89/month, Card-required trial at public launch, AI and card cost per customer, Fixed monthly costs (~$1,200) (+13 more)

### Community 59 - "Site contact form"
Cohesion: 0.17
Nodes (19): ContactState, PRETEND_SENT, schema, sendContact(), ContactForm(), INTENTS, Contact(), Form() (+11 more)

### Community 60 - "Map schema and templates"
Cohesion: 0.12
Nodes (20): Card types (object, process, effect), Effect file (map/effects/CONTEXT.md, one file, no cards), Generated map files, Card labels (type, cluster, universe, status, verified, commit, entity, consumes/produces), Map schema (rules of this map), Naming rules, Object card (map/objects/<cluster>/<slug>.md), Process card (map/processes/<slug>.md) (+12 more)

### Community 61 - "Voice and messaging"
Cohesion: 0.15
Nodes (23): Messaging toolkit index, Voice summary, Buyer and user roles, Approval state labels, Audience-specific value propositions and voice shifts, Calls to action, Do and don't examples, Empty state copy (+15 more)

### Community 62 - "Plans, tiers and roadmap"
Cohesion: 0.14
Nodes (20): Plans and tiers, Account types: Brand vs Agency/Organization, canUse(access.tier, featureId) server gate, Client approver single-use approval link, Decided, not built (founder 2026-10-18), FEATURES list in web/src/lib/plans/tiers.ts, Google Search Console connection, Module registry and score over modules (+12 more)

### Community 63 - "Jobs, hand-off and claims"
Cohesion: 0.17
Nodes (17): ACTIVE, failPendingStep(), JobRef, markResent(), handOff(), RESEND_AFTER_MS, resendDue(), STALE_JOB_ERROR (+9 more)

### Community 64 - "Search performance page"
Cohesion: 0.19
Nodes (21): date, dateTime, formatChange(), formatCtr(), formatDateTime(), formatDay(), formatInt(), formatPosition() (+13 more)

### Community 65 - "Access key settings"
Cohesion: 0.19
Nodes (17): createAccessKey(), CreateKeyState, keyLastUsed(), ConnectInstructions(), Guide(), CopyBlock(), App, CodeSetup() (+9 more)

### Community 66 - "Growth score computation"
Cohesion: 0.13
Nodes (19): AssessedScores, clamp01(), computeGrowthScore(), GrowthScore, ModuleEvidence, PageSpeedScores, pct(), SCORE_VERSION (+11 more)

### Community 67 - "App guide: live capabilities"
Cohesion: 0.15
Nodes (20): Pipeline detail check (ai_jobs, ai_usage), AI_MODE paid/free (D-037), AI router web/src/lib/ai/router.ts (runWorker / runWorkerJson), Ask Braventa assistant (/api/assistant, D-043), /connect 'Connect your tools' onboarding step (D-041), Live capabilities today, 14-day Pro trial then Basic (D-030), Google Search Console connection / Search visibility module (D-051 step 6) (+12 more)

### Community 68 - "AI-assisted onboarding spec"
Cohesion: 0.15
Nodes (6): Onboarding acceptance criteria, Onboarding data model concepts (pain_point_catalog, onboarding_sessions, onboarding_responses, pain_point_assessments, evidence_items, growth_plan_items), AI-assisted onboarding and pain-point diagnostic spec (founder, 2026-10-10), Pain-point catalog (10 categories A-J), Separate priority fields (customer_priority, ai_recommended_priority, calculated_priority, final_approved_priority), Pain-point discovery (10 categories, 43 pain points; top three; up to 4 follow-ups; ON-1 to ON-6)

### Community 69 - "Product requirements modules"
Cohesion: 0.11
Nodes (19): A Business Intelligence, E CRM Intelligence, B Marketing Strategy, Problems Braventa solves, Proof of concept: what exists today, Understand stage, D Website Intelligence, CRM-1 connect HubSpot via OAuth (read-only) (+11 more)

### Community 70 - "Report sections and score badge"
Cohesion: 0.19
Nodes (20): ContentActions(), Answers(), Content(), DraftNotes, Drafts(), Field(), formatDay(), ListCard() (+12 more)

### Community 71 - "MCP authentication"
Cohesion: 0.14
Nodes (17): authenticateMcp(), Org, AUTH_MESSAGES, Principal, Rejected, resolveAccessToken(), ResolvedPrincipal, TokenRow (+9 more)

### Community 72 - "Plan priority and findings"
Cohesion: 0.15
Nodes (18): SolutionId, findings(), calculatedPriority(), clamp(), CONFIDENCE_SCORE, cut(), DiscoveryFacts, Finding (+10 more)

### Community 73 - "Requirements and MVP cross-refs"
Cohesion: 0.12
Nodes (20): Ask Braventa in-app assistant, Basic tier, Connect your AI assistant (MCP), BI-11 Q&A assistant grounded in the knowledge base, BI-12 optional guided onboarding questions, BI-5 edit and confirm profile fields, BI-6 provenance labels, BI-8 knowledge base (+12 more)

### Community 74 - "Website intelligence gap report"
Cohesion: 0.15
Nodes (20): Website Intelligence gap report, AI privacy: zero data retention, audit_runs and audit_findings tables, Bounded crawl (pre-Phase 1), Evidence model, Capabilities needing external API access or authorization, Legal drafts held for approval, Missing: abuse limits and tests (+12 more)

### Community 75 - "MCP access and OAuth schema"
Cohesion: 0.15
Nodes (15): api_audit_log generalized from mcp_tool_calls (key, scope, object, action, ids, ok/error; no payload secrets), mcp_access_keys_org_idx, mcp_access_keys_user_idx, public.mcp_access_keys, mcp_access_keys_service_owner, memberships_owner_guard, oauth_clients_created_idx, oauth_clients_ip_time_idx (+7 more)

### Community 76 - "Search Console card components"
Cohesion: 0.13
Nodes (16): ConnectionNotice(), NOTICES, TONES, ConfirmButton(), DisconnectButton(), Connection, Latest, NotConnected() (+8 more)

### Community 77 - "App layout and logo"
Cohesion: 0.15
Nodes (16): comfortaa, metadata, quicksand, RootLayout(), UserMenu(), signOut(), Home(), Route() (+8 more)

### Community 78 - "Tenancy and RLS docs"
Cohesion: 0.14
Nodes (20): Function create_organization(org_name), Enum member_role, Function is_member(org), Function is_org_admin(org), Table memberships, Trigger memberships_owner_guard, Data model observations, Table organizations (+12 more)

### Community 79 - "Web package dependencies"
Cohesion: 0.10
Nodes (19): cheerio, tsx, eslint, eslint-config-next, next, react, react-dom, server-only (+11 more)

### Community 80 - "Plan actions and controls"
Cohesion: 0.21
Nodes (18): DiagnosisActions(), ErrorText(), FindingReview(), PlanItemActions(), STATUS_TEXT, useAction(), ActionResult, confirmDiagnosis() (+10 more)

### Community 81 - "Technical checks section"
Cohesion: 0.16
Nodes (19): AuditData, AuditFindingRow, CATEGORY_LABEL, CATEGORY_TEXT, FieldRows(), FindingItem(), KEY_LABEL, LABEL_TONE (+11 more)

### Community 82 - "Plans page and MCP access"
Cohesion: 0.18
Nodes (14): RequestState, requestUpgrade(), metadata, ORDER, Plans(), PlansPage(), PREVIOUS, RequestForm() (+6 more)

### Community 83 - "Roadmap and user journeys"
Cohesion: 0.17
Nodes (18): Vercel Pro required before charging, CS-8 draft further plan items on demand, Roadmap and business model, Business model, Exploratory (no requirement ID), Later: future vision, Next: validation with paying customers, Now: MVP proof of concept (+10 more)

### Community 84 - "Pipeline test fixtures"
Cohesion: 0.13
Nodes (12): vitest, sql, ResendResult, HANDOFF_ERROR, admin, afterCalls, dispatchStep, JOB (+4 more)

### Community 85 - "Site tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 86 - "Assistant UI"
Cohesion: 0.20
Nodes (17): Answer(), AnswerList(), applePlatform(), Assistant(), AssistantLauncher(), Inlines(), Message, noSubscribe() (+9 more)

### Community 87 - "Assistant handler and limits"
Cohesion: 0.20
Nodes (14): ASSISTANT_LIMITS, ASSISTANT_NEEDS_PLAN, assistantAccess, checkAssistantLimits(), LimitCheck, business, now, pageRoutes() (+6 more)

### Community 88 - "Web tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 89 - "Job dispatches schema"
Cohesion: 0.18
Nodes (11): public.ai_jobs, job_dispatches_org_idx, job_dispatches_send, public.cleanup_job_dispatches(), public.job_dispatch_failed(), public.job_dispatch_health(), public.job_dispatches, public.job_dispatches_send() (+3 more)

### Community 90 - "Security review and planned CRM"
Cohesion: 0.12
Nodes (18): Table knowledge_chunks, Function match_knowledge, Table subscriptions, Billing (provider not chosen), Marketing email provider (not chosen), Transactional email (Supabase Auth defaults), HubSpot CRM integration (planned), HubSpot Phase 2: assisted actions (+10 more)

### Community 91 - "Growth score and provenance docs"
Cohesion: 0.15
Nodes (11): Growth score (computeGrowthScore), Module A Business Intelligence, Module B Marketing Strategy, Module D Website Intelligence, Capability 8.3 Marketing strategy and planning, Conflict 3: onboarding URL-only vs guided questions (BI-7, Q-022), Business profile (profileStep), Growth score, diagnosis and growth plan (D-051 modules; one Opus call; four priorities; ON-7, ON-8, D-029) (+3 more)

### Community 92 - "AI router and assistant route"
Cohesion: 0.18
Nodes (16): json(), maxDuration, POST(), sameHost(), BudgetExceededError, ESCALATE, MODELS, modelsFor() (+8 more)

### Community 93 - "Connect your AI assistant docs"
Cohesion: 0.24
Nodes (15): ChatGPT custom MCP connector (Developer mode, OAuth), Connectivity check (braventa_get_status; well-known metadata; POST /oauth/register returns 201), Connect ChatGPT to Braventa (MCP), Open item: Privacy and Sub-processors pages should name OpenAI (ChatGPT), MCP phase 2: Sign in with Braventa (OAuth metadata, dynamic client registration, PKCE S256, 1-hour access tokens, rotating 30-day hashed refresh tokens, revoke), oauth_clients table (ChatGPT redirect URIs), Personal access keys (Claude Desktop config, Claude Code command; up to 5 active), Who can use it (14-day Pro trial, then any paid plan; pauses after the trial) (+7 more)

### Community 94 - "Token build script"
Cohesion: 0.15
Nodes (15): contrast(), css, failures, get(), here, leaves(), lines, luminance() (+7 more)

### Community 95 - "Report infographic"
Cohesion: 0.21
Nodes (15): Bars(), PROVENANCE_COLOR, PROVENANCE_ORDER, ReportInfographic(), ScoreRing(), StackedBar(), Stat(), TechnicalTile() (+7 more)

### Community 96 - "Login and auth callback"
Cohesion: 0.24
Nodes (12): GET(), AuthState, credentials, parse(), signIn(), signUp(), AuthForm(), LoginContent() (+4 more)

### Community 97 - "Diagnosis and plan schema"
Cohesion: 0.23
Nodes (14): diagnoses_confirmed_by_idx, diagnoses_job_idx, diagnoses_org_idx, diagnoses_profile_idx, diagnoses_report_idx, diagnoses_revises_idx, diagnosis_findings_org_idx, growth_plan_items_changed_by_idx (+6 more)

### Community 98 - "Assistant knowledge base"
Cohesion: 0.17
Nodes (14): content, target, APP_ROUTES, COMING_SOON_TOOLS, featuresSection(), KNOWLEDGE_VERSION, knowledgeForPrompt(), knowledgeSections() (+6 more)

### Community 99 - "Contact pipeline docs"
Cohesion: 0.17
Nodes (14): Q-033 Contact form spam protection and notification, braventa.io contact pipeline, Automatic 'We got your message' reply email, Contact form flow (/contact server action to Supabase then HubSpot), CONTACT_HASH_SALT secret, Contact pipeline environment variables (Vercel project braventa-site), Honeypot field check (pretend success, store nothing), HUBSPOT_ACCESS_TOKEN (optional private-app token with forms scope) (+6 more)

### Community 100 - "npm scripts"
Cohesion: 0.13
Nodes (15): scripts, audit:site, build, dev, eval:models, health, help:doc, help:doc:check (+7 more)

### Community 101 - "Plan and diagnosis sections"
Cohesion: 0.20
Nodes (14): Chip(), CONFIDENCE_TEXT, Detail(), DiagnosisRow, DiagnosisSection(), FindingBasis(), FindingRow, PlanItemRow (+6 more)

### Community 102 - "Connection actions and return paths"
Cohesion: 0.33
Nodes (12): authorisedOrg(), backFrom(), chooseSearchConsoleProperty(), disconnectSearchConsoleAction(), refreshSearchConsole(), SYNC_CODES, connectionOutcomeUrl(), connectionReturnPath() (+4 more)

### Community 103 - "Assistant prompt builder"
Cohesion: 0.15
Nodes (14): AssistantRequest, AssistantTurn, BusinessSummary, clean(), DRAFT_STATUS, formatBusinessSummary(), MAX_BUSINESS_CHARS, MAX_HISTORY_CHARS (+6 more)

### Community 104 - "MCP server and keys docs"
Cohesion: 0.25
Nodes (14): Function is_org_owner(org), Table mcp_access_keys, Table mcp_tool_calls, Braventa MCP server (inbound), Credentials at a glance, Braventa MCP server (/api/mcp), Phase 1: personal access keys (brv_), Phase 2: OAuth 2.1 sign-in (Sign in with Braventa) (+6 more)

### Community 105 - "Brand asset inventory"
Cohesion: 0.20
Nodes (11): App metadata files (icon.svg, favicon.ico, apple-icon.png, opengraph-image.png), Brand asset inventory, build-brand-assets.mjs generator, Brand fonts: Montserrat ExtraBold, Quicksand, Comfortaa, <Logo /> component and logo-geometry.ts, Logo files in web/public/brand/, Online brand kit artifact, Social banners and avatar (+3 more)

### Community 106 - "Legal pages"
Cohesion: 0.19
Nodes (10): Cookies(), metadata, metadata, Privacy(), metadata, Subprocessors(), VENDORS, metadata (+2 more)

### Community 107 - "Onboarding service"
Cohesion: 0.19
Nodes (8): FollowUpUpdate, completeSession(), continueFollowUps(), Session, skipDiscovery(), skipRemainingFollowUps(), startPlanAfterResponse(), StepResult

### Community 108 - "Email templates"
Cohesion: 0.20
Nodes (12): Braventa email templates, Analysis complete template (trigger: ai_jobs row reaches done), Analysis failed template (trigger: job status failed), Email confirmation template (Supabase Auth), Password reset template, Email placeholder dictionary ({{product_name}}, {{growth_score}}, {{unsubscribe_url}}, ...), Security notice template (password or email changed), Email sending status today (+4 more)

### Community 109 - "Onboarding sessions schema"
Cohesion: 0.33
Nodes (11): onboarding_responses_org_idx, onboarding_responses_session_idx, onboarding_responses_session_pain_point_key, onboarding_responses_session_priority_key, onboarding_sessions_evidence_job_idx, onboarding_sessions_org_idx, onboarding_sessions_plan_job_idx, onboarding_sessions_profile_idx (+3 more)

### Community 110 - "Growth score and MCP tools guide"
Cohesion: 0.20
Nodes (10): computeGrowthScore (lib/modules/score.ts), Feature module registry (D-051, web/src/lib/modules/registry.ts), <ScoreBadge /> and <ScoreBar /> with scoreTone(), braventa_answer_follow_up_questions tool, braventa_confirm_priorities tool, braventa_get_follow_up_questions tool, braventa_get_status tool, Conversion and messaging module (AI assessment of the website) (+2 more)

### Community 111 - "Search Console schema"
Cohesion: 0.27
Nodes (9): integration_connections table (provider check allows only google_search_console today), AES-256-GCM token encryption (web/src/lib/integrations/secret-box.ts), social_accounts table (network, external id, scopes, status, token_ref, expires_at; tokens in Vault or encrypted, never plaintext), integration_connections_connected_by_idx, public.integration_connections, public.search_console_snapshots, search_console_snapshots_connection_idx, search_console_snapshots_org_time_idx (+1 more)

### Community 112 - "Web dev dependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/turbopack, tsx, @types/node, @types/react (+3 more)

### Community 113 - "Content items and approval docs"
Cohesion: 0.27
Nodes (10): Table campaigns, Table content_calendars, Table content_items, Enum content_status, Trigger guard_content_item_write, Implicit jsonb links to business_profiles, Module content_studio, Canva (idea) (+2 more)

### Community 114 - "Product overview and audience"
Cohesion: 0.27
Nodes (9): Product overview, Secondary audience: agencies and consultants (provisional), Business growth system, Candidate early verticals (hypotheses), GrowthOS codename, Primary audience: service businesses, Tagline: Run your growth as one system, Agency or consultant managing several businesses (+1 more)

### Community 115 - "Proposed API objects"
Cohesion: 0.20
Nodes (10): New activities table (HubSpot-style engagements so AI can log work), New assets table plus Supabase Storage, Generic associations table for user-created links (organization_id, from_type, from_id, to_type, to_id, label), content_items status as a pipeline (API and MCP handlers must refuse approved, scheduled and published in code), Drop the unused integrations table to end duplication with integration_connections, integrations and integration_connections overlap; INTEGRATIONS.md still plans HubSpot on integrations, object_properties registry generated from Zod/TypeScript types, with custom_properties jsonb per object, plan_items status as a pipeline (proposed, accepted, dismissed, done) over growth_plan_items (+2 more)

### Community 116 - "How it works page"
Cohesion: 0.20
Nodes (9): ANALYSIS, ASSESSED, LOOP, MEASURED, metadata, NOT_YET, SCORE_LIMITS, SETUP (+1 more)

### Community 117 - "Site home page"
Cohesion: 0.20
Nodes (9): HeroPreview(), LOOP, metadata, MODULES, PROBLEMS, STEPS, TRUST, Status (+1 more)

### Community 118 - "Environments and domains"
Cohesion: 0.22
Nodes (9): Table contact_requests, HubSpot as Braventa's own CRM (contact requests), Community community.braventa.io (future), Environments and domains, Local development environment, Marketing site braventa.io (Vercel braventa-site), No staging environment, Production app app.braventa.io (Vercel braventa-app) (+1 more)

### Community 119 - "Community guidelines"
Cohesion: 0.25
Nodes (9): Braventa community and documentation guidelines, Announcement templates (release note, event, maintenance, incident), Code of conduct (summary), Community purpose (help members, support customers, shape the product, be honest about the roadmap), Incident announcement template (Investigating / Identified / Monitoring / Resolved), Moderation principles, Release note template, Voice for community managers (+1 more)

### Community 120 - "Web dependencies"
Cohesion: 0.22
Nodes (9): dependencies, cheerio, next, react, react-dom, server-only, @supabase/ssr, @supabase/supabase-js (+1 more)

### Community 121 - "Markdown renderer"
Cohesion: 0.28
Nodes (8): Block, DraftList, Inline, List, ListItem, parseInline(), parseMarkdown(), safeHref()

### Community 122 - "Crawler and SEO module docs"
Cohesion: 0.32
Nodes (8): Module website_seo, Google PageSpeed Insights, Website crawler, Crawler SSRF protection (fixed 2026-10-10, D-018), Fenced untrusted content (website_content, technical_checks), Prompt-injection posture, robots.txt compliance, External integrations layer

### Community 123 - "Email infrastructure"
Cohesion: 0.32
Nodes (8): Email footer postal address placeholder (Pixel Marketing Design, Baguio City; replace with the US LLC once registered), hello@braventa.io mailbox (Hostinger IMAP+SMTP connected to HubSpot), Hostinger mailboxes and DNS (MX, SPF, DKIM, DMARC p=none), HubSpot branded sending domain braventa.io (DKIM CNAMEs, merged SPF), HubSpot Starter Customer Platform subscription (bought 2026-10-11), Pixelmarketingdesign HubSpot portal (Hub ID 247150427), Shared email rules (consent, footer, sender names, subject lines, one CTA, no overclaiming), Standard transactional and marketing footers

### Community 124 - "Lifecycle email templates"
Cohesion: 0.29
Nodes (7): Customer success check-in template (21 days after first analysis), Drafts awaiting approval reminder (needs_approval for n days, once per batch), Educational newsletter template, Marketing and lifecycle email templates, Onboarding nudges (no analysis started; analysis done, nothing reviewed), Re-engagement template (60 days inactive; stop after 30 more days), Welcome sequence (Welcome 1-4)

### Community 125 - "Site indexing config"
Cohesion: 0.32
Nodes (3): headers, nextConfig, INDEXABLE

### Community 126 - "Contact requests schema"
Cohesion: 0.39
Nodes (6): contact_requests_created_idx, public.contact_requests, contact_requests_email_idx, contact_requests_ip_hash_idx, contact_requests_rate_limit, public.contact_requests_rate_limit()

### Community 127 - "Website audit schema"
Cohesion: 0.46
Nodes (7): audit_findings_org_idx, audit_findings_run_idx, audit_runs_job_idx, audit_runs_org_idx, audit_runs_profile_idx, public.audit_findings, public.audit_runs

### Community 128 - "Assistant usage schema"
Cohesion: 0.36
Nodes (4): assistant_usage_org_time_idx, assistant_usage_user_time_idx, public.assistant_usage, public.reserve_assistant_question()

### Community 129 - "Feature modules schema"
Cohesion: 0.43
Nodes (7): module_runs_audit_run_idx, module_runs_job_idx, module_runs_org_idx, module_runs_report_idx, public.module_runs, public.organization_modules, touch_updated_at

### Community 130 - "Contact form data rules"
Cohesion: 0.29
Nodes (7): HubSpot form 'braventa.io contact' (GUID ce8aca1a-3eee-4ce6-8201-8b2d1d46de4b), contact_requests table (Supabase, insert-only for the public), Custom HubSpot contact properties braventa_request_type and braventa_product_updates, IP hash privacy (ip_hash = HMAC-SHA256(IP, CONTACT_HASH_SALT); raw IP never stored), Marketing consent record (contact_requests.marketing_opt_in mirrored to braventa_product_updates), DB rate-limit trigger (at most 3 per visitor per hour, 5 per email per day), Legal pages (Terms, Privacy, Cookies, Acceptable use, Sub-processors, DPA, Trial terms)

### Community 131 - "Support site plan"
Cohesion: 0.29
Nodes (4): Next 10: read-only public API v1 (D-050), Developers section (/developers), Legal documents list, Support site sections

### Community 132 - "Proxy and Supabase browser client"
Cohesion: 0.29
Nodes (3): @supabase/ssr, config, PUBLIC_PATHS

### Community 133 - "Site pricing page"
Cohesion: 0.29
Nodes (6): FAQ, metadata, ORDER, PLUS, TIERS, TRIAL_DAYS

### Community 135 - "Secret box encryption"
Cohesion: 0.60
Nodes (5): decryptSecret(), decryptWithKey(), encryptSecret(), encryptWithKey(), key()

### Community 136 - "Onboarding follow-ups schema"
Cohesion: 0.70
Nodes (4): onboarding_follow_ups_org_idx, onboarding_follow_ups_session_idx, public.onboarding_follow_ups, touch_updated_at

## Ambiguous Edges - Review These
- `Pipeline detail check (ai_jobs, ai_usage)` → `Reaper and sweeper`  [AMBIGUOUS]
  .claude/agents/braventa-health-check.md · relation: conceptually_related_to
- `Typography decision D-015 (Quicksand headings, Comfortaa everything else)` → `create-next-app boilerplate README (web/)`  [AMBIGUOUS]
  web/README.md · relation: conceptually_related_to
- `Q-024 Configurable model IDs without a code change` → `BRAVENTA.IO wordmark`  [AMBIGUOUS]
  docs/brand/VISUAL_IDENTITY.md · relation: cites

## Knowledge Gaps
- **223 isolated node(s):** `@supabase/supabase-js`, `next`, `react`, `react-dom`, `server-only` (+218 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 854 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CRM integration and AI-ready data model (research, 2026-10-17)` connect `CRM and MCP research` to `Diagnosis and plan schema`, `Decision log: team, seats, integrations`, `Analysis start and owner inputs`, `MCP route and server metadata`, `Secret box encryption`, `MCP access and OAuth schema`, `Search Console schema`, `Proposed API objects`, `Roadmap and user journeys`, `Plan tiers and access`, `Google OAuth routes`, `Foundation schema`, `Website-intel scoring step`, `Website audit schema`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `next`, `react` to the rest of the system?**
  _223 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Website crawler and robots` be split into smaller, more focused modules?**
  _Cohesion score 0.056692242114237 - nodes in this community are weakly interconnected._
- **Why does `Team seats, roles and feature modules (research, 2026-10-17)` connect `Decision log: team, seats, integrations` to `Social planner research`, `Website messaging and module catalog`, `Pipeline prompts and model comparison`, `Plan tiers and access`, `Audit checks`, `Seats, roles and modules research`, `Foundation schema`, `Pricing proposal`, `Website-intel scoring step`, `Plans, tiers and roadmap`, `Website audit schema`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `Social planner research` be split into smaller, more focused modules?**
  _Cohesion score 0.060153776571687016 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Pipeline detail check (ai_jobs, ai_usage)` and `Reaper and sweeper`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Typography decision D-015 (Quicksand headings, Comfortaa everything else)` and `create-next-app boilerplate README (web/)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
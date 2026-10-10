> **Status:** Founder-provided specification, received 2026-10-10 and added unchanged below this note.
> The founder approved three directions from it (D-028): discovery runs **alongside** the website analysis,
> the diagnosis plan **replaces** the "5 opportunities" (content is one solution), and the MVP value test is
> now "a diagnosis and plan the owner confirms, plus content they can take away". Requirements derived from it
> are ON-1 – ON-8 in [`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md); staging is in [`MVP_SCOPE.md`](MVP_SCOPE.md).
> Where this document and approved specs differ, approved specs and decisions win. Do not edit the text below.

# Braventa AI-Assisted Onboarding & Pain-Point Diagnostic Specification

**Document type:** Product planning and implementation context for Claude Code  
**Product lineage:** GrowthOS concept, currently under the Braventa brand direction  
**Status:** Proposed specification. Inspect the current repository and reconcile with existing implementation before making changes.

## 1. Purpose

This document defines how Braventa should identify business-owner pain points during onboarding and use AI to turn answers into a useful, prioritized growth plan.

**Onboarding must be AI-assisted, not merely a static form.** It should combine structured questions, contextual follow-ups, business-context analysis, optional website/tool assessment, and an AI-generated synthesis. The customer remains in control of their answers, data connections, and consequential actions.

The app is already under development. This document describes intended behavior; it is not permission to rewrite the app or implement every future capability at once.

## 2. Product Principle

The onboarding should help an owner move from “I know something is holding my business back, but I don't know exactly what to fix or where to start” to “Braventa understands my business, has helped identify the problems that matter most, and has given me a practical plan for what to do next.”

The experience should feel like a guided diagnostic conversation with an intelligent business-growth advisor—not a generic survey, a long static checklist, or an AI chatbot that asks repetitive questions without retaining context.

### Core principles
- **AI-assisted, human-directed:** AI guides the process, but owners can correct assumptions, skip questions, and approve recommendations.
- **Structured plus conversational:** Store answers as structured data while using natural-language questions and summaries where useful.
- **Adaptive:** Ask follow-ups based on previous answers, business type, goals, and available evidence.
- **Outcome-oriented:** Produce a clear diagnosis, recommended priorities, and actionable next steps.
- **Evidence-aware:** Separate customer-confirmed facts, connected-system observations, and AI hypotheses.
- **Progressive:** Ask only what is needed at each stage; do not overwhelm the user.
- **Honest:** Never claim to have audited, connected to, or changed a system unless that actually happened.
- **Modular:** Map recommendations to current capabilities, future capabilities, or clearly labeled manual recommendations.
- **Cost-aware:** Use an appropriate model for each task and avoid expensive reasoning calls for routine extraction or classification.

## 3. Business Problems Braventa May Help Solve

These categories form the initial pain-point catalog. Treat them as a starting taxonomy that can be refined through customer research and product use.

### A. Lead generation and sales
- Not enough inquiries or qualified leads.
- Leads are poor fits for the business.
- Overreliance on referrals or word of mouth.
- Unclear which acquisition channels generate valuable leads.
- Leads are contacted too slowly or not followed up consistently.
- Too many inquiries or quotes fail to convert.
- Sales stages and responsibilities are unclear.
- The business does not understand why deals are lost.

**Potential solutions:** acquisition strategy, lead-capture improvements, follow-up workflows, lead nurturing, CRM pipeline improvements, and sales reporting.

### B. Marketing strategy and direction
- No clear marketing plan or target audience.
- Unclear positioning, offer, or differentiators.
- Marketing activities produce weak or uncertain results.
- Budget is spent without clear measurement.
- The owner does not know what to prioritize.
- Competitor positioning is not understood.
- Marketing work is not connected to business goals.

**Potential solutions:** business assessment, positioning and offer review, marketing roadmap, channel prioritization, campaign planning, and KPI design.

### C. Content and social media
- Difficulty coming up with relevant content ideas.
- Inconsistent publishing.
- Content creation takes too much time.
- Content generates little engagement, traffic, or business interest.
- Difficulty producing video scripts, graphics, blogs, social posts, email content, or ad concepts.
- Content is repeatedly recreated rather than repurposed.
- Inconsistent brand voice and messaging.
- Unclear which content performs best.

**Potential solutions:** content strategy, editorial calendar, brand-aware generation, repurposing, campaign assets, and performance analysis.

### D. Website and online presence
- Website looks outdated or does not build trust.
- Visitors do not understand the offer.
- Website traffic produces few inquiries.
- Weak calls to action, landing pages, or conversion journeys.
- Poor or uncertain search visibility.
- Website is difficult to maintain.
- Owner does not know which website issue to fix first.
- Website forms and lead capture are disconnected from follow-up.

**Potential solutions:** website assessment, SEO and UX recommendations, conversion improvements, landing-page planning, lead-capture fixes, and future CMS integrations.

### E. CRM and customer management
- Customer information is spread across tools.
- Sales pipeline is unclear.
- CRM data is incomplete, duplicated, or outdated.
- Prospects are not segmented effectively.
- Follow-up is inconsistent.
- Team members do not know which leads need attention.
- CRM workflows and reports are difficult to maintain.
- Existing CRM software is underused.

**Potential solutions:** CRM audit, data-quality review, pipeline design, segmentation, workflow recommendations, and integrations such as HubSpot where supported.

### F. Manual work and automation
- Repetitive administrative tasks consume time.
- Information is manually copied between apps.
- Reports are manually assembled.
- Business tools do not communicate with one another.
- Existing automations fail or are difficult to troubleshoot.
- The owner does not know which process to automate first.
- Important tasks depend on memory or one person.
- Workflow documentation is missing.

**Potential solutions:** automation opportunity assessment, workflow design, n8n-based workflows, integrations, monitoring, and process documentation.

### G. Reporting and decision-making
- No clear picture of business performance.
- Metrics are spread across multiple platforms.
- The business cannot connect activities with outcomes.
- Decisions rely on guesswork.
- Reports take too long to prepare.
- KPIs and targets are unclear.
- Data exists, but the next action is not obvious.

**Potential solutions:** KPI framework, supported data consolidation, performance summaries, goal tracking, and evidence-based recommendations.

### H. Customer retention and relationships
- Too few customers return or buy again.
- Follow-up after purchase is inconsistent.
- Upsell and cross-sell opportunities are missed.
- There is no structured re-engagement process.
- Customer feedback is rarely collected.
- Relationship management relies on manual reminders.
- The business cannot identify at-risk customers from available information.

**Potential solutions:** customer lifecycle workflows, post-sale follow-up, retention campaigns, segmentation, feedback collection, and re-engagement automation.

### I. Operations and team productivity
- Tasks are scattered across tools.
- Work is delayed or forgotten.
- Processes are not standardized.
- People repeatedly ask for the same information.
- Marketing, sales, and operations are poorly coordinated.
- The team does not know which tasks consume the most time.
- Important business knowledge is not documented.

**Potential solutions:** process documentation, task workflows, team coordination, shared knowledge, and operational automation.

### J. Budget, capacity, and AI adoption
- A full internal marketing or operations team is unaffordable.
- There is not enough time or staff to execute plans.
- The business pays for tools it barely uses.
- The owner wants to use AI but does not know where to start.
- AI tools have been tried but not integrated into repeatable workflows.
- The owner is concerned about AI accuracy, privacy, or quality.
- The value of automation is unclear.

**Potential solutions:** prioritization, tool-stack review, practical AI workflow recommendations, guided implementation, and cost-versus-impact analysis.

## 4. Proposed AI-Assisted Onboarding Journey

This is the target journey, not a requirement that every step be implemented in the first release.

### Stage 1 — Welcome and explain the value
Explain that Braventa will ask a few questions to understand the business and identify useful next steps. Set expectations about duration, requested information, optional integrations, and how AI will assist. Do not imply that the initial assessment is a guaranteed or complete audit.

### Stage 2 — Establish business context
Collect enough structured information to personalize the diagnostic:
- Business name and website, if available.
- Industry and business type.
- Main products or services.
- Geographic/service area.
- Ideal customer or audience, if known.
- Team size or available capacity.
- Main business goals.
- Current stage or broad business context, if useful.
- Existing marketing, CRM, analytics, website, and automation tools.

Do not require every field before the user can progress. Allow “not sure,” “not applicable,” and “skip for now” where sensible.

### Stage 3 — AI-guided discovery conversation
The AI should use the known business profile to ask concise, relevant questions. It may begin with: **“What's making it hardest for your business to grow right now?”**

Present selectable pain-point categories and allow free-text responses. Initial categories:
- Leads and sales.
- Marketing strategy.
- Content and social media.
- Website and online presence.
- CRM and customer management.
- Manual work and automation.
- Reporting and decision-making.
- Customer retention.
- Operations and team productivity.
- Budget, capacity, and AI adoption.

Users can select multiple issues and describe a problem in their own words. AI should map free-text answers to canonical pain-point IDs when appropriate, preserve the original wording, and ask for confirmation if the mapping is ambiguous.

### Stage 4 — Adaptive follow-up questions
Do not ask every follow-up question to every user. Choose the next question based on selected pain points, known information, and the value of learning more.

Potential follow-up dimensions:
- **Severity:** How much does this affect the business?
- **Frequency:** How often does it happen?
- **Impact type:** Revenue, leads, time, cost, customer experience, risk, or team capacity.
- **Evidence:** Is there a metric, example, or observation?
- **Current process:** How is the problem handled today?
- **Tools:** Which systems are involved?
- **Desired outcome:** What would a good result look like?
- **Urgency:** How soon does it need attention?
- **Constraints:** Budget, time, staffing, permissions, technical limitations, or change readiness.

Ask one or a small number of questions at a time. Reuse existing answers and summarize understanding back to the user. Avoid a long interrogation.

### Stage 5 — Select top priorities
Ask the owner to identify their top three priorities, or let AI propose a shortlist and ask the owner to confirm or reorder it. Store owner-stated priority separately from AI-calculated priority. Do not override the owner's judgment with a score.

### Stage 6 — Optional evidence gathering
Where the user chooses to provide a website or connect an integration, Braventa may use accessible evidence to improve the assessment.
- Review publicly accessible website pages.
- Inspect CRM data only after the integration and appropriate permissions are granted.
- Review analytics only when connected data is available.
- Inspect automation execution details only when the relevant system is connected and authorized.

Explain what will be accessed and why. If no integration is connected, use user answers and label the assessment as self-reported rather than pretending facts are verified.

### Stage 7 — Generate and confirm the diagnosis
AI synthesizes the stated goals, selected pain points, follow-up answers, available verified evidence, owner priorities, and missing information. Present a concise summary and let the user correct inaccuracies before finalizing the plan.

### Stage 8 — Present a prioritized action plan
The result should include:
1. Short business-context summary.
2. Top problems and why they matter.
3. Evidence and confidence for each assessment.
4. Recommended first actions.
5. Expected effort and dependencies where reasonably estimable.
6. Available Braventa capabilities that can help.
7. Manual or third-party alternatives if a required feature is unavailable.
8. Suggested success metrics.
9. A clear first action the user can take now.

Do not promise specific financial outcomes without a valid, substantiated basis.

### Stage 9 — Convert recommendations into trackable work
Where supported, let users turn an approved recommendation into a task, project, content brief, workflow, or integration setup. External side effects—sending emails, publishing content, editing CRM records, changing website content, or triggering business workflows—must follow explicit authorization and confirmation policies.

### Stage 10 — Keep onboarding alive
Persist the business profile, pain points, assessment, and plan so the assistant can refer to them later. Let users update goals and priorities. Reassess when meaningful new data arrives, but do not silently rewrite user-approved plans.

## 5. How AI Should Behave

### 5.1 Use structured outputs
Where practical, have AI return validated structured data such as:
- Business-context summary.
- Canonical pain-point IDs.
- Extracted user statements.
- Missing information.
- Suggested follow-up question and reason.
- Impact, urgency, and confidence assessments with explanations.
- Proposed solution mappings.
- Recommended next actions.
- Evidence references and uncertainty notes.

Validate model output against application schemas before saving or using it. Handle invalid, incomplete, or refused outputs gracefully.

### 5.2 Separate facts, self-reports, observations, and hypotheses
Every important finding should have a source/evidence type, for example:
- `customer_reported`
- `connected_system_observation`
- `public_website_observation`
- `ai_hypothesis`
- `manually_verified`

Do not treat a hypothesis as a confirmed fact without confirmation or supporting evidence.

### 5.3 Context-aware question selection
Before asking, consider what is already known, what remains uncertain, which missing answer could change the recommendation, whether the question is relevant, whether authorized data could provide the answer, and whether the value justifies the user effort and AI cost. Do not ask for information already supplied. Let nonessential details remain unknown.

### 5.4 Maintain user control
Users must be able to edit answers, reject or reclassify a suggested pain point, mark a question not applicable, skip optional questions, confirm or revise the diagnosis, choose recommended actions, and manage integration permissions. AI suggestions are advisory until confirmed or covered by a clearly disclosed, approved low-risk policy.

### 5.5 Avoid generic or repetitive behavior
Use real business context and previous answers. Ask specific follow-ups, explain why a detail is needed when helpful, avoid repeating questions, and never invent metrics, tools, integrations, or audit results. Summarize what has been learned and let the user correct it.

## 6. Pain-Point Catalog and Solution Mapping

Store the catalog as structured application data, not only as prose in a prompt. Each pain point should have a stable ID independent of its display label.

Suggested fields:
- `id`
- `category_id`
- `label`
- `description`
- `examples`
- `follow_up_question_keys`
- `potential_solution_ids`
- `status` (active, deprecated, exploratory)
- `version`

A solution mapping should indicate whether a solution is available in the current product, planned, a manual recommendation, dependent on a third-party integration, or not currently supported. Do not imply that selecting a pain point makes the corresponding module available.

### Initial mapping examples

| Pain point | Potential solution | Example first action |
|---|---|---|
| Not enough qualified leads | Marketing strategy and acquisition | Review current lead sources |
| Leads are not followed up | CRM and automation | Map the existing follow-up process |
| Website traffic does not convert | Website intelligence | Review calls to action and lead capture |
| Content is inconsistent | Content Studio | Draft a realistic content plan |
| CRM is messy or underused | CRM intelligence | Review data quality and pipeline |
| Repetitive manual tasks | Automation | Identify high-frequency manual work |
| Marketing ROI is unclear | Analytics | Establish measurable campaign KPIs |
| Low customer retention | Lifecycle automation | Map the post-sale customer journey |
| Limited time or staff | AI and prioritization | Find high-impact, low-effort actions |
| Unsure how to use AI | AI business assistant | Select one practical workflow to pilot |

Mappings are initial hypotheses. Consider business context, owner priorities, available product capabilities, integration access, and evidence.

## 7. Prioritization Framework

A possible initial score is:

`Priority Score = (Impact × Urgency × Confidence) / Effort`

Use consistent scales (e.g. 1–5) and explain the score. This is a decision aid, not an objective truth. Avoid false precision.

Consider impact on the stated goal, urgency and cost of delay, evidence quality, effort/cost/risk, dependencies, available product features, and owner-stated priority and constraints.

Keep separate fields for:
- `customer_priority`
- `ai_recommended_priority`
- `calculated_priority`
- `final_approved_priority`

A high-impact recommendation may not be feasible yet. Explain the dependency or propose a smaller first step.

## 8. Data Model Concepts

Inspect the existing schema first and adapt it rather than creating duplicates. Potential entities:
- `organizations` or `workspaces`
- `business_profiles`
- `pain_point_catalog`
- `onboarding_sessions`
- `onboarding_responses`
- `pain_point_assessments`
- `evidence_items`
- `solution_catalog`
- `recommended_solutions`
- `growth_plan_items`
- `integration_connections`
- `ai_interaction_logs` (with appropriate privacy and retention limits)

Design requirements:
- Store canonical IDs plus original user wording.
- Associate records with the correct organization/workspace and user.
- Keep timestamps and assessment versions.
- Record evidence source and confidence where relevant.
- Track whether a recommendation is draft, confirmed, active, completed, rejected, or superseded.
- Avoid unnecessary sensitive information.
- Apply database-level tenant isolation and authorization.
- Do not log credentials, tokens, or unnecessary raw customer data.

## 9. Technical and AI Cost Considerations

The founder previously discussed Supabase, n8n, OpenRouter, Claude, and HubSpot. Verify the current repository and configuration before assuming any are integrated.

- Use deterministic application logic for validation, persistence, permissions, and scoring where possible.
- Use AI for language understanding, adaptive questioning, synthesis, and context-aware recommendations.
- Avoid using an LLM for calculations that simple validated code can perform reliably.
- Route routine extraction/classification to an economical model; reserve more capable models for complex synthesis or reasoning.
- Keep model routing configurable rather than hard-coding model versions.
- Track token usage, latency, failures, and estimated cost where feasible.
- Bound conversation context and summarize older interactions when needed.
- Add retries and fallbacks for transient model/API failures.
- Never let model output bypass authorization or execute arbitrary tools.

## 10. Privacy, Security, and Trust

- Obtain explicit authorization before connecting external systems or reading private business data.
- Enforce organization/workspace isolation at database and API layers.
- Keep credentials server-side and out of prompts, logs, and source control.
- Use least-privilege integration scopes.
- Confirm consequential external actions.
- Be transparent about which data is used for analysis.
- Provide a path to correct or delete relevant business information in accordance with product policy.
- Never use one customer's data in another customer's assessment.
- Avoid unsupported legal, financial, or other high-stakes conclusions.
- Distinguish general business suggestions from professional advice where relevant.

## 11. UX Requirements

The UI should show progress without making onboarding feel long; use concise questions and clear options; allow multi-select and free text; show contextual follow-ups instead of all questions at once; save progress where supported; let users review/correct AI's understanding; mark optional questions and integrations; provide useful loading, retry, and error states; work on mobile and desktop; and meet accessibility expectations for keyboard use, labels, focus, and contrast.

The pain-point picker is only one component of the AI-assisted flow; it must not replace adaptive dialogue and synthesis.

## 12. MVP Scope Recommendation

Prioritize:
1. Business profile and goals.
2. Structured pain-point catalog.
3. Multi-select discovery plus free-text input.
4. AI classification of free-text into catalog IDs, with confirmation when ambiguous.
5. A small set of adaptive follow-up questions.
6. Top-three priority confirmation.
7. Evidence-aware AI synthesis.
8. Clear, editable, prioritized action plan.
9. Persistence of profile, responses, and plan.
10. Basic cost/error observability for AI calls.

Defer deep multi-platform audits, automatic external-system changes, complex scoring, and broad autonomous execution until the initial experience proves useful and reliable.

## 13. Acceptance Criteria

- Onboarding uses business context to personalize discovery.
- Users can choose pain points and add their own in natural language.
- AI asks relevant follow-ups based on missing information rather than showing every question.
- Previously answered questions are not repeated unnecessarily.
- Users can correct AI interpretations and confirm priorities.
- The diagnosis separates self-reported information, observed evidence, and hypotheses.
- Recommendations map to stable pain-point and solution IDs.
- Unsupported capabilities are clearly identified.
- The output includes prioritized actions and success indicators where feasible.
- Responses and recommendations are stored securely per workspace.
- AI failures do not destroy answers or block the user without a recovery path.
- Onboarding works on mobile and desktop.
- Tests cover schema validation, tenant authorization, pain-point mapping, question selection, and failure handling where relevant.

## 14. Instructions to Claude Code

Before implementing:
1. Read `CLAUDE.md`, this file, and relevant product/architecture documentation.
2. Inspect current onboarding routes, components, database schema, AI provider abstractions, and integrations.
3. Report what exists and identify gaps against this specification.
4. Propose a staged implementation plan that fits the current architecture.
5. Do not replace working systems or perform broad refactors without a clear reason and approval.

When implementing:
- Reuse current components, conventions, and schema where sensible.
- Keep AI output structured and validated.
- Keep authorization, scoring, and persistence in application code.
- Treat AI as an assistant to the diagnostic process, not the source of truth.
- Do not connect to or mutate external systems without authorization.
- Add or update tests and documentation.
- Keep current features working.

After implementation, report what changed, tests run, limitations, and recommended next steps.

### Source-of-truth order
1. Explicit recent founder instruction.
2. Approved current product specification.
3. Approved architecture and decision records.
4. Current verified implementation and tests.
5. This document.
6. Unapproved ideas or assumptions.

**Final guiding principle:** Braventa onboarding should feel like an intelligent, context-aware discovery process that helps business owners understand their biggest challenges and decide what to do next—not a static survey followed by a generic AI-generated report.

# Braventa email templates

This document holds the reusable email templates for Braventa, split by consent class: transactional/account email (sent to every account holder as part of the service, no marketing content) and marketing/lifecycle email (sent only to people who have explicitly opted in, always with an unsubscribe link), plus support and sales templates sent one-to-one. Use it when building email flows, configuring the email provider, or writing a one-off message. Voice and claim rules come from [`../brand/VOICE_AND_MESSAGING.md`](../brand/VOICE_AND_MESSAGING.md); the consent rule is D-014 and approval-by-default is D-013 in [`../decisions/DECISION_LOG.md`](../decisions/DECISION_LOG.md); feature status comes from [`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md). Visual treatment of HTML email follows [`../brand/VISUAL_IDENTITY.md`](../brand/VISUAL_IDENTITY.md).

**Status / last reviewed: 2026-10-10** · Templates ready; most cannot be sent yet (see §2)

---

## 1. Placeholder dictionary

| Placeholder | Meaning | Example |
|---|---|---|
| `{{product_name}}` | Always "Braventa" | Braventa |
| `{{first_name}}` | Recipient's first name; fall back to "there" | Sam |
| `{{business_name}}` | Name of the analyzed business | Northside Plumbing |
| `{{website_url}}` | The analyzed website | northsideplumbing.com |
| `{{app_url}}` | App base URL | https://app.braventa.io |
| `{{analysis_url}}` | Link to `/analysis/{id}` | https://app.braventa.io/analysis/… |
| `{{dashboard_url}}` | Link to `/dashboard` | https://app.braventa.io/dashboard |
| `{{growth_score}}` | Overall growth score, 0–100 | 62 |
| `{{top_opportunity}}` | Title of opportunity #1 | Add a tap-to-call button on mobile |
| `{{draft_count}}` | Number of drafts awaiting approval | 5 |
| `{{error_reason}}` | Plain-language failure reason (never a raw error) | the AI service was busy |
| `{{confirm_url}}` | Email confirmation link (Supabase auth) | — |
| `{{reset_url}}` | Password reset link (Supabase auth) | — |
| `{{link_expiry}}` | Link validity period | 1 hour |
| `{{usage_percent}}` | Share of monthly AI usage consumed | 100 |
| `{{reset_date}}` | Date the monthly usage limit resets | November 1 |
| `{{event_time}}`, `{{event_location}}`, `{{event_device}}` | Security notice details | — |
| `{{support_email}}` | Support address | support@braventa.io (to be confirmed) |
| `{{sender_name}}`, `{{sender_title}}` | Human sender for support/sales/success | — |
| `{{booking_url}}` | Call booking link | — |
| `{{feature_name}}`, `{{feature_summary}}`, `{{feature_url}}` | Product update content | — |
| `{{unsubscribe_url}}` | One-click unsubscribe (mandatory on marketing) | — |
| `{{preferences_url}}` | Email preference center | — |
| `{{company_address}}` | Postal address (mandatory on marketing in many jurisdictions) | — |
| `{{year}}` | Current year | 2026 |

Fallback rule: if a placeholder has no value, rewrite the sentence rather than leaving a gap (for example, omit the score line if `{{growth_score}}` is empty).

## 2. Sending status today

| Capability | Status |
|---|---|
| Email confirmation, password reset | **Can be sent** via Supabase Auth's built-in emails. Copy below should be pasted into Supabase Auth email templates (they use Supabase's own variables, e.g. `{{ .ConfirmationURL }}`; map our placeholders when configuring). |
| All other transactional emails | **Cannot be sent yet.** No transactional email provider is integrated. Requires a provider, sending domain (SPF/DKIM/DMARC for braventa.io), and app triggers. |
| All marketing/lifecycle emails | **Cannot be sent yet.** Requires an email platform, a consent record (opt-in timestamp and source), unsubscribe handling, and a postal address. |
| Support and sales emails | Sent manually from a person's mailbox. |

## 3. Shared rules

- **Consent (D-014).** Account creation is not marketing consent. Marketing email goes only to contacts with a recorded opt-in. Transactional email contains no promotion, upsell, or newsletter content.
- **Every marketing email** includes `{{unsubscribe_url}}`, `{{preferences_url}}`, and `{{company_address}}` in the footer. Unsubscribes take effect immediately and never affect transactional email.
- **Sender names:** transactional — "Braventa" from `no-reply@` or `notifications@`; marketing — "Braventa" or "{{sender_name}} at Braventa"; support/sales — a named person.
- **Subject lines:** sentence case, under 50 characters where possible, no emojis, no "RE:" tricks, no false urgency.
- **One primary CTA** per email, as a button with a verb.
- **No overclaiming.** Never imply Braventa published, sent, or changed anything on the customer's behalf.

### Standard footers
**Transactional footer:**
> You're receiving this because you have a Braventa account. This is a service message about your account.
> Braventa · {{company_address}}

**Marketing footer:**
> You're receiving this because you opted in to Braventa updates. [Manage preferences]({{preferences_url}}) · [Unsubscribe]({{unsubscribe_url}})
> Braventa · {{company_address}}

---

## 4. Transactional and account email

Consent class for all templates in this section: **Transactional** — sent regardless of marketing consent; no marketing content.

### 4.1 Email confirmation
- **Purpose:** Verify the address on a new account.
- **Trigger:** Sign-up (Supabase Auth).
- **Subject:** Confirm your email for Braventa
- **Alternative:** One step left: confirm your email
- **Preheader:** Confirm your address to start your first growth assessment.
- **Body:**
  > Hi {{first_name}},
  >
  > Confirm your email address to finish creating your Braventa account.
  >
  > **[Confirm email]({{confirm_url}})**
  >
  > This link expires in {{link_expiry}}. If you didn't create an account, you can ignore this email.
- **CTA:** Confirm email

### 4.2 Password reset
- **Purpose:** Let the user set a new password.
- **Trigger:** "Reset password" request (Supabase Auth). Note: the app has no reset UI yet; build it before relying on this email.
- **Subject:** Reset your Braventa password
- **Alternative:** Your password reset link
- **Preheader:** This link expires in {{link_expiry}}.
- **Body:**
  > Hi {{first_name}},
  >
  > We received a request to reset the password for your Braventa account.
  >
  > **[Reset password]({{reset_url}})**
  >
  > This link expires in {{link_expiry}}. If you didn't ask for this, ignore this email — your password won't change.
- **CTA:** Reset password

### 4.3 Analysis complete
- **Purpose:** Tell the user their results are ready.
- **Trigger:** `ai_jobs` row for an analysis reaches `done`.
- **Subject:** Your growth assessment for {{business_name}} is ready
- **Alternative:** {{business_name}}: growth score {{growth_score}}
- **Preheader:** Your top opportunity, a 30-day plan, and {{draft_count}} drafts to review.
- **Body:**
  > Hi {{first_name}},
  >
  > Braventa has finished analyzing {{website_url}}.
  >
  > - **Growth score:** {{growth_score}} / 100
  > - **Top opportunity:** {{top_opportunity}}
  > - **Ready for you:** a 30-day content plan and {{draft_count}} drafted posts
  >
  > The drafts are waiting for your approval. Nothing is published automatically.
  >
  > **[See your results]({{analysis_url}})**
- **CTA:** See your results

### 4.4 Analysis failed
- **Purpose:** Explain a failed run and how to recover.
- **Trigger:** Analysis job status `failed`.
- **Subject:** Your analysis of {{business_name}} didn't finish
- **Alternative:** We couldn't complete your analysis
- **Preheader:** Here's what happened and how to try again.
- **Body:**
  > Hi {{first_name}},
  >
  > Braventa couldn't finish analyzing {{website_url}} because {{error_reason}}.
  >
  > Most of the time, running it again fixes this. If it fails twice, check that the website loads in your browser, then reply to this email and we'll look into it.
  >
  > **[Try again]({{analysis_url}})**
- **CTA:** Try again

### 4.5 Drafts awaiting approval
- **Purpose:** Remind the user that drafts need a decision.
- **Trigger:** Drafts in `needs_approval` for more than {{n}} days after analysis complete (send once; maximum one reminder per batch).
- **Subject:** {{draft_count}} drafts are waiting for your approval
- **Alternative:** Your drafts for {{business_name}} need a review
- **Preheader:** Approve or reject them in a few minutes.
- **Body:**
  > Hi {{first_name}},
  >
  > You have {{draft_count}} drafted posts for {{business_name}} waiting for review. Approve the ones you like and reject the rest — nothing goes out without your approval.
  >
  > **[Review drafts]({{analysis_url}})**
- **CTA:** Review drafts
- **Note:** This is a service reminder about work the user started; keep it free of promotion so it stays transactional.

### 4.6 Usage limit reached
- **Purpose:** Explain why new analyses are paused.
- **Trigger:** Monthly AI budget reached for the organization (`BudgetExceededError`). Optional earlier variant at 80%.
- **Subject:** Your monthly Braventa usage limit has been reached
- **Alternative:** New analyses are paused until {{reset_date}}
- **Preheader:** Your existing results are still available.
- **Body:**
  > Hi {{first_name}},
  >
  > Your organization has used {{usage_percent}}% of this month's AI usage, so new analyses are paused until {{reset_date}}.
  >
  > Everything you've already created — profiles, scores, plans, and drafts — is still available.
  >
  > If you need more capacity before then, reply to this email.
  >
  > **[Go to your dashboard]({{dashboard_url}})**
- **CTA:** Go to your dashboard
- **Note:** Do not include plan upgrades or pricing (D-012).

### 4.7 Security notice
- **Purpose:** Alert the user to a security-relevant account change.
- **Trigger:** Password changed, email changed, or (later) sign-in from a new device.
- **Subject:** Your Braventa password was changed
- **Alternative:** Security alert for your Braventa account
- **Preheader:** If this was you, no action is needed.
- **Body:**
  > Hi {{first_name}},
  >
  > The password for your Braventa account was changed on {{event_time}} ({{event_device}}, {{event_location}}).
  >
  > If this was you, there's nothing else to do.
  >
  > If it wasn't, reset your password now and contact us at {{support_email}}.
  >
  > **[Reset password]({{reset_url}})**
- **CTA:** Reset password

---

## 5. Marketing and lifecycle email

Consent class for all templates in this section: **Marketing** — requires recorded opt-in; unsubscribe link mandatory; marketing footer required.

### 5.1 Welcome sequence

#### Welcome 1 — Welcome
- **Purpose:** Set expectations and get the first analysis started.
- **Trigger:** Opt-in recorded (immediately).
- **Subject:** Welcome to Braventa
- **Alternative:** Here's how to get your first growth assessment
- **Preheader:** Four minutes from your website to a plan.
- **Body:**
  > Hi {{first_name}},
  >
  > Welcome to Braventa. You'll hear from us occasionally with product updates and practical growth ideas for service businesses.
  >
  > If you haven't yet, start with your website. In about four minutes Braventa builds a profile of your business, gives you a growth score, finds your top five opportunities, and drafts your first posts for approval.
  >
  > **[Analyze your website]({{app_url}}/onboarding)**
- **CTA:** Analyze your website

#### Welcome 2 — Understanding your growth score
- **Purpose:** Educate on the score so it's trusted, not over-trusted.
- **Trigger:** 2 days after Welcome 1.
- **Subject:** What your growth score actually measures
- **Alternative:** Reading your growth score in two minutes
- **Preheader:** Part measured, part assessed — here's the difference.
- **Body:**
  > Hi {{first_name}},
  >
  > Your growth score is a starting point for priorities, not a prediction. It combines:
  >
  > - **Measured by Google:** mobile speed, SEO basics, accessibility.
  > - **Assessed by Braventa:** content clarity, conversion readiness, online presence.
  >
  > The number matters less than the five opportunities underneath it. Start with the one marked high impact and low effort.
  >
  > **[Open your dashboard]({{dashboard_url}})**
- **CTA:** Open your dashboard

#### Welcome 3 — From plan to posts
- **Purpose:** Drive draft review.
- **Trigger:** 4 days after Welcome 2.
- **Subject:** Your 30-day plan, in one sitting
- **Alternative:** How to review your drafts quickly
- **Preheader:** Approve the drafts that fit, reject the rest.
- **Body:**
  > Hi {{first_name}},
  >
  > Each analysis ends with a 30-day plan — a goal, an audience, and content pillars — and five drafted posts written in your brand voice.
  >
  > A quick way to review: read each draft once, approve it if you'd say it to a customer, reject it if you wouldn't. Nothing is published automatically.
  >
  > **[Review your drafts]({{dashboard_url}})**
- **CTA:** Review your drafts

#### Welcome 4 — What's coming next
- **Purpose:** Share roadmap honestly; invite feedback.
- **Trigger:** 5 days after Welcome 3.
- **Subject:** What we're building next
- **Alternative:** Help shape Braventa
- **Preheader:** HubSpot first. Tell us what you need.
- **Body:**
  > Hi {{first_name}},
  >
  > Today Braventa helps you understand your business and get the first work drafted. Next, we're building connections to the tools you already use, starting with HubSpot, so the plan can move into action and results can come back.
  >
  > We'd like to hear what would help you most. Reply with one sentence — we read every reply.
  >
  > **[Book a 20-minute call]({{booking_url}})**
- **CTA:** Book a 20-minute call

### 5.2 Onboarding nudges

#### Nudge A — No analysis started
- **Purpose:** Prompt the first analysis.
- **Trigger:** Opted-in user, account 3 days old, no analysis.
- **Subject:** Your first growth assessment takes 4 minutes
- **Alternative:** Start with your website
- **Preheader:** One URL. Five priorities.
- **Body:**
  > Hi {{first_name}}, you haven't run your first analysis yet. Enter your website and Braventa will show you the five opportunities worth your time, plus a 30-day plan.
  >
  > **[Analyze your website]({{app_url}}/onboarding)**
- **CTA:** Analyze your website

#### Nudge B — Analysis done, nothing reviewed
- **Purpose:** Encourage acting on the first opportunity (distinct from the transactional draft reminder: this one is educational).
- **Trigger:** Opted-in user, analysis complete 7 days ago, no approvals.
- **Subject:** One thing to do for {{business_name}} this week
- **Alternative:** Your first step is already written
- **Preheader:** {{top_opportunity}}
- **Body:**
  > Hi {{first_name}}, the top opportunity Braventa found for {{business_name}} was: **{{top_opportunity}}**. The first step is in your results.
  >
  > **[See the first step]({{analysis_url}})**
- **CTA:** See the first step

### 5.3 Product update (monthly)
- **Purpose:** Summarize what changed.
- **Trigger:** Monthly, to opted-in users.
- **Subject:** What's new in Braventa — {{month}}
- **Alternative:** {{month}} at Braventa: {{headline_change}}
- **Preheader:** {{headline_change}} and {{n}} smaller improvements.
- **Body:**
  > Hi {{first_name}},
  >
  > Here's what changed this month.
  >
  > **New:** {{change_1}} — {{why_it_matters_1}}
  > **Improved:** {{change_2}}
  > **Fixed:** {{change_3}}
  >
  > **Coming next:** {{next_item}} (planned — timing may change)
  >
  > **[Open Braventa]({{app_url}})**
- **CTA:** Open Braventa

### 5.4 Feature announcement
- **Purpose:** Announce one shipped feature.
- **Trigger:** Feature is live and verified in production (never before).
- **Subject:** New in Braventa: {{feature_name}}
- **Alternative:** You can now {{feature_verb_phrase}}
- **Preheader:** {{feature_summary}}
- **Body:**
  > Hi {{first_name}},
  >
  > You can now {{feature_verb_phrase}}.
  >
  > **What it does:** {{feature_summary}}
  > **Why it matters:** {{feature_benefit}}
  > **How to start:** {{feature_first_step}}
  >
  > {{approval_note — e.g. "As always, nothing is published without your approval."}}
  >
  > **[Try {{feature_name}}]({{feature_url}})**
- **CTA:** Try {{feature_name}}

### 5.5 Educational newsletter
- **Purpose:** Practical growth advice for service businesses; builds trust.
- **Trigger:** Every 2–4 weeks.
- **Subject:** {{topic_as_benefit}} (e.g. "Three fixes for a contact page that doesn't convert")
- **Alternative:** {{question_form}} (e.g. "Why do visitors leave before calling?")
- **Preheader:** A five-minute read for service business owners.
- **Body structure:**
  > Hi {{first_name}},
  >
  > **The problem:** {{one_paragraph}}
  > **What to do:** 3 numbered, specific steps.
  > **An example:** {{illustrative_example — clearly labelled as illustrative, not a customer story unless approved}}
  > **In Braventa:** one sentence on how the product helps today (live features only).
  >
  > **[Check your own site]({{app_url}}/onboarding)**
- **CTA:** Check your own site

### 5.6 Customer success check-in
- **Purpose:** Personal check-in from a human; gather feedback.
- **Trigger:** 21 days after first analysis, opted-in users.
- **From:** {{sender_name}}, a real person.
- **Subject:** How is Braventa working for {{business_name}}?
- **Alternative:** Quick question about your plan
- **Preheader:** Two-minute reply, or a 20-minute call.
- **Body:**
  > Hi {{first_name}},
  >
  > I'm {{sender_name}} from Braventa. It's been a few weeks since you analyzed {{business_name}}, and I wanted to check in.
  >
  > Did the opportunities feel right? Was anything missing or wrong? Reply with a sentence or two, or book time and we'll go through it together.
  >
  > **[Book a call]({{booking_url}})**
  >
  > {{sender_name}}, {{sender_title}}
- **CTA:** Book a call

### 5.7 Re-engagement
- **Purpose:** Win back or cleanly sunset inactive subscribers.
- **Trigger:** No app sign-in and no email engagement for 60 days.
- **Subject:** Still want to hear from Braventa?
- **Alternative:** Your growth assessment is still here
- **Preheader:** Re-run your analysis, or unsubscribe in one click.
- **Body:**
  > Hi {{first_name}},
  >
  > It's been a while. Your profile for {{business_name}} is still in Braventa, and a fresh analysis takes about four minutes — your website has probably changed since last time.
  >
  > If you'd rather not hear from us, [unsubscribe here]({{unsubscribe_url}}). No hard feelings.
  >
  > **[Re-run your analysis]({{dashboard_url}})**
- **CTA:** Re-run your analysis
- **Rule:** If no engagement within 30 days, stop marketing email to this contact.

---

## 6. Support response templates

Sent one-to-one by a named person. No marketing content. Structure: acknowledge → answer or next step → timeframe → sign-off.

### 6.1 First response
> Hi {{first_name}},
>
> Thanks for getting in touch. I'm looking into {{issue_summary}} now and will get back to you by {{response_time}}.
>
> {{sender_name}}, Braventa support

### 6.2 Analysis keeps failing
> Hi {{first_name}},
>
> Sorry the analysis of {{website_url}} isn't finishing. I checked and the cause was {{error_reason}}.
>
> {{fix_or_workaround}}. Once that's done, use **Re-run analysis** on your results page. If it still fails, reply here and I'll run it with you.
>
> {{sender_name}}

### 6.3 Feature not available yet
> Hi {{first_name}},
>
> Thanks for asking about {{requested_feature}}. Braventa doesn't do that yet. It's {{on_the_roadmap | not currently planned}}, and I've added your request so the team knows who needs it.
>
> In the meantime, {{workaround_or_none}}.
>
> {{sender_name}}

### 6.4 "Did Braventa post this?"
> Hi {{first_name}},
>
> Braventa doesn't publish or send anything on your behalf — drafts stay in your account until you approve them, and approving doesn't publish them today. If something appeared on your channels, it came from another tool or account. Happy to help you check.
>
> {{sender_name}}

### 6.5 Data deletion request
> Hi {{first_name}},
>
> We've received your request to delete {{scope — account / business profile}}. We'll confirm when it's done, within {{deletion_timeframe}}. [Confirm process with legal/ops before use.]
>
> {{sender_name}}

### 6.6 Resolved
> Hi {{first_name}},
>
> {{issue_summary}} should now be fixed — {{what_changed}}. Let me know if you see it again.
>
> {{sender_name}}

---

## 7. Sales proposal email

- **Purpose:** Follow up a discovery call with a written proposal.
- **Trigger:** Manual, after a call. One-to-one; not a marketing send.
- **Subject:** Braventa for {{business_name}} — proposal
- **Alternative:** Next steps for {{business_name}}
- **Preheader:** What we heard, what we'd do, and what happens next.
- **Body:**
  > Hi {{first_name}},
  >
  > Thanks for the time on {{call_date}}. Here's what I heard and what I'd suggest.
  >
  > **What you told us:** {{customer_goal}}; {{main_pain_1}}; {{main_pain_2}}.
  >
  > **What Braventa found:** your growth score is {{growth_score}}, and the top opportunities are {{opportunity_1}} and {{opportunity_2}}. [Attach or link the analysis.]
  >
  > **What we'd do together:**
  > 1. {{step_1 — e.g. run the analysis on your main site and review it on a call}}
  > 2. {{step_2 — e.g. approve a first month of content from the 30-day plan}}
  > 3. {{step_3 — optional implementation service, if offered}}
  >
  > **What Braventa does today vs next:** today it builds your profile, priorities, plan, and drafts for approval. {{relevant_planned_feature}} is planned, not live — I'll keep you posted.
  >
  > **Investment:** {{pricing_per_founder_decision}} [Do not fill without a founder-approved price — D-012.]
  >
  > If this looks right, reply and we'll set up the next step. Or [book a follow-up]({{booking_url}}).
  >
  > {{sender_name}}, {{sender_title}}
- **CTA:** Reply or book a follow-up
- **Rule:** No guarantees of leads, revenue, or rankings. See the sales proposal structure in [`CAMPAIGN_GUIDELINES.md` §5](CAMPAIGN_GUIDELINES.md#5-sales-presentation-and-proposal).

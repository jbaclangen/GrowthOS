# Braventa community and documentation guidelines

This document guides anyone who speaks for Braventa in community spaces (forums, groups, social replies, events) and anyone who writes Braventa documentation. It covers the community's purpose, voice for community managers, announcement templates, moderation principles, a code of conduct summary, and documentation writing rules, including how to label planned features. It builds on [`../brand/VOICE_AND_MESSAGING.md`](../brand/VOICE_AND_MESSAGING.md) and [`../brand/BRAND_BIBLE.md`](../brand/BRAND_BIBLE.md); feature status comes from [`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md); decisions from [`../decisions/DECISION_LOG.md`](../decisions/DECISION_LOG.md).

**Status / last reviewed: 2026-10-10** · Provisional — no community space exists yet; platform choice is open

---

## 1. Community purpose

The Braventa community exists to:
1. **Help members run growth as a system** — share what works for service businesses, not just how to use the product.
2. **Support customers** — fast, friendly answers about Braventa, with a route to private support for account issues.
3. **Shape the product** — collect feature requests and feedback in the open, and close the loop when things ship.
4. **Be honest about the roadmap** — what's live, what's next, and what isn't planned.

It is not a sales channel. Promotion happens elsewhere.

## 2. Voice for community managers

- **Warmer and more conversational** than marketing, still clear and concise. Use first names.
- **Answer first, then add context.** Link to docs instead of pasting long explanations.
- **Own mistakes.** "That's a bug on our side — thanks for flagging it. We're on it." No deflecting.
- **Be exact about status.** "Not yet" is better than "soon". Never promise dates you don't control.
- **Thank contributors** specifically: "Thanks, {{first_name}} — that tip about contact pages is useful."
- **Move private matters private.** Account, billing, or data questions go to {{support_email}}; never ask for passwords or personal data in public.
- **No emojis in announcements.** In casual replies, one at most where the platform norm expects it.

| Situation | Response pattern |
|---|---|
| Feature request | "Thanks — that's not something Braventa does today. I've logged it. {{status: planned / under consideration / not planned}}." |
| Bug report | "Thanks for the detail. I can reproduce it / I've passed it to the team. I'll update this thread when it's fixed." |
| Frustrated member | Acknowledge, apologize for the specific impact, give the next step and a timeframe. |
| Question we can't answer yet | "I don't know yet. I'll find out and reply here by {{date}}." |

## 3. Announcement templates

### 3.1 Release note
```
Title: {{product_name}} update — {{date}}

What's new
- {{feature}}: {{what it does, in one sentence}}. {{how to find it}}.

Improved
- {{improvement}}

Fixed
- {{fix}}

Coming next (planned — timing may change)
- {{next_item}}

Questions or feedback? Reply here.
```
Rule: only list items that are deployed to production and verified.

### 3.2 Event
```
Title: {{event_name}} — {{date}}, {{time}} {{timezone}}

What: {{one-sentence description}}
Who it's for: {{audience}}
You'll leave with: {{1–3 concrete takeaways}}
Where: {{link or location}}
Register: {{registration_url}}

Can't make it? {{recording_policy}}
```

### 3.3 Maintenance
```
Title: Scheduled maintenance — {{date}}, {{start_time}}–{{end_time}} {{timezone}}

What's affected: {{e.g. new analyses can't be started}}
What's not affected: {{e.g. existing results stay viewable}}
Why: {{plain reason}}
We'll post here when it's complete.
```

### 3.4 Incident
```
Title: [Investigating | Identified | Monitoring | Resolved] {{short description}}

{{time}} {{timezone}} — What's happening: {{impact in plain words, e.g. "Analyses are failing at the planning step."}}
Who's affected: {{scope}}
What you can do: {{workaround or "No action needed"}}
Next update: by {{time}}

(On resolution) Cause: {{plain explanation}}. What we're changing: {{prevention}}. Sorry for the disruption.
```
Rules: post the first update quickly, even with little detail; update at the stated time; never speculate about data exposure — involve the founder before any security communication.

## 4. Moderation principles

1. **Protect people first.** Remove harassment, threats, and personal data immediately.
2. **Be consistent and transparent.** Apply the same rules to everyone, including customers and partners; explain removals briefly where it's safe to.
3. **Escalate proportionally:** reminder → content removal → temporary mute → removal from the community.
4. **No spam or unsolicited promotion**, including affiliate links and cold pitches to members.
5. **Keep criticism.** Honest negative feedback about Braventa stays up; respond to it, don't delete it.
6. **Security reports go private.** Thank the reporter and move to {{security_email}}.
7. **Log moderation actions** (what, why, who) for consistency.

## 5. Code of conduct (summary)

- Be respectful. Disagree with ideas, not people.
- No harassment, discrimination, or personal attacks.
- Don't share other people's private information, or your own account credentials.
- No spam or self-promotion outside designated threads.
- Share accurate information; say when something is your opinion or an AI-generated suggestion.
- Respect confidentiality: don't post other businesses' data without permission.
- Moderators may remove content or members who break these rules. Report issues to {{moderation_contact}}.

Full code of conduct: `[Link — add when the community platform is chosen]`.

## 6. Documentation writing guidelines

### 6.1 Principles
- **Task-first.** Organize around what the reader is trying to do ("Approve your drafts"), not around screens or internals.
- **Second person, present tense, active voice.** "Select **Approve**." not "The Approve button can be selected."
- **Sentence-case headings**; US English (see [`VOICE_AND_MESSAGING.md` §6](../brand/VOICE_AND_MESSAGING.md#6-spelling-and-style-conventions)).
- **UI labels in bold**, exactly as they appear in the app.
- **Short steps:** one action per numbered step; state the expected result.
- **Explain AI outputs:** what's measured, what's assessed, what's inferred.
- **Accurate over complete:** document what exists; label everything else.

### 6.2 Doc intro template
```
# {{Task or topic, sentence case}}

{{One or two sentences: what this helps you do and why it matters.}}

**Before you start:** {{prerequisites, e.g. "You need a Braventa account and a website address."}}
**Time:** {{e.g. "About 5 minutes, plus 3–4 minutes for the analysis to run."}}
```

### 6.3 Page structure
1. Title and intro (template above)
2. Steps (numbered) or concepts (short sections)
3. What you'll see / expected result
4. Troubleshooting (symptom → cause → fix)
5. Related pages

### 6.4 Tone
Calm, precise, helpful. No marketing language in docs ("powerful", "seamless", "revolutionary"). No jokes in error or troubleshooting content.

### 6.5 Labelling planned features
- Never document a planned feature as if it exists.
- If a page must mention one, use a callout:
  > **Planned:** {{feature}} isn't available yet. This page will be updated when it ships.
- Do not include screenshots, steps, or settings for unbuilt features.
- When a feature ships, remove the callout and update [`../product/MVP_SCOPE.md`](../product/MVP_SCOPE.md) in the same change.
- Use consistent status words: **Live**, **Planned**, **Future vision** (internal), **Coming next** (public-facing).

### 6.6 Example intro
```
# Review and approve your drafts

Each analysis ends with five drafted social posts written in your brand voice. Review them,
approve the ones you want to use, and reject the rest. Nothing is published automatically.

**Before you start:** You need a completed analysis.
**Time:** About 5 minutes.
```

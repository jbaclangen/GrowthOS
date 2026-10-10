# Component guidelines

Conventions for Braventa UI components. Implemented primitives live in `web/src/app/globals.css`
(`@layer components`) and `web/src/components/`. Tokens: [`DESIGN_TOKENS.md`](DESIGN_TOKENS.md). Copy rules:
[`VOICE_AND_MESSAGING.md` §12](../docs/brand/VOICE_AND_MESSAGING.md#12-product-ui-microcopy).

Status / last reviewed: 2026-10-10. "Implemented" = exists in code today; "Convention" = rule for when it's built.

## Principles
- Reuse before you create: check `globals.css` primitives and `web/src/components/` first.
- Promote a pattern into a shared component the second time it's needed (e.g. `Tag` and `StatusTag` in
  `analysis/[id]/page.tsx` are the next candidates — see the audit in the handover report).
- Semantic tokens only; no HEX, no `dark:` colour overrides.
- Every interactive element: visible focus, keyboard operable, ≥ 44 px touch target on mobile.

## Implemented primitives

| Class / component | Use | Notes |
|---|---|---|
| `.btn-primary` | The one main action in a view | Cobalt fill, `accent-foreground` text, 8 px radius. One per view. |
| `.btn-secondary` | Other actions | Surface fill, border; hover `surface-muted`. |
| `.input` | Text inputs, selects, textareas | Focus = Cobalt border + 20 % ring. Always with a visible `<label>`. |
| `.card` | Grouped content | `surface`, 1 px border, 12 px radius, 20 px padding. |
| `.eyebrow` | Small uppercase label above a heading | Comfortaa 600, 12 px, +0.08em, `muted`. ≤ 4 words. |
| `.heading` | Explicit Quicksand heading style | `h1`–`h4` get Quicksand automatically. |
| `.display` | Marketing headline | Quicksand 700 at `text-display`. Not in the app. |
| `.chip` | Status and metadata chips | Comfortaa 600, 11 px uppercase, 4 px radius. Pair with a tone (below). |
| `<Logo />` | Brand mark | `variant="lockup"|"symbol"`, `height` ≥ 20 / 16. Inherits text colour; node via `logo-node`. |
| `<ScoreBadge />`, `<ScoreBar />` | 0–100 scores | `scoreTone()`: ≥ 70 success, 45–69 warning, < 45 danger. Number always shown. |

## Buttons (convention)
- Labels are verbs in sentence case: "Analyze website", "Approve", "Re-run analysis". Not "Submit", not "OK".
- Pending state replaces the label ("Starting…") and disables the button; never remove the button.
- Destructive: `btn-secondary` with `text-danger`, plus confirmation for irreversible actions.
- Marketing CTAs may use `rounded-pill` and larger padding (`px-6 py-3`).

## Status chips (convention — the core of "distinguish drafts, approved, running, completed")

| State | Label | Tone classes |
|---|---|---|
| Planned / brief | `Planned` | `bg-surface-muted text-muted` |
| Draft | `Draft` | `bg-surface-muted text-muted` |
| Needs approval | `Needs approval` | `bg-warning-soft text-warning` |
| Approved | `Approved` | `bg-success-soft text-success` |
| Rejected | `Rejected` | `bg-danger-soft text-danger` |
| Scheduled | `Scheduled` | `bg-accent-soft text-accent-soft-foreground` |
| Running / queued | `Running` | `bg-info-soft text-info` (+ spinner) |
| Completed | `Completed` | `bg-success-soft text-success` |
| Failed | `Failed` | `bg-danger-soft text-danger` |
| Not connected (integration) | `Not connected` | `bg-surface-muted text-muted` |
| Connected | `Connected` | `bg-success-soft text-success` |

Always show the word; colour is supplementary. Use the same labels in UI, emails, and docs.

## Cards and lists
- One idea per card; title (h3, 16 px) → supporting text (`text-sm text-muted`) → action row.
- Recommendation cards always show **why** and **first step** (as opportunities do today).
- Clickable cards: whole card is the link; hover `border-accent`.

## Forms
- Label above field, optional fields marked "(optional)", helper text below in `text-xs text-muted`.
- Validate on submit; errors under the field in `text-danger`, written as what to do ("Enter a valid email
  address").
- Long-running submissions state the expected wait ("Takes about 3–4 minutes").

## Navigation
- Header: 56 px, `surface`, bottom border; `<Logo height={22} />` left linking to `/dashboard`; account right.
- Page structure: optional `.eyebrow` → `h1` (24 px) → one-line description (`text-sm text-muted`) → content.
- Future app nav (when there are > 3 destinations): left sidebar on desktop, bottom or menu on mobile; modules
  named per D-010.

## Feedback states
- **Empty states:** say what this area is for and give one next step (button). No blank panels.
- **Loading:** skeletons for content, spinners only for short actions; long jobs show named steps with
  `aria-live="polite"` (see analysis progress).
- **Errors:** what happened + what to do + a retry where possible. Translate provider errors into plain
  language; never show raw upstream messages (current gap — see handover).
- **Success:** confirm briefly in place; don't interrupt with modals.

## AI-specific conventions
- Label provenance: *Verified* (measured, e.g. "Google"), *From you*, *Inferred*, *Recommended* — see
  [`BUSINESS_METHODOLOGY.md`](../docs/product/BUSINESS_METHODOLOGY.md).
- Every generated item that could be published carries a status chip and an explicit approve action.
- Never use sparkle icons or "magic" language for AI actions; name the action ("Draft five posts").

## Data display
Tables: header row `text-xs text-muted font-semibold`, row dividers `border-border`, wrap in `.card` with
`overflow-x-auto`. Numbers `tabular-nums`, right-aligned. Charts: see
[`VISUAL_IDENTITY.md` §10](../docs/brand/VISUAL_IDENTITY.md#10-data-visualisation).

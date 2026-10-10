# Design tokens

How Braventa's design tokens are defined, compiled, and used. The *why* behind each value is in
[`docs/brand/VISUAL_IDENTITY.md`](../docs/brand/VISUAL_IDENTITY.md); component usage is in
[`component-guidelines.md`](component-guidelines.md).

Status / last reviewed: 2026-10-10 · Decision D-009.

## Pipeline

```
design-system/tokens.json  ──npm run tokens──▶  web/src/styles/tokens.css  ──@import──▶  web/src/app/globals.css
   (source, DTCG format)        + WCAG check         (generated, committed)                  (Tailwind 4 theme)
```

- **Edit only `tokens.json`.** `tokens.css` is generated; hand edits are overwritten.
- `npm run tokens` (in `web/`) compiles and **fails if any text/background role pair is below WCAG AA**.
- `npm run tokens:check` verifies the committed CSS matches `tokens.json` (use before committing / in CI).
- Format: W3C Design Tokens (`$value`, `$type`, `$description`); references like `{color.cobalt.600}`.

## What the compiler emits

| `tokens.json` group | CSS output | Tailwind usage |
|---|---|---|
| `color.ink/cobalt/volt/green/amber/red/chart.*` | `@theme` `--color-<scale>-<step>` | `bg-cobalt-50`, `text-ink-500`, `fill-chart-2` |
| `color.brand.*` | `--color-brand-<name>` | `bg-brand-ink`, `text-brand-volt` |
| `theme.light/dark.*` (semantic roles) | `--<role>` on `:root`, dark under `prefers-color-scheme` and `[data-theme="dark"]` | `bg-surface`, `text-muted`, `border-border`, `bg-accent`, `text-accent-foreground`, `fill-logo-node` … |
| `font.display/sans/mono` | `--font-*` | `font-display`, `font-sans` (default body), `font-mono` |
| `fontSize.display` | `--text-display` | `text-display` |
| `tracking.*` | `--tracking-*` | `tracking-tight`, `tracking-label`, `tracking-display` |
| `fontWeight.*` | `--font-weight-body/ui/heading` (plain vars) | used in CSS |
| `radius.*` | `--radius-*` (overrides Tailwind's) | `rounded-sm` 4, `rounded-md` 8, `rounded-lg` 12, `rounded-xl` 16, `rounded-pill` |
| `shadow.*` | `--shadow-*` | `shadow-sm/md/lg` |
| `motion.easing.*` | `--ease-*` | `ease-standard`, `ease-enter`, `ease-exit` |
| `motion.duration.*` | `--duration-*` (plain vars) | `duration-(--duration-fast)` |
| `layout.*` | `--layout-*` (plain vars) | reference in CSS |
| `space.*`, `fontSize.xs…6xl` | not emitted | documented contract; identical to Tailwind defaults (`p-4` = 16 px, `text-sm` = 14 px) |

Fonts: `--font-quicksand` and `--font-comfortaa` are set by `next/font` in `web/src/app/layout.tsx`.

## Rules
1. **Use semantic roles in components** (`bg-surface`, `text-muted`, `bg-accent`). Scale colours are for rare
   brand moments (marketing art, charts). Never hard-code HEX in components.
2. **No `dark:` overrides for colour** — roles already switch with the theme. If something needs a different
   dark value, add or change a role in `tokens.json`.
3. **Adding a role:** add it to *both* `theme.light` and `theme.dark`; if it's text-on-background, add the pair
   to `PAIRS` in `web/scripts/build-tokens.mjs` so contrast is enforced.
4. **Changing a brand colour** is a brand decision — record it in `DECISION_LOG.md`, then regenerate tokens *and*
   brand assets (`build-brand-assets.mjs` reads colours from `tokens.json`).
5. Keep spacing and type on the Tailwind scale; avoid arbitrary values (`p-[13px]`) unless matching an external
   constraint.

## Current semantic roles
`background`, `surface`, `surface-muted`, `foreground`, `muted`, `border`, `border-strong`, `accent`,
`accent-hover`, `accent-foreground`, `accent-soft`, `accent-soft-foreground`, `signal`, `signal-foreground`,
`focus`, `logo-node`, `success`, `success-soft`, `warning`, `warning-soft`, `danger`, `danger-soft`, `info`,
`info-soft`. Values per theme: [`VISUAL_IDENTITY.md` §3.3](../docs/brand/VISUAL_IDENTITY.md#33-semantic-roles-light--dark).

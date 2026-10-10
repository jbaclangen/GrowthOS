# Visual identity

The authoritative specification for how Braventa looks: logo, colour, typography, layout, iconography,
imagery, data visualisation, motion, and accessibility. Values here are *descriptions*; the machine-readable
values live in [`design-system/tokens.json`](../../design-system/tokens.json) and are compiled into the app
(D-009). If this document and `tokens.json` ever disagree, `tokens.json` wins and this document is fixed.

Status / last reviewed: 2026-10-10. Decisions: D-006 (colour), D-008 (symbol), D-015 (typography, founder),
D-017 (wordmark). Component rules: [`design-system/component-guidelines.md`](../../design-system/component-guidelines.md).

---

## 1. Creative direction

**Idea: one connected system, with a clear next step.** Everything in the identity says *connected* (paths,
nodes, one consistent system of surfaces) and *next* (forward direction, one highlighted action). The brand
should feel like a calm, capable operator — never like "AI magic".

### What we took from the founder's inspirations

| Source | What it does | What Braventa adopts | What Braventa does not adopt |
|---|---|---|---|
| [unitedcarriers.com](https://unitedcarriers.com/) | Near-black ink and white, a single electric cobalt accent (`#0016CB`), short confident declaratives ("we own the outcome"), dark cinematic hero followed by clean light sections, small spaced-out uppercase labels. | One saturated cobalt as the only action colour; ink/paper contrast; short uppercase section heads on marketing pages; the "one accountable operator" stance. | Heavy WebGL/scroll-jacking, space/earth photography, all-caps body text. |
| [teamworkgraph.com](https://teamworkgraph.com/) | Layered charcoal surfaces (`#111213` → `#1F1F21`), tools drawn as connected nodes on a graph, status chips (Done / On track / At risk), one hand-drawn highlight colour. | Layered ink surfaces for dark mode; the node-and-edge "graph" motif (logo node, social artwork); explicit status chips; one bright signal colour used sparingly (Volt). | Busy icon-cloud heroes; scribble illustrations as a core motif. |

### Principles
1. **Clarity over decoration.** Every visual element must help someone understand or act.
2. **One accent for action.** Cobalt means "you can do something here". Nothing decorative is Cobalt.
3. **One signal for "next".** Volt marks the single most important thing — the logo node, the next action on a
   dark hero. If two things are Volt, neither is.
4. **Surfaces, not shadows.** Hierarchy comes from layered surfaces and borders; shadows only for things that
   float (menus, dialogs).
5. **Rounded, friendly geometry.** Quicksand, Comfortaa, and the round-capped symbol share one language:
   approachable, precise, not childish. Keep corners consistent (§7).

### Avoid
Generic AI imagery (robots, glowing brains, neural-network spaghetti, sparkles as a logo), purple-to-pink
gradients, glassmorphism, stock photos of people pointing at screens, decorative dashboards full of vanity
charts, and template SaaS illustration packs.

---

## 2. Logo

### 2.1 The Waypoint symbol
A "B" drawn as a vertical stem and two forward chevrons. The upper chevron closes back to the stem; the lower
path stops short of a detached **node** — the path leads to the next action. It reads as the letter B, as
forward motion (two chevrons), and as a connected system (paths + node).

| Property | Spec |
|---|---|
| Grid | 48 × 48 units |
| Paths | `M12 8 V40 M12 8 L31 16 L12 24 M12 24 L29 30.5` and `M12 40 L29 33.5` |
| Stroke | 5.5 units, round caps, round joins |
| Node | circle, centre (35, 32), radius 5.5 |
| Tight bounds | x 9.25 → 40.5, y 5.25 → 42.75 (31.25 × 37.5) |
| App-icon tile | 48 × 48, corner radius 11 (22.9 %) |

The geometry is defined once in [`design-system/scripts/build-brand-assets.mjs`](../../design-system/scripts/build-brand-assets.mjs)
(`SYMBOL`) and generated into every file. Never redraw it by hand.

### 2.2 The wordmark
Lowercase **braventa** in **Quicksand Bold (700)**, default spacing, converted to outlines (the SVGs need no
installed font). Quicksand's round terminals echo the symbol's round caps (D-017). In running text the name
is always written **Braventa** — capital B, never "BRAVENTA" in sentences, never "Braventa AI" (D-002).

### 2.3 Lockups

| Lockup | Use | Construction (cap height of wordmark = *x*) |
|---|---|---|
| **Horizontal** (primary) | App header, website nav, email header, documents | Symbol height 1.3*x*; gap 0.45*x*; wordmark baseline aligned so its ascender height is centred on the symbol |
| **Stacked** | Square-ish spaces: event badges, splash, social posts | Symbol height 2.2*x*, centred; gap 0.6*x*; wordmark below |
| **Symbol** | App icon, favicon, avatars, tight spaces, watermarks | Symbol alone, or on the Ink tile for icons |
| **Wordmark** | Rare: when the symbol is already present nearby | Wordmark alone |

### 2.4 Colour variants

| Variant | Glyph + wordmark | Node | Use on |
|---|---|---|---|
| Primary | Ink `#0B0C10` | Cobalt `#2340F5` | Paper, white, light photos |
| Reversed | Paper `#F4F4F1` | Volt `#D4F53C` | Ink, dark surfaces, dark photos |
| Mono black | Ink | Ink | One-colour print, fax-grade, embossing, partner co-branding |
| Mono white | White | White | One-colour on any dark or coloured background |
| App icon | Paper on an Ink tile | Volt | App icon, favicon, social avatar |

Volt is never used for the node on light backgrounds — it disappears on Paper. The in-app `<Logo>` handles this
automatically through the `logo-node` token role.

### 2.5 Clear space and minimum size
- **Clear space:** keep a margin of **two node diameters** (= 0.75 × the wordmark's cap height in the
  horizontal lockup) on every side of any lockup. Nothing — text, edges, other logos — enters that zone.
- **Minimum size:** horizontal lockup 20 px tall on screen / 6 mm in print; symbol 16 px / 4 mm. Below 16 px
  use the app-icon tile (the favicon), never the bare symbol.

### 2.6 Incorrect use
Do not: recolour the glyph in Cobalt or Volt; put the Volt node on a light background; stretch, skew, rotate,
or outline the logo; add shadows, glows, gradients, or bevels; rebuild the wordmark in another font or in
uppercase; change the gap or relative size in a lockup; place the primary (dark) logo on a busy or dark photo;
crop or move the node; enclose the horizontal lockup in a shape; append "AI" or a tagline into the lockup;
use the symbol as a bullet or decorative pattern in running text.

---

## 3. Colour

### 3.1 Brand colours

| Name | HEX | Role | Rationale |
|---|---|---|---|
| **Ink** | `#0B0C10` | Primary dark: text on light, expressive dark canvases, the app icon tile. | A blue-black rather than pure black, so it sits with Cobalt and reads premium on screens (UC/TWG both avoid pure black). |
| **Paper** | `#F4F4F1` | Primary light canvas. | A touch warm so long sessions feel less clinical than pure white; white is reserved for surfaces (cards) on top of it. |
| **Cobalt** | `#2340F5` | **Action:** primary buttons, links, focus, selection, the logo node on light. | Saturated electric blue signals trust and precision (UC inspiration) while being distinct from the default "SaaS blue". 6.7:1 on white. |
| **Volt** | `#D4F53C` | **Signal:** "next" — logo node on dark, one highlight on dark heroes, social artwork. | Energy and momentum; maximally distinct from Cobalt; unusual in B2B so ownable. Fails contrast as text on light — never use it that way. |

### 3.2 Scales
Full scales (Ink 0–950, Cobalt 50–950, Volt 200–800, green, amber, red) are in `tokens.json` → `color.*` and
available as Tailwind utilities (e.g. `bg-cobalt-50`, `text-ink-500`). **Components should not use scale
colours directly** — use semantic roles (§3.3) so light/dark both work.

### 3.3 Semantic roles (light / dark)

| Role | Light | Dark | Use |
|---|---|---|---|
| `background` | Paper `#F4F4F1` | Ink 950 `#0B0C10` | Page canvas |
| `surface` | White `#FFFFFF` | Ink 900 `#13151A` | Cards, panels, inputs, header |
| `surface-muted` | Ink 100 `#EDEDE9` | Ink 850 `#1B1D23` | Wells, tags, hover rows |
| `foreground` | Ink 950 | `#F1F1EE` | Primary text |
| `muted` | Ink 500 `#61646E` | Ink 400 `#9A9DA6` | Secondary text, captions |
| `border` / `border-strong` | `#E2E2DD` / `#D9DAD6` | `#262830` / `#3A3D47` | Dividers, outlines / hover outlines |
| `accent` | Cobalt 600 `#2340F5` | Cobalt 400 `#6178FF` | Primary action fill, links |
| `accent-foreground` | White | Ink 950 | Text on accent. Dark mode uses dark text on a lighter Cobalt so both links and buttons pass AA. |
| `accent-soft` / `-foreground` | Cobalt 50 / 700 | Cobalt 950 / 300 | Selected rows, info callouts, highlight tags |
| `signal` / `-foreground` | Volt / Ink | Volt / Ink | Brand highlight fill with ink text |
| `focus` | Cobalt 500 | Cobalt 400 | Focus ring |
| `logo-node` | Cobalt | Volt | Logo node only |
| `success` (+`-soft`) | `#067647` / `#ECFDF3` | `#47CD89` / `#0E2F21` | Approved, completed, connected |
| `warning` (+`-soft`) | `#B54708` / `#FFFAEB` | `#FDB022` / `#3A2A05` | Needs approval, attention, nearing a limit |
| `danger` (+`-soft`) | `#B42318` / `#FEF3F2` | `#F97066` / `#3B1513` | Failed, rejected, destructive actions |
| `info` (+`-soft`) | Cobalt 700 / 50 | Cobalt 300 / 950 | Running, informational notices |

**Contrast is enforced:** `npm run tokens` fails if any text/background role pair drops below WCAG AA (4.5:1;
3:1 for the focus ring). Current lowest pair: dark `accent` on `surface`, 4.90:1.

### 3.4 Proportion
Roughly **70 % neutrals (Paper/White or Ink), 20 % text, ≤ 8 % Cobalt, ≤ 2 % Volt.** On marketing pages, dark
Ink sections may alternate with Paper sections (the UC rhythm); in the app, Paper/White dominates in light mode.

### 3.5 Theme behaviour
The app follows the operating system (`prefers-color-scheme`) and supports a forced mode via
`<html data-theme="light|dark">` (tokens already emit it; no toggle UI yet). The marketing site may open with an
Ink hero regardless of OS theme.

---

## 4. Typography

Founder decision **D-015**: **Quicksand** for headings and the logo; **Comfortaa** for all other text. Both are
SIL Open Font License, variable (300–700), loaded through `next/font/google` (self-hosted at build time, no
runtime request to Google, no licence cost).

| Role | Face | Weight | Case | Token / class |
|---|---|---|---|---|
| Wordmark | Quicksand | 700 | lowercase | outlined SVG |
| Marketing display | Quicksand | 700 | Sentence case; short uppercase section heads allowed | `.display`, `text-display` |
| App headings (h1–h4) | Quicksand | 600–700 | Sentence case | automatic on `h1`–`h4`; `.heading` |
| Body, UI, buttons, forms | Comfortaa | 400 body / 600 UI | Sentence case | `font-sans` (default) |
| Eyebrows and chips | Comfortaa | 600 | UPPERCASE, +0.08em tracking | `.eyebrow`, `.chip` |
| Code, IDs | system monospace | 400 | — | `font-mono` |

### 4.1 Type scale
Matches Tailwind's default scale so classes and tokens agree: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60 px,
plus marketing `display` = `clamp(44px, 7vw, 80px)`, line-height 0.95.

| Use | Size |
|---|---|
| App page title (h1) | 24 px (`text-2xl`) |
| App section title (h2) | 18 px (`text-lg`) |
| Card title (h3) | 16 px, weight 600 |
| Body (app) | 14 px (`text-sm`) |
| Long-form reading (docs, drafts, emails) | 16 px, line-height 1.6 |
| Caption / meta | 12 px (`text-xs`), `muted` |
| Marketing H1 | `display` |
| Marketing H2 | 36–48 px |

### 4.2 Guardrails for Comfortaa
Comfortaa is wide with a small x-height and very round forms — charming, but slower to read than a neutral UI
face. To keep the product usable (see Q-012):
- Never set body copy below **14 px**; long passages at **16 px** with line-height ≥ 1.6.
- Use weight **600** for labels, buttons, and table headers; 400 for paragraphs. Avoid 300.
- Use `tabular-nums` for scores, dates, and numbers in tables.
- Keep line length ≤ 70 characters (`max-w-prose`).
- Do not use Comfortaa in all caps for anything longer than four words.

---

## 5. Layout, grid, and spacing

- **Spacing:** 4 px base (Tailwind scale). Common rhythm: 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.
- **Content widths:** narrow 576 px (auth, onboarding, forms) · app 1024 px (`max-w-5xl`) · marketing 1280 px.
- **Gutters:** 16 px minimum on mobile; 24–32 px on desktop.
- **Grid:** app uses simple 1 → 2 → 3 column CSS grids (`sm:` / `md:`); marketing uses a 12-column grid with
  generous whitespace and alternating Ink/Paper bands.
- **Header:** 56 px, `surface` background with a bottom border; logo left, account actions right.
- **Density:** cards pad 20 px (`p-5`); list gaps 12 px; section gaps 32 px.

## 6. Responsive rules
Mobile first. Breakpoints are Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). No horizontal page
scroll at 320 px; wide tables scroll inside their card (`overflow-x-auto`). Touch targets ≥ 44 × 44 px on mobile
(WCAG 2.5.8 minimum is 24 px; we aim higher). Primary actions go full-width on narrow screens.

## 7. Corners, borders, elevation

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 4 px | Chips |
| `rounded-md` | 8 px | Buttons, inputs |
| `rounded-lg` | 12 px | Cards, panels |
| `rounded-xl` | 16 px | Dialogs, marketing panels |
| `rounded-pill` | 9999 px | Marketing CTAs, status pills |

Borders are 1 px `border`; hover uses `border-strong` or `accent`. Shadows (`shadow-sm/md/lg`) are only for
menus, popovers, toasts, and dialogs.

## 8. Iconography
Outline icons, **1.5–2 px stroke, round caps and joins** (to match the symbol and the rounded type), 24 px grid,
used at 16 / 20 / 24 px. Recommended set: [Lucide](https://lucide.dev) (ISC licence) — not yet installed; add
it when the first icon is needed rather than drawing one-offs. Icons inherit `currentColor`; status icons take
the status colour. Never use an icon as the only label for an unfamiliar action.

## 9. Illustration and photography
- **Illustration:** the **graph motif** — nodes joined by thin lines on a faint dot grid, one Volt node marking
  the next action (see the social banners). Use it for heroes, empty states, and section dividers. Keep it
  abstract and sparse; no characters, no robots.
- **Product imagery:** real product screenshots in a neutral frame, cropped to the part that matters, never
  fake dashboards.
- **Photography (optional, marketing):** real service businesses at work — trades, crews, owners on site —
  natural light, unposed, slightly desaturated so Cobalt/Volt UI elements carry the colour. No stock
  "people pointing at laptops".

## 10. Data visualisation
- Default series colour **Cobalt**; categorical order: Cobalt `#2340F5`, Teal `#0E9384`, Orange `#E0702B`,
  Violet `#7A5AF8`, Rose `#D9456B`, Slate `#61646E` (`color.chart.1–6`). Use at most four in one chart.
- Status data uses the semantic colours (success/warning/danger), never the categorical palette.
- Scores 0–100 map to: ≥ 70 `success`, 45–69 `warning`, < 45 `danger` (implemented in `scoreTone()`), always
  paired with the number — colour is never the only signal.
- Label data directly where possible; thin gridlines in `border`; no 3-D, no gradients, no dual axes.
- Show the source of a number (e.g. "Google" next to PageSpeed scores) — provenance is a product principle.
- Volt is not a data colour.

## 11. Motion
Purposeful and quick. Durations `fast` 120 ms (hover, press), `base` 200 ms (menus, popovers), `slow` 320 ms
(panels). Easing `standard` for most, `enter` / `exit` for appear/disappear. Animate opacity and transform, not
layout. Progress indicators show real steps (the analysis pipeline lists its steps). `prefers-reduced-motion`
disables non-essential motion globally (implemented in `globals.css`).

## 12. Accessibility requirements
WCAG 2.2 AA is the floor:
- Text contrast ≥ 4.5:1 (enforced by the token build), large text and UI components ≥ 3:1.
- Visible focus on every interactive element (global `:focus-visible` ring in `focus` colour).
- Never colour alone: statuses pair colour with a word (chip label) and, where useful, an icon.
- All interactive elements reachable and operable by keyboard; logical heading order (one `h1` per page).
- Live regions for asynchronous progress (`aria-live="polite"` on the analysis progress card).
- Images and the logo carry accessible names (`aria-label="Braventa"`).
- Respect reduced motion; support 200 % zoom without loss of content.

## 13. App vs marketing
| | App (`app.braventa.io`) | Marketing (`braventa.io`) |
|---|---|---|
| Mood | Calm, dense enough to work in, Paper/White first | Expressive, Ink heroes, alternating bands |
| Type | Quicksand 24 px titles, Comfortaa 14 px body | Quicksand `display`, uppercase section heads allowed |
| Volt | Logo node only (dark mode) | One highlight per view, graph motif |
| Motion | Minimal | Section reveals allowed (respect reduced motion) |

Both share the same tokens, logo, and voice — they must clearly be one brand.

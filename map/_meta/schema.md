# Schema — the rules of this map

The closed set of card types, the labels they carry and the naming they follow. When a card and this file disagree,
reconcile the same day. The subject tree (`web/`, `site/`, `supabase/`, `design-system/`, `docs/`) stays authoritative:
a card points at the owning file and never restates its behaviour.

## Card types

| `type:` | Lives at | Carries |
|---|---|---|
| object | `map/objects/<cluster>/<slug>.md` | a noun: table, enum, TS type, module, route group, config surface |
| process | `map/processes/<slug>.md` | a verb: a movement that actually runs, step by step, with citations |
| effect | `map/effects/CONTEXT.md` (one file, no cards) | "if you change X, open these cards" plus inbound consumers |

## Labels

| Label | Values | On |
|---|---|---|
| `type` | `object` · `process` | all cards |
| `cluster` | folder name under `map/objects/` | objects |
| `universe` | `live` (in force; implement and cite against it) · `leftover` (present, not the main path) · `ghost` (named or documented, not wired) | all cards |
| `status` | `stub` (title only) · `stale` (written, citations not re-checked) · `verified` (citations re-checked on `verified` date at `commit`) | all cards |
| `verified` | `YYYY-MM-DD` | cards with `status: verified` |
| `commit` | short SHA the citations were checked against | cards with `status: verified` |
| `entity` | repo path of the owning file (migration, module, route) | objects |
| `consumes` / `produces` | wikilinks to object cards | processes |

`status: verified` needs all three: a date, a commit and `path:line` citations in the body. Everything else is `stale`
or `stub`. A card is never `verified` by assertion.

## Naming

- Slugs and folders: kebab-case, the code name where one exists (`growth-plan-item`, not "plan item").
- The title line gives the product word and the code name when they differ ("Growth plan item (`growth_plan_items`)").
- Clusters group nouns by how an editor asks about them, not by layer. Current clusters are listed in
  `map/objects/_index.md`.
- Line citations are `path:line` against the `commit` in the card's frontmatter. Re-check them when the file moves.
- `map/CLAUDE.md` is the hand-edited entry file. `map/AGENTS.md` and `map/routing.md` are generated copies
  (`npm run map:sync` in `web/`); never edit the copies.
- Generated indexes (`map/objects/_index.md`, `graphify-out/GRAPH_REPORT.md`) are rebuilt, not hand-edited.
- Links: relative markdown links in card bodies (target like `../report/growth-plan-item.md`), wikilinks only in
  `consumes:`/`produces:` frontmatter. `node map/_meta/check-links.mjs` fails on a link that resolves to nothing; both
  scripts run as `npm run map:check` in `web/`.

## What a card may not do

- Copy behaviour out of the code. Cite the line instead.
- Map a roadmap item, a "Coming soon" tool or a planned route as `live`. Mark it `ghost` and cite the doc that plans it.
- Hold the same fact as another card. One home, one link.

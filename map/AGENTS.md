<!-- Generated copy of map/CLAUDE.md by map/_meta/build-index.mjs. Edit CLAUDE.md, then run the script. -->
# Braventa system map

A navigable map of the Braventa repo for agents that must change it: what each noun is, which movements
actually run, and what else moves when one of them changes. The subject tree (`web/`, `site/`, `supabase/`,
`design-system/`, `docs/`) stays authoritative; every card cites `path:line` and never restates behaviour.

Built on ICM (Interpretable Context Methodology): folders carry sequencing, hierarchy carries context, files
carry state. If something needs explaining, it goes in a card, not in your head.

## Where things live

| Folder | What it holds |
|---|---|
| `CONTEXT.md` | how to walk the map: the three universes (live, leftover, ghost) and the name collisions |
| `objects/` | one card per noun, clustered by how an editor asks: `tenancy/`, `onboarding/`, `pipeline/`, `report/`, `modules/`, `integrations/`, `access/`, `config/`; `objects/_index.md` is generated |
| `processes/` | one card per movement that really runs (start-analysis … build-help-doc), each with a human gate |
| `effects/CONTEXT.md` | the change-impact index: "if you change X, open these cards", plus inbound consumers |
| `_meta/schema.md` | card types, labels, naming, what a card may not do; `_meta/build-index.mjs` regenerates the generated files |
| `_templates/` | blank object and process cards; a new card is a copy, not a blank page |

## Route by task

| If you are | Go to | Then |
|---|---|---|
| about to change a table, enum, module or route | `effects/CONTEXT.md` | open every card it lists before editing |
| asking "what is X" | `objects/_index.md` → the card | follow its `See` link to source, not to another essay |
| asking "what runs when the owner does Y" | `processes/<verb>.md` | the Steps section cites the line for each movement |
| unsure whether a name is the product word or the code name | `CONTEXT.md` § Name collisions | cite the code name in code, the product word in copy |
| told something is live that a card marks `ghost` | the card's citation | the repo wins; update the doc or the card, never the claim |
| adding or renaming a card | `_templates/`, then `node map/_meta/build-index.mjs` | commit the regenerated `_index.md`, `AGENTS.md`, `routing.md` |

## The rules

- A card is `verified` only with a date, a commit and `path:line` citations. Otherwise it is `stale`.
- Planned features, roadmap items and "Coming soon" tools are `ghost`. Never implement against a ghost.
- `map/CLAUDE.md` is hand-edited; `AGENTS.md` and `routing.md` are generated copies of it.
- Load the entry file, one card and its cited lines (about 2k–8k tokens). Never load the whole map.
- The knowledge graph in `graphify-out/GRAPH_REPORT.md` is a second view of the same tree; cards win when they disagree.

---
type: object
cluster: config
universe: live
status: verified
verified: 2026-10-23
commit: 62d0c69
entity: web/package.json
---

# Generators and scripts (`web/package.json` scripts)

The repo's scripts: what each reads, what it writes, and which committed files are generated output that must never
be edited by hand.

## Why this shape

Several committed files are derived from one source (tokens, the help guide, brand geometry). Each generator writes a
header saying so, and a `--check` mode or a unit test fails when the output lags the source, so the derived copy can
be committed and diffed without becoming a second source of truth.

## Shape

| Script | Reads | Writes | Citation |
|---|---|---|---|
| `tokens` | `design-system/tokens.json` | `web/src/styles/tokens.css`, `site/src/styles/tokens.css`; exits 1 when a role pair fails WCAG AA | `web/package.json:10`; `web/scripts/build-tokens.mjs:1-5,12-13,41-75,145` |
| `tokens:check` | same | nothing; exits 1 when either CSS is stale | `web/package.json:11`; `web/scripts/build-tokens.mjs:132-143` |
| `help:doc` | `renderGuide()` from `web/src/lib/assistant/knowledge.ts` | `docs/help/APP_GUIDE.md` | `web/package.json:15`; `web/scripts/build-help-doc.mts:1-9,24-25` |
| `help:doc:check` | same | nothing; exits 1 when stale | `web/package.json:16`; `web/scripts/build-help-doc.mts:11-21` |
| `eval:models` | `.env.local`, OpenRouter directly (not `runWorker`), `EVAL_MODELS`, `EVAL_OWNER` | `web/.eval/<timestamp>/*.json`, `SUMMARY.txt`; spends credit, no DB writes | `web/package.json:12`; `web/scripts/compare-models.mts:1-9,31-35,41,131,147` |
| `audit:site` | crawler + PageSpeed (`GOOGLE_API_KEY`), `AUDIT_JSON` | stdout only; no AI, no DB | `web/package.json:13`; `web/scripts/audit-site.mts:1-6,66` |
| `pipeline:local` | service client, a dedicated test organization, a running dev server | `ai_jobs` rows in that organization; POSTs `/api/jobs/continue`; spends credit | `web/package.json:14`; `web/scripts/run-pipeline-local.mts:1-13` |
| `health` | `web/.env.local`, `HEALTH_APP_URL`, `HEALTH_SITE_URL`, `HEALTH_JSON` | stdout, exit code 1 on any FAIL | `web/package.json:19`; `web/scripts/health-check.mts:1-8,17-18,29-30,170-178` |
| `design-system/scripts/build-brand-assets.mjs` (no npm script; needs `BRAND_TOOLS_DIR`) | `design-system/tokens.json` colours + font outlines | `web/public/brand/**`; `{web,site}/src/app/{icon.svg,apple-icon.png,favicon.ico,opengraph-image.png}`; `{web,site}/src/components/brand/logo-geometry.ts` | `design-system/scripts/build-brand-assets.mjs:1-9,30-32` |
| `node map/_meta/build-index.mjs` (`--check`) | frontmatter of `map/objects/**/*.md`, `map/CLAUDE.md` | `map/objects/_index.md`, `map/AGENTS.md`, `map/routing.md` | `map/_meta/build-index.mjs:1-7` |

`site/package.json:6-11` has only `dev` (port 3001), `build`, `start`, `lint`: every generator runs from `web/`.
`map/_meta/schema.md:38-39` names `npm run map:sync`; at `62d0c69` `web/package.json:5-20` has no such script (it is
added, uncommitted, in the working tree).

Generated, never hand-edit (each says so in its first line): `web/src/styles/tokens.css:1-2`,
`site/src/styles/tokens.css:1-2`, `docs/help/APP_GUIDE.md:1`, `web/src/components/brand/logo-geometry.ts:1`,
`site/src/components/brand/logo-geometry.ts:1`, `web/public/brand/**` and the icon files (`CLAUDE.md:52`),
`map/objects/_index.md`, `map/AGENTS.md`, `map/routing.md` (`map/_meta/schema.md:38-40`).

Citations: `web/package.json:5-20`, `site/package.json:6-11`

## Connected to

- **owns:** the generated files listed above
- **owned-by:** —
- **joins:** [design-tokens](design-tokens.md) (source of `tokens`, brand assets), [assistant-knowledge](../access/assistant-knowledge.md) (source of `help:doc`), [ai-worker](../pipeline/ai-worker.md) (`eval:models` bypasses the router on purpose), [job-step-machine](../../processes/job-step-machine.md) (`pipeline:local`), [deploy-targets](deploy-targets.md) (`health` defaults to the production URLs), [env-config](env-config.md)
- **looks-like-but-is-not:** `npm run build` / `lint` / `test` (Next, ESLint, vitest; not generators); `.claude/agents/braventa-health-check.md` (an agent that runs `health`, not a script)

## If you change this

- **Hits:** `tokens.json` → run `tokens` and commit both CSS files; brand colours or the mark → rerun `build-brand-assets.mjs` and commit its outputs; `knowledge.ts` or any `page.tsx` → run `help:doc` (the test at `web/src/lib/assistant/assistant.test.ts:316-318` fails otherwise); a new card or `map/CLAUDE.md` edit → `build-index.mjs`; `tokens:check` is part of verify (`CLAUDE.md:59`).
- **Does not hit:** the database (only `pipeline:local` writes, into its test organization).

## Surfaces

| Surface | Role |
|---|---|
| Developer, `web/` | runs scripts |
| [build-tokens-and-brand-assets](../../processes/build-tokens-and-brand-assets.md), [build-help-doc](../../processes/build-help-doc.md) | the two generator processes |
| `.claude/agents/braventa-health-check.md:11-12` | runs `npm run health` |
| vitest | enforces `help:doc` currency |

## See

- Source: `web/package.json`, `web/scripts/`, `design-system/scripts/`, `map/_meta/`
- As built: `design-system/DESIGN_TOKENS.md`

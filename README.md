# Braventa

**Run your growth as one system.** Braventa connects your website, marketing, CRM, and content into one growth
system that shows you what to do next — and helps you get it done. Built for small and mid-sized service
businesses. (Internal codename: GrowthOS.)

> **Status:** MVP proof of concept. Not yet charging customers. Domains: `braventa.io` (marketing, not built) ·
> `app.braventa.io` (app, Vercel).

## What works today
Sign up → enter a website → Braventa reads the site and Google PageSpeed → business profile → growth score with
sub-scores → top five opportunities, each with a first step → 30-day content plan → five drafted posts that you
approve or reject. Nothing is published automatically.

Not built yet: CRM (HubSpot) connection, publishing, email sending, automation, analytics, billing. See
[`docs/product/MVP_SCOPE.md`](docs/product/MVP_SCOPE.md) and [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md).

## Repository

| Path | What |
|---|---|
| `web/` | Next.js 16 app (App Router, Tailwind 4, Supabase auth) |
| `supabase/migrations/` | Database schema with row-level security |
| `n8n/` | Exported workflow JSON (none yet) |
| `design-system/` | `tokens.json` (single source for colour/type/spacing), component guidelines, brand asset generator |
| `docs/brand/` | Brand Bible, positioning, visual identity, voice, asset inventory |
| `docs/product/` | Overview, Growth Loop methodology, requirements, MVP scope, journeys, roadmap |
| `docs/architecture/` | System, data model, AI routing and costs, integrations, security |
| `docs/marketing/` | Website messaging, email templates, campaigns, community |
| `docs/decisions/` | Founder brief, decision log, open questions, handover reports |
| `map/` | ICM system map: object and process cards with `path:line` citations, change-impact index, universes (D-055) |
| `graphify-out/` | graphify knowledge graph of the tree (`GRAPH_REPORT.md` committed; `graph.html`, `graph.json` rebuilt locally) |
| `.obsidian/` | Obsidian vault settings for browsing `map/` and `docs/` as a graph (workspace files stay local) |
| `CLAUDE.md` | Rules for Claude Code sessions working in this repo |

Start with [`docs/brand/BRAND_BIBLE.md`](docs/brand/BRAND_BIBLE.md) for the brand and
[`docs/architecture/SYSTEM_ARCHITECTURE.md`](docs/architecture/SYSTEM_ARCHITECTURE.md) for the system.

## Development
```bash
cd web
```
```bash
npm install
```
Copy `web/.env.example` to `web/.env.local` and fill in values (never commit secrets), then:
```bash
npm run dev
```
Other commands (in `web/`): `npm run build`, `npm run lint`, `npm run tokens` (compile design tokens, checks
WCAG contrast), `npm run tokens:check`. `GET /api/health/integrations` checks every external service.

## Brand
Braventa's logo, colours, and type are defined in [`docs/brand/VISUAL_IDENTITY.md`](docs/brand/VISUAL_IDENTITY.md);
asset files are in `web/public/brand/`. The name and marks have not been trademark-cleared.

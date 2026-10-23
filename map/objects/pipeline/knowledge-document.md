---
type: object
cluster: pipeline
universe: live
status: verified
verified: 2026-10-24
commit: 7a91d84
entity: supabase/migrations/20261010061028_foundation.sql
---

# Knowledge document (`knowledge_documents`)

The text of each crawled page, kept per organization as source material. Written by the crawling step; read by nothing yet.

## Why this shape

The foundation schema planned a knowledge base for an assistant (`source_type` lists uploads, notes and CRM), and the crawl already has the page text, so it is stored now and de-duplicated by content hash: `supabase/migrations/20261010061028_foundation.sql:110-121`, `:136`.

## Shape

- Table `supabase/migrations/20261010061028_foundation.sql:110-121`: `source_type` comment `:113`; `source_url`, `title`, `content`, `content_hash`; `unique (organization_id, content_hash)` `:119`.
- RLS "members all" `:300-309`.
- Writer: upsert in `crawlStep` `web/src/lib/pipeline/website-intel.ts:260-273` (`source_type` `website_page` `:265`, SHA-256 of the text `:269`, duplicates ignored `:271`).
- Readers: none in `web/src` (the profile prompt reads the in-memory digest, `:288-289`, `:304`).
- Crawled text is untrusted input to models (project rule; `supabase/migrations/20261011160802_website_audit.sql:19`).

Citations: `supabase/migrations/20261010061028_foundation.sql:110-121`, `:300-309`, `web/src/lib/pipeline/website-intel.ts:260-273`.

## Connected to

- **owns:** [knowledge-chunk](knowledge-chunk.md) (cascade `:126`; ghost, never written).
- **owned-by:** [organization](../tenancy/organization.md).
- **joins:** [audit-run](audit-run.md) (the same crawl, stored as measurements rather than text).
- **looks-like-but-is-not:** `audit_runs.coverage` (per-page measurements, `website_audit.sql:18-20`); `business_profiles.intelligence` (the profile the model derived, `foundation.sql:89`).

## If you change this

- **Hits:** the upsert `website-intel.ts:262-272` (its `onConflict` names the unique constraint `:271`); the `knowledge_chunks` foreign key `foundation.sql:126`.
- **Does not hit:** the business profile step, which never reads this table (`website-intel.ts:293-307`); the diagnosis.

## Surfaces

| Surface | Role |
|---|---|
| Crawling step → [crawl-and-profile](../../processes/crawl-and-profile.md) | writes |
| App pages, assistant, MCP | none |
| Supabase dashboard (human) | reads |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/architecture/DATA_MODEL.md` (row at `:80`); planned use `docs/product/ROADMAP.md:73-74`, `:100`

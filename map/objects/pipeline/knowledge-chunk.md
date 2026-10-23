---
type: object
cluster: pipeline
universe: ghost
status: verified
verified: 2026-10-24
commit: 2214b05
entity: supabase/migrations/20261010061028_foundation.sql
---

# Knowledge chunk (`knowledge_chunks` + `match_knowledge`)

An embedded slice of a knowledge document and the similarity search over it. The table, index and function exist; nothing writes or reads them.

## Why this shape

The foundation schema laid out retrieval for an AI marketing assistant before any feature used it: `supabase/migrations/20261010061028_foundation.sql:4`, `:136`. The MVP scope lists it as "not a feature": `docs/product/MVP_SCOPE.md:81-82`.

## Shape

- Table `supabase/migrations/20261010061028_foundation.sql:123-131`: `document_id` cascade `:126`, `chunk_index`, `content`, `embedding vector(1536)` `:129`; HNSW cosine index `:133-134`; document index `supabase/migrations/20261010061126_advisor_fixes.sql:20`.
- `match_knowledge(org, query_embedding, match_count)` `foundation.sql:137-148`, invoker rights (RLS applies). No revoke or grant follows it, unlike `create_organization` `:71-72` (`docs/architecture/DATA_MODEL.md:138`).
- RLS "members all" `foundation.sql:300-309`.
- No reference to `knowledge_chunks` or `match_knowledge` anywhere in `web/src` or `web/scripts`.
- Planned use: knowledge-base retrieval for the assistant (BI-8, BI-11) `docs/product/ROADMAP.md:73-74`.

Citations: `supabase/migrations/20261010061028_foundation.sql:123-148`, `docs/product/MVP_SCOPE.md:81-82`, `docs/product/ROADMAP.md:73-74`.

## Connected to

- **owns:** nothing.
- **owned-by:** [knowledge-document](knowledge-document.md) (`:126`); [organization](../tenancy/organization.md).
- **joins:** nothing live.
- **looks-like-but-is-not:** [knowledge-document](knowledge-document.md), which is written; Ask Braventa's context, which is a summary built from tables (`web/src/app/api/assistant/route.ts:95`), not a vector search.

## If you change this

- **Hits:** `match_knowledge` `:137-148` and the HNSW index `:133-134`.
- **Does not hit:** anything in `web/src`; the live assistant ([ask-braventa](../../processes/ask-braventa.md)).

## Surfaces

| Surface | Role |
|---|---|
| none | none |

## See

- Source: `supabase/migrations/20261010061028_foundation.sql`
- As built: `docs/product/MVP_SCOPE.md` (`:81-82`)

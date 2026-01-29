## Objective
Restore RAG answers for basic questions by ensuring retrieval falls back when pgvector has no hits and by populating `embedding_vector` everywhere content is indexed.

## Root Cause (Code References)
- Pgvector-only filter returns 0 rows when `embedding_vector` is NULL (lib/advisor/retrieval.ts:82–88, 98–111).
- Fallback is only on error, not on empty result sets (lib/advisor/retrieval.ts:49–67).
- Indexing scripts store only `embeddingData` and omit `embeddingVector` (scripts/index-embeddings.ts:76–86, 147–156, 252–262).

## Changes
1. Result-aware fallback in retrieval
- In `searchSimilar`, after pgvector query, if `results.length === 0`, run `searchWithInMemory(...)` using legacy `embedding_data`.
- Location: lib/advisor/retrieval.ts:49–67 and 97–121.

2. Populate `embedding_vector` in indexing script
- On insert/update, set both `embeddingVector: embVector` and `embeddingData: JSON.stringify(embVector)`.
- Locations:
  - Controls insert/update (scripts/index-embeddings.ts:61–73, 76–86)
  - Policy templates insert/update (scripts/index-embeddings.ts:134–146, 147–156)
  - Catalog insert/update (scripts/index-embeddings.ts:238–251, 252–262)

3. Backfill existing rows
- Run idempotent SQL to fill vectors where missing:
  - `UPDATE embeddings SET embedding_vector = embedding_data::vector WHERE embedding_vector IS NULL AND embedding_data IS NOT NULL;`
- Reference: migrations/001_add_pgvector.sql:18–31 (pattern already present).

## Verification
- Reindex content for a sample client via advisor router (server/routers/advisor.ts:163–248) and confirm non-empty retrievals.
- Run `scripts/test-ai-features.ts` and assert results > 0 for simple queries.
- Test `askQuestion` with client and general prompts; ensure context sections populate and no “no data” message unless truly empty.

## Acceptance Criteria
- `searchSimilar` returns >0 results for seeded controls/catalog/templates queries without errors.
- `askQuestion` includes at least one context section for seeded data.
- Database shows `COUNT(embedding_vector) = COUNT(*)` after backfill on seeded rows.

Approve to proceed with code updates and verification.
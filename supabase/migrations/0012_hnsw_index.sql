-- 0012_hnsw_index.sql
-- Replace IVFFlat with HNSW for better recall on small tables.
-- IVFFlat with lists=100 misses results when table has fewer rows than lists.
-- HNSW has consistent recall regardless of table size.

DROP INDEX IF EXISTS idx_chunks_embedding;

CREATE INDEX idx_chunks_embedding ON chunks
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

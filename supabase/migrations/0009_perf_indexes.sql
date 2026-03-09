-- 0009: Performance indexes
-- Compound index on chunks for ordered retrieval (covers studio getAllChunks + chat queries)
CREATE INDEX IF NOT EXISTS idx_chunks_notebook_user_chunk
  ON chunks (notebook_id, user_id, chunk_index);

-- Index on companies.notebook_id for shared page lookups
CREATE INDEX IF NOT EXISTS idx_companies_notebook_id
  ON companies (notebook_id);

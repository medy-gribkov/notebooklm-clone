-- 0003_indexes.sql
-- Performance indexes: vector search, foreign keys, composite queries

-- Vector similarity search (IVFFlat for approximate nearest neighbor)
CREATE INDEX idx_chunks_embedding ON chunks
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- Foreign key indexes (user_id lookups)
CREATE INDEX idx_notebooks_user_id ON notebooks (user_id);
CREATE INDEX idx_chunks_user_id ON chunks (user_id);
CREATE INDEX idx_messages_user_id ON messages (user_id);
CREATE INDEX idx_notebook_files_user_id ON notebook_files (user_id);
CREATE INDEX idx_notes_user_id ON notes (user_id);
CREATE INDEX idx_studio_generations_user_id ON studio_generations (user_id);
CREATE INDEX idx_notebook_members_user ON notebook_members (user_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_chunks_notebook_user ON chunks (notebook_id, user_id);
CREATE INDEX idx_messages_notebook_user ON messages (notebook_id, user_id);
CREATE INDEX idx_messages_notebook_created ON messages (notebook_id, created_at);
CREATE INDEX idx_notebook_files_notebook_user ON notebook_files (notebook_id, user_id);
CREATE INDEX idx_notes_notebook ON notes (notebook_id);
CREATE INDEX idx_notes_notebook_user ON notes (notebook_id, user_id);
CREATE INDEX idx_studio_generations_notebook ON studio_generations (notebook_id, action);
CREATE INDEX idx_notebook_members_notebook ON notebook_members (notebook_id);

-- Shared links: fast token lookup for active links
CREATE INDEX idx_shared_links_token ON shared_links (token) WHERE is_active = true;
CREATE INDEX idx_shared_links_notebook ON shared_links (notebook_id);

-- JSONB metadata queries
CREATE INDEX idx_chunks_metadata_gin ON chunks USING GIN (metadata);

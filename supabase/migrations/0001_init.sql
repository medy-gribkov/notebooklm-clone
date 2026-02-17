-- 0001_init.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE notebooks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title      TEXT NOT NULL,
  file_url   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'processing', -- 'processing' | 'ready' | 'error'
  page_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id  UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content      TEXT NOT NULL,
  embedding    vector(768),
  chunk_index  INTEGER NOT NULL,
  metadata     JSONB DEFAULT '{}'
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  sources     JSONB,   -- [{chunkId, content, similarity}] for assistant messages
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON chunks (notebook_id);
CREATE INDEX ON messages (notebook_id, created_at);

-- RLS
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notebooks" ON notebooks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_chunks"    ON chunks    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_messages"  ON messages  FOR ALL USING (auth.uid() = user_id);

-- Isolated vector search (notebook_id + user_id, never sees other users' data)
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding   vector(768),
  match_notebook_id UUID,
  match_user_id     UUID,
  match_count       INTEGER DEFAULT 5
) RETURNS TABLE (id UUID, content TEXT, similarity FLOAT) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.content, 1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  WHERE c.notebook_id = match_notebook_id AND c.user_id = match_user_id
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

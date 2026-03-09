-- 0002_functions.sql
-- RPC functions: vector search, share token validation

-- Vector similarity search (user's own chunks)
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding extensions.vector(768),
  match_notebook_id uuid,
  match_user_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (id uuid, content text, similarity float, metadata jsonb)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT chunks.id, chunks.content,
    1 - (chunks.embedding <=> query_embedding) AS similarity,
    chunks.metadata
  FROM chunks
  WHERE chunks.notebook_id = match_notebook_id
    AND chunks.user_id = match_user_id
    AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Validate a share token (called via service client for public access)
CREATE OR REPLACE FUNCTION validate_share_token(share_token text)
RETURNS TABLE (notebook_id uuid, owner_id uuid, permissions text, is_valid boolean)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    sl.notebook_id,
    sl.user_id AS owner_id,
    sl.permissions,
    (sl.is_active AND (sl.expires_at IS NULL OR sl.expires_at > NOW())) AS is_valid
  FROM shared_links sl
  WHERE sl.token = share_token
  LIMIT 1;
$$;

-- Member-aware vector search (allows notebook members to query chunks)
CREATE OR REPLACE FUNCTION match_chunks_shared(
  query_embedding extensions.vector(768),
  match_notebook_id uuid,
  requesting_user_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (id uuid, content text, similarity float, metadata jsonb)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT
    c.id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    c.metadata
  FROM chunks c
  WHERE c.notebook_id = match_notebook_id
    AND (
      c.user_id = requesting_user_id
      OR EXISTS (
        SELECT 1 FROM notebook_members nm
        WHERE nm.notebook_id = match_notebook_id
        AND nm.user_id = requesting_user_id
      )
    )
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

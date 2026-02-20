-- 0010_move_vector_extension.sql
-- Move the vector extension from public to a dedicated extensions schema
-- Clears the Supabase linter "extension_in_public" warning

-- =============================================================================
-- 1. Create extensions schema and move vector there
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION vector SET SCHEMA extensions;

-- Grant usage so all roles can reference the vector type and operators
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- =============================================================================
-- 2. Recreate match_chunks with updated search_path
-- =============================================================================
-- The vector type now lives in extensions schema, so search_path must include it.

DROP FUNCTION IF EXISTS match_chunks(extensions.vector, uuid, uuid, int, float);

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

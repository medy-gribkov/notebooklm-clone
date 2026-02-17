-- Add match_threshold param to match_chunks RPC so low-similarity results are filtered out.
-- Drop and recreate the function with the new parameter (default 0.5).

DROP FUNCTION IF EXISTS match_chunks(vector, uuid, uuid, int);

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(768),
  match_notebook_id uuid,
  match_user_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chunks.id,
    chunks.content,
    1 - (chunks.embedding <=> query_embedding) AS similarity
  FROM chunks
  WHERE
    chunks.notebook_id = match_notebook_id
    AND chunks.user_id = match_user_id
    AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

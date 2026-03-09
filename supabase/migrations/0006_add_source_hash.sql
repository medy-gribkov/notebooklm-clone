-- Add source_hash column to studio_generations to track content state
ALTER TABLE studio_generations ADD COLUMN IF NOT EXISTS source_hash TEXT;

-- Create an index for faster lookups (notebook_id, action, source_hash)
CREATE INDEX IF NOT EXISTS idx_studio_generations_lookup ON studio_generations(notebook_id, action, source_hash);

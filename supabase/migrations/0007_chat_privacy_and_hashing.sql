-- Migration 0007: Chat Privacy and Hashing Anchor

-- 1. Add is_public to messages to separate private notebook chat from global shared chat
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 2. Add source_hash to notebooks and studio_generations to provide a single source of truth for caching
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS source_hash TEXT;
ALTER TABLE studio_generations ADD COLUMN IF NOT EXISTS source_hash TEXT;

-- 3. Create index for faster cache lookups
CREATE INDEX IF NOT EXISTS idx_studio_generations_source_hash ON studio_generations(source_hash);

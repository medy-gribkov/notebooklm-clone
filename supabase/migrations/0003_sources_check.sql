-- Ensure the sources column in messages only stores JSON arrays (or NULL).
ALTER TABLE messages
  ADD CONSTRAINT messages_sources_is_array
  CHECK (sources IS NULL OR jsonb_typeof(sources) = 'array');

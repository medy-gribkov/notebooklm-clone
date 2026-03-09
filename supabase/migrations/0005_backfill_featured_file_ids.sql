-- Backfill file_id on orphaned featured chunks so they can be properly
-- managed (deleted/replaced) when users upload new files to cloned notebooks.
UPDATE chunks c
SET metadata = jsonb_set(
  c.metadata,
  '{file_id}',
  to_jsonb(nf.id::text)
)
FROM notebook_files nf
WHERE c.notebook_id = nf.notebook_id
  AND c.metadata->>'file_id' IS NULL
  AND nf.storage_path LIKE 'featured/%';

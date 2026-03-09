-- 0004_optimization.sql
-- Status indexes for dashboard filtering + starter_prompts column

-- Status indexes (not covered by 0003)
CREATE INDEX IF NOT EXISTS idx_notebooks_status ON notebooks (status);
CREATE INDEX IF NOT EXISTS idx_notebook_files_status ON notebook_files (status);

-- AI-generated contextual starter prompts per notebook
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS starter_prompts jsonb DEFAULT NULL;

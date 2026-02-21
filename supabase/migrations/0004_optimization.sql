-- supabase/migrations/0004_optimization.sql

-- Add indexes for common filter queries to improve query performance on the dashboard

-- Index notebooks by status for faster filtering
CREATE INDEX IF NOT EXISTS idx_notebooks_status ON public.notebooks (status);

-- Index notebook_files by status for faster joins and file queries
CREATE INDEX IF NOT EXISTS idx_notebook_files_status ON public.notebook_files (status);

-- Note: user_id indexes are typically handled automatically by Supabase RLS, 
-- but adding an explicit index on notebooks(user_id) can help with dashboard speed
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON public.notebooks (user_id);

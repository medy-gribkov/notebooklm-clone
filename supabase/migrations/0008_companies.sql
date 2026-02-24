-- Migration 0008: Companies table for job-hunting company notebooks

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  category TEXT,
  notebook_id UUID REFERENCES notebooks(id) ON DELETE SET NULL,
  share_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_notebook ON companies(notebook_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- Additional indexes for query performance

-- notebooks.status: dashboard filters by status (processing, ready, error)
CREATE INDEX IF NOT EXISTS idx_notebooks_status ON notebooks(status);

-- notebooks.source_hash: dedup check during featured clone
CREATE INDEX IF NOT EXISTS idx_notebooks_source_hash ON notebooks(source_hash);

-- companies.share_token: shared notebook lookup by token
CREATE INDEX IF NOT EXISTS idx_companies_share_token ON companies(share_token);

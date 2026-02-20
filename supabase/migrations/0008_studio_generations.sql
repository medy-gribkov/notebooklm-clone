-- Studio generations persistence
CREATE TABLE studio_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studio_generations_notebook ON studio_generations (notebook_id, action);

ALTER TABLE studio_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_generations" ON studio_generations
  FOR ALL USING (auth.uid() = user_id);

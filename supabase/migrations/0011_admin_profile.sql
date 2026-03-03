-- Admin profile table for storing editable bio/resume text
CREATE TABLE IF NOT EXISTS admin_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  bio_text text NOT NULL,
  display_name text,
  contact_info jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- RLS: only the admin user can read/write their own profile
ALTER TABLE admin_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON admin_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON admin_profile FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON admin_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS, so the shared chat route can read admin profile

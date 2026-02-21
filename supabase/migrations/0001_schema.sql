-- 0001_schema.sql
-- Core schema: extensions, tables, RLS policies, storage

-- pgvector in dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE notebooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  file_url    TEXT,
  status      TEXT NOT NULL DEFAULT 'processing',
  page_count  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content     TEXT NOT NULL,
  embedding   extensions.vector(768),
  chunk_index INTEGER NOT NULL,
  metadata    JSONB DEFAULT '{}'
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  sources     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT messages_sources_is_array CHECK (sources IS NULL OR jsonb_typeof(sources) = 'array')
);

CREATE TABLE notebook_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id  UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'ready', 'error')),
  page_count   INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL DEFAULT 'New note',
  content     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE studio_generations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action      TEXT NOT NULL,
  result      JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shared_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token       TEXT UNIQUE NOT NULL,
  permissions TEXT NOT NULL DEFAULT 'view' CHECK (permissions IN ('view', 'chat')),
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notebook_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (notebook_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE notebooks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_files    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_members  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notebooks" ON notebooks FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_chunks" ON chunks FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_messages" ON messages FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_notebook_files" ON notebook_files FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_notes" ON notes FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_generations" ON studio_generations FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_shared_links" ON shared_links FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_memberships" ON notebook_members FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "owner_manages_members" ON notebook_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM notebooks
      WHERE notebooks.id = notebook_members.notebook_id
      AND notebooks.user_id = (select auth.uid())
    )
  );

-- Storage: users can only access their own uploads
CREATE POLICY "Users access own PDFs" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'pdf-uploads'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'pdf-uploads'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

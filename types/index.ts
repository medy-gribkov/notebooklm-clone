export interface Notebook {
  id: string;
  user_id: string;
  title: string;
  file_url: string | null;
  status: 'processing' | 'ready' | 'error';
  page_count: number | null;
  description: string | null;
  created_at: string;
}

export interface NotebookFile {
  id: string;
  notebook_id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  status: 'processing' | 'ready' | 'error';
  page_count: number | null;
  created_at: string;
}

export interface Chunk {
  id: string;
  notebook_id: string;
  user_id: string;
  content: string;
  chunk_index: number;
  metadata: Record<string, unknown>;
}

export interface Source {
  chunkId: string;
  content: string;
  similarity: number;
  fileName?: string;
}

export interface Note {
  id: string;
  notebook_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface StudioGeneration {
  id: string;
  notebook_id: string;
  user_id: string;
  action: string;
  result: unknown;
  created_at: string;
}

export interface Message {
  id: string;
  notebook_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[] | null;
  created_at: string;
}

export interface SharedLink {
  id: string;
  notebook_id: string;
  user_id: string;
  token: string;
  permissions: 'view' | 'chat';
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface NotebookMember {
  id: string;
  notebook_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  invited_by: string | null;
  created_at: string;
}

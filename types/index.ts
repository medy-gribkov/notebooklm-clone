export interface Notebook {
  id: string;
  user_id: string;
  title: string;
  file_url: string;
  status: 'processing' | 'ready' | 'error';
  page_count: number | null;
  description: string | null;
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

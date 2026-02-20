# DocChat

**Chat with your PDFs using AI.** Upload a document, ask questions in plain English, and get answers grounded in your content with cited sources.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| AI/LLM | Groq (Llama 3.3 70B) with Gemini fallback, via Vercel AI SDK |
| Embeddings | Gemini embedding-001 (768-dim), pgvector |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Auth | Supabase Auth (GitHub OAuth + Magic Link) + JWT validation (jose) |
| Infrastructure | Docker, nginx (reverse proxy + SSL), Let's Encrypt |
| CI/CD | GitHub Actions (typecheck, lint, build, Docker) |

## Architecture

```
Browser
  |
nginx (SSL termination, gzip, caching)
  |
Next.js App (standalone, port 3000)
  |
  +-- API Routes (/api/chat, /api/upload, /api/notebooks, /api/messages)
  |     |
  |     +-- JWT Auth (jose) + Supabase RLS
  |     +-- Groq LLM (streaming via AI SDK)
  |     +-- RAG Pipeline (LangChain splitter + Gemini embeddings + pgvector)
  |
  +-- Supabase
        +-- PostgreSQL (notebooks, chunks, messages)
        +-- pgvector (cosine similarity search)
        +-- Storage (private PDF bucket)
        +-- Auth (Google OAuth, GitHub OAuth, Magic Link)
```

## Features

- **PDF Upload**: Drag-and-drop or click to upload. 5 MB max, text-based PDFs.
- **RAG Chat**: Questions answered from your document only, with source citations.
- **Source Panel**: See which document sections each answer came from, with relevance scores.
- **Streaming Responses**: Real-time token streaming via Vercel AI SDK.
- **Studio**: NotebookLM-style tools. Flashcards, Quiz, Report, Mind Map, Data Table, all generated from your document.
- **Auth**: GitHub OAuth or passwordless Magic Link sign-in.
- **Security**: JWT validation with issuer claims, rate limiting (10 msg/min chat, 3/hr upload, 5/hr studio), PDF magic bytes check, prompt injection defense, CSP headers.
- **Light/Dark Mode**: Toggle between light and dark themes. Preference persists in localStorage.

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Fill in your Supabase, Groq, and Gemini API keys

# Run dev server
npm run dev
```

Open http://localhost:3000.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase Dashboard > Settings > API |
| `GROQ_API_KEY` | Groq API key (primary LLM) |
| `GEMINI_API_KEY` | Google AI (Gemini) API key (embeddings + LLM fallback) |

## Database Setup

Apply migrations in the Supabase SQL Editor, in order:

1. `supabase/migrations/0001_init.sql` - Tables, pgvector, RPC functions
2. `supabase/migrations/0002_similarity_threshold.sql` - match_threshold parameter
3. `supabase/migrations/0003_sources_check.sql` - JSONB constraint on messages.sources

Create a private storage bucket named `pdf-uploads` (5 MB limit, application/pdf only).

## Docker Deployment

### Development (no SSL)

```bash
docker compose --env-file .env.local -f docker-compose.dev.yml up --build
```

### Production (with nginx + SSL)

```bash
# 1. Update nginx/nginx.conf with your domain
# 2. Get initial SSL certificate
docker compose run --rm certbot certonly \
  --webroot -w /var/lib/letsencrypt \
  -d your-domain.com

# 3. Start the full stack
docker compose up -d --build
```

See `deploy.sh` for a complete VPS setup script.

## Project Structure

```
app/
  (auth)/login/       Login page (Google + GitHub OAuth + Magic Link)
  (app)/dashboard/    Dashboard with notebook grid
  (app)/notebook/[id] Chat interface per notebook
  api/                API routes (chat, upload, notebooks, messages)
components/           React components (chat, sources, upload, cards)
lib/                  Server utilities (auth, gemini, rag, rate-limit, validate)
supabase/migrations/  SQL migrations
nginx/                nginx reverse proxy config
```

## CI/CD

GitHub Actions runs on every push/PR to master:
1. Type check (`tsc --noEmit`)
2. Lint (`eslint`)
3. Build (`next build`)
4. Docker build validation

## Author

Built by [Medy Gribkov](https://medygribkov.vercel.app) | [GitHub](https://github.com/medy-gribkov)

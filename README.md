# DocChat

Upload documents. Ask questions. Get AI-powered answers with cited sources.

DocChat is a NotebookLM-style research assistant. Upload PDFs, DOCX, text files, or images to a notebook, then chat with them using RAG (Retrieval-Augmented Generation). Every answer is grounded in your uploaded content with source citations. The Studio panel generates flashcards, quizzes, reports, mind maps, and more from your documents.

## Features

- **Multi-format upload**: PDF, DOCX, TXT, and images (JPEG, PNG, WebP with OCR). Drag-and-drop or click to upload. Multiple files per notebook.
- **RAG chat**: Questions answered only from your documents, with cited source passages and relevance scores.
- **Streaming responses**: Real-time token streaming via Vercel AI SDK.
- **Studio tools**: Flashcards, quiz, report, mind map, data table, infographic, slide deck, and audio overview, all generated from your documents.
- **Notebook sharing**: Create secure share links (view-only or view+chat). Anonymous users get rate-limited chat access without signing up.
- **Group collaboration**: Invite members (editor or viewer roles) to notebooks. Shared RAG context across all members.
- **Notebook exports**: Download notebook content as Markdown or JSON (chat history, notes, studio outputs).
- **Featured notebooks**: Curated example notebooks with pre-generated studio content.
- **Notes**: Save chat messages or write your own notes within each notebook.
- **Auth**: Email/password, magic link, GitHub OAuth, and Google OAuth via Supabase Auth.
- **Light/dark mode**: Theme toggle with system preference detection.
- **i18n**: English and Hebrew translations.
- **Security**: JWT validation, rate limiting on all endpoints, PDF magic bytes check, prompt injection defense, CSP headers, input sanitization.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui |
| AI/LLM | Groq (Llama 3.3 70B) with Gemini fallback, via Vercel AI SDK v4 |
| Embeddings | Google text-embedding-004 (768-dim) via LangChain |
| Vector search | pgvector (cosine similarity) |
| Database | Supabase PostgreSQL with Row-Level Security |
| Auth | Supabase Auth (email, magic link, GitHub, Google) |
| Storage | Supabase Storage (private PDF bucket) |
| CI/CD | GitHub Actions (typecheck, lint, build) |
| Deploy | Docker (single container, standalone mode) |

## Quick Start

```bash
# Clone and install
git clone https://github.com/mahdygr-blip/NoteBookLM-clone.git
cd NoteBookLM-clone
npm install --legacy-peer-deps

# Configure environment
cp .env.local.example .env.local
# Fill in your API keys (see Environment Variables below)

# Run dev server
npm run dev
```

Open http://localhost:3000.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret from Supabase Dashboard, Settings, API |
| `GROQ_API_KEY` | Yes | Groq API key (primary LLM) |
| `GEMINI_API_KEY` | Yes | Google AI API key (embeddings + LLM fallback) |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL for OG meta tags (defaults to localhost) |

## Database Setup

Apply migrations in the Supabase SQL Editor, in order:

1. `supabase/migrations/0001_schema.sql` - Tables, RLS policies, pgvector extension, storage policy
2. `supabase/migrations/0002_functions.sql` - RPC functions (vector search, share token validation)
3. `supabase/migrations/0003_indexes.sql` - Performance indexes (IVFFlat, foreign keys, composites)

After migrations, create a private storage bucket named `pdf-uploads` with a 5 MB file size limit and `application/pdf` MIME type restriction.

## Auth Providers Setup

### Email/Password
Enabled by default in Supabase Auth. No additional setup needed.

### GitHub OAuth
1. Create a GitHub OAuth App at https://github.com/settings/developers
2. Set the callback URL to `https://<your-project>.supabase.co/auth/v1/callback`
3. Copy the client ID and secret to Supabase Dashboard, Auth, Providers, GitHub

### Google OAuth
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Set the authorized redirect URI to `https://<your-project>.supabase.co/auth/v1/callback`
3. Copy the client ID and secret to Supabase Dashboard, Auth, Providers, Google

## Docker Deployment

DocChat runs as a single standalone Next.js container. No nginx or separate reverse proxy needed for platforms like runmydocker.com that handle SSL/routing.

### Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  --build-arg NEXT_PUBLIC_APP_URL=https://your-domain.com \
  -t docchat .
```

### Run locally

```bash
docker run -p 3000:3000 \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-key \
  -e SUPABASE_JWT_SECRET=your-jwt-secret \
  -e GROQ_API_KEY=your-groq-key \
  -e GEMINI_API_KEY=your-gemini-key \
  docchat
```

### Production with nginx + SSL

For VPS deployments that need SSL:

```bash
# Update nginx/nginx.conf with your domain
# Get SSL certificate
docker compose run --rm certbot certonly \
  --webroot -w /var/lib/letsencrypt \
  -d your-domain.com

# Start full stack
docker compose up -d --build
```

See `deploy.sh` for a complete VPS setup script.

## Project Structure

```
app/
  (auth)/login/               Login page (email, GitHub, Google OAuth)
  (auth)/auth/callback/       OAuth callback handler
  (app)/dashboard/            Dashboard with notebook grid and featured carousel
  (app)/notebook/[id]/        Notebook view (chat, sources, studio, notes)
  (app)/notebook/featured/    Featured notebook pages
  (app)/settings/             User settings
  shared/[token]/             Public shared notebook view
  api/
    chat/                     Streaming RAG chat
    messages/                 Chat history
    notebooks/                CRUD notebooks
    notebooks/[id]/files/     File upload and management
    notebooks/[id]/share/     Share link management
    notebooks/[id]/members/   Group member management
    notebooks/[id]/export/    Notebook export (markdown, JSON)
    notebooks/[id]/notes/     Notes CRUD
    notebooks/[id]/generations/ Studio generation history
    notebooks/[id]/audio/     Audio overview (TTS)
    notebooks/[id]/pdf/       Signed PDF download URL
    shared/[token]/           Public notebook data
    shared/[token]/chat/      Anonymous chat on shared notebooks
    studio/                   Studio content generation
    upload/                   Legacy upload endpoint
    user/                     User profile
    account/                  Account management
components/                   React components (chat, sources, studio, cards, layout)
lib/                          Server utilities
  auth.ts                    JWT validation
  llm.ts                     LLM client (Groq primary, Gemini fallback)
  rag.ts                     RAG pipeline (splitting, embedding, retrieval)
  rate-limit.ts              In-memory rate limiting
  validate.ts                Input validation and sanitization
  share.ts                   Share token generation and IP hashing
  export.ts                  Notebook export formatting
  featured-notebooks.ts      Featured notebook definitions
  featured-content.ts        Pre-generated studio content for featured notebooks
  supabase/                  Supabase client factories (browser, server, service)
  extractors/                File content extractors (PDF, DOCX, TXT, images)
supabase/migrations/         SQL migrations (3 files)
messages/                    i18n translation files (en.json, he.json)
public/                      Static assets (favicon, OG image, manifest)
scripts/                     Build scripts (asset generation)
nginx/                       nginx reverse proxy config (for VPS deployments)
```

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/chat | User | Streaming RAG chat |
| GET | /api/messages | User | Chat history for a notebook |
| GET | /api/notebooks | User | List user's notebooks |
| POST | /api/notebooks/create | User | Create a notebook |
| GET | /api/notebooks/[id] | User | Get notebook details |
| DELETE | /api/notebooks/[id] | Owner | Delete a notebook |
| PATCH | /api/notebooks/[id] | Owner | Update notebook title/description |
| POST | /api/notebooks/[id]/files | Owner | Upload files to notebook |
| GET | /api/notebooks/[id]/files | User | List notebook files |
| GET | /api/notebooks/[id]/pdf | User | Get signed PDF download URL |
| GET/POST/DELETE | /api/notebooks/[id]/share | Owner | Manage share links |
| GET/POST/DELETE | /api/notebooks/[id]/members | Owner | Manage group members |
| GET | /api/notebooks/[id]/export | User | Export as markdown or JSON |
| GET/POST/DELETE | /api/notebooks/[id]/notes | User | Notes CRUD |
| GET | /api/notebooks/[id]/generations | User | Studio generation history |
| POST | /api/notebooks/[id]/audio | User | Generate audio overview |
| POST | /api/studio | User | Generate studio content |
| GET | /api/shared/[token] | None | Public notebook data |
| POST | /api/shared/[token]/chat | None | Anonymous chat (3/hr/IP) |

## Rate Limits

| Endpoint | Limit | Key |
|----------|-------|-----|
| Chat | 10/min | user_id |
| File upload | 3/hr | user_id |
| Studio generation | 5/hr | user_id |
| Share link creation | 10/hr | user_id |
| Member invitation | 20/hr | user_id |
| Export | 5/hr | user_id |
| Public notebook fetch | 30/min | IP |
| Anonymous chat | 3/hr | IP |

## Security

- All API routes require authentication except public share endpoints
- JWT validation with issuer claim verification (jose library)
- Row-Level Security (RLS) on all Supabase tables
- PDF magic bytes validation before processing
- Input sanitization: null byte stripping, length limits, UUID validation
- Prompt injection defense: document content wrapped in delimiter markers
- Anonymous IPs hashed with SHA-256 (never stored raw)
- Share tokens generated with crypto.randomBytes (base64url encoded)
- CSP headers (no unsafe-eval), HSTS, X-Frame-Options, nosniff
- Rate limiting on every endpoint with Retry-After headers

## CI/CD

GitHub Actions runs on every push and PR to master:

1. TypeScript type checking (`tsc --noEmit`)
2. ESLint
3. Production build (`next build`)

## Testing

```bash
# Run unit tests
npx vitest run

# Run with watch mode
npx vitest
```

Tests cover lib utilities (auth, validation, rate limiting, export, share, RAG helpers) and API route handlers.

## License

MIT

## Author

Built by [Mahdy Gribkov](https://mahdygribkov.vercel.app)

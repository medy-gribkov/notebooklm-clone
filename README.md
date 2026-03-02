# DocChat

Upload documents. Ask questions. Get AI-powered answers with cited sources.

DocChat is a full-stack document intelligence platform built with Next.js 16, LangChain, and pgvector. Upload PDFs, DOCX, text files, or images to a notebook, then chat with them using RAG (Retrieval-Augmented Generation). Every answer is grounded in your uploaded content with source citations and relevance scoring. The Studio panel generates flashcards, quizzes, reports, mind maps, and more from your documents.

**Live demo:** [docchat-cagb.onrender.com](https://docchat-cagb.onrender.com)

## Features

- **Multi-format upload** -- PDF, DOCX, TXT, and images (JPEG, PNG, WebP with OCR via Gemini). Drag-and-drop or click to upload. Multiple files per notebook.
- **RAG chat** -- Questions answered from your documents with cited source passages and cosine similarity scores. Powered by LangChain retrieval chains and pgvector.
- **Streaming responses** -- Real-time token streaming via Vercel AI SDK with `requestAnimationFrame` batching for smooth rendering.
- **Studio tools** -- Flashcards, quiz, report, mind map, data table, infographic, slide deck, and audio overview. All generated from your documents using structured output parsing.
- **Notebook sharing** -- Secure share links (view-only or view+chat). Anonymous users get rate-limited chat access without signing up.
- **Group collaboration** -- Invite members (editor or viewer roles) to notebooks. Shared RAG context across all members.
- **Notebook exports** -- Download notebook content as Markdown or JSON (chat history, notes, studio outputs).
- **Featured notebooks** -- Curated example notebooks with pre-generated studio content for new users.
- **Notes** -- Save chat messages or write your own notes within each notebook using a TipTap rich text editor.
- **Auth** -- Email/password, magic link, GitHub OAuth, and Google OAuth via Supabase Auth.
- **Light/dark mode** -- Theme toggle with system preference detection.
- **i18n** -- English and Hebrew with RTL support via next-intl.
- **Security** -- JWT validation, rate limiting on all endpoints, PDF magic bytes check, prompt injection defense, CSP headers, input sanitization.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 (strict) |
| Styling | Tailwind CSS v4, shadcn/ui v3, tw-animate-css |
| AI/LLM | Groq (Llama 3.3 70B) primary, Gemini 2.0 Flash fallback, via Vercel AI SDK v4 |
| RAG Pipeline | LangChain (retriever, RAG chain, structured output parsers, message trimming) |
| Embeddings | Google Gemini Embedding 001 (768-dim) via @langchain/google-genai |
| Vector Search | pgvector (IVFFlat index, cosine distance) |
| Database | Supabase PostgreSQL with Row-Level Security |
| Auth | Supabase Auth (email, magic link, GitHub OAuth, Google OAuth) |
| Storage | Supabase Storage (private bucket, signed URLs) |
| Testing | Vitest (361+ tests, 41 files, 97%+ statement coverage), Playwright E2E (6 tests) |
| CI/CD | GitHub Actions (typecheck, lint, test, build, Docker push) |
| Deploy | Docker (standalone Next.js, node:22-alpine) on Render |

## Quick Start

```bash
git clone https://github.com/mahdygr-blip/NoteBookLM-clone.git
cd NoteBookLM-clone
npm install --legacy-peer-deps

cp .env.local.example .env.local
# Fill in your API keys (see Environment Variables below)

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret from Supabase Dashboard > Settings > API |
| `GROQ_API_KEY` | Yes | Groq API key (primary LLM) |
| `GEMINI_API_KEY` | Yes | Google AI API key (embeddings + LLM fallback + OCR) |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL for OG meta tags (defaults to localhost) |

## Database Setup

Apply migrations in the Supabase SQL Editor, in order:

1. `0001_schema.sql` -- Tables, RLS policies, pgvector extension, storage policy
2. `0002_functions.sql` -- RPC functions (vector search, share token validation)
3. `0003_indexes.sql` -- Performance indexes (IVFFlat, foreign keys, composites)
4. `0004_optimization.sql` -- Query optimizations
5. `0005_backfill_featured_file_ids.sql` -- Featured notebook file IDs
6. `0006_add_source_hash.sql` -- Content deduplication hashing
7. `0007_chat_privacy_and_hashing.sql` -- Chat privacy and IP hashing
8. `0008_companies.sql` -- Company metadata table
9. `0009_perf_indexes.sql` -- Additional performance indexes

After migrations, create a private storage bucket named `pdf-uploads` with a 5 MB file size limit.

## Auth Providers

### Email/Password
Enabled by default in Supabase Auth. No additional setup needed.

### GitHub OAuth
1. Create a GitHub OAuth App at [github.com/settings/developers](https://github.com/settings/developers)
2. Set the callback URL to `https://<your-project>.supabase.co/auth/v1/callback`
3. Add client ID and secret in Supabase Dashboard > Auth > Providers > GitHub

### Google OAuth
1. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Set the authorized redirect URI to `https://<your-project>.supabase.co/auth/v1/callback`
3. Add client ID and secret in Supabase Dashboard > Auth > Providers > Google

## Docker

DocChat runs as a single standalone Next.js container.

### Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  --build-arg NEXT_PUBLIC_APP_URL=https://your-domain.com \
  -t docchat .
```

### Run

```bash
docker run -p 3000:3000 \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-key \
  -e SUPABASE_JWT_SECRET=your-jwt-secret \
  -e GROQ_API_KEY=your-groq-key \
  -e GEMINI_API_KEY=your-gemini-key \
  docchat
```

### VPS with nginx + SSL

For VPS deployments that need SSL termination, see `deploy.sh` for a complete setup script with Let's Encrypt.

```bash
chmod +x deploy.sh
./deploy.sh your-domain.com your-email@example.com
```

## Project Structure

```
app/
  (auth)/login/                 Login (email, GitHub, Google OAuth)
  (auth)/auth/callback/         OAuth callback handler
  (app)/dashboard/              Notebook grid + featured carousel
  (app)/notebook/[id]/          Notebook view (chat, sources, studio, notes)
  (app)/notebook/featured/      Featured notebook pages
  (app)/settings/               User settings (profile, theme, language)
  shared/[token]/               Public shared notebook view
  api/
    chat/                       Streaming RAG chat
    messages/                   Chat history
    notebooks/                  CRUD notebooks
    notebooks/[id]/files/       File upload and management
    notebooks/[id]/share/       Share link management
    notebooks/[id]/members/     Group member management
    notebooks/[id]/export/      Export (Markdown, JSON)
    notebooks/[id]/notes/       Notes CRUD
    notebooks/[id]/generations/ Studio generation history
    notebooks/[id]/audio/       Audio overview (TTS)
    notebooks/[id]/pdf/         Signed PDF download URL
    shared/[token]/             Public notebook data
    shared/[token]/chat/        Anonymous chat on shared notebooks
    studio/                     Studio content generation
    upload/                     File upload endpoint
    user/                       User profile + avatar
    account/                    Account deletion
components/
  chat-interface.tsx            Main chat UI with streaming
  source-panel.tsx              Source citations with similarity bars
  sources-panel.tsx             File list sidebar
  studio-panel.tsx              Studio generation panel
  studio/                       Studio view components (flashcards, quiz, report, etc.)
  markdown-renderer.tsx         Lazy-loaded markdown with sanitization
lib/
  auth.ts                       JWT validation (jose)
  llm.ts                        LLM client factory (Groq primary, Gemini fallback)
  rag.ts                        RAG pipeline (splitting, embedding, retrieval)
  rate-limit.ts                 In-memory rate limiting with auto-cleanup
  validate.ts                   Input validation and sanitization
  share.ts                      Share token generation + IP hashing
  export.ts                     Notebook export formatting
  featured-notebooks.ts         Featured notebook definitions
  featured-content.ts           Pre-generated studio content
  supabase/                     Supabase client factories (browser, server, service)
  extractors/                   Content extractors (PDF, DOCX, TXT, images)
  langchain/
    embeddings.ts               GoogleGenerativeAIEmbeddings (768-dim)
    retriever.ts                Custom DocChatRetriever (wraps match_chunks RPC)
    rag-chain.ts                LCEL chain: query -> retrieve -> deduplicate -> context
    chat-model.ts               ChatGoogleGenerativeAI for metadata generation
    output-parsers.ts           Zod schemas + StructuredOutputParser for 7 studio types
    trim-messages.ts            Message history trimming (12k char budget)
supabase/migrations/            SQL migrations (9 files)
messages/                       i18n translations (en.json, he.json)
public/                         Static assets (favicon, OG image, manifest)
nginx/                          nginx config for VPS deployments
```

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/chat` | User | Streaming RAG chat |
| GET | `/api/messages` | User | Chat history for a notebook |
| GET | `/api/notebooks` | User | List user notebooks |
| POST | `/api/notebooks/create` | User | Create notebook |
| GET | `/api/notebooks/[id]` | User | Notebook details |
| DELETE | `/api/notebooks/[id]` | Owner | Delete notebook |
| PATCH | `/api/notebooks/[id]` | Owner | Update title/description |
| POST | `/api/notebooks/[id]/files` | Owner | Upload files |
| GET | `/api/notebooks/[id]/files` | User | List files |
| GET | `/api/notebooks/[id]/pdf` | User | Signed PDF download URL |
| GET/POST/DELETE | `/api/notebooks/[id]/share` | Owner | Share link management |
| GET/POST/DELETE | `/api/notebooks/[id]/members` | Owner | Group member management |
| GET | `/api/notebooks/[id]/export` | User | Export as Markdown or JSON |
| GET/POST/DELETE | `/api/notebooks/[id]/notes` | User | Notes CRUD |
| GET | `/api/notebooks/[id]/generations` | User | Studio generation history |
| POST | `/api/notebooks/[id]/audio` | User | Generate audio overview |
| POST | `/api/studio` | User | Generate studio content |
| POST/DELETE | `/api/user/avatar` | User | Upload or remove avatar |
| GET | `/api/user/export` | User | Download all user data |
| PATCH | `/api/user/preferences` | User | Update display name, accent color |
| DELETE | `/api/account` | User | Delete account and all data |
| GET | `/api/shared/[token]` | None | Public notebook data |
| POST | `/api/shared/[token]/chat` | None | Anonymous chat (rate-limited) |

## Rate Limits

| Endpoint | Limit | Key |
|---|---|---|
| Chat | 10 req/min | user_id |
| File upload | 15 req/hr | user_id |
| Studio generation | 30 req/hr | user_id |
| Share link creation | 10 req/hr | user_id |
| Member invitation | 20 req/hr | user_id |
| Export | 5 req/hr | user_id |
| Public notebook fetch | 30 req/min | IP (hashed) |
| Anonymous chat | 10 req/min | IP (hashed) |

## Security

- JWT validation with issuer claim verification (jose)
- Row-Level Security (RLS) on all Supabase tables
- PDF magic bytes validation (`%PDF-` header check)
- Input sanitization: null byte stripping, length limits (100k chars), UUID validation
- Prompt injection defense: document content wrapped in `===BEGIN DOCUMENT===` / `===END DOCUMENT===` delimiters
- Anonymous IPs hashed with SHA-256 (never stored raw)
- Share tokens: `crypto.randomBytes(32)` base64url encoded
- Security headers: CSP (no unsafe-eval), HSTS, X-Frame-Options DENY, nosniff, strict Referrer-Policy, Permissions-Policy
- Rate limiting on every endpoint with `Retry-After` headers on 429

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

41 test files, 361+ unit/component tests, 6 E2E tests. Coverage: 97%+ statements, 95%+ branches. `lib/langchain/` at 100%.

## CI/CD

GitHub Actions runs on every push and PR to master:

1. TypeScript type checking (`tsc --noEmit`)
2. ESLint
3. Vitest (unit + integration tests with coverage)
4. Production build (`next build`)
5. Docker build + push to DockerHub (master only)

Docker images are auto-deployed to Render on push to master.

## License

MIT

## Author

Built by [Medy Gribkov](https://medygribkov.vercel.app)

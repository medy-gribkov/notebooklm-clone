# DocChat - Technical Video Script

**Format:** Screen recording with voiceover
**Duration:** ~5-6 minutes
**Language:** Hebrew + English technical terms
**Audience:** Potential employers, technical decision makers
**Tone:** Senior engineer walkthrough. Confident, precise, no fluff.

---

## Visual Cues Legend

- `[SCREEN]` = what to show on screen
- `[CUT]` = transition to new screen
- `[HIGHLIGHT]` = zoom/box annotation on specific area

---

## 1. Hook (0:00-0:30)

`[SCREEN: shared notebook page, chat with streaming response, sources panel open]`

היי, אני מדי גריבקוב. בניתי את DocChat, פלטפורמת RAG מלאה שמאפשרת למשתמשים להעלות מסמכים ולנהל שיחה חכמה איתם, עם citations מדויקים לטקסט המקורי.

`[CUT: dashboard with notebook grid]`

זה לא proof of concept. זו מערכת production עם authentication, rate limiting, security hardening, ו-CI/CD pipeline מלא. אני אראה לכם בדיוק איך בניתי את זה ולמה בחרתי כל טכנולוגיה.

---

## 2. Architecture Overview (0:30-1:30)

`[SCREEN: VS Code with project tree open, app/ folder expanded]`

ה-stack: **Next.js 16** עם App Router, **TypeScript strict**, **Tailwind CSS v4**, ו-**Supabase** כ-backend.

`[HIGHLIGHT: app/ directory structure]`

Next.js 16 נבחר בגלל ה-proxy.ts middleware pattern החדש. ב-15 היה middleware.ts, ב-16 עברו ל-proxy.ts שנותן שליטה טובה יותר על routing. ה-App Router מאפשר React Server Components, מה שחוסך JavaScript בצד הלקוח.

`[CUT: Supabase dashboard showing tables]`

**Supabase** ולא Firebase, ובגלל סיבה ספציפית: **pgvector**. אני צריך vector similarity search בתוך Postgres. עם Firebase הייתי צריך Pinecone או Weaviate בנפרד. עם Supabase, ה-vectors יושבים באותו database עם Row Level Security, transactions, ו-SQL control. הכל במקום אחד.

`[CUT: Render dashboard]`

Deploy על **Render** ולא Vercel. למה? Docker control. אני רוצה multi-stage build, health checks, ו-persistent containers. Vercel serverless מגביל על cold starts ו-function timeout. Render נותן container שרץ 24/7.

`[SCREEN: architecture diagram - draw or show]`

**ה-flow**: Client שולח request ל-Next.js API Route. ה-route מאמת auth דרך Supabase cookie או JWT Bearer. ואז מפעיל את ה-RAG pipeline ומחזיר streaming response.

---

## 3. RAG Pipeline Deep Dive (1:30-3:00)

`[SCREEN: lib/processing/process-notebook.ts in VS Code]`

נתחיל מה-ingestion. משתמש מעלה PDF. **pdf-parse** v1 מחלץ טקסט. אחר כך **RecursiveCharacterTextSplitter** מ-LangChain חותך ל-chunks של 2,000 תווים עם overlap של 200.

`[HIGHLIGHT: BATCH_SIZE = 5, INTER_BATCH_DELAY = 6500]`

כל chunk עובר embedding דרך **Gemini embedding API**, vectors של 768 dimensions. בגלל rate limit של Gemini, 10 requests per minute, אני שולח batches של 5 בפרלל, עם delay של 6.5 שניות בין batches. ו-exponential backoff על 429s: 6 שניות, 12, 24, 48, 96.

`[CUT: lib/langchain/retriever.ts]`

**ה-query flow** הוא הליבה. בניתי custom **BaseRetriever** מ-LangChain שעוטף Supabase RPC.

`[HIGHLIGHT: DocChatRetriever class, _getRelevantDocuments method]`

כשמשתמש שולח שאלה: embed the query, קריאת RPC ל-**match_chunks** ב-Supabase. זה cosine similarity על pgvector עם HNSW index. **threshold של 0.3**, **top-K של 12 chunks**.

`[CUT: lib/langchain/context-builder.ts]`

אחרי ה-retrieval, **deduplication**. chunks דומים מאוד, מעל 90% Jaccard overlap, מסוננים. זה מונע hallucination מ-near-duplicate sources.

`[CUT: lib/langchain/rag-chain.ts]`

הכל מחובר ב-**LCEL chain**, ה-composition pattern של LangChain: query נכנס, embed, retrieve, deduplicate, build context, assemble system prompt. ה-output הוא sources ו-system prompt מוכן.

`[HIGHLIGHT: ===BEGIN DOCUMENT=== / ===END DOCUMENT===]`

שימו לב ל-delimiters: `===BEGIN DOCUMENT===` ו-`===END DOCUMENT===`. זה prompt injection defense. ה-system prompt מציין שהטקסט בין ה-delimiters הוא data, לא commands.

`[CUT: app/api/chat/route.ts, streamText call]`

ה-streaming עצמו דרך **Vercel AI SDK**, `streamText` עם `useChat` hook בצד הלקוח. למה לא LangChain streaming? כי ה-useChat hook של Vercel AI SDK נותן state management מובנה, automatic message history, ו-StreamData protocol לשליחת metadata כמו sources.

**זו ההחלטה הארכיטקטונית המרכזית: LangChain לכל ה-RAG logic, Vercel AI SDK רק ל-streaming**. שני ה-SDKs עושים דברים שונים טוב.

---

## 4. Security & Production Hardening (3:00-4:00)

`[SCREEN: lib/validate.ts]`

**Input validation** קודם כל. כל UUID עובר regex check. כל הודעה מוגבלת ל-2,000 תווים. null bytes מוסרים. ויש regex patterns שמסננים prompt injection: "ignore previous instructions", "act as", "system override", ועוד.

`[CUT: lib/rate-limit.ts]`

**Rate limiting** ב-memory Map עם cleanup. 10 הודעות per minute per user ב-chat. 3 uploads per hour. 30 requests per minute per IP על shared notebooks. כל 429 מחזיר **Retry-After header**.

`[CUT: proxy.ts]`

**Auth flow**: ה-proxy.ts middleware בודק Supabase auth cookies. non-authenticated users מ-redirect ל-login. API routes משתמשים ב-service role client שעוקף RLS. כל file access דרך signed URLs, לא public URLs.

`[HIGHLIGHT: CSP headers section]`

**Security headers**: CSP בלי unsafe-eval. HSTS. X-Frame-Options. Content-Type nosniff. Referrer-Policy. ו-Permissions-Policy.

`[CUT: PDF upload validation code]`

גם ב-upload: magic bytes check. חמשת הבתים הראשונים חייבים להיות `%PDF-`. לא סומכים על Content-Type header.

---

## 5. Testing & CI/CD (4:00-5:00)

`[SCREEN: terminal running vitest with results]`

**683 unit tests** ו-**34 E2E tests**. Vitest לכל ה-unit ו-component tests, Playwright ל-E2E.

`[HIGHLIGHT: test file tree showing __tests__/security/]`

יש **security test suite** ייעודי: prompt injection tests ש-validate שה-filtering עובד, auth bypass tests שבודקים שכל ה-protected routes מחזירים 401, ו-XSS tests שמוודאים שה-markdown renderer מסנן script tags, onerror attributes, ו-iframes.

`[CUT: .github/workflows/ci.yml]`

**ה-CI pipeline**: Type check ו-lint רצים בפרלל עם unit tests ו-component tests. אם הכל עובר, build. אחרי build, בפרלל: E2E tests, Lighthouse audit, ו-Docker build. על master push, ה-Docker image נדחף ל-DockerHub, ו-Render עושה auto-deploy.

`[HIGHLIGHT: health-check job]`

**Post-deploy health check**: 120 שניות wait ל-Render deploy, ואז curl ל-production URL. אם זה נכשל, ה-CI pipeline fails ואני מקבל notification.

`[CUT: coverage report in terminal]`

כל ה-`lib/` directory ב-**100% coverage**. זה כולל ה-RAG pipeline, ה-validators, ה-rate limiter, ה-file processing, הכל.

---

## 6. Close & Unique Features (5:00-5:40)

`[SCREEN: shared notebook with Cybersecurity category starters]`

**Shared notebooks** עם **category-specific chat starters**. אם ה-notebook שייך לחברת Cybersecurity, ה-starters שואלים על security products ו-compliance standards. Fintech מקבל שאלות על regulations ו-target market. יש 7 קטגוריות.

`[CUT: studio panel showing flashcards + quiz]`

**Studio tools**: ה-AI מייצר flashcards, quizzes, reports, mindmaps, slide decks, ו-infographics מתוך ה-documents. הכל דרך LangChain StructuredOutputParser עם Zod schemas.

`[CUT: shared notebook about Medy, chat asking "who built this"]`

**Admin bio injection**: כשמשתמש פותח notebook של ה-portfolio שלי, ה-system prompt מזריק את ה-bio שלי. אז recruiter שמדבר עם ה-notebook מקבל תשובות מדויקות על מי אני ומה בניתי.

`[CUT: portfolio website, then GitHub]`

DocChat מדגים full-stack architecture, RAG expertise, security mindset, testing discipline, ו-production deployment. כל שורת קוד זמינה ב-GitHub.

**Live demo**: docchat-cagb.onrender.com
**GitHub**: github.com/medy-gribkov/notebooklm-clone
**Portfolio**: medygribkov.vercel.app

תודה שצפיתם.

---

## Recording Notes

- Record screen at 1920x1080
- Use VS Code dark theme for code shots
- Zoom to 150% on code sections for readability
- Prepare architecture diagram beforehand (Excalidraw or Figma)
- Keep terminal font size at 16px+
- Rehearse transitions between VS Code, Supabase dashboard, terminal, and browser
- Total target: 5:30, acceptable range 4:30-6:30

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/* Hoisted mocks. vi.hoisted runs before any import.                  */
/* ------------------------------------------------------------------ */
const {
  mockFrom,
  mockSupabase,
  mockServiceFrom,
  mockServiceClient,
  mockCheckRateLimit,
  mockGenerateCompanyContent,
  mockGenerateShareToken,
  mockEmbedText,
  mockGetNotebookHash,
  mockCreateDocuments,
} = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockServiceFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: mockFrom,
  };
  const mockServiceClient = {
    from: mockServiceFrom,
  };
  const mockCheckRateLimit = vi.fn();
  const mockGenerateCompanyContent = vi.fn();
  const mockGenerateShareToken = vi.fn();
  const mockEmbedText = vi.fn();
  const mockGetNotebookHash = vi.fn();
  const mockCreateDocuments = vi.fn();

  return {
    mockFrom,
    mockSupabase,
    mockServiceFrom,
    mockServiceClient,
    mockCheckRateLimit,
    mockGenerateCompanyContent,
    mockGenerateShareToken,
    mockEmbedText,
    mockGetNotebookHash,
    mockCreateDocuments,
  };
});

/* ------------------------------------------------------------------ */
/* Module mocks                                                       */
/* ------------------------------------------------------------------ */
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn().mockReturnValue(mockServiceClient),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/generate-company", () => ({
  generateCompanyContent: mockGenerateCompanyContent,
}));

vi.mock("@/lib/share", () => ({
  generateShareToken: mockGenerateShareToken,
}));

vi.mock("@/lib/processing/process-notebook", () => ({
  embedText: mockEmbedText,
}));

vi.mock("@/lib/hash", () => ({
  getNotebookHash: mockGetNotebookHash,
}));

vi.mock("@langchain/textsplitters", () => ({
  RecursiveCharacterTextSplitter: vi.fn(function (this: Record<string, unknown>) {
    this.createDocuments = mockCreateDocuments;
  }),
}));

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */
const ADMIN_ID = "admin-user-id-123";
const NOTEBOOK_ID = "notebook-uuid-001";
const FILE_ID = "file-uuid-001";
const SHARE_TOKEN = "fake-share-token-abc";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://test/api/admin/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Minimal content returned by generateCompanyContent */
function fakeContent() {
  return {
    description: "A tech company",
    files: [
      { fileName: "overview.md", content: "This is the company overview content." },
    ],
    quiz: [{ q: "Q?", a: "A" }],
    flashcards: [{ front: "F", back: "B" }],
    report: "Report text",
    mindmap: { root: "Company" },
    datatable: { headers: ["H"], rows: [["R"]] },
    infographic: { title: "Info" },
    slidedeck: { slides: [{ title: "Slide 1" }] },
  };
}

/**
 * Build chained mock helpers for Supabase client.
 * Each method returns the same chain object so `.insert().select().single()` works.
 */
function chainOk(data: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data, error: null });
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve({ data, error: null }));
  return chain;
}

function chainError(message: string) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: null, error: { message } });
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: { message } }));
  return chain;
}

/**
 * Configure mockFrom for the full happy path:
 *  call 0 → notebooks.insert (create notebook)
 *  call 1 → notebook_files.insert (create file)
 *  call 2 → studio_generations.insert
 *  call 3 → shared_links.insert
 *  call 4 → companies.insert
 */
function setupHappyPathMockFrom() {
  // notebooks.insert → returns notebook id
  const notebookChain = chainOk({ id: NOTEBOOK_ID });

  // notebook_files.insert → returns file id
  const fileChain = chainOk({ id: FILE_ID });

  // studio_generations.insert → success
  const studioChain = chainOk(null);

  // shared_links.insert → success
  const shareChain = chainOk(null);

  // companies.insert → success
  const companiesChain = chainOk(null);

  mockFrom
    .mockReturnValueOnce(notebookChain)   // notebooks
    .mockReturnValueOnce(fileChain)        // notebook_files
    .mockReturnValueOnce(studioChain)      // studio_generations
    .mockReturnValueOnce(shareChain)       // shared_links
    .mockReturnValueOnce(companiesChain);  // companies
}

/**
 * Configure mockServiceFrom for the happy path embedding flow:
 *  call 0 → chunks.insert
 *  call 1 → notebook_files.update (status → ready)
 *  call 2 → notebooks.update (status → ready)
 */
function setupHappyPathServiceFrom() {
  const chunksChain = chainOk(null);
  const filesUpdateChain = chainOk(null);
  const notebooksUpdateChain = chainOk(null);

  mockServiceFrom
    .mockReturnValueOnce(chunksChain)
    .mockReturnValueOnce(filesUpdateChain)
    .mockReturnValueOnce(notebooksUpdateChain);
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */
describe("POST /api/admin/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_USER_ID", ADMIN_ID);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

    // Defaults (overridden in individual tests as needed)
    mockCheckRateLimit.mockReturnValue(true);
    mockGenerateCompanyContent.mockResolvedValue(fakeContent());
    mockGenerateShareToken.mockReturnValue(SHARE_TOKEN);
    mockGetNotebookHash.mockReturnValue("hash-abc");
    mockCreateDocuments.mockResolvedValue([
      { pageContent: "chunk1" },
      { pageContent: "chunk2" },
    ]);
    mockEmbedText.mockResolvedValue([0.1, 0.2, 0.3]);
  });

  /* ---- 1. 401 when getUser returns null ---- */
  it("returns 401 when getUser returns null", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/admin/generate/route");
    const res = await POST(makeRequest({ companyName: "Acme", website: "https://acme.com" }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  /* ---- 2. 403 when user is not admin ---- */
  it("returns 403 when user is not admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "not-admin-id" } },
    });

    const { POST } = await import("@/app/api/admin/generate/route");
    const res = await POST(makeRequest({ companyName: "Acme", website: "https://acme.com" }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  /* ---- 3. 429 when rate limited ---- */
  it("returns 429 when rate limited", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });
    mockCheckRateLimit.mockReturnValue(false);

    const { POST } = await import("@/app/api/admin/generate/route");
    const res = await POST(makeRequest({ companyName: "Acme", website: "https://acme.com" }));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
  });

  /* ---- 4. 400 when companyName is missing ---- */
  it("returns 400 when companyName is missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });

    const { POST } = await import("@/app/api/admin/generate/route");
    const res = await POST(makeRequest({ website: "https://acme.com" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing");
  });

  /* ---- 5. 400 when website is missing ---- */
  it("returns 400 when website is missing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });

    const { POST } = await import("@/app/api/admin/generate/route");
    const res = await POST(makeRequest({ companyName: "Acme" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing");
  });

  /* ---- 6. 500 when generateCompanyContent returns null ---- */
  it("returns 500 when generateCompanyContent returns null", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });
    mockGenerateCompanyContent.mockResolvedValue(null);

    const { POST } = await import("@/app/api/admin/generate/route");
    const res = await POST(makeRequest({ companyName: "Acme", website: "https://acme.com" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to generate content");
  });

  /* ---- 7. 500 when notebook creation DB error ---- */
  it("returns 500 when notebook creation DB error", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });

    const errorChain = chainError("insert failed");
    mockFrom.mockReturnValueOnce(errorChain);

    const { POST } = await import("@/app/api/admin/generate/route");
    const res = await POST(makeRequest({ companyName: "Acme", website: "https://acme.com" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Database error");
  });

  /* ---- 8. 201 happy path ---- */
  it("returns 201 with notebookId and shareUrl on success", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });

    setupHappyPathMockFrom();
    setupHappyPathServiceFrom();

    const { POST } = await import("@/app/api/admin/generate/route");
    const res = await POST(
      makeRequest({ companyName: "Acme", website: "https://acme.com", category: "SaaS" }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.notebookId).toBe(NOTEBOOK_ID);
    expect(body.shareToken).toBe(SHARE_TOKEN);
    expect(body.shareUrl).toBe(`http://localhost:3000/shared/${SHARE_TOKEN}`);

    // Verify embedText was called for each chunk
    expect(mockEmbedText).toHaveBeenCalledTimes(2);
    expect(mockEmbedText).toHaveBeenCalledWith("chunk1");
    expect(mockEmbedText).toHaveBeenCalledWith("chunk2");
  });

  /* ---- 9. 201 even when studio generation insert fails ---- */
  it("returns 201 even when studio generation insert fails (partial failure tolerated)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });

    // notebooks.insert → OK
    const notebookChain = chainOk({ id: NOTEBOOK_ID });
    // notebook_files.insert → OK
    const fileChain = chainOk({ id: FILE_ID });
    // studio_generations.insert → ERROR (this is the partial failure)
    const studioChain = chainError("studio insert error");
    // shared_links.insert → OK
    const shareChain = chainOk(null);
    // companies.insert → OK
    const companiesChain = chainOk(null);

    mockFrom
      .mockReturnValueOnce(notebookChain)
      .mockReturnValueOnce(fileChain)
      .mockReturnValueOnce(studioChain)
      .mockReturnValueOnce(shareChain)
      .mockReturnValueOnce(companiesChain);

    setupHappyPathServiceFrom();

    const { POST } = await import("@/app/api/admin/generate/route");
    const res = await POST(
      makeRequest({ companyName: "Acme", website: "https://acme.com" }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.notebookId).toBe(NOTEBOOK_ID);
  });

  /* ---- 10. 500 when embedText throws ---- */
  it("returns 500 when embedding fails (embedText throws)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: ADMIN_ID } },
    });

    // notebooks.insert → OK
    const notebookChain = chainOk({ id: NOTEBOOK_ID });
    // notebook_files.insert → OK
    const fileChain = chainOk({ id: FILE_ID });
    // studio_generations.insert → OK
    const studioChain = chainOk(null);

    mockFrom
      .mockReturnValueOnce(notebookChain)
      .mockReturnValueOnce(fileChain)
      .mockReturnValueOnce(studioChain);

    // embedText throws
    mockEmbedText.mockRejectedValue(new Error("Embedding API 429 rate limit"));

    // Service client: error-path updates (notebooks → error, notebook_files → error)
    const notebooksErrorChain = chainOk(null);
    const filesErrorChain = chainOk(null);
    mockServiceFrom
      .mockReturnValueOnce(notebooksErrorChain)
      .mockReturnValueOnce(filesErrorChain);

    const { POST } = await import("@/app/api/admin/generate/route");
    const res = await POST(
      makeRequest({ companyName: "Acme", website: "https://acme.com" }),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to embed");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase } = vi.hoisted(() => {
    const mockSupabase = {
        auth: { getUser: vi.fn() },
        from: vi.fn(),
    };
    return { mockSupabase };
});

vi.mock("@/lib/auth", () => ({
    authenticateRequest: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/processing/get-all-chunks", () => ({
    getAllChunks: vi.fn().mockImplementation(() => Promise.resolve("sample document content")),
}));

vi.mock("@/lib/llm", () => ({
    getLLM: vi.fn().mockReturnValue({}),
}));

vi.mock("ai", () => ({
    streamText: vi.fn(),
}));

import { POST } from "@/app/api/studio/route";
import { authenticateRequest } from "@/lib/auth";
import { getAllChunks } from "@/lib/processing/get-all-chunks";
import { streamText } from "ai";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedChunks = vi.mocked(getAllChunks);
const mockedStreamText = vi.mocked(streamText);
const validUUID = "550e8400-e29b-41d4-a716-446655440000";

const VALID_ACTIONS = ["flashcards", "quiz", "report", "mindmap", "datatable", "infographic", "slidedeck"];

describe("POST /api/studio (Caching)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedAuth.mockResolvedValue("skip");
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: "user-123" } },
        });
        mockedChunks.mockResolvedValue("sample document content");
        process.env.GROQ_API_KEY = "dummy-key";
        process.env.GEMINI_API_KEY = "dummy-key";
    });

    it.each(VALID_ACTIONS)("returns cached result for %s if hashes match", async (action) => {
        const cachedResult = { [action]: [] };

        mockSupabase.from.mockImplementation((table) => {
            if (table === "notebooks") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { id: validUUID, status: "ready", source_hash: "test-hash" }, error: null }),
                };
            }
            if (table === "studio_generations") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { result: cachedResult }, error: null }),
                };
            }
            return {};
        });

        const req = new Request("http://test/api/studio", {
            method: "POST",
            body: JSON.stringify({ notebookId: validUUID, action }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual(cachedResult);
        expect(mockedStreamText).not.toHaveBeenCalled();
        expect(mockedChunks).not.toHaveBeenCalled();
    });

    it.each(VALID_ACTIONS)("calls AI for %s if no cached result is found", async (action) => {
        mockSupabase.from.mockImplementation((table) => {
            if (table === "notebooks") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { id: validUUID, status: "ready" }, error: null }),
                };
            }
            if (table === "studio_generations") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
                    insert: vi.fn().mockResolvedValue({ error: null }),
                };
            }
            return {};
        });

        mockedStreamText.mockReturnValue({
            toUIMessageStreamResponse: vi.fn().mockReturnValue(new Response("streaming...")),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        const req = new Request("http://test/api/studio", {
            method: "POST",
            body: JSON.stringify({ notebookId: validUUID, action }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(mockedStreamText).toHaveBeenCalled();
    });
});

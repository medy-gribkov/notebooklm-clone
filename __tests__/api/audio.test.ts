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

vi.mock("@/lib/groq-tts", () => ({
    generateSpeech: vi.fn(),
}));

vi.mock("ai", () => ({
    generateText: vi.fn().mockResolvedValue({ text: "Mocked summary" }),
}));

import { POST } from "@/app/api/notebooks/[id]/audio/route";
import { authenticateRequest } from "@/lib/auth";
import { getAllChunks } from "@/lib/processing/get-all-chunks";
import { generateSpeech } from "@/lib/groq-tts";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedChunks = vi.mocked(getAllChunks);
const mockedSpeech = vi.mocked(generateSpeech);
const validUUID = "550e8400-e29b-41d4-a716-446655440000";

describe("POST /api/notebooks/[id]/audio", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedAuth.mockResolvedValue("skip");
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: "user-123" } },
        });

        // Default notebook mock
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: validUUID, status: "ready", title: "Test Notebook" },
                error: null
            }),
        });

        mockedChunks.mockResolvedValue("Some text for the audio summary.");
        process.env.GROQ_API_KEY = "dummy-key";
        process.env.GEMINI_API_KEY = "dummy-key";
    });

    it("returns 401 without auth", async () => {
        mockedAuth.mockResolvedValue(null);
        const req = new Request(`http://test/api/notebooks/${validUUID}/audio`, { method: "POST" });
        const res = await POST(req, { params: Promise.resolve({ id: validUUID }) });
        expect(res.status).toBe(401);
    });

    it("returns 400 for processing notebook", async () => {
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: validUUID, status: "processing", title: "Test" },
                error: null
            }),
        });

        const req = new Request(`http://test/api/notebooks/${validUUID}/audio`, { method: "POST" });
        const res = await POST(req, { params: Promise.resolve({ id: validUUID }) });
        expect(res.status).toBe(400);
    });

    it("returns audio buffer on success", async () => {
        const dummyBuffer = new Uint8Array([1, 2, 3]).buffer;
        mockedSpeech.mockResolvedValue(dummyBuffer);

        const req = new Request(`http://test/api/notebooks/${validUUID}/audio`, { method: "POST" });
        const res = await POST(req, { params: Promise.resolve({ id: validUUID }) });

        if (res.status !== 200) {
            console.error("[audio test] Response:", res.status, await res.json());
        }
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    });
});

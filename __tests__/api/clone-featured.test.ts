import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase } = vi.hoisted(() => {
    const mockSupabase = {
        auth: { getUser: vi.fn() },
        from: vi.fn(),
    };
    return { mockSupabase };
});

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/supabase/service", () => ({
    getServiceClient: vi.fn().mockReturnValue(mockSupabase),
}));

vi.mock("@/lib/rag", () => ({
    embedText: vi.fn().mockResolvedValue([0.1, 0.2]),
}));

import { POST } from "@/app/api/notebooks/clone-featured/route";

describe("POST /api/notebooks/clone-featured", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: "user-123" } },
        });

        // Mock sequential Supabase calls
        mockSupabase.from.mockReturnValue({
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: "new-nb-id" }, error: null }),
                }),
            }),
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            }),
        });
    });

    it("clones a notebook and includes source_hash in generations", async () => {
        const insertMock = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "some-id" }, error: null }),
            }),
        });

        // Specific mock for studio_generations insert
        mockSupabase.from.mockImplementation((table) => {
            if (table === "studio_generations") {
                return { insert: insertMock };
            }
            return {
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { id: "id" }, error: null }),
                    }),
                }),
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ error: null }),
                    }),
                }),
            };
        });

        const req = new Request("http://test/api/notebooks/clone-featured", {
            method: "POST",
            body: JSON.stringify({ slug: "wix" }),
        });

        const res = await POST(req);
        expect(res.status).toBe(201);

        // Verify studio_generations insert included source_hash
        const generationCalls = insertMock.mock.calls[0][0];
        expect(generationCalls[0]).toHaveProperty("source_hash");
        expect(generationCalls[0].source_hash).toMatch(/^[a-f0-9]{64}$/);
    });
});

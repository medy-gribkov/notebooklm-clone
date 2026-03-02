import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase, mockServiceFrom, mockServiceClient } =
  vi.hoisted(() => {
    const mockFrom = vi.fn();
    const mockServiceFrom = vi.fn();
    const mockRemove = vi.fn().mockResolvedValue({});
    const mockSupabase = {
      auth: { getUser: vi.fn() },
      from: mockFrom,
    };
    const mockServiceClient = {
      from: mockServiceFrom,
      storage: {
        from: vi.fn().mockReturnValue({
          remove: mockRemove,
        }),
      },
    };
    return { mockFrom, mockSupabase, mockServiceFrom, mockServiceClient, mockRemove };
  });

vi.mock("@/lib/auth", () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn().mockReturnValue(mockServiceClient),
}));

vi.mock("@/lib/validate", () => ({
  isValidUUID: vi.fn(),
}));

vi.mock("@/lib/notebook-status", () => ({
  updateNotebookStatus: vi.fn().mockResolvedValue(undefined),
}));

import { DELETE } from "@/app/api/notebooks/[id]/files/[fileId]/route";
import { authenticateRequest } from "@/lib/auth";
import { isValidUUID } from "@/lib/validate";
import { updateNotebookStatus } from "@/lib/notebook-status";

const mockedAuth = vi.mocked(authenticateRequest);
const mockedIsValidUUID = vi.mocked(isValidUUID);
const mockedUpdateStatus = vi.mocked(updateNotebookStatus);

describe("DELETE /api/notebooks/[id]/files/[fileId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue("skip");
    mockedIsValidUUID.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  const makeParams = (id = "nb-1", fileId = "file-1") =>
    ({ params: Promise.resolve({ id, fileId }) });

  it("returns 401 without auth", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("http://test/api/notebooks/nb-1/files/file-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when notebookId is invalid", async () => {
    mockedIsValidUUID.mockReturnValueOnce(false);
    const req = new Request("http://test/api/notebooks/bad/files/file-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("bad", "file-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid ID" });
  });

  it("returns 400 when fileId is invalid", async () => {
    // first call (notebookId) returns true, second (fileId) returns false
    mockedIsValidUUID.mockReturnValueOnce(true).mockReturnValueOnce(false);
    const req = new Request("http://test/api/notebooks/nb-1/files/bad", { method: "DELETE" });
    const res = await DELETE(req, makeParams("nb-1", "bad"));
    expect(res.status).toBe(400);
  });

  it("returns 401 when no user from getUser", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const req = new Request("http://test/api/notebooks/nb-1/files/file-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when file not found", async () => {
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      }),
    });
    const req = new Request("http://test/api/notebooks/nb-1/files/file-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "File not found" });
  });

  it("returns 200 and deletes file with storage path", async () => {
    let serviceCallCount = 0;
    mockServiceFrom.mockImplementation(() => {
      serviceCallCount++;
      if (serviceCallCount === 1) {
        // notebook_files select
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "file-1", storage_path: "user-123/doc.pdf" },
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (serviceCallCount === 2) {
        // chunks delete
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      // notebook_files delete
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/files/file-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(mockServiceClient.storage.from).toHaveBeenCalledWith("pdf-uploads");
  });

  it("returns 200 and skips storage remove when no storage_path", async () => {
    let serviceCallCount = 0;
    mockServiceFrom.mockImplementation(() => {
      serviceCallCount++;
      if (serviceCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "file-1", storage_path: null },
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (serviceCallCount === 2) {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    });

    // Reset storage mock call count
    mockServiceClient.storage.from.mockClear();

    const req = new Request("http://test/api/notebooks/nb-1/files/file-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams());
    expect(res.status).toBe(200);
    // storage.from should NOT have been called when storage_path is null
    expect(mockServiceClient.storage.from).not.toHaveBeenCalled();
  });

  it("calls updateNotebookStatus after deletion", async () => {
    let serviceCallCount = 0;
    mockServiceFrom.mockImplementation(() => {
      serviceCallCount++;
      if (serviceCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "file-1", storage_path: null },
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (serviceCallCount === 2) {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    });

    const req = new Request("http://test/api/notebooks/nb-1/files/file-1", { method: "DELETE" });
    await DELETE(req, makeParams());
    expect(mockedUpdateStatus).toHaveBeenCalledWith("nb-1");
  });
});

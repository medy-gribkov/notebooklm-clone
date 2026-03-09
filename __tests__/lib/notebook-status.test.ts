import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "notebook_files") {
        return { select: mockSelect };
      }
      return { update: mockUpdate };
    }),
  })),
}));

import { updateNotebookStatus } from "@/lib/notebook-status";

describe("updateNotebookStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
  });

  it("sets 'ready' when no files exist", async () => {
    mockEq.mockResolvedValue({ data: [] });
    await updateNotebookStatus("notebook-1");
    expect(mockUpdate).toHaveBeenCalledWith({ status: "ready", page_count: 0 });
  });

  it("sets 'ready' when all files are ready", async () => {
    mockEq.mockResolvedValue({
      data: [
        { status: "ready", page_count: 5 },
        { status: "ready", page_count: 10 },
      ],
    });
    await updateNotebookStatus("notebook-1");
    expect(mockUpdate).toHaveBeenCalledWith({ status: "ready", page_count: 15 });
  });

  it("sets 'processing' when any file is processing", async () => {
    mockEq.mockResolvedValue({
      data: [
        { status: "ready", page_count: 5 },
        { status: "processing", page_count: null },
      ],
    });
    await updateNotebookStatus("notebook-1");
    expect(mockUpdate).toHaveBeenCalledWith({ status: "processing", page_count: 5 });
  });

  it("sets 'error' when mix of ready and error (no processing)", async () => {
    mockEq.mockResolvedValue({
      data: [
        { status: "ready", page_count: 3 },
        { status: "error", page_count: null },
      ],
    });
    await updateNotebookStatus("notebook-1");
    expect(mockUpdate).toHaveBeenCalledWith({ status: "error", page_count: 3 });
  });

  it("sets 'ready' when data is null", async () => {
    mockEq.mockResolvedValue({ data: null });
    await updateNotebookStatus("notebook-1");
    expect(mockUpdate).toHaveBeenCalledWith({ status: "ready", page_count: 0 });
  });

  it("returns early when fetch files fails", async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: "DB connection lost" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await updateNotebookStatus("notebook-1");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to fetch files"),
      "DB connection lost"
    );
    expect(mockUpdate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("logs error when update for empty notebook fails", async () => {
    mockEq.mockResolvedValue({ data: [] });
    mockUpdateEq.mockResolvedValueOnce({ error: { message: "Update failed" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await updateNotebookStatus("notebook-1");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to update empty notebook"),
      "Update failed"
    );
    consoleSpy.mockRestore();
  });

  it("logs error when final status update fails", async () => {
    mockEq.mockResolvedValue({
      data: [{ status: "ready", page_count: 5 }],
    });
    mockUpdateEq.mockResolvedValueOnce({ error: { message: "Write conflict" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await updateNotebookStatus("notebook-1");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to update"),
      "Write conflict"
    );
    consoleSpy.mockRestore();
  });
});

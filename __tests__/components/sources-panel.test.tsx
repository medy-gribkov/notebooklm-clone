// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("@/components/pdf-viewer-modal", () => ({
  PdfViewerModal: ({ trigger }: { trigger: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "pdf-viewer-modal" }, trigger),
}));

vi.mock("@/lib/validate-file", () => ({
  validateUploadFile: vi.fn().mockReturnValue({ valid: true }),
}));

import { SourcesPanel } from "@/components/sources-panel";
import type { NotebookFile } from "@/types";

const readyFile: NotebookFile = {
  id: "f1",
  notebook_id: "nb-1",
  user_id: "u1",
  file_name: "report.pdf",
  storage_path: "u1/report.pdf",
  status: "ready",
  page_count: 10,
  created_at: "2025-01-01T00:00:00Z",
};

const processingFile: NotebookFile = {
  id: "f2",
  notebook_id: "nb-1",
  user_id: "u1",
  file_name: "data.docx",
  storage_path: "u1/data.docx",
  status: "processing",
  page_count: null,
  created_at: "2025-01-01T00:00:00Z",
};

const errorFile: NotebookFile = {
  id: "f3",
  notebook_id: "nb-1",
  user_id: "u1",
  file_name: "broken.pdf",
  storage_path: "u1/broken.pdf",
  status: "error",
  page_count: null,
  created_at: "2025-01-01T00:00:00Z",
};

function makeFiller(count: number): NotebookFile[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `fill-${i}`,
    notebook_id: "nb-1",
    user_id: "u1",
    file_name: `file${i}.pdf`,
    storage_path: `u1/file${i}.pdf`,
    status: "ready" as const,
    page_count: 1,
    created_at: "2025-01-01T00:00:00Z",
  }));
}

describe("SourcesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it("renders empty state when no files", () => {
    render(<SourcesPanel notebookId="nb-1" initialFiles={[]} />);
    expect(screen.getByText("noSources")).toBeInTheDocument();
  });

  it("renders file list with file names", () => {
    render(
      <SourcesPanel notebookId="nb-1" initialFiles={[readyFile, processingFile]} />
    );
    // File names rendered without extension
    expect(screen.getByText("report")).toBeInTheDocument();
    expect(screen.getByText("data")).toBeInTheDocument();
  });

  it("shows status badges for each file", () => {
    render(
      <SourcesPanel notebookId="nb-1" initialFiles={[readyFile, processingFile]} />
    );
    // Ready file shows page count via t("pages", { count: 10 })
    expect(screen.getByText("pages")).toBeInTheDocument();
    // Processing file shows t("processing")
    expect(screen.getByText("processing")).toBeInTheDocument();
  });

  it("shows error status for failed files", () => {
    render(<SourcesPanel notebookId="nb-1" initialFiles={[errorFile]} />);
    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("add button is visible", () => {
    render(<SourcesPanel notebookId="nb-1" initialFiles={[]} />);
    expect(screen.getByText("add")).toBeInTheDocument();
  });

  it("add button disabled when at max files (5)", () => {
    const fiveFiles = makeFiller(5);
    render(<SourcesPanel notebookId="nb-1" initialFiles={fiveFiles} />);
    const addButton = screen.getByText("add").closest("button")!;
    expect(addButton).toBeDisabled();
  });

  it("shows upload progress when uploading", () => {
    render(
      <SourcesPanel
        notebookId="nb-1"
        initialFiles={[readyFile]}
        isUploading={true}
        setIsUploading={vi.fn()}
      />
    );
    expect(screen.getByText("uploadInProgress")).toBeInTheDocument();
  });

  it("shows delete confirmation on delete click", () => {
    render(<SourcesPanel notebookId="nb-1" initialFiles={[readyFile]} />);
    const deleteButton = screen.getByLabelText("deleteFile");
    fireEvent.click(deleteButton);
    expect(screen.getByText("deleteConfirm")).toBeInTheDocument();
  });
});

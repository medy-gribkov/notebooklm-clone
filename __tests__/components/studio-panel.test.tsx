// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock all dynamic studio view components
vi.mock("@/components/studio/flashcards", () => ({
  FlashcardsView: () => <div data-testid="flashcards-view" />,
}));
vi.mock("@/components/studio/quiz", () => ({
  QuizView: () => <div data-testid="quiz-view" />,
}));
vi.mock("@/components/studio/report", () => ({
  ReportView: () => <div data-testid="report-view" />,
}));
vi.mock("@/components/studio/mindmap", () => ({
  MindMapView: () => <div data-testid="mindmap-view" />,
}));
vi.mock("@/components/studio/datatable", () => ({
  DataTableView: () => <div data-testid="datatable-view" />,
}));
vi.mock("@/components/studio/infographic", () => ({
  InfographicView: () => <div data-testid="infographic-view" />,
}));
vi.mock("@/components/studio/slidedeck", () => ({
  SlideDeckView: () => <div data-testid="slidedeck-view" />,
}));
vi.mock("@/components/studio/note-editor", () => ({
  NoteEditor: () => <div data-testid="note-editor" />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: React.PropsWithChildren<{ onClick?: () => void; [key: string]: unknown }>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

import { StudioPanel } from "@/components/studio-panel";

describe("StudioPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: empty history, empty notes
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it("renders 7 feature cards plus 1 disabled audio card", () => {
    render(<StudioPanel notebookId="nb-1" />);

    // 7 active features
    expect(screen.getByText("flashcards")).toBeInTheDocument();
    expect(screen.getByText("quiz")).toBeInTheDocument();
    expect(screen.getByText("report")).toBeInTheDocument();
    expect(screen.getByText("mindmap")).toBeInTheDocument();
    expect(screen.getByText("datatable")).toBeInTheDocument();
    expect(screen.getByText("infographic")).toBeInTheDocument();
    expect(screen.getByText("slidedeck")).toBeInTheDocument();

    // Audio disabled card
    expect(screen.getByText("audioOverview")).toBeInTheDocument();
    expect(screen.getByText("comingSoon")).toBeInTheDocument();
  });

  it("displays error message on generation failure", async () => {
    // First call: history load (empty). Second call: generation POST fails.
    let callCount = 0;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount <= 1) {
        // History load
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      // Generation fails
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "AI service unavailable" }),
      });
    });

    render(<StudioPanel notebookId="nb-1" />);

    const flashcardsBtn = screen.getByText("flashcards").closest("button")!;
    fireEvent.click(flashcardsBtn);

    await waitFor(() => {
      expect(screen.getByText("AI service unavailable")).toBeInTheDocument();
    });
  });

  it("shows history section when generations exist", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { id: "g1", action: "flashcards", result: [{ front: "Q", back: "A" }], created_at: new Date().toISOString() },
      ]),
    });

    render(<StudioPanel notebookId="nb-1" />);

    await waitFor(() => {
      expect(screen.getByText("history")).toBeInTheDocument();
      expect(screen.getByText("Flashcards")).toBeInTheDocument();
    });
  });

  it("notes section shows empty state initially", () => {
    render(<StudioPanel notebookId="nb-1" />);

    expect(screen.getByText("noNotes")).toBeInTheDocument();
    expect(screen.getByText("addNote")).toBeInTheDocument();
  });
});

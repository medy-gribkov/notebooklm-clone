// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { CitationBadge, CitationContext } from "@/components/citation-badge";
import type { Source } from "@/types";

const mockSources: Source[] = [
  { chunkId: "c1", content: "First source content that is deliberately made long enough to test truncation behavior in the tooltip display which should exceed one hundred characters easily", similarity: 0.8, fileName: "test.pdf" },
  { chunkId: "c2", content: "Second source", similarity: 0.6, fileName: "doc.pdf" },
];

describe("CitationBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children (citation number)", () => {
    render(<CitationBadge data-index="1">1</CitationBadge>);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows tooltip from source content", () => {
    render(
      <CitationContext.Provider value={mockSources}>
        <CitationBadge data-index="1">1</CitationBadge>
      </CitationContext.Provider>
    );
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("title")).toContain("First source content");
  });

  it("truncates long tooltip to 100 chars with ellipsis", () => {
    render(
      <CitationContext.Provider value={mockSources}>
        <CitationBadge data-index="1">1</CitationBadge>
      </CitationContext.Provider>
    );
    const btn = screen.getByRole("button");
    const title = btn.getAttribute("title") ?? "";
    expect(title.endsWith("...")).toBe(true);
    // 100 chars of content + "..."
    expect(title.length).toBeLessThanOrEqual(103);
  });

  it("clicks scrolls to source element", () => {
    const mockElement = { scrollIntoView: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } };
    vi.spyOn(document, "getElementById").mockReturnValue(mockElement as unknown as HTMLElement);

    render(
      <CitationContext.Provider value={mockSources}>
        <CitationBadge data-index="2">2</CitationBadge>
      </CitationContext.Provider>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(document.getElementById).toHaveBeenCalledWith("source-2");
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("handles missing source gracefully (no crash)", () => {
    render(
      <CitationContext.Provider value={[]}>
        <CitationBadge data-index="5">5</CitationBadge>
      </CitationContext.Provider>
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute("title")).toBeNull();
  });

  it("handles missing data-index gracefully", () => {
    render(
      <CitationContext.Provider value={mockSources}>
        <CitationBadge>?</CitationBadge>
      </CitationContext.Provider>
    );
    // data-index defaults to "0", so index 0 - 1 = -1, no source found
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});

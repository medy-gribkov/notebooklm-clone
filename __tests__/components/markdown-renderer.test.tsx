// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "./setup";

// Mock rehype-sanitize (returns content as-is in test env)
vi.mock("rehype-sanitize", () => ({ default: () => {} }));

// Mock remark-citations plugin (no-op)
vi.mock("@/lib/remark-citations", () => ({ default: () => {} }));

// Mock citation-badge
vi.mock("@/components/citation-badge", () => ({
  CitationContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
  CitationBadge: () => null,
}));

// Import after mocks
import MarkdownRenderer from "@/components/markdown-renderer";

describe("MarkdownRenderer", () => {
  it("renders plain text", () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders headings", () => {
    render(<MarkdownRenderer content="# Main Title" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Main Title");
  });

  it("renders bold text", () => {
    render(<MarkdownRenderer content="This is **bold** text" />);
    const strong = document.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong?.textContent).toBe("bold");
  });

  it("renders links", () => {
    render(<MarkdownRenderer content="[Click here](https://example.com)" />);
    const link = screen.getByRole("link", { name: "Click here" });
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("renders code blocks", () => {
    render(<MarkdownRenderer content={"```\nconsole.log('hi')\n```"} />);
    const code = document.querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code?.textContent).toContain("console.log");
  });

  it("renders inline code", () => {
    render(<MarkdownRenderer content="Use `npm install` to install" />);
    const code = document.querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code?.textContent).toBe("npm install");
  });

  it("handles empty content", () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container).toBeInTheDocument();
  });

  it("accepts optional sources prop", () => {
    const sources = [{ chunkId: "chunk-1", content: "Some content", similarity: 0.85, fileName: "doc.pdf" }];
    const { container } = render(<MarkdownRenderer content="Text" sources={sources} />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Override the next/dynamic mock from setup to actually load the component
vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = () => null;
    Stub.displayName = "DynamicStub";
    return Stub;
  },
}));

import MarkdownRenderer from "@/components/markdown-renderer";

describe("Security: XSS via Markdown Renderer", () => {
  it("strips script tags from markdown", () => {
    const { container } = render(
      <MarkdownRenderer content={'<script>alert("xss")</script>'} />
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("alert");
  });

  it("strips onerror attributes from img tags", () => {
    const { container } = render(
      <MarkdownRenderer content='<img onerror="alert(1)" src="x">' />
    );
    const img = container.querySelector("img");
    if (img) {
      expect(img.hasAttribute("onerror")).toBe(false);
    }
  });

  it("strips iframe tags", () => {
    const { container } = render(
      <MarkdownRenderer content='<iframe src="https://evil.com"></iframe>' />
    );
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("strips onclick event handlers", () => {
    const { container } = render(
      <MarkdownRenderer content='<div onclick="alert(1)">click me</div>' />
    );
    // The outer div from render always exists; check no element has onclick
    const allElements = container.querySelectorAll("*");
    allElements.forEach((el) => {
      expect(el.hasAttribute("onclick")).toBe(false);
    });
  });

  it("preserves safe markdown elements", () => {
    const content = `# Hello

- item one
- item two

**bold text**`;
    const { container } = render(
      <MarkdownRenderer content={content} />
    );
    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelector("strong")).not.toBeNull();
    // Lists should render (ul > li)
    expect(container.querySelectorAll("li").length).toBeGreaterThanOrEqual(1);
  });

  it("renders code blocks safely", () => {
    const { container } = render(
      <MarkdownRenderer content={'```js\nconsole.log("hello")\n```'} />
    );
    expect(container.querySelector("code")).not.toBeNull();
  });

  it("strips javascript: URLs in links", () => {
    const { container } = render(
      <MarkdownRenderer content='[click](javascript:alert(1))' />
    );
    const links = container.querySelectorAll("a");
    links.forEach((a) => {
      const href = a.getAttribute("href") ?? "";
      expect(href).not.toContain("javascript:");
    });
  });
});

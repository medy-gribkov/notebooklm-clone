import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkCitations from "@/lib/remark-citations";
import type { Root, Parent } from "mdast";

function parseWithCitations(markdown: string): Root {
  const processor = unified().use(remarkParse).use(remarkCitations);
  return processor.runSync(processor.parse(markdown)) as Root;
}

function findCiteNodes(node: Parent): Array<{ type: string; data: { hProperties: Record<string, string> } }> {
  const cites: Array<{ type: string; data: { hProperties: Record<string, string> } }> = [];
  for (const child of node.children) {
    if ((child.type as string) === "cite") {
      cites.push(child as never);
    }
    if ("children" in child) {
      cites.push(...findCiteNodes(child as Parent));
    }
  }
  return cites;
}

describe("remarkCitations", () => {
  it("transforms [1] into a cite node", () => {
    const tree = parseWithCitations("See source [1] here.");
    const cites = findCiteNodes(tree);
    expect(cites).toHaveLength(1);
    expect(cites[0].type).toBe("cite");
    expect(cites[0].data.hProperties["data-index"]).toBe("1");
  });

  it("transforms multiple citations [1][2]", () => {
    const tree = parseWithCitations("Data from [1] and [2].");
    const cites = findCiteNodes(tree);
    expect(cites).toHaveLength(2);
    expect(cites[0].data.hProperties["data-index"]).toBe("1");
    expect(cites[1].data.hProperties["data-index"]).toBe("2");
  });

  it("handles 3-digit citation [123]", () => {
    const tree = parseWithCitations("Reference [123].");
    const cites = findCiteNodes(tree);
    expect(cites).toHaveLength(1);
    expect(cites[0].data.hProperties["data-index"]).toBe("123");
  });

  it("does NOT transform markdown links [text](url)", () => {
    const tree = parseWithCitations("Click [here](https://example.com) for info.");
    const cites = findCiteNodes(tree);
    expect(cites).toHaveLength(0);
  });

  it("does NOT transform image syntax ![alt](src)", () => {
    const tree = parseWithCitations("See ![image](photo.png) below.");
    const cites = findCiteNodes(tree);
    expect(cites).toHaveLength(0);
  });

  it("passes through text with no citations unchanged", () => {
    const tree = parseWithCitations("No citations here.");
    const cites = findCiteNodes(tree);
    expect(cites).toHaveLength(0);
    // Paragraph should still exist with text
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe("paragraph");
  });

  it("handles citation mid-sentence", () => {
    const tree = parseWithCitations("According to [1] the data shows growth.");
    const cites = findCiteNodes(tree);
    expect(cites).toHaveLength(1);
    expect(cites[0].data.hProperties["data-index"]).toBe("1");
  });

  it("handles adjacent citations [1][2][3]", () => {
    const tree = parseWithCitations("Sources [1][2][3].");
    const cites = findCiteNodes(tree);
    expect(cites).toHaveLength(3);
  });

  it("handles citation at end of string with no trailing text", () => {
    const tree = parseWithCitations("Sources [1]");
    const cites = findCiteNodes(tree);
    expect(cites).toHaveLength(1);
    expect(cites[0].data.hProperties["data-index"]).toBe("1");
    // Last child should be the cite, no trailing text node
    const paragraph = tree.children[0] as Parent;
    const lastChild = paragraph.children[paragraph.children.length - 1];
    expect((lastChild.type as string)).toBe("cite");
  });

  it("preserves surrounding text nodes", () => {
    const tree = parseWithCitations("Before [1] after.");
    const paragraph = tree.children[0] as Parent;
    // Should have: "Before " + cite + " after."
    expect(paragraph.children.length).toBeGreaterThanOrEqual(3);
    expect(paragraph.children[0].type).toBe("text");
    expect(paragraph.children[1].type).toBe("cite");
    expect(paragraph.children[2].type).toBe("text");
  });
});

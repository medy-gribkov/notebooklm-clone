import { describe, it, expect } from "vitest";
import { getFeaturedContent } from "@/lib/featured-content";
import { featuredNotebooks } from "@/lib/featured-notebooks";

describe("getFeaturedContent", () => {
  it("returns content for 'getting-started' slug", () => {
    const content = getFeaturedContent("getting-started");
    expect(content).not.toBeNull();
    expect(content!.content).toBeTruthy();
    expect(content!.quiz).toBeInstanceOf(Array);
    expect(content!.flashcards).toBeInstanceOf(Array);
    expect(content!.report).toBeInstanceOf(Array);
    expect(content!.mindmap).toHaveProperty("label");
  });

  it("returns null for unknown slug", () => {
    expect(getFeaturedContent("nonexistent")).toBeNull();
  });

  it("has content for all featured notebook slugs", () => {
    for (const nb of featuredNotebooks) {
      const content = getFeaturedContent(nb.slug);
      expect(content, `Missing content for slug: ${nb.slug}`).not.toBeNull();
    }
  });

  it("all quiz questions have 4 options and valid correctIndex", () => {
    for (const nb of featuredNotebooks) {
      const content = getFeaturedContent(nb.slug);
      if (!content) continue;
      for (const q of content.quiz) {
        expect(q.options).toHaveLength(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
        expect(q.question).toBeTruthy();
        expect(q.explanation).toBeTruthy();
      }
    }
  });

  it("all flashcards have front and back", () => {
    for (const nb of featuredNotebooks) {
      const content = getFeaturedContent(nb.slug);
      if (!content) continue;
      for (const fc of content.flashcards) {
        expect(fc.front).toBeTruthy();
        expect(fc.back).toBeTruthy();
      }
    }
  });

  it("all reports have heading and content", () => {
    for (const nb of featuredNotebooks) {
      const content = getFeaturedContent(nb.slug);
      if (!content) continue;
      for (const section of content.report) {
        expect(section.heading).toBeTruthy();
        expect(section.content).toBeTruthy();
      }
    }
  });
});

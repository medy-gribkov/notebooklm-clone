import { describe, it, expect } from "vitest";
import { getFeaturedContent } from "@/lib/featured-content";
import { featuredNotebooks } from "@/lib/featured-notebooks";

// Only 8 companies have hardcoded content; the rest use on-demand generation.
const HARDCODED_SLUGS = ["wix", "monday-com", "jfrog", "gong", "check-point", "tabnine", "snyk", "appsflyer"];

describe("getFeaturedContent", () => {
  it("returns content for 'wix' slug", () => {
    const content = getFeaturedContent("wix");
    expect(content).not.toBeNull();
    expect(content!.files).toBeInstanceOf(Array);
    expect(content!.files.length).toBeGreaterThanOrEqual(1);
    expect(content!.description).toBeTruthy();
    expect(content!.quiz).toBeInstanceOf(Array);
    expect(content!.flashcards).toBeInstanceOf(Array);
    expect(content!.report).toBeInstanceOf(Array);
    expect(content!.mindmap).toHaveProperty("label");
  });

  it("returns null for unknown slug", () => {
    expect(getFeaturedContent("nonexistent")).toBeNull();
  });

  it("has content for all hardcoded company slugs", () => {
    for (const slug of HARDCODED_SLUGS) {
      const content = getFeaturedContent(slug);
      expect(content, `Missing content for slug: ${slug}`).not.toBeNull();
    }
  });

  it("returns null for companies without hardcoded content", () => {
    const nonHardcoded = featuredNotebooks.filter((nb) => !HARDCODED_SLUGS.includes(nb.slug));
    expect(nonHardcoded.length).toBeGreaterThan(0);
    for (const nb of nonHardcoded) {
      const content = getFeaturedContent(nb.slug);
      expect(content, `${nb.slug} should not have hardcoded content`).toBeNull();
    }
  });

  it("all hardcoded notebooks have files with fileName and content", () => {
    for (const slug of HARDCODED_SLUGS) {
      const content = getFeaturedContent(slug);
      if (!content) continue;
      expect(content.files.length, `${slug} should have 1+ files`).toBeGreaterThanOrEqual(1);
      for (const file of content.files) {
        expect(file.fileName, `${slug} file missing fileName`).toBeTruthy();
        expect(file.content, `${slug} file "${file.fileName}" missing content`).toBeTruthy();
        expect(file.content.length, `${slug} file "${file.fileName}" content too short`).toBeGreaterThan(200);
      }
    }
  });

  it("all hardcoded notebooks have a description", () => {
    for (const slug of HARDCODED_SLUGS) {
      const content = getFeaturedContent(slug);
      if (!content) continue;
      expect(content.description, `${slug} missing description`).toBeTruthy();
      expect(content.description.length).toBeGreaterThan(20);
      expect(content.description.length).toBeLessThan(200);
    }
  });

  it("all quiz questions have 4 options and valid correctIndex", () => {
    for (const slug of HARDCODED_SLUGS) {
      const content = getFeaturedContent(slug);
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
    for (const slug of HARDCODED_SLUGS) {
      const content = getFeaturedContent(slug);
      if (!content) continue;
      for (const fc of content.flashcards) {
        expect(fc.front).toBeTruthy();
        expect(fc.back).toBeTruthy();
      }
    }
  });

  it("all reports have heading and content", () => {
    for (const slug of HARDCODED_SLUGS) {
      const content = getFeaturedContent(slug);
      if (!content) continue;
      for (const section of content.report) {
        expect(section.heading).toBeTruthy();
        expect(section.content).toBeTruthy();
      }
    }
  });
});

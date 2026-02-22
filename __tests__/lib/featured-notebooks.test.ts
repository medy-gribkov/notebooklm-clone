import { describe, it, expect } from "vitest";
import { featuredNotebooks, getFeaturedBySlug } from "@/lib/featured-notebooks";

const VALID_PATTERNS = [
  "circles", "grid", "waves", "dots", "hexagons", "triangles", "lines", "diamond",
];

describe("featuredNotebooks", () => {
  it("contains 8 notebooks", () => {
    expect(featuredNotebooks).toHaveLength(8);
  });

  it("has no duplicate slugs", () => {
    const slugs = featuredNotebooks.map((n) => n.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("all entries have required fields", () => {
    for (const nb of featuredNotebooks) {
      expect(nb.slug).toBeTruthy();
      expect(nb.titleKey).toBeTruthy();
      expect(nb.descriptionKey).toBeTruthy();
      expect(nb.bgClass).toBeTruthy();
      expect(nb.icon).toBeTruthy();
      expect(nb.author).toBeTruthy();
      expect(nb.date).toBeTruthy();
      expect(nb.sourceCount).toBeGreaterThan(0);
    }
  });

  it("all patterns are valid", () => {
    for (const nb of featuredNotebooks) {
      expect(VALID_PATTERNS).toContain(nb.pattern);
    }
  });
});

describe("getFeaturedBySlug", () => {
  it("finds a known slug", () => {
    const nb = getFeaturedBySlug("getting-started");
    expect(nb).toBeDefined();
    expect(nb!.slug).toBe("getting-started");
  });

  it("returns undefined for unknown slug", () => {
    expect(getFeaturedBySlug("nonexistent")).toBeUndefined();
  });
});

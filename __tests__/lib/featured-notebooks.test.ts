import { describe, it, expect } from "vitest";
import { featuredNotebooks, getFeaturedBySlug, CATEGORIES } from "@/lib/featured-notebooks";

const VALID_PATTERNS = [
  "circles", "grid", "waves", "dots", "hexagons", "triangles", "lines", "diamond",
];

describe("featuredNotebooks", () => {
  it("contains 54 notebooks (50 companies + 4 education)", () => {
    expect(featuredNotebooks).toHaveLength(54);
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
      expect(nb.category).toBeTruthy();
    }
  });

  it("all entries have sourceCount of 1", () => {
    for (const nb of featuredNotebooks) {
      expect(nb.sourceCount).toBe(1);
    }
  });

  it("all patterns are valid", () => {
    for (const nb of featuredNotebooks) {
      expect(VALID_PATTERNS).toContain(nb.pattern);
    }
  });

  it("all categories are from the CATEGORIES list", () => {
    const validCats = CATEGORIES.filter((c) => c !== "All");
    for (const nb of featuredNotebooks) {
      expect(validCats).toContain(nb.category);
    }
  });

  it("all company entries have a website domain", () => {
    for (const nb of featuredNotebooks) {
      if (nb.category === "Education") continue;
      expect(nb.website, `${nb.slug} missing website`).toBeTruthy();
    }
  });
});

describe("getFeaturedBySlug", () => {
  it("finds a known slug", () => {
    const nb = getFeaturedBySlug("wix");
    expect(nb).toBeDefined();
    expect(nb!.slug).toBe("wix");
  });

  it("returns undefined for unknown slug", () => {
    expect(getFeaturedBySlug("nonexistent")).toBeUndefined();
  });
});

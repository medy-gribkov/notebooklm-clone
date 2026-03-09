import { describe, it, expect } from "vitest";
import {
  flashcardSchema,
  quizSchema,
  reportSchema,
  mindmapSchema,
  datatableSchema,
  infographicSchema,
  slidedeckSchema,
  studioParsers,
  type StudioAction,
} from "@/lib/langchain/output-parsers";

describe("output-parsers", () => {
  describe("flashcardSchema", () => {
    it("accepts valid flashcards", () => {
      const input = [{ front: "What is AI?", back: "Artificial Intelligence" }];
      expect(flashcardSchema.parse(input)).toEqual(input);
    });

    it("rejects missing fields", () => {
      expect(() => flashcardSchema.parse([{ front: "Q" }])).toThrow();
    });
  });

  describe("quizSchema", () => {
    it("accepts valid quiz questions", () => {
      const input = [
        {
          question: "What is 2+2?",
          options: ["1", "2", "3", "4"],
          correctIndex: 3,
          explanation: "Basic math",
        },
      ];
      expect(quizSchema.parse(input)).toEqual(input);
    });

    it("rejects options with wrong length", () => {
      const input = [
        {
          question: "Q",
          options: ["a", "b"],
          correctIndex: 0,
          explanation: "E",
        },
      ];
      expect(() => quizSchema.parse(input)).toThrow();
    });

    it("rejects correctIndex out of range", () => {
      const input = [
        {
          question: "Q",
          options: ["a", "b", "c", "d"],
          correctIndex: 5,
          explanation: "E",
        },
      ];
      expect(() => quizSchema.parse(input)).toThrow();
    });

    it("rejects negative correctIndex", () => {
      const input = [
        {
          question: "Q",
          options: ["a", "b", "c", "d"],
          correctIndex: -1,
          explanation: "E",
        },
      ];
      expect(() => quizSchema.parse(input)).toThrow();
    });
  });

  describe("reportSchema", () => {
    it("accepts valid report sections", () => {
      const input = [{ heading: "Intro", content: "Some text" }];
      expect(reportSchema.parse(input)).toEqual(input);
    });

    it("rejects missing content", () => {
      expect(() => reportSchema.parse([{ heading: "H" }])).toThrow();
    });
  });

  describe("mindmapSchema", () => {
    it("accepts valid mindmap with children", () => {
      const input = {
        label: "Root",
        children: [
          {
            label: "Branch 1",
            children: [{ label: "Leaf 1" }],
          },
          { label: "Branch 2" },
        ],
      };
      expect(mindmapSchema.parse(input)).toEqual(input);
    });

    it("accepts mindmap with no grandchildren", () => {
      const input = {
        label: "Root",
        children: [{ label: "Branch" }],
      };
      expect(mindmapSchema.parse(input)).toEqual(input);
    });

    it("rejects missing label", () => {
      expect(() => mindmapSchema.parse({ children: [] })).toThrow();
    });
  });

  describe("datatableSchema", () => {
    it("accepts valid datatable", () => {
      const input = {
        columns: ["Name", "Age"],
        rows: [["Alice", "30"], ["Bob", "25"]],
      };
      expect(datatableSchema.parse(input)).toEqual(input);
    });

    it("rejects missing columns", () => {
      expect(() => datatableSchema.parse({ rows: [] })).toThrow();
    });
  });

  describe("infographicSchema", () => {
    it("accepts valid infographic sections", () => {
      const input = [{ heading: "Stats", content: "80% of users..." }];
      expect(infographicSchema.parse(input)).toEqual(input);
    });

    it("rejects non-array input", () => {
      expect(() => infographicSchema.parse({ heading: "H" })).toThrow();
    });
  });

  describe("slidedeckSchema", () => {
    it("accepts valid slides", () => {
      const input = [{ heading: "Title Slide", content: "Welcome" }];
      expect(slidedeckSchema.parse(input)).toEqual(input);
    });

    it("rejects items missing heading", () => {
      expect(() => slidedeckSchema.parse([{ content: "text" }])).toThrow();
    });
  });

  describe("studioParsers", () => {
    it("has exactly 7 actions", () => {
      expect(Object.keys(studioParsers)).toHaveLength(7);
    });

    it("has all expected keys", () => {
      const expected: StudioAction[] = [
        "flashcards",
        "quiz",
        "report",
        "mindmap",
        "datatable",
        "infographic",
        "slidedeck",
      ];
      for (const key of expected) {
        expect(studioParsers).toHaveProperty(key);
      }
    });

    it("each parser has getFormatInstructions method", () => {
      for (const key of Object.keys(studioParsers) as StudioAction[]) {
        expect(typeof studioParsers[key].getFormatInstructions).toBe("function");
      }
    });
  });
});

/**
 * Zod schemas and StructuredOutputParsers for the 7 Studio actions
 * (flashcards, quiz, report, mindmap, datatable, infographic, slidedeck).
 */
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

export const flashcardSchema = z.array(
  z.object({
    front: z.string().describe("Question or term"),
    back: z.string().describe("Answer or definition"),
  }),
);

export const quizSchema = z.array(
  z.object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    correctIndex: z.number().min(0).max(3),
    explanation: z.string(),
  }),
);

export const reportSchema = z.array(
  z.object({
    heading: z.string(),
    content: z.string(),
  }),
);

export const mindmapSchema = z.object({
  label: z.string(),
  children: z.array(
    z.object({
      label: z.string(),
      children: z
        .array(z.object({ label: z.string() }))
        .optional(),
    }),
  ),
});

export const datatableSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

export const infographicSchema = z.array(
  z.object({
    heading: z.string(),
    content: z.string(),
  }),
);

export const slidedeckSchema = z.array(
  z.object({
    heading: z.string(),
    content: z.string(),
  }),
);

export const studioParsers = {
  flashcards: StructuredOutputParser.fromZodSchema(flashcardSchema),
  quiz: StructuredOutputParser.fromZodSchema(quizSchema),
  report: StructuredOutputParser.fromZodSchema(reportSchema),
  mindmap: StructuredOutputParser.fromZodSchema(mindmapSchema),
  datatable: StructuredOutputParser.fromZodSchema(datatableSchema),
  infographic: StructuredOutputParser.fromZodSchema(infographicSchema),
  slidedeck: StructuredOutputParser.fromZodSchema(slidedeckSchema),
} as const;

export type StudioAction = keyof typeof studioParsers;

import { describe, it, expect } from "vitest";
import {
  formatChatAsMarkdown,
  formatNotesAsMarkdown,
  formatStudioAsMarkdown,
  buildNotebookExport,
  buildNotebookJSON,
} from "@/lib/export";
import type { Message, Note, StudioGeneration, Notebook } from "@/types";

const baseNotebook: Notebook = {
  id: "nb-1",
  title: "Test Notebook",
  description: "A test",
  status: "ready",
  user_id: "u-1",
  created_at: "2026-01-01T00:00:00Z",
  page_count: 5,
  file_url: null,
};

const sampleMessage: Message = {
  id: "m-1",
  notebook_id: "nb-1",
  user_id: "u-1",
  role: "user",
  content: "Hello",
  created_at: "2026-01-01T12:00:00Z",
  sources: null,
};

const sampleNote: Note = {
  id: "n-1",
  notebook_id: "nb-1",
  title: "My Note",
  content: "Note body",
  created_at: "2026-01-01T12:00:00Z",
  updated_at: "2026-01-01T12:00:00Z",
};

const sampleGeneration: StudioGeneration = {
  id: "g-1",
  notebook_id: "nb-1",
  user_id: "u-1",
  action: "quiz",
  result: [{ question: "Q1", answer: "A1" }],
  created_at: "2026-01-01T12:00:00Z",
};

describe("formatChatAsMarkdown", () => {
  it("returns empty string for empty array", () => {
    expect(formatChatAsMarkdown([])).toBe("");
  });

  it("formats user message with 'You' role", () => {
    const md = formatChatAsMarkdown([sampleMessage]);
    expect(md).toContain("### You");
    expect(md).toContain("Hello");
  });

  it("formats assistant message with 'DocChat' role", () => {
    const msg = { ...sampleMessage, role: "assistant" as const, content: "Hi there" };
    const md = formatChatAsMarkdown([msg]);
    expect(md).toContain("### DocChat");
    expect(md).toContain("Hi there");
  });

  it("separates multiple messages with ---", () => {
    const msgs = [sampleMessage, { ...sampleMessage, id: "m-2", role: "assistant" as const, content: "Reply" }];
    const md = formatChatAsMarkdown(msgs);
    expect(md).toContain("---");
  });
});

describe("formatNotesAsMarkdown", () => {
  it("returns empty string for empty array", () => {
    expect(formatNotesAsMarkdown([])).toBe("");
  });

  it("formats note with title as h2", () => {
    const md = formatNotesAsMarkdown([sampleNote]);
    expect(md).toContain("## My Note");
    expect(md).toContain("Note body");
  });
});

describe("formatStudioAsMarkdown", () => {
  it("returns empty string for empty array", () => {
    expect(formatStudioAsMarkdown([])).toBe("");
  });

  it("capitalizes action name", () => {
    const md = formatStudioAsMarkdown([sampleGeneration]);
    expect(md).toContain("## Quiz");
  });

  it("JSON-stringifies the result", () => {
    const md = formatStudioAsMarkdown([sampleGeneration]);
    expect(md).toContain('"question"');
  });
});

describe("buildNotebookExport", () => {
  it("includes notebook title as h1", () => {
    const md = buildNotebookExport(baseNotebook, [], [], []);
    expect(md).toContain("# Test Notebook");
  });

  it("omits chat section when no messages", () => {
    const md = buildNotebookExport(baseNotebook, [], [sampleNote], []);
    expect(md).not.toContain("# Chat History");
  });

  it("includes all sections when data present", () => {
    const md = buildNotebookExport(baseNotebook, [sampleMessage], [sampleNote], [sampleGeneration]);
    expect(md).toContain("# Chat History");
    expect(md).toContain("# Notes");
    expect(md).toContain("# Studio Outputs");
  });
});

describe("buildNotebookJSON", () => {
  it("returns correct structure", () => {
    const json = buildNotebookJSON(baseNotebook, [sampleMessage], [sampleNote], [sampleGeneration]) as Record<string, unknown>;
    expect(json).toHaveProperty("notebook");
    expect(json).toHaveProperty("messages");
    expect(json).toHaveProperty("notes");
    expect(json).toHaveProperty("studio_outputs");
    expect(json).toHaveProperty("exported_at");
  });

  it("maps notebook fields correctly", () => {
    const json = buildNotebookJSON(baseNotebook, [], [], []) as { notebook: Record<string, unknown> };
    expect(json.notebook.id).toBe("nb-1");
    expect(json.notebook.title).toBe("Test Notebook");
    expect(json.notebook.description).toBe("A test");
  });

  it("maps message fields without id", () => {
    const json = buildNotebookJSON(baseNotebook, [sampleMessage], [], []) as { messages: Record<string, unknown>[] };
    expect(json.messages[0]).not.toHaveProperty("id");
    expect(json.messages[0].role).toBe("user");
    expect(json.messages[0].content).toBe("Hello");
  });
});

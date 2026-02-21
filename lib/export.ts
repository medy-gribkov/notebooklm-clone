import type { Message, Note, StudioGeneration, Notebook } from "@/types";

export function formatChatAsMarkdown(messages: Message[]): string {
  return messages
    .map((m) => {
      const role = m.role === "user" ? "You" : "DocChat";
      const time = new Date(m.created_at).toLocaleString();
      return `### ${role} (${time})\n\n${m.content}\n`;
    })
    .join("\n---\n\n");
}

export function formatNotesAsMarkdown(notes: Note[]): string {
  return notes
    .map((n) => `## ${n.title}\n\n${n.content}\n`)
    .join("\n---\n\n");
}

export function formatStudioAsMarkdown(
  generations: StudioGeneration[]
): string {
  return generations
    .map((g) => {
      const label = g.action.charAt(0).toUpperCase() + g.action.slice(1);
      return `## ${label}\n\n${JSON.stringify(g.result, null, 2)}\n`;
    })
    .join("\n---\n\n");
}

export function buildNotebookExport(
  notebook: Notebook,
  messages: Message[],
  notes: Note[],
  generations: StudioGeneration[]
): string {
  let md = `# ${notebook.title}\n\n`;
  md += `Exported from DocChat on ${new Date().toISOString().split("T")[0]}\n\n`;

  if (messages.length > 0) {
    md += `---\n\n# Chat History\n\n${formatChatAsMarkdown(messages)}\n`;
  }
  if (notes.length > 0) {
    md += `---\n\n# Notes\n\n${formatNotesAsMarkdown(notes)}\n`;
  }
  if (generations.length > 0) {
    md += `---\n\n# Studio Outputs\n\n${formatStudioAsMarkdown(generations)}\n`;
  }
  return md;
}

export function buildNotebookJSON(
  notebook: Notebook,
  messages: Message[],
  notes: Note[],
  generations: StudioGeneration[]
): object {
  return {
    notebook: {
      id: notebook.id,
      title: notebook.title,
      description: notebook.description,
      created_at: notebook.created_at,
    },
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      sources: m.sources,
      created_at: m.created_at,
    })),
    notes: notes.map((n) => ({
      title: n.title,
      content: n.content,
      created_at: n.created_at,
    })),
    studio_outputs: generations.map((g) => ({
      action: g.action,
      result: g.result,
      created_at: g.created_at,
    })),
    exported_at: new Date().toISOString(),
  };
}

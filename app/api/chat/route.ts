import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { retrieveChunks } from "@/lib/rag";
import { llm } from "@/lib/gemini";
import { streamText, StreamData } from "ai";
import { NextResponse } from "next/server";
import type { Source } from "@/types";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a research assistant for the user's uploaded documents.
Answer ONLY using the provided context. Never use external knowledge.
If the answer is not in the documents, respond: "I couldn't find that in your document."
Keep answers concise and factual. Cite relevant parts from the context when helpful.`;

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { messages, notebookId } = body as {
    messages: Array<{ role: string; content: string }>;
    notebookId: string;
  };

  if (!notebookId) {
    return NextResponse.json({ error: "notebookId required" }, { status: 400 });
  }

  // Verify notebook ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id, status")
    .eq("id", notebookId)
    .eq("user_id", user.id)
    .single();

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  if (notebook.status !== "ready") {
    return NextResponse.json(
      { error: "Notebook is still processing" },
      { status: 400 }
    );
  }

  const userMessage = messages[messages.length - 1]?.content ?? "";

  // Retrieve relevant chunks
  let sources: Source[] = [];
  try {
    sources = await retrieveChunks(userMessage, notebookId, user.id);
  } catch {
    // Non-fatal: proceed without sources
  }

  const context = sources
    .map((s, i) => `[Source ${i + 1}]\n${s.content}`)
    .join("\n\n---\n\n");

  const systemWithContext = `${SYSTEM_PROMPT}\n\n<context>\n${context}\n</context>`;

  // Save user message
  const serviceClient = getServiceClient();
  await serviceClient.from("messages").insert({
    notebook_id: notebookId,
    user_id: user.id,
    role: "user",
    content: userMessage,
  });

  const data = new StreamData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data.append({ sources } as any);

  const result = streamText({
    model: llm,
    system: systemWithContext,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    onFinish: async ({ text }) => {
      await serviceClient.from("messages").insert({
        notebook_id: notebookId,
        user_id: user.id,
        role: "assistant",
        content: text,
        sources: sources.length > 0 ? sources : null,
      });
      data.close();
    },
  });

  return result.toDataStreamResponse({ data });
}

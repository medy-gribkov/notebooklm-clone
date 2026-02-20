import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllChunks } from "@/lib/rag";
import { getLLM } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";
import { streamText } from "ai";
import { NextResponse } from "next/server";

export const maxDuration = 120;

const VALID_ACTIONS = ["flashcards", "quiz", "report", "mindmap", "datatable"] as const;
type StudioAction = (typeof VALID_ACTIONS)[number];

const PROMPTS: Record<StudioAction, string> = {
  flashcards: `You are a study aid generator. From the document below, create 10-15 flashcards covering the most important concepts, definitions, and facts. Return ONLY a valid JSON array with no additional text: [{"front":"question or term","back":"answer or definition"}]`,

  quiz: `You are a quiz generator. From the document below, create a 10-question multiple choice quiz. Each question should test understanding, not just recall. Return ONLY valid JSON with no additional text: [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]`,

  report: `You are a document analyst. Write a structured summary report of the document below. Return ONLY valid JSON with no additional text: [{"heading":"Executive Summary","content":"..."},{"heading":"Key Findings","content":"..."},{"heading":"Detailed Analysis","content":"..."},{"heading":"Conclusions","content":"..."}]. Each content field should be 2-4 paragraphs.`,

  mindmap: `You are a knowledge organizer. Extract the hierarchical topic structure from the document below. Return ONLY valid JSON with no additional text: {"label":"Main Topic","children":[{"label":"Subtopic 1","children":[{"label":"Detail A"},{"label":"Detail B"}]},{"label":"Subtopic 2","children":[]}]}. Maximum 3 levels deep, 4-8 top-level children.`,

  datatable: `You are a data extractor. Extract all quantitative data, statistics, figures, dates, and key facts from the document below into a structured table. Return ONLY valid JSON with no additional text: {"columns":["Category","Value","Context"],"rows":[["GDP Growth","3.2%","Q4 2024"]]}. Include at least 5 rows if the document contains enough data.`,
};

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(`studio:${user.id}`, 5, 3_600_000)) {
    return NextResponse.json(
      { error: "Studio rate limit reached. Max 5 generations per hour." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const body = await request.json();
  const { notebookId, action } = body as {
    notebookId: string;
    action: string;
  };

  if (!notebookId || !isValidUUID(notebookId)) {
    return NextResponse.json({ error: "Invalid notebookId" }, { status: 400 });
  }

  if (!VALID_ACTIONS.includes(action as StudioAction)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const validAction = action as StudioAction;

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

  let documentText: string;
  try {
    documentText = await getAllChunks(notebookId, user.id);
  } catch (e) {
    console.error("[studio] Failed to retrieve chunks:", e);
    return NextResponse.json(
      { error: "Failed to retrieve document content" },
      { status: 500 }
    );
  }

  if (!documentText.trim()) {
    return NextResponse.json(
      { error: "No document content found" },
      { status: 400 }
    );
  }

  const systemPrompt = `${PROMPTS[validAction]}\n\n===BEGIN DOCUMENT===\n${documentText}\n===END DOCUMENT===`;

  try {
    const result = streamText({
      model: getLLM(),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate ${validAction} from the document above. Return only valid JSON.`,
        },
      ],
      onError: ({ error }) => {
        console.error("[studio] Stream error:", error);
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[studio] Generation failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

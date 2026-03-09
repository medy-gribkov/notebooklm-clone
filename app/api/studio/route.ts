import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllChunks } from "@/lib/processing/get-all-chunks";
import { getLLM } from "@/lib/llm";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";
import { studioParsers, type StudioAction } from "@/lib/langchain/output-parsers";
import { streamText } from "ai";
import { getNotebookHash } from "@/lib/hash";
import { NextResponse } from "next/server";

export const maxDuration = 120;

const VALID_ACTIONS = ["flashcards", "quiz", "report", "mindmap", "datatable", "infographic", "slidedeck"] as const;

const PROMPTS: Record<StudioAction, string> = {
  flashcards: `You are a document analysis assistant. From the document below, create 10-15 flashcards covering the most important facts, concepts, and details. Return ONLY a valid JSON array with no additional text: [{"front":"question or term","back":"answer or definition"}]`,

  quiz: `You are a document analysis assistant. From the document below, create a 10-question multiple choice quiz testing knowledge of the key topics, facts, and concepts. Return ONLY valid JSON with no additional text: [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]`,

  report: `You are a document analyst. Write a structured analysis report of the document below. Identify the main topics and organize them into clear sections. Return ONLY valid JSON with no additional text: [{"heading":"Section Title","content":"..."}]. Each content field should be 2-4 paragraphs.`,

  mindmap: `You are a document analyst. Extract the hierarchical structure of topics, subtopics, and key points from the document below into a mind map. Return ONLY valid JSON with no additional text: {"label":"Main Topic","children":[{"label":"Subtopic","children":[{"label":"Detail A"},{"label":"Detail B"}]},{"label":"Another Subtopic","children":[]}]}. Maximum 3 levels deep, 4-8 top-level children.`,

  datatable: `You are a data extraction specialist. Extract all key facts, metrics, dates, figures, and notable data points from the document below. Return ONLY valid JSON with no additional text: {"columns":["Category","Detail","Context"],"rows":[["Item","Value","Additional context"]]}. Include at least 5 rows if the document contains enough data.`,

  infographic: `You are a content designer. Create a structured summary from the document below. Break into 4-6 sections covering the main themes and key highlights. Return ONLY valid JSON with no additional text: [{"heading":"Section Title","content":"Brief description paragraph"},{"heading":"Key Facts","content":"Fact 1: detail. Fact 2: detail."}]. Each section should be concise and visually oriented.`,

  slidedeck: `You are a presentation designer. Create a presentation deck about the document below with 8-12 slides covering the main topics, key findings, and important details. Return ONLY valid JSON with no additional text: [{"heading":"Overview","content":"Summary and context"},{"heading":"Key Topics","content":"Main points"},{"heading":"Details & Analysis","content":"Supporting information"},{"heading":"Conclusions","content":"Key takeaways"}]. Each content field should have 2-4 bullet points.`,
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

  if (!checkRateLimit(`studio:${user.id}`, 30, 3_600_000)) {
    return NextResponse.json(
      { error: "Studio rate limit reached. Max 30 generations per hour." },
      { status: 429, headers: { "Retry-After": "120" } }
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
    .select("id, status, source_hash")
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

  // Check cache BEFORE fetching all chunks (avoids expensive DB read on cache hit)
  if (notebook.source_hash) {
    try {
      const { data: cached } = await supabase
        .from("studio_generations")
        .select("result")
        .eq("notebook_id", notebookId)
        .eq("action", validAction)
        .eq("source_hash", notebook.source_hash)
        .single();
      if (cached) {
        return NextResponse.json(cached.result);
      }
    } catch {
      // Cache lookup may fail if migration is pending
    }
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

  // Calculate content hash for caching (fallback to calculation if not in notebook metadata)
  const sourceHash = notebook.source_hash || getNotebookHash(documentText);

  // Inject LangChain format instructions into the prompt for type-safe output
  const parser = studioParsers[validAction];
  const formatInstructions = parser.getFormatInstructions();
  const systemPrompt = `${PROMPTS[validAction]}\n\n${formatInstructions}\n\n===BEGIN DOCUMENT===\n${documentText}\n===END DOCUMENT===`;

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
      onFinish: async ({ text }) => {
        // Validate output against Zod schema
        try {
          const { sanitizeAIJSON } = await import("@/lib/json-fix");
          const cleanedText = sanitizeAIJSON(text);
          const parsed = await parser.parse(cleanedText);
          // Save new generation with source_hash
          try {
            await supabase.from("studio_generations").insert({
              notebook_id: notebookId,
              user_id: user.id,
              action: validAction,
              result: parsed,
              source_hash: sourceHash,
            });
          } catch {
            // Save may fail if migration is pending
          }
        } catch {
          // Schema validation failed, output won't be cached
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[studio] Generation failed:", msg);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}

import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllChunks } from "@/lib/rag";
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
  flashcards: `You are a company research assistant. From the company profile below, create 10-15 flashcards covering the most important facts: products, tech stack, leadership, funding, competitors, and culture. Return ONLY a valid JSON array with no additional text: [{"front":"question or term","back":"answer or definition"}]`,

  quiz: `You are a company research assistant. From the company profile below, create a 10-question multiple choice quiz testing knowledge of the company's products, technology, market position, culture, and competitive landscape. Return ONLY valid JSON with no additional text: [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]`,

  report: `You are a company intelligence analyst. Write a structured analysis report of the company below. Return ONLY valid JSON with no additional text: [{"heading":"Company Overview","content":"..."},{"heading":"Products & Technology","content":"..."},{"heading":"Market Position & Competition","content":"..."},{"heading":"Engineering Culture & Opportunities","content":"..."}]. Each content field should be 2-4 paragraphs.`,

  mindmap: `You are a company intelligence analyst. Extract the hierarchical structure of the company below into a mind map covering products, technology, market, culture, and opportunities. Return ONLY valid JSON with no additional text: {"label":"Company Name","children":[{"label":"Products","children":[{"label":"Product A"},{"label":"Product B"}]},{"label":"Technology","children":[]}]}. Maximum 3 levels deep, 4-8 top-level children.`,

  datatable: `You are a company data analyst. Extract all key facts, metrics, funding rounds, employee counts, revenue figures, founding dates, and notable statistics from the company profile below. Return ONLY valid JSON with no additional text: {"columns":["Metric","Value","Context"],"rows":[["Founded","2006","Tel Aviv, Israel"]]}. Include at least 5 rows if the document contains enough data.`,

  infographic: `You are a company intelligence designer. Create a structured company snapshot from the profile below. Break into 4-6 sections: overview, key metrics, technology stack, market position, culture highlights, and career opportunities. Return ONLY valid JSON with no additional text: [{"heading":"Section Title","content":"Brief description paragraph"},{"heading":"Key Metrics","content":"Metric 1: value. Metric 2: value."},{"heading":"Technology Stack","content":"Details"}]. Each section should be concise and visually oriented.`,

  slidedeck: `You are a company intelligence analyst. Create a presentation deck about the company below with 8-12 slides covering: overview, products, technology, market position, competitive landscape, culture, and career opportunities. Return ONLY valid JSON with no additional text: [{"heading":"Company Overview","content":"Subtitle and overview"},{"heading":"Products & Services","content":"Key offerings"},{"heading":"Technology & Engineering","content":"Stack and culture"},{"heading":"Why Join","content":"Career opportunities and culture highlights"}]. Each content field should have 2-4 bullet points.`,
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

  // Check for existing generation with the same hash
  let existingGen = null;
  try {
    const { data } = await supabase
      .from("studio_generations")
      .select("result")
      .eq("notebook_id", notebookId)
      .eq("action", validAction)
      .eq("source_hash", sourceHash)
      .single();
    existingGen = data;
  } catch (dbError) {
    // If column missing or other error, log it but continue without caching
    console.warn("[studio] Caching lookup failed (migration might be pending):", dbError);
  }

  if (existingGen) {
    return NextResponse.json(existingGen.result);
  }

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
      onError: ({ error }) => {
        console.error("[studio] Stream error:", error);
      },
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
          } catch (saveError) {
            console.warn("[studio] Failed to save generation (migration might be pending):", saveError);
          }
        } catch (parseError) {
          console.warn("[studio] Output failed schema validation:", {
            action: validAction,
            error: parseError instanceof Error ? parseError.message : parseError,
          });
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[studio] Generation failed:", msg);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}

import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllChunks } from "@/lib/rag";
import { getLLM } from "@/lib/llm";
import { generateSpeech } from "@/lib/groq-tts";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const maxDuration = 120;

// POST /api/notebooks/[id]/audio - generate audio overview
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: notebookId } = await params;
  if (!isValidUUID(notebookId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(user.id + ":audio", 2, 3_600_000)) {
    return NextResponse.json(
      { error: "Audio generation limit reached. Try again in an hour." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  // Verify notebook ownership
  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id, status, title")
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

  try {
    // Get document content
    const documentText = await getAllChunks(notebookId, user.id);

    if (!documentText.trim()) {
      return NextResponse.json(
        { error: "No document content available" },
        { status: 400 }
      );
    }

    // Generate a summary for TTS
    const { text: summary } = await generateText({
      model: getLLM(),
      system: `You are creating an audio overview script for a document titled "${notebook.title}".
Write a 2-3 paragraph conversational summary that works well when read aloud.
Be engaging and informative. Cover the main topics and key points.
Keep it under 2000 characters. Do not use markdown, bullet points, or special formatting.`,
      messages: [
        {
          role: "user",
          content: `Document content:\n${documentText.slice(0, 8000)}`,
        },
      ],
    });

    // Generate speech
    const audioBuffer = await generateSpeech(summary);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[audio] Generation failed:", msg);
    return NextResponse.json(
      { error: "Audio generation failed. Please try again." },
      { status: 500 }
    );
  }
}

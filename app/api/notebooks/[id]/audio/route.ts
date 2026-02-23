import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllChunks } from "@/lib/rag";
import { getLLM } from "@/lib/llm";
import { generateSpeech } from "@/lib/groq-tts";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validate";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getNotebookHash } from "@/lib/hash";

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

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Audio generation is not configured. Set GROQ_API_KEY to enable TTS." },
      { status: 501 }
    );
  }

  try {
    // Get document content
    const documentText = await getAllChunks(notebookId, user.id);

    if (!documentText.trim()) {
      return NextResponse.json(
        { error: "Upload documents first to generate an audio overview." },
        { status: 400 }
      );
    }

    // Calculate hash for caching
    const sourceHash = getNotebookHash(documentText);

    // Check for existing cached audio
    try {
      const { data: cached } = await supabase
        .from("studio_generations")
        .select("result")
        .eq("notebook_id", notebookId)
        .eq("action", "audio")
        .eq("source_hash", sourceHash)
        .single();

      if (cached) {
        const { audioBase64 } = cached.result as { summary: string; audioBase64: string };
        const audioBuffer = Buffer.from(audioBase64, "base64");
        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Length": String(audioBuffer.byteLength),
            "Cache-Control": "private, max-age=3600",
          },
        });
      }
    } catch {
      // Ignore cache lookup errors (migration pending)
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

    // Persist to database for future sessions
    try {
      const audioBase64 = Buffer.from(audioBuffer).toString("base64");
      await supabase.from("studio_generations").insert({
        notebook_id: notebookId,
        user_id: user.id,
        action: "audio",
        result: { summary, audioBase64 },
        source_hash: sourceHash,
      });
    } catch (saveError) {
      console.warn("[audio] Failed to cache audio generation:", saveError);
    }

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

    // Surface specific TTS errors to the user
    if (msg.includes("401") || msg.includes("403")) {
      return NextResponse.json(
        { error: "TTS is not available on your Groq API plan. Upgrade at console.groq.com." },
        { status: 403 }
      );
    }
    if (msg.includes("429")) {
      return NextResponse.json(
        { error: "TTS rate limit reached. Try again in a few minutes." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    return NextResponse.json(
      { error: "Audio generation failed. Please try again." },
      { status: 500 }
    );
  }
}

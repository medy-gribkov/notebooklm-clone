import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Get the primary LLM for streaming chat via the Vercel AI SDK.
 * Prefers Groq (LLaMA 3.3 70B) if available, falls back to Gemini 2.0 Flash.
 * For non-streaming tasks, use ChatGoogleGenerativeAI from lib/langchain/chat-model.ts.
 */
export function getLLM() {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groq = createGroq({ apiKey: groqKey });
    return groq("llama-3.3-70b-versatile");
  }
  return getGeminiLLM();
}

/** Gemini fallback LLM. Used when Groq is unavailable or fails at stream time. */
export function getGeminiLLM() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required");
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  return google("gemini-2.0-flash");
}

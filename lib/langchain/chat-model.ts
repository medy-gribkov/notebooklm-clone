import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

let instance: ChatGoogleGenerativeAI | null = null;

/**
 * LangChain chat model for non-streaming tasks (metadata generation, etc.).
 * For streaming chat responses, use getLLM() from lib/llm.ts with the Vercel AI SDK.
 */
export function getChatModel(): ChatGoogleGenerativeAI {
  if (instance) return instance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required for chat model");
  instance = new ChatGoogleGenerativeAI({
    apiKey,
    model: "gemini-2.0-flash",
    temperature: 0.7,
  });
  return instance;
}

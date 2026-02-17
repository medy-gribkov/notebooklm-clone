import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export function getLLM() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required");
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  return google("gemini-2.5-flash-latest");
}

export function getEmbeddings() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required");
  return new GoogleGenerativeAIEmbeddings({
    model: "embedding-001",
    apiKey: process.env.GEMINI_API_KEY,
  });
}

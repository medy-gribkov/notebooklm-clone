import { GoogleGenerativeAI } from "@google/generative-ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const apiKey = process.env.GEMINI_API_KEY!;

export const genAI = new GoogleGenerativeAI(apiKey);

// For Vercel AI SDK streaming
export const google = createGoogleGenerativeAI({ apiKey });
export const llm = google("gemini-2.5-flash-latest");

// For embeddings (direct SDK)
export const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

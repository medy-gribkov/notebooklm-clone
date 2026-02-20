import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function getLLM() {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groq = createGroq({ apiKey: groqKey });
    return groq("llama-3.3-70b-versatile");
  }
  if (!process.env.GEMINI_API_KEY) throw new Error("GROQ_API_KEY or GEMINI_API_KEY is required");
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  return google("gemini-2.0-flash");
}

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMS = 768;

/**
 * Embed text via Gemini REST API with explicit outputDimensionality.
 * Embeddings still use Gemini (Groq doesn't offer embeddings).
 */
export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMS,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const values: number[] = data?.embedding?.values;

  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMS) {
    throw new Error(
      `Unexpected embedding shape: expected ${EMBEDDING_DIMS}, got ${values?.length ?? "undefined"}`
    );
  }

  return values;
}

interface ChatMessage {
  role: string;
  content: string;
}

// Groq llama-3.3-70b-versatile = 128K context. Gemini 2.0 Flash fallback = 1M.
// Use conservative budget targeting Groq (the smaller model).
const MODEL_CONTEXT_CHARS = 200_000; // ~50K tokens * 4 chars/token (well under 128K token limit)
const RESPONSE_RESERVE_CHARS = 8_000; // ~2K tokens for response

/**
 * Trim message history to fit within a character budget.
 * Uses character count as a proxy for tokens (~4 chars/token).
 * Always keeps the last user message. Removes oldest messages first.
 *
 * @param systemPromptChars - character length of system prompt (including RAG context).
 *   When provided, maxChars is computed dynamically to respect model context window.
 */
export function trimMessages<T extends ChatMessage>(
  messages: T[],
  maxChars?: number,
  systemPromptChars?: number,
): T[] {
  // If system prompt size is known, compute remaining budget dynamically
  const effectiveMax = maxChars ?? (
    systemPromptChars != null
      ? Math.max(MODEL_CONTEXT_CHARS - systemPromptChars - RESPONSE_RESERVE_CHARS, 2_000)
      : 12_000
  );
  if (messages.length === 0) return [];

  const last = messages[messages.length - 1];
  const history = messages.slice(0, -1);

  let totalChars = last.content.length;
  const kept: T[] = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const msgChars = history[i].content.length;
    if (totalChars + msgChars > effectiveMax) break;
    totalChars += msgChars;
    kept.unshift(history[i]);
  }

  kept.push(last);
  return kept;
}

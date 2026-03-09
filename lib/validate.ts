const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true if `id` matches the UUID v4 format (case-insensitive). */
export function isValidUUID(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Sanitize user-supplied text: strip null bytes, control chars, prompt
 * injection markers, and known instructional phrases. Caps at 100k chars.
 */
export function sanitizeText(text: string): string {
  // Strip null bytes and dangerous control chars (preserve \n \t \r)
  let cleaned = text.replace(/[\x00\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Strip prompt injection delimiter markers
  cleaned = cleaned.replace(/===BEGIN DOCUMENT===/g, "").replace(/===END DOCUMENT===/g, "");

  // Prompt Injection Defense: strip high-risk instructional phrases
  // Uses flexible whitespace matching to catch evasion attempts
  const injectionPatterns = [
    /ignore\s+(?:all\s+)?previous\s+instructions?/gi,
    /disregard\s+(?:all\s+)?(?:previous\s+)?instructions?/gi,
    /system\s+override/gi,
    /you\s+are\s+now/gi,
    /stop\s+processing/gi,
    /forget\s+(?:all\s+)?(?:previous\s+)?rules/gi,
    /new\s+instructions?\s*:/gi,
    /act\s+as\s+(?:a\s+)?(?:different|new)/gi,
    /override\s+(?:your\s+)?(?:system\s+)?prompt/gi,
  ];

  for (const pattern of injectionPatterns) {
    cleaned = cleaned.replace(pattern, "[FILTERED]");
  }

  return cleaned.slice(0, 100_000);
}

/** Validate a chat message. Returns an error string, or null if valid. */
export function validateUserMessage(msg: string): string | null {
  if (!msg || msg.trim().length === 0) return "Message cannot be empty";
  if (msg.length > 2000) return "Message exceeds 2000 character limit";
  if (msg.includes("\x00") || msg.includes("\ufffd")) return "Invalid characters in message";
  return null;
}

/**
 * Sanitizes raw AI output that is intended to be JSON.
 * Fixes "Bad control character" errors by escaping unescaped newlines and tabs
 * that models often accidentally place inside JSON string values.
 */
export function sanitizeAIJSON(raw: string): string {
    if (!raw) return "";

    let cleaned = raw.trim();

    // 1. Remove markdown code blocks if the model wrapped the JSON
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Escape raw control characters, then fix double-escapes
    cleaned = cleaned.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
    cleaned = cleaned.replace(/\\\\n/g, "\\n")
        .replace(/\\\\r/g, "\\r")
        .replace(/\\\\t/g, "\\t")
        .replace(/\\\\"/g, "\\\"");

    return cleaned;
}

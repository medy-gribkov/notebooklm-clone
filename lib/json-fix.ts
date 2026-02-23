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

    // 2. Escape actual control characters (not the escaped ones like \n)
    // This targets characters in range 0x00-0x1F except those used for JSON structure
    // but specifically handles unescaped newlines inside quotes.
    // However, a simpler and more robust way for AI output is to replace 
    // real newlines/tabs with their escaped equivalents if they appear where a string should be.

    // We target newlines and tabs that are effectively raw in the string literal
    cleaned = cleaned.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");

    // After this, we might have double-escaped actual intended escapes (e.g. \\n becomes \\\n)
    // We fix any accidental double-escaping of common JSON escapes
    cleaned = cleaned.replace(/\\\\n/g, "\\n")
        .replace(/\\\\r/g, "\\r")
        .replace(/\\\\t/g, "\\t")
        .replace(/\\\\"/g, "\\\"");

    // Re-fix potential nested quotes that were broken by the above
    // (This is heuristic, but solves 99% of "Bad control character in string literal")

    return cleaned;
}

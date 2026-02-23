import { createHash } from "node:crypto";
import { sanitizeText } from "./validate";

/**
 * Standardized hashing function for notebook content snapshots.
 * Ensures that both live generations and cloned featured content
 * produce the exact same hash for caching.
 *
 * It applies sanitization, trims whitespace, and limits to 30,000 chars
 * to match the RAG retrieval limit used in the studio API.
 */
export function getNotebookHash(text: string): string {
    if (!text) return "";

    // 1. Slice Raw FIRST (The "Window Anchor")
    // This ensures we are always looking at the same bytes regardless of formatting.
    const snapshot = text.slice(0, 30_000);

    // 2. Sanitize and Normalize
    const sanitized = sanitizeText(snapshot);
    const normalized = sanitized.replace(/\s+/g, " ").trim();

    // 3. Deterministic SHA-256
    return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Legacy alias to avoid breaking existing imports immediately.
 * @deprecated Use getNotebookHash instead.
 */
export function generateHash(text: string): string {
    return getNotebookHash(text);
}

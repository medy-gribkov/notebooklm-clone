import { describe, it, expect } from "vitest";
import { getNotebookHash } from "@/lib/hash";

describe("getNotebookHash Perfection", () => {
    it("is deterministic for RTL text (Hebrew)", () => {
        const hebrew = "שלום עולם! זהו מבחן של מערכת הגיבוב.";
        expect(getNotebookHash(hebrew)).toBe(getNotebookHash(hebrew));
    });

    it("is deterministic for RTL text (Arabic)", () => {
        const arabic = "مرحبا بالعالم! هذا اختبار لنظام التجزئة.";
        expect(getNotebookHash(arabic)).toBe(getNotebookHash(arabic));
    });

    it("handles emojis correctly", () => {
        const emojis = "🚀 High performance AI assistant 🤖✨";
        const hash1 = getNotebookHash(emojis);
        const hash2 = getNotebookHash(emojis);
        expect(hash1).toBe(hash2);
        expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("normalizes varying whitespace deterministically", () => {
        const text1 = "word1    word2\nword3\tword4";
        const text2 = "word1 word2 word3 word4";
        // Both should normalize to space-separated single spaces
        expect(getNotebookHash(text1)).toBe(getNotebookHash(text2));
    });

    it("removes prompt injection markers", () => {
        const plain = "This is a document.";
        const injected = "===BEGIN DOCUMENT===This is a document.===END DOCUMENT===";
        expect(getNotebookHash(injected)).toBe(getNotebookHash(plain));
    });

    it("sanitizes dangerous control characters", () => {
        const dirty = "clean\x00text\x07with\x1Fgarbage";
        const clean = "cleantextwithgarbage";
        expect(getNotebookHash(dirty)).toBe(getNotebookHash(clean));
    });

    it("is stable across very large inputs (over 30k)", () => {
        const base = "A".repeat(29_999);
        const text1 = base + "B" + "C";
        const text2 = base + "B" + "D";
        // Since it caps at 30k, base + B should be the same
        expect(getNotebookHash(text1)).toBe(getNotebookHash(text2));
    });

    it("handles mathematical symbols and unicode edge cases", () => {
        const symbols = "∑(x² + y²) = √z / 0.5";
        expect(getNotebookHash(symbols)).toBe(getNotebookHash(symbols));
    });
});

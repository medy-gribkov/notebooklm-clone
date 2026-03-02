import { describe, it, expect } from "vitest";
import { trimMessages } from "@/lib/langchain/trim-messages";

interface Msg {
  role: string;
  content: string;
}

function msg(role: string, content: string): Msg {
  return { role, content };
}

describe("trimMessages", () => {
  it("returns empty array for empty input", () => {
    expect(trimMessages([])).toEqual([]);
  });

  it("returns single message unchanged", () => {
    const messages = [msg("user", "hello")];
    expect(trimMessages(messages)).toEqual(messages);
  });

  it("keeps all messages when under budget", () => {
    const messages = [
      msg("user", "hi"),
      msg("assistant", "hello"),
      msg("user", "how are you"),
    ];
    expect(trimMessages(messages)).toEqual(messages);
  });

  it("drops oldest messages when over budget", () => {
    const messages = [
      msg("user", "a".repeat(5000)),
      msg("assistant", "b".repeat(5000)),
      msg("user", "c".repeat(5000)),
    ];
    // Total would be 15000, budget 12000.
    // Last message "c" = 5000 chars. Going backwards from history:
    // "b" (5000) => 10000 <= 12000 => keep
    // "a" (5000) => 15000 > 12000 => stop
    const result = trimMessages(messages);
    expect(result).toEqual([
      msg("assistant", "b".repeat(5000)),
      msg("user", "c".repeat(5000)),
    ]);
  });

  it("always keeps the last message even if it exceeds budget", () => {
    const messages = [msg("user", "x".repeat(20000))];
    const result = trimMessages(messages, 100);
    expect(result).toEqual(messages);
  });

  it("respects custom maxChars parameter", () => {
    const messages = [
      msg("user", "aaa"), // 3 chars
      msg("assistant", "bbb"), // 3 chars
      msg("user", "ccc"), // 3 chars
    ];
    // budget = 5. Last = 3. History backwards: "bbb" (3) => 6 > 5 => stop
    const result = trimMessages(messages, 5);
    expect(result).toEqual([msg("user", "ccc")]);
  });

  it("keeps messages at exact boundary", () => {
    const messages = [
      msg("user", "aa"), // 2 chars
      msg("assistant", "bb"), // 2 chars
      msg("user", "cc"), // 2 chars
    ];
    // budget = 6. Last = 2. History: "bb" (2) => 4 <= 6 => keep. "aa" (2) => 6 <= 6 => keep.
    const result = trimMessages(messages, 6);
    expect(result).toEqual(messages);
  });

  it("computes dynamic budget from systemPromptChars", () => {
    // Budget = 200000 - 190000 - 8000 = 2000
    const messages = [
      msg("user", "a".repeat(5000)),
      msg("assistant", "b".repeat(5000)),
      msg("user", "c".repeat(1500)),
    ];
    // Last = 1500. History backwards: "b" (5000) => 6500 > 2000 => stop
    const result = trimMessages(messages, undefined, 190000);
    expect(result).toEqual([
      msg("user", "c".repeat(1500)),
    ]);
  });

  it("floors budget at 2000 when systemPromptChars is very large", () => {
    // Budget = max(200000 - 198000 - 8000, 2000) = max(-6000, 2000) = 2000
    const messages = [
      msg("user", "a".repeat(3000)),
      msg("assistant", "b".repeat(3000)),
      msg("user", "c".repeat(1500)),
    ];
    // Last = 1500. History backwards: "b" (3000) => 4500 > 2000 => stop
    const result = trimMessages(messages, undefined, 198000);
    expect(result).toEqual([msg("user", "c".repeat(1500))]);
  });

  it("drops multiple old messages preserving order", () => {
    const messages = [
      msg("user", "a".repeat(4000)),
      msg("assistant", "b".repeat(4000)),
      msg("user", "c".repeat(4000)),
      msg("assistant", "d".repeat(4000)),
      msg("user", "e".repeat(4000)),
    ];
    // Last = 4000. History backwards:
    // "d" (4000) => 8000 <= 12000 => keep
    // "c" (4000) => 12000 <= 12000 => keep
    // "b" (4000) => 16000 > 12000 => stop
    const result = trimMessages(messages);
    expect(result).toEqual([
      msg("user", "c".repeat(4000)),
      msg("assistant", "d".repeat(4000)),
      msg("user", "e".repeat(4000)),
    ]);
  });
});

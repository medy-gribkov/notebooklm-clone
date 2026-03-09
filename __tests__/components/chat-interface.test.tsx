// @vitest-environment jsdom
import "../components/setup";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Control useChat return values per test
const mockSendMessage = vi.fn();
let useChatReturn = {
  messages: [] as Array<{ id: string; role: string; parts: Array<{ type: string; text: string }> }>,
  sendMessage: mockSendMessage,
  status: "ready" as string,
  error: undefined as Error | undefined,
  id: "chat-1",
  setMessages: vi.fn(),
  stop: vi.fn(),
  regenerate: vi.fn(),
  resumeStream: vi.fn(),
  addToolResult: vi.fn(),
  addToolOutput: vi.fn(),
  addToolApprovalResponse: vi.fn(),
  clearError: vi.fn(),
};

vi.mock("@ai-sdk/react", () => ({
  useChat: () => useChatReturn,
}));

vi.mock("ai", () => ({
  DefaultChatTransport: vi.fn(),
}));

vi.mock("@/components/markdown-renderer", () => ({
  default: ({ content }: { content: string }) =>
    React.createElement("div", { "data-testid": "markdown", className: "markdown" }, content),
}));

vi.mock("@/components/source-panel", () => ({
  SourcePanel: () => React.createElement("div", { "data-testid": "source-panel" }),
}));

vi.mock("@/components/mascot", () => ({
  Mascot: ({ mood }: { mood: string }) =>
    React.createElement("div", { "data-testid": "mascot", "data-mood": mood }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("button", props, children),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: Record<string, unknown>) =>
    React.createElement("textarea", { ...props, "data-testid": "chat-input" }),
}));

vi.mock("@/lib/validate-file", () => ({
  validateUploadFile: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock("@/lib/constants", () => ({
  CHAT_PROSE_CLASSES: "prose",
}));

import { ChatInterface } from "@/components/chat-interface";

describe("ChatInterface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatReturn = {
      messages: [],
      sendMessage: mockSendMessage,
      status: "ready",
      error: undefined,
      id: "chat-1",
      setMessages: vi.fn(),
      stop: vi.fn(),
      regenerate: vi.fn(),
      resumeStream: vi.fn(),
      addToolResult: vi.fn(),
      addToolOutput: vi.fn(),
      addToolApprovalResponse: vi.fn(),
      clearError: vi.fn(),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("renders upload prompt when no files and no messages", () => {
    render(
      <ChatInterface
        notebookId="nb-1"
        initialMessages={[]}
        hasFiles={false}
        isProcessing={false}
      />
    );

    expect(screen.getByTestId("mascot")).toBeInTheDocument();
    expect(screen.getByTestId("mascot")).toHaveAttribute("data-mood", "happy");
  });

  it("shows neutral mascot mood when hasErrorFiles is true", () => {
    render(
      <ChatInterface
        notebookId="nb-1"
        initialMessages={[]}
        hasFiles={false}
        hasErrorFiles={true}
        isProcessing={false}
      />
    );

    // Component uses "neutral" mood for error files (not "sad")
    expect(screen.getByTestId("mascot")).toHaveAttribute("data-mood", "neutral");
  });

  it("shows processing state when isProcessing is true", () => {
    render(
      <ChatInterface
        notebookId="nb-1"
        initialMessages={[]}
        hasFiles={true}
        isProcessing={true}
      />
    );

    // t("processingState") returns the key itself
    expect(screen.getByText("processingState")).toBeInTheDocument();
    expect(screen.getByTestId("mascot")).toHaveAttribute("data-mood", "thinking");
  });

  it("renders starter prompts when hasFiles and no messages", () => {
    render(
      <ChatInterface
        notebookId="nb-1"
        initialMessages={[]}
        hasFiles={true}
        isProcessing={false}
        starterPrompts={["What is this about?", "Summarize the key points"]}
      />
    );

    expect(screen.getByText("What is this about?")).toBeInTheDocument();
    expect(screen.getByText("Summarize the key points")).toBeInTheDocument();
  });

  it("renders user messages from useChat", () => {
    useChatReturn.messages = [
      { id: "m1", role: "user", parts: [{ type: "text", text: "Hello" }] },
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "Hi there!" }] },
    ];

    render(
      <ChatInterface
        notebookId="nb-1"
        initialMessages={[
          { id: "m1", notebook_id: "nb-1", user_id: "u1", role: "user", content: "Hello", sources: null, created_at: "" },
          { id: "m2", notebook_id: "nb-1", user_id: "u1", role: "assistant", content: "Hi there!", sources: null, created_at: "" },
        ]}
        hasFiles={true}
      />
    );

    // User message text is rendered directly
    expect(screen.getByText("Hello")).toBeInTheDocument();
    // Assistant message goes through MarkdownRenderer (mocked via next/dynamic as DynamicStub -> null)
    // The copy button still renders for assistant messages
    expect(screen.getByLabelText("copyMessage")).toBeInTheDocument();
  });

  it("copy button calls navigator.clipboard.writeText", async () => {
    useChatReturn.messages = [
      { id: "m1", role: "user", parts: [{ type: "text", text: "Hello" }] },
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "Response text" }] },
    ];

    render(
      <ChatInterface
        notebookId="nb-1"
        initialMessages={[]}
        hasFiles={true}
      />
    );

    const copyBtn = screen.getByLabelText("copyMessage");
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Response text");
    });
  });

  it("textarea is disabled when no files and no messages", () => {
    render(
      <ChatInterface
        notebookId="nb-1"
        initialMessages={[]}
        hasFiles={false}
      />
    );

    const textarea = screen.getByTestId("chat-input");
    expect(textarea).toBeDisabled();
  });

  it("shows description when provided and no messages", () => {
    render(
      <ChatInterface
        notebookId="nb-1"
        initialMessages={[]}
        hasFiles={true}
        description="This notebook covers machine learning basics."
      />
    );

    expect(screen.getByText("This notebook covers machine learning basics.")).toBeInTheDocument();
  });
});

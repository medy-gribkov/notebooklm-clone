"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "ai/react";
import type { Message as AIMessage } from "ai";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SourcePanel } from "@/components/source-panel";
import type { Message, Source } from "@/types";

interface ChatInterfaceProps {
  notebookId: string;
  initialMessages: Message[];
}

const STARTER_PROMPTS = [
  "Summarize the key points of this document",
  "What are the main conclusions or findings?",
  "What topics does this document cover?",
  "What questions does this document answer?",
];

export function ChatInterface({ notebookId, initialMessages }: ChatInterfaceProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [streamingSources, setStreamingSources] = useState<Source[]>([]);

  const priorMessages: AIMessage[] = initialMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }));

  const { messages, input, handleInputChange, handleSubmit, isLoading, data, setInput } =
    useChat({
      api: "/api/chat",
      body: { notebookId },
      initialMessages: priorMessages,
    });

  // Extract sources from stream data
  useEffect(() => {
    if (data && data.length > 0) {
      const last = data[data.length - 1] as { sources?: Source[] };
      if (last?.sources) {
        setStreamingSources(last.sources);
      }
    }
  }, [data]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
        setStreamingSources([]);
      }
    }
  }

  function handleStarterPrompt(prompt: string) {
    setInput(prompt);
  }

  // Map db message id to stored sources
  const sourcesById = Object.fromEntries(
    initialMessages
      .filter((m) => m.role === "assistant" && m.sources)
      .map((m) => [m.id, m.sources as Source[]])
  );

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <svg
                className="mb-4 h-12 w-12 text-muted-foreground/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-sm font-medium text-muted-foreground">
                Ask anything about your document
              </p>
              <p className="text-xs mt-1 text-muted-foreground/70 mb-6">
                All answers come directly from the uploaded PDF.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleStarterPrompt(prompt)}
                    className="rounded-lg border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message: AIMessage) => {
            const isUser = message.role === "user";
            const isLastAssistant =
              !isUser && message.id === messages[messages.length - 1]?.id;

            // Use streaming sources for the last assistant message while loading,
            // fall back to persisted sources from DB
            const sources: Source[] | undefined =
              isLastAssistant && isLoading
                ? streamingSources
                : (sourcesById[message.id] ?? (isLastAssistant ? streamingSources : undefined));

            return (
              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] space-y-2 ${
                    isUser ? "items-end" : "items-start"
                  } flex flex-col`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {!isUser && sources && sources.length > 0 && (
                    <div className="w-full">
                      <SourcePanel sources={sources} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
                <span className="flex gap-1" aria-label="Thinking...">
                  <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground [animation-delay:0ms]" />
                  <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground [animation-delay:150ms]" />
                  <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex gap-2 items-end"
        >
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your document... (Enter to send, Shift+Enter for new line)"
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isLoading}
            rows={1}
          />
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !input.trim()}
            className="h-11 px-4 shrink-0"
            aria-label="Send message"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </Button>
        </form>
        <p className="mt-1.5 text-center text-xs text-muted-foreground/50 max-w-2xl mx-auto">
          Answers are grounded in your document only. Sources shown below each reply.
        </p>
      </div>
    </div>
  );
}

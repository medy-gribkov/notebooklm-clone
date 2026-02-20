"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "ai/react";
import type { Message as AIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SourcePanel } from "@/components/source-panel";
import type { Message, Source } from "@/types";

interface ChatInterfaceProps {
  notebookId: string;
  initialMessages: Message[];
}

const STARTER_PROMPTS = [
  { text: "Summarize the key points of this document", icon: "list" },
  { text: "What are the main conclusions or findings?", icon: "target" },
  { text: "What topics does this document cover?", icon: "book" },
  { text: "What questions does this document answer?", icon: "question" },
];

export function ChatInterface({ notebookId, initialMessages }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      onError: (error) => {
        console.error("[chat] useChat error:", error);
        const msg = error.message ?? "";
        if (msg.includes("429") || msg.toLowerCase().includes("too many")) {
          setErrorMessage(
            "Rate limit reached. You can send up to 10 messages per minute."
          );
        } else {
          setErrorMessage("Something went wrong. Please try again.");
        }
      },
    });

  const streamingSources: Source[] = (() => {
    if (data && data.length > 0) {
      const last = data[data.length - 1] as { sources?: Source[] };
      return last?.sources ?? [];
    }
    return [];
  })();

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        setErrorMessage(null);
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    setErrorMessage(null);
    handleSubmit(e);
  }

  function handleStarterPrompt(prompt: string) {
    setInput(prompt);
  }

  const sourcesById = Object.fromEntries(
    initialMessages
      .filter((m) => m.role === "assistant" && m.sources)
      .map((m) => [m.id, m.sources as Source[]])
  );

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Scrollable messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        <div className="px-4 py-6">
          <div className="space-y-5 max-w-2xl mx-auto">
            {messages.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center animate-fade-in">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
                  <svg
                    className="h-8 w-8 text-primary/30"
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
                </div>
                <p className="text-base font-semibold mb-1">
                  Ask anything about your document
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  All answers come directly from the uploaded PDF.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.text}
                      onClick={() => handleStarterPrompt(prompt.text)}
                      className="group flex items-start gap-2.5 rounded-xl border p-3 text-left text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:border-primary/20 transition-all"
                    >
                      <StarterIcon type={prompt.icon} />
                      <span className="leading-relaxed">{prompt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message: AIMessage) => {
              const isUser = message.role === "user";
              const isLastAssistant =
                !isUser && message.id === messages[messages.length - 1]?.id;

              const sources: Source[] | undefined =
                isLastAssistant && isLoading
                  ? streamingSources
                  : (sourcesById[message.id] ?? (isLastAssistant ? streamingSources : undefined));

              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"} animate-slide-up`}>
                  <div className="flex gap-2.5 max-w-[85%]">
                    {/* Avatar */}
                    {!isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                        <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`space-y-2.5 ${
                        isUser ? "items-end" : "items-start"
                      } flex flex-col min-w-0`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          isUser
                            ? "bg-gradient-to-br from-primary to-[oklch(0.45_0.2_290)] text-white rounded-br-md shadow-sm"
                            : "bg-muted/40 border rounded-bl-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      {!isUser && sources && sources.length > 0 && (
                        <div className="w-full overflow-hidden">
                          <SourcePanel sources={sources} />
                        </div>
                      )}
                    </div>
                    {/* User avatar */}
                    {isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                        <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Shimmer loading indicator */}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                    <svg className="h-3.5 w-3.5 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-muted/40 border px-4 py-3 w-48">
                    <div className="space-y-2">
                      <div className="h-2.5 rounded-full bg-muted-foreground/10 animate-shimmer" />
                      <div className="h-2.5 rounded-full bg-muted-foreground/10 animate-shimmer [animation-delay:200ms] w-3/4" />
                      <div className="h-2.5 rounded-full bg-muted-foreground/10 animate-shimmer [animation-delay:400ms] w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom spacer for scroll */}
            <div className="h-1" />
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="border-t bg-background/80 backdrop-blur-sm p-4 shrink-0">
        {errorMessage && (
          <p className="mb-2 text-center text-xs text-destructive max-w-2xl mx-auto animate-fade-in">
            {errorMessage}
          </p>
        )}
        <form
          onSubmit={handleFormSubmit}
          className="max-w-2xl mx-auto flex gap-2 items-end"
        >
          <div className="relative flex-1">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your document..."
              className="min-h-[48px] max-h-32 resize-none pr-4 rounded-xl border-border/60 focus:border-primary/40 transition-colors"
              disabled={isLoading}
              rows={1}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !input.trim()}
            className="h-12 w-12 shrink-0 rounded-xl p-0"
            aria-label="Send message"
          >
            <svg
              className="h-4.5 w-4.5"
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
        <p className="mt-2 text-center text-[11px] text-muted-foreground/50 max-w-2xl mx-auto">
          Enter to send. Shift+Enter for new line. Sources shown below each reply.
        </p>
      </div>
    </div>
  );
}

function StarterIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0 mt-0.5 text-primary/40 group-hover:text-primary/60 transition-colors";
  switch (type) {
    case "list":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      );
    case "target":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
          <circle cx="12" cy="12" r="6" strokeWidth={1.5} />
          <circle cx="12" cy="12" r="2" strokeWidth={1.5} />
        </svg>
      );
    case "book":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case "question":
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

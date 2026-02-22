"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useChat } from "ai/react";
import type { Message as AIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SourcePanel } from "@/components/source-panel";
import { Mascot } from "@/components/mascot";
import { useTranslations } from "next-intl";
import { validateUploadFile } from "@/lib/validate-file";
import type { Message, NotebookFile, Source } from "@/types";

interface ChatInterfaceProps {
  notebookId: string;
  initialMessages: Message[];
  isProcessing?: boolean;
  hasFiles?: boolean;
  description?: string | null;
  starterPrompts?: string[] | null;
  onFileUploaded?: (file: NotebookFile) => void;
  isUploading?: boolean;
  setIsUploading?: (v: boolean) => void;
}

export function ChatInterface({ notebookId, initialMessages, isProcessing = false, hasFiles = true, description, starterPrompts: dynamicPrompts, onFileUploaded, isUploading: externalUploading, setIsUploading }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [centerUploading, setCenterUploading] = useState(false);
  const t = useTranslations("chat");

  const iconTypes = ["list", "target", "book", "question"];
  const starterPrompts = useMemo(() => {
    if (dynamicPrompts?.length) {
      // Dynamic prompts from generateNotebookMeta, show up to 4
      const shuffled = [...dynamicPrompts].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 4).map((text, i) => ({ text, icon: iconTypes[i % iconTypes.length] }));
    }
    // 6 default prompts, randomly pick 4
    const allDefaults = [
      { text: t("starter1"), icon: "list" },
      { text: t("starter2"), icon: "target" },
      { text: t("starter3"), icon: "book" },
      { text: t("starter4"), icon: "question" },
      { text: t("starter5"), icon: "list" },
      { text: t("starter6"), icon: "target" },
    ];
    const shuffled = [...allDefaults].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicPrompts, t]);

  // Auto-dismiss error after 8s
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

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
        const msg = error.message ?? "";
        if (msg.includes("429") || msg.toLowerCase().includes("too many")) {
          setErrorMessage(
            t("rateLimitError")
          );
        } else {
          setErrorMessage(t("genericError"));
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

  const copyMessage = useCallback(async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  const saveToNote = useCallback(async (messageId: string, content: string) => {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: content.slice(0, 60).replace(/\n/g, " "), content }),
      });
      if (res.ok) {
        setSavedNoteId(messageId);
        setTimeout(() => setSavedNoteId(null), 2000);
      }
    } catch {
      // Silent fail
    }
  }, [notebookId]);

  function handleCenterFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      setErrorMessage(t(validation.error === "unsupportedType" ? "genericError" : "genericError"));
      e.target.value = "";
      return;
    }
    setCenterUploading(true);
    setIsUploading?.(true);
    const formData = new FormData();
    formData.append("file", file);
    fetch(`/api/notebooks/${notebookId}/files`, { method: "POST", body: formData })
      .then(async (res) => {
        if (res.ok) {
          const uploaded: NotebookFile = await res.json();
          onFileUploaded?.(uploaded);
        } else {
          const b = await res.json();
          setErrorMessage(b.error ?? t("genericError"));
        }
      })
      .catch(() => setErrorMessage(t("genericError")))
      .finally(() => { setCenterUploading(false); setIsUploading?.(false); });
    e.target.value = "";
  }

  const sourcesById = useMemo(
    () =>
      Object.fromEntries(
        initialMessages
          .filter((m) => m.role === "assistant" && m.sources)
          .map((m) => [m.id, m.sources as Source[]])
      ),
    [initialMessages]
  );

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Error toast - top right */}
      {errorMessage && (
        <div className="fixed top-4 end-4 z-50 flex items-center gap-2 bg-destructive/10 border border-destructive/20 px-3 py-2.5 rounded-lg text-xs text-destructive animate-slide-up max-w-sm shadow-lg">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ms-1 text-destructive/60 hover:text-destructive"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Scrollable messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        <div className="px-4 py-6">
          <div className="space-y-5 max-w-2xl lg:max-w-3xl mx-auto">
            {messages.length === 0 && !hasFiles && !isProcessing && (
              <div className="flex flex-col items-center py-20 text-center animate-fade-in">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.docx,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleCenterFileChange}
                />
                <div className="mb-6 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Mascot size="lg" mood="happy" />
                </div>
                <p className="text-base font-semibold mb-1">{t("uploadToStart")}</p>
                <p className="text-sm text-muted-foreground mb-4">{t("uploadToStartDesc")}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={centerUploading || !!externalUploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {centerUploading ? (
                    <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  {centerUploading ? t("uploading") : t("browseFiles")}
                </button>
              </div>
            )}

            {messages.length === 0 && (hasFiles || isProcessing) && (
              <div className="flex flex-col items-center py-16 text-center animate-fade-in">
                {isProcessing && (
                  <div className="flex items-center gap-2.5 mb-6 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                    <span className="text-xs text-primary">{t("processingState")}</span>
                  </div>
                )}
                <div className="mb-6">
                  <Mascot size="lg" mood={isProcessing ? "thinking" : "neutral"} />
                </div>
                {description && (
                  <div className="rounded-xl border bg-card/60 p-4 mb-6 text-center max-w-md mx-auto">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      {t("notebookSummary")}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{description}</p>
                  </div>
                )}
                <p className="text-base font-semibold mb-1">
                  {t("askAnything")}
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  {t("allAnswers")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt.text}
                      onClick={() => handleStarterPrompt(prompt.text)}
                      disabled={isProcessing}
                      className="group flex items-start gap-2.5 rounded-xl border p-3 text-left text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:border-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className={`flex gap-2.5 max-w-[85%] lg:max-w-2xl xl:max-w-3xl`}>
                    {/* Avatar */}
                    {!isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                        <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`space-y-2.5 ${isUser ? "items-end" : "items-start"
                        } flex flex-col min-w-0`}
                    >
                      <div
                        className={`group/msg relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${isUser
                          ? "bg-primary text-primary-foreground rounded-br-md shadow-sm shadow-black/[0.04]"
                          : "bg-muted/30 border border-border/50 border-l-2 border-l-primary/30 rounded-bl-md shadow-sm shadow-black/[0.02] dark:shadow-none"
                          }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:my-2 prose-code:text-xs">
                            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Action buttons (AI messages only) */}
                        {!isUser && message.content && (
                          <div className="absolute top-2 end-2 flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                            <button
                              onClick={() => copyMessage(message.id, message.content)}
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                              aria-label={t("copyMessage")}
                            >
                              {copiedId === message.id ? (
                                <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => saveToNote(message.id, message.content)}
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                              aria-label={t("saveToNote")}
                            >
                              {savedNoteId === message.id ? (
                                <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
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
        <form
          onSubmit={handleFormSubmit}
          className="max-w-2xl lg:max-w-3xl mx-auto flex gap-2 items-end"
        >
          <div className="relative flex-1">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={!hasFiles && messages.length === 0 ? t("uploadFirst") : t("placeholder")}
              className="min-h-[48px] max-h-32 resize-none pr-4 rounded-xl border-border/60 focus:border-primary/40 transition-colors"
              disabled={isLoading || (!hasFiles && messages.length === 0)}
              rows={1}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !input.trim()}
            className="h-12 w-12 shrink-0 rounded-xl p-0"
            aria-label={t("send")}
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
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </Button>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted-foreground/50 max-w-2xl lg:max-w-3xl mx-auto">
          {t("sendHint")}
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

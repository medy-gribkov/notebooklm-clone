"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SourcePanel } from "@/components/source-panel";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { Message, Note, StudioGeneration, Source } from "@/types";

const MarkdownRenderer = dynamic(() => import("@/components/markdown-renderer"), {
  ssr: false,
  loading: () => <span className="inline-block h-4 w-4 animate-pulse rounded bg-muted" />,
});
const FlashcardsView = dynamic(() => import("@/components/studio/flashcards").then(m => ({ default: m.FlashcardsView })));
const QuizView = dynamic(() => import("@/components/studio/quiz").then(m => ({ default: m.QuizView })));
const ReportView = dynamic(() => import("@/components/studio/report").then(m => ({ default: m.ReportView })));
const MindMapView = dynamic(() => import("@/components/studio/mindmap").then(m => ({ default: m.MindMapView })));
const DataTableView = dynamic(() => import("@/components/studio/datatable").then(m => ({ default: m.DataTableView })));
const InfographicView = dynamic(() => import("@/components/studio/infographic").then(m => ({ default: m.InfographicView })));
const SlideDeckView = dynamic(() => import("@/components/studio/slidedeck").then(m => ({ default: m.SlideDeckView })));

interface Company {
  name: string;
  website: string | null;
  category: string | null;
}

interface SharedData {
  notebook: { id: string; title: string; description: string | null; created_at: string };
  permissions: "view" | "chat";
  messages: Omit<Message, "notebook_id" | "user_id">[];
  notes: Omit<Note, "notebook_id" | "updated_at">[];
  generations: Omit<StudioGeneration, "notebook_id" | "user_id">[];
  company: Company | null;
}

type Tab = "chat" | "notes" | "studio";

export default function SharedNotebookPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const t = useTranslations("featured");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string; sources?: Source[] }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef(chatMessages);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/shared/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || "Failed to load shared notebook");
          return;
        }
        const result = await res.json();
        setData(result);
        // Populate chat with existing messages
        setChatMessages(
          (result.messages || []).map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          }))
        );
      } catch {
        setError("Failed to load shared notebook");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const sendMessage = useCallback(async (userMsg: string) => {
    if (!userMsg.trim() || chatLoading) return;

    setChatInput("");
    setChatError(null);
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch(`/api/shared/${token}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessagesRef.current, { role: "user", content: userMsg }],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setChatError(body.error || "Failed to send message");
        setChatLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setChatError("No response stream");
        setChatLoading(false);
        return;
      }

      let assistantContent = "";
      let parsedSources: Source[] = [];
      let pendingFlush = false;
      setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const flushContent = () => {
        pendingFlush = false;
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent, sources: parsedSources.length > 0 ? parsedSources : undefined };
          return updated;
        });
      };

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("0:")) {
            try {
              assistantContent += JSON.parse(line.slice(2));
              if (!pendingFlush) {
                pendingFlush = true;
                requestAnimationFrame(flushContent);
              }
            } catch { /* skip malformed */ }
          } else if (line.startsWith("2:")) {
            try {
              const dataArr = JSON.parse(line.slice(2));
              for (const item of Array.isArray(dataArr) ? dataArr : [dataArr]) {
                if (item && Array.isArray(item.sources)) {
                  parsedSources = item.sources;
                }
              }
            } catch { /* skip malformed */ }
          }
        }
      }

      // Final flush to ensure all content is rendered
      flushContent();
    } catch {
      setChatError("Failed to send message. Please try again.");
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, token]);

  const copyMessage = useCallback(async (idx: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgIdx(idx);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedMsgIdx(null), 2000);
    } catch { /* clipboard not available */ }
  }, []);

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(chatInput.trim());
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground">Loading company profile...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-xl font-semibold">{error || "Company profile not found"}</h1>
          <p className="text-muted-foreground text-sm">
            This share link may have expired or been revoked.
          </p>
          <a
            href="/login"
            className="inline-block text-sm text-primary hover:underline underline-offset-2"
          >
            Sign up for full access
          </a>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "chat", label: "Chat", count: data.messages.length },
    { key: "notes", label: "Notes", count: data.notes.length },
    { key: "studio", label: "Studio", count: data.generations.length },
  ];

  return (
    <div className="flex h-dvh flex-col bg-background overflow-hidden">
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {data.company?.website && !logoError ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://logo.clearbit.com/${new URL(data.company.website.startsWith("http") ? data.company.website : `https://${data.company.website}`).hostname}`}
                  alt={data.company.name}
                  className="h-7 w-7 rounded"
                  onError={() => setLogoError(true)}
                />
                <span className="text-sm font-semibold truncate max-w-[200px]">{data.company.name}</span>
              </>
            ) : data.company?.name ? (
              <>
                <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {data.company.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold truncate max-w-[200px]">{data.company.name}</span>
              </>
            ) : (
              <Logo size="sm" />
            )}
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {data.company?.category || "Shared"}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold">{data.notebook.title}</h1>
        {data.notebook.description && (
          <p className="text-muted-foreground mt-1">
            {data.notebook.description.startsWith("featured.")
              ? t(data.notebook.description.replace("featured.", ""))
              : data.notebook.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-muted-foreground" suppressHydrationWarning>
            Shared {new Date(data.notebook.created_at).toLocaleDateString()}
          </span>
          {data.permissions === "chat" && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Chat enabled
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 min-h-[44px] text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "chat" ? (
        <>
          <div className="flex-1 overflow-y-auto" aria-live="polite" aria-busy={chatLoading}>
            <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-4">
              {data.permissions === "view" && (
                <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  This profile is shared as view-only.{" "}
                  <a href="/login" className="text-primary hover:underline underline-offset-2">
                    Sign up
                  </a>{" "}
                  to create your own company research notebooks.
                </div>
              )}

              {chatMessages.length === 0 && (
                <div className="py-8 sm:py-12 text-center space-y-6">
                  <div>
                    <p className="text-base font-semibold mb-1">
                      Ask anything about {data.company?.name || "this company"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ask about their tech, culture, or how Medy&apos;s experience fits.
                    </p>
                  </div>
                  {data.permissions === "chat" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                      {[
                        `What does ${data.company?.name || "this company"} do?`,
                        `What's their engineering culture like?`,
                        `Is Medy a good fit for ${data.company?.name || "this company"}?`,
                        `What are Medy's key projects?`,
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => sendMessage(prompt)}
                          disabled={chatLoading}
                          className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-50"
                        >
                          <svg className="h-4 w-4 shrink-0 mt-0.5 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                          </svg>
                          <span className="leading-relaxed">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className="space-y-2">
                  <div
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start items-start gap-2"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-1" aria-hidden="true">
                        DC
                      </div>
                    )}
                    <div
                      className={`group/msg relative rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user"
                        ? "max-w-[85%] lg:max-w-2xl xl:max-w-3xl bg-primary text-primary-foreground"
                        : "max-w-[85%] lg:max-w-2xl xl:max-w-3xl bg-[#FAF9F7] dark:bg-muted/20 border border-border/40 border-l-2 border-l-primary/30 prose dark:prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5"
                        }`}
                    >
                      {msg.role === "assistant" && msg.content && (
                        <div className="absolute top-2 end-2 flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity z-10">
                          <button
                            onClick={() => copyMessage(i, msg.content)}
                            className="p-1.5 rounded-md hover:bg-background/80 text-muted-foreground/50 hover:text-foreground transition-colors"
                            aria-label="Copy message"
                          >
                            {copiedMsgIdx === i ? (
                              <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                      {msg.content ? (
                        msg.role === "user" ? (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        ) : (
                          <MarkdownRenderer content={msg.content} />
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                          Thinking...
                        </span>
                      )}
                    </div>
                  </div>
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="max-w-[85%] lg:max-w-2xl xl:max-w-3xl ms-8">
                      <SourcePanel sources={msg.sources} />
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />

              {chatError && (
                <p className="text-sm text-destructive text-center">{chatError}</p>
              )}
            </div>
          </div>

          {data.permissions === "chat" && (
            <div className="border-t bg-card/80 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
              <form onSubmit={handleSendMessage} className="mx-auto max-w-5xl flex gap-2 px-4 py-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Ask about ${data.company?.name || "this company"}'s tech, culture, products...`}
                  disabled={chatLoading}
                  autoComplete="off"
                  aria-label={`Ask about ${data.company?.name || "this company"}`}
                  className="flex-1 h-12 rounded-lg border bg-background px-4 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  aria-label="Send message"
                  className="h-12 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 min-w-[60px]"
                >
                  {chatLoading ? (
                    <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin mx-auto" />
                  ) : (
                    "Send"
                  )}
                </button>
              </form>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-6">
            {activeTab === "notes" && (
              <div className="space-y-4">
                {data.notes.length === 0 && (
                  <div className="flex flex-col items-center py-16 text-center">
                    <svg className="h-10 w-10 text-muted-foreground/40 dark:text-muted-foreground/50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <p className="text-sm font-medium text-muted-foreground">No notes yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Notes added by the notebook owner will appear here.</p>
                  </div>
                )}
                {data.notes.map((note) => (
                  <div key={note.id} className="rounded-xl border bg-card p-5">
                    <h3 className="font-semibold">{note.title}</h3>
                    <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                      {note.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "studio" && (
              <div className="space-y-4">
                {data.generations.length === 0 && (
                  <div className="flex flex-col items-center py-16 text-center">
                    <svg className="h-10 w-10 text-muted-foreground/40 dark:text-muted-foreground/50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5.002 5.002 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p className="text-sm font-medium text-muted-foreground">No studio outputs yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">AI-generated content like quizzes, flashcards, and reports will appear here.</p>
                  </div>
                )}
                {data.generations.map((gen) => (
                  <div key={gen.id} className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                        {gen.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(gen.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-sm">
                      {(() => {
                        switch (gen.action) {
                          case "flashcards":
                            return <FlashcardsView data={gen.result as never} />;
                          case "quiz":
                            return <QuizView data={gen.result as never} />;
                          case "report":
                            return <ReportView data={gen.result as never} />;
                          case "mindmap":
                            return <MindMapView data={gen.result as never} />;
                          case "datatable":
                            return <DataTableView data={gen.result as never} />;
                          case "infographic":
                            return <InfographicView data={gen.result as never} />;
                          case "slidedeck":
                            return <SlideDeckView data={gen.result as never} />;
                          default:
                            return typeof gen.result === "string"
                              ? <div className="whitespace-pre-wrap">{gen.result}</div>
                              : <pre className="text-xs overflow-auto max-h-64 bg-muted text-foreground rounded-lg p-3 scrollbar-thin">
                                  {JSON.stringify(gen.result, null, 2)}
                                </pre>;
                        }
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      <footer className="border-t bg-card/50 py-4 shrink-0">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 text-center sm:text-left">
          <p className="text-xs text-muted-foreground">
            Built by{" "}
            <a
              href="https://medygribkov.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-2"
            >
              Medy Gribkov
            </a>
            {" "}with DocChat
          </p>
          <div className="flex items-center gap-3">
            <a href="https://github.com/Medy-gribkov" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            <a href="https://linkedin.com/in/medygribkov" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">LinkedIn</a>
            <a href="/Medy-Gribkov-Resume.pdf" download className="text-xs text-primary hover:underline underline-offset-2">Resume</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

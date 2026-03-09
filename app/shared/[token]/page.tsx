"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SourcePanel } from "@/components/source-panel";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { CompanyLogo } from "@/components/company-logo";
import { CHAT_PROSE_CLASSES } from "@/lib/constants";
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

function getCategoryContent(category: string | null | undefined) {
  switch (category) {
    case "Cybersecurity":
      return {
        slogan: "Explore their security solutions and threat intelligence",
        starters: [
          "What security products or services do they offer?",
          "What threats or vulnerabilities do they address?",
          "How does their approach compare to competitors?",
          "What certifications or compliance standards do they hold?",
        ],
      };
    case "Fintech":
      return {
        slogan: "Discover their financial services and market strategy",
        starters: [
          "What financial products or services do they provide?",
          "What regulations do they comply with?",
          "Who is their target market?",
          "What technology powers their platform?",
        ],
      };
    case "AI/ML":
      return {
        slogan: "Learn about their AI technology and research",
        starters: [
          "What AI models or technologies do they use?",
          "What problems does their AI solve?",
          "What data or datasets do they work with?",
          "How does their solution compare to alternatives?",
        ],
      };
    case "SaaS":
      return {
        slogan: "Understand their platform, pricing, and integrations",
        starters: [
          "What does their platform do?",
          "Who are their target customers?",
          "What integrations do they support?",
          "What's their pricing model?",
        ],
      };
    case "DevTools":
      return {
        slogan: "Explore their developer tools and ecosystem",
        starters: [
          "What developer problems do they solve?",
          "What languages or frameworks do they support?",
          "How does their tool fit into the dev workflow?",
          "What's their developer community like?",
        ],
      };
    case "E-commerce":
      return {
        slogan: "Discover their products, markets, and operations",
        starters: [
          "What products or services do they sell?",
          "What markets do they serve?",
          "What's their fulfillment or logistics approach?",
          "How do they differentiate from competitors?",
        ],
      };
    default:
      return {
        slogan: "Get AI-powered answers with cited sources from the document",
        starters: [
          "Summarize the key points of this document",
          "What are the main topics covered?",
          "What conclusions or recommendations are made?",
          "Explain the most important details",
        ],
      };
  }
}

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

      // Extract sources from response header
      let parsedSources: Source[] = [];
      const sourcesHeader = res.headers.get("X-Chat-Sources");
      if (sourcesHeader) {
        try { parsedSources = JSON.parse(sourcesHeader); } catch { /* skip malformed */ }
      }

      let assistantContent = "";
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
          const trimmed = line.startsWith("data: ") ? line.slice(6) : "";
          if (!trimmed || trimmed === "[DONE]") continue;
          try {
            const event = JSON.parse(trimmed);
            if (event.type === "text-delta" && typeof event.delta === "string") {
              assistantContent += event.delta;
              if (!pendingFlush) {
                pendingFlush = true;
                requestAnimationFrame(flushContent);
              }
            }
          } catch { /* skip malformed */ }
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
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Logo size="lg" />
          <p className="text-sm text-muted-foreground">Loading shared notebook...</p>
          <div className="flex gap-3 w-full max-w-xs">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-16 rounded-xl bg-card animate-shimmer" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
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
          <h1 className="text-xl font-semibold">{error || "Notebook not found"}</h1>
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

  const descriptionText = data.notebook.description
    ? data.notebook.description.startsWith("featured.")
      ? t(data.notebook.description.replace("featured.", ""))
      : data.notebook.description
    : null;

  return (
    <div className="flex h-dvh flex-col bg-background overflow-hidden">
      <header className="sticky top-0 z-20 border-b border-primary/10 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {data.company?.name ? (
              <CompanyLogo domain={data.company.website ?? undefined} name={data.company.name} size="sm" />
            ) : (
              <Logo size="sm" />
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">{data.notebook.title}</h1>
              {descriptionText && (
                <p className="text-[11px] text-muted-foreground truncate max-w-[300px] sm:max-w-md hidden sm:block">
                  {descriptionText}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {data.company?.category && (
              <span className="hidden sm:inline text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {data.company.category}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 min-h-[44px] text-sm font-medium border-b-[3px] transition-colors ${activeTab === tab.key
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
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
              <div className="flex gap-6">
                {/* Sidebar - desktop only */}
                <aside className="hidden lg:block w-64 shrink-0">
                  <div className="sticky top-6 space-y-4">
                    <div className="rounded-xl border bg-card p-4 space-y-3">
                      {data.company?.name && (
                        <div className="flex items-center gap-3">
                          <CompanyLogo domain={data.company.website ?? undefined} name={data.company.name} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{data.company.name}</p>
                            {data.company.category && (
                              <p className="text-xs text-muted-foreground">{data.company.category}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {data.company?.website && (
                        <a
                          href={`https://${data.company.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-2"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          {data.company.website}
                        </a>
                      )}
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Sources</span>
                          <span className="font-medium">{data.generations.length} outputs</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Notes</span>
                          <span className="font-medium">{data.notes.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer links in sidebar on desktop */}
                    <div className="rounded-xl border bg-card p-4 space-y-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-2">About the author</p>
                      <a href="https://medygribkov.vercel.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                        Portfolio
                      </a>
                      <a href="https://github.com/Medy-gribkov" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                        GitHub
                      </a>
                      <a href="https://linkedin.com/in/medygribkov" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                        LinkedIn
                      </a>
                      <a href="/Medy-Gribkov-Resume.pdf" download className="flex items-center gap-2 text-xs text-primary font-medium hover:underline underline-offset-2">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Download Resume
                      </a>
                    </div>
                  </div>
                </aside>

                {/* Main chat area */}
                <div className="flex-1 min-w-0 space-y-4">
              {data.permissions === "view" && (
                <div className="rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-sm text-muted-foreground">
                  This notebook is shared as view-only.{" "}
                  <a href="/login" className="text-primary hover:underline underline-offset-2">
                    Sign up
                  </a>{" "}
                  to create your own notebooks.
                </div>
              )}

              {chatMessages.length === 0 && (() => {
                const { slogan, starters } = getCategoryContent(data.company?.category);
                return (
                <div className="py-8 sm:py-12 text-center space-y-6">
                  <div>
                    <p className="text-base font-semibold mb-1">
                      Ask anything about {data.notebook.title || "this document"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {slogan}
                    </p>
                  </div>
                  {data.permissions === "chat" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                      {starters.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => sendMessage(prompt)}
                          disabled={chatLoading}
                          className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50"
                        >
                          <svg className="h-4 w-4 shrink-0 mt-0.5 text-primary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                          </svg>
                          <span className="leading-relaxed">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                );
              })()}

              {chatMessages.map((msg, i) => (
                <div key={i} className="space-y-2 animate-slide-up" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                  <div
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start items-start gap-2"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 ring-1 ring-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-1" aria-hidden="true">
                        DC
                      </div>
                    )}
                    <div
                      className={`group/msg relative rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user"
                        ? "max-w-[85%] lg:max-w-2xl xl:max-w-3xl bg-gradient-to-br from-primary to-primary/85 text-primary-foreground rounded-br-md shadow-sm shadow-primary/20"
                        : `max-w-[85%] lg:max-w-2xl xl:max-w-3xl pe-12 bg-[#FAF9F7] dark:bg-muted/20 border border-border/40 border-l-2 border-l-primary/50 shadow-sm shadow-black/[0.03] ${CHAT_PROSE_CLASSES}`
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
                          <MarkdownRenderer content={msg.content} sources={msg.sources} />
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
                    <details className="max-w-[85%] lg:max-w-2xl xl:max-w-3xl ms-8 group/details">
                      <summary className="cursor-pointer select-none list-none flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                        <svg className="h-3 w-3 shrink-0 transition-transform group-open/details:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <svg className="h-3 w-3 shrink-0 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {msg.sources.length} {msg.sources.length === 1 ? "source" : "sources"}
                      </summary>
                      <div className="mt-1.5">
                        <SourcePanel sources={msg.sources} />
                      </div>
                    </details>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />

              {chatError && (
                <p className="text-sm text-destructive text-center">{chatError}</p>
              )}
                </div>
              </div>
            </div>
          </div>

          {data.permissions === "chat" && (
            <div className="border-t bg-card/80 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
              <form onSubmit={handleSendMessage} className="mx-auto max-w-7xl flex gap-2 px-4 sm:px-6 py-3 lg:ps-[calc(16rem+1.5rem+1.5rem)]">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about this document..."
                  disabled={chatLoading}
                  autoComplete="off"
                  aria-label="Ask a question about this document"
                  className="flex-1 h-12 rounded-xl border border-border/50 bg-muted/30 px-4 text-base sm:text-sm shadow-inner shadow-black/[0.03] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background focus:shadow-none transition-all"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  aria-label="Send message"
                  className="h-12 w-12 shrink-0 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center"
                >
                  {chatLoading ? (
                    <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  ) : (
                    <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
            {activeTab === "notes" && (
              <div className="space-y-4">
                {data.notes.length === 0 && (
                  <div className="flex flex-col items-center py-16 text-center">
                    <svg className="h-10 w-10 text-muted-foreground/60 dark:text-muted-foreground/50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                    <svg className="h-10 w-10 text-muted-foreground/60 dark:text-muted-foreground/50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

      <footer className={`border-t border-primary/10 bg-card/80 backdrop-blur-sm py-3 shrink-0 ${activeTab === "chat" ? "hidden" : ""}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 text-center sm:text-left">
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
            <a href="https://github.com/Medy-gribkov" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
              GitHub
            </a>
            <a href="https://linkedin.com/in/medygribkov" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              LinkedIn
            </a>
            <a href="/Medy-Gribkov-Resume.pdf" download className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Resume
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

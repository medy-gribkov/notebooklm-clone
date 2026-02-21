"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Message, Note, StudioGeneration } from "@/types";

interface SharedData {
  notebook: { id: string; title: string; description: string | null; created_at: string };
  permissions: "view" | "chat";
  messages: Omit<Message, "notebook_id" | "user_id">[];
  notes: Omit<Note, "notebook_id" | "updated_at">[];
  generations: Omit<StudioGeneration, "notebook_id" | "user_id">[];
}

type Tab = "chat" | "notes" | "studio";

export default function SharedNotebookPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatError(null);
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch(`/api/shared/${token}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, { role: "user", content: userMsg }],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setChatError(body.error || "Failed to send message");
        setChatLoading(false);
        return;
      }

      // Read streaming response
      const reader = res.body?.getReader();
      if (!reader) {
        setChatError("No response stream");
        setChatLoading(false);
        return;
      }

      let assistantContent = "";
      setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Extract text from SSE data stream
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("0:")) {
            // ai SDK data stream text chunk
            const text = JSON.parse(line.slice(2));
            assistantContent += text;
            setChatMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantContent };
              return updated;
            });
          }
        }
      }
    } catch {
      setChatError("Failed to send message. Please try again.");
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground">Loading shared notebook...</span>
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Shared
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Notebook info */}
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold">{data.notebook.title}</h1>
        {data.notebook.description && (
          <p className="text-muted-foreground mt-1">{data.notebook.description}</p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-muted-foreground">
            Shared {new Date(data.notebook.created_at).toLocaleDateString()}
          </span>
          {data.permissions === "chat" && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Chat enabled
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
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

      {/* Content */}
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {activeTab === "chat" && (
          <div className="space-y-4">
            {chatMessages.length === 0 && (
              <p className="text-muted-foreground text-center py-12">
                No chat messages yet.
              </p>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content || (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                      Thinking...
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />

            {chatError && (
              <p className="text-sm text-destructive text-center">{chatError}</p>
            )}

            {data.permissions === "chat" && (
              <form onSubmit={handleSendMessage} className="flex gap-2 pt-4 border-t">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about this document..."
                  disabled={chatLoading}
                  className="flex-1 h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            )}

            {data.permissions === "view" && chatMessages.length > 0 && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  This notebook is shared as view-only.{" "}
                  <a href="/login" className="text-primary hover:underline underline-offset-2">
                    Sign up
                  </a>{" "}
                  to create your own notebooks and chat.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-4">
            {data.notes.length === 0 && (
              <p className="text-muted-foreground text-center py-12">No notes.</p>
            )}
            {data.notes.map((note) => (
              <div key={note.id} className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">{note.title}</h3>
                <div
                  className="mt-2 text-sm text-muted-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === "studio" && (
          <div className="space-y-4">
            {data.generations.length === 0 && (
              <p className="text-muted-foreground text-center py-12">
                No studio outputs.
              </p>
            )}
            {data.generations.map((gen) => (
              <div key={gen.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {gen.action}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(gen.created_at).toLocaleDateString()}
                  </span>
                </div>
                <pre className="text-sm overflow-auto max-h-64 bg-muted rounded-lg p-3">
                  {JSON.stringify(gen.result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <footer className="border-t bg-card/50 py-4">
        <div className="mx-auto max-w-5xl px-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Shared via DocChat
          </p>
          <a
            href="/login"
            className="text-xs text-primary font-medium hover:underline underline-offset-2"
          >
            Sign up for full access
          </a>
        </div>
      </footer>
    </div>
  );
}

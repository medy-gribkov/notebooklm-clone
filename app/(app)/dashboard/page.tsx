"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UploadZone } from "@/components/upload-zone";
import { NotebookCard } from "@/components/notebook-card";
import { Button } from "@/components/ui/button";
import type { Notebook } from "@/types";

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const POLL_DELAYS = [5000, 10000, 20000, 30000];

function isTimedOut(notebook: Notebook): boolean {
  return (
    notebook.status === "processing" &&
    Date.now() - new Date(notebook.created_at).getTime() > PROCESSING_TIMEOUT_MS
  );
}

export default function DashboardPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const pollAttemptRef = useRef(0);

  useEffect(() => {
    fetch("/api/notebooks")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setNotebooks(data);
        setLoading(false);
      });

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function handleNotebookCreated(notebook: Notebook) {
    setNotebooks((prev) => [notebook, ...prev]);
  }

  function handleNotebookDeleted(id: string) {
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
  }

  // Poll processing notebooks with exponential backoff: 5s → 10s → 20s → 30s cap
  useEffect(() => {
    const processing = notebooks.filter(
      (n) => n.status === "processing" && !isTimedOut(n)
    );

    if (processing.length === 0) {
      pollAttemptRef.current = 0;
      return;
    }

    const delay = POLL_DELAYS[Math.min(pollAttemptRef.current, POLL_DELAYS.length - 1)];

    const timeout = setTimeout(() => {
      pollAttemptRef.current++;
      Promise.all(
        processing.map((n) =>
          fetch(`/api/notebooks/${n.id}`).then((r) => r.json())
        )
      ).then((updates) => {
        setNotebooks((prev) =>
          prev.map((n) => {
            const updated = updates.find((u) => u.id === n.id);
            return updated ?? n;
          })
        );
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [notebooks]);

  const readyCount = notebooks.filter((n) => n.status === "ready").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-base font-semibold tracking-tight">DocChat</span>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="hidden sm:block text-xs text-muted-foreground">
                {userEmail}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-10">
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Upload a PDF
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Text-based PDFs only. Up to 5 MB. Processing takes 15–60 seconds.
            </p>
          </div>
          <UploadZone onNotebookCreated={handleNotebookCreated} />
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Your Notebooks
            </h2>
            {!loading && notebooks.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {readyCount} of {notebooks.length} ready
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl border bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          ) : notebooks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-14 text-center">
              <svg className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-muted-foreground">No notebooks yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a PDF above to start chatting with your document.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {notebooks.map((notebook) => (
                <NotebookCard
                  key={notebook.id}
                  notebook={notebook}
                  timedOut={isTimedOut(notebook)}
                  onDelete={handleNotebookDeleted}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="border-t pt-6">
          <p className="text-xs text-muted-foreground text-center">
            Processing large PDFs may take up to 60 seconds due to Gemini rate limits.
            Scanned PDFs without a text layer are not supported.
          </p>
        </footer>
      </main>
    </div>
  );
}

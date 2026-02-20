"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UploadZone } from "@/components/upload-zone";
import { NotebookCard } from "@/components/notebook-card";
import { Button } from "@/components/ui/button";
import type { Notebook } from "@/types";

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_DELAYS = [5000, 10000, 20000, 30000];

function isTimedOut(notebook: Notebook): boolean {
  return (
    notebook.status === "processing" &&
    Date.now() - new Date(notebook.created_at).getTime() > PROCESSING_TIMEOUT_MS
  );
}

export default function DashboardPage() {
  const router = useRouter();
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
  const processingCount = notebooks.filter((n) => n.status === "processing" && !isTimedOut(n)).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight">DocChat</span>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {userEmail[0].toUpperCase()}
                </div>
                <span className="text-xs text-muted-foreground max-w-[160px] truncate">
                  {userEmail}
                </span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
        {/* Stats row */}
        {!loading && notebooks.length > 0 && (
          <div className="grid grid-cols-3 gap-3 animate-fade-in">
            <StatCard
              label="Total"
              value={notebooks.length}
              icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            />
            <StatCard
              label="Ready"
              value={readyCount}
              icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              accent
            />
            <StatCard
              label="Processing"
              value={processingCount}
              icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            />
          </div>
        )}

        {/* Upload section */}
        <section className="animate-slide-up [animation-delay:100ms]">
          <div className="mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Upload a PDF
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Text-based PDFs only. Up to 5 MB. Processing takes 15-60 seconds.
            </p>
          </div>
          <UploadZone onNotebookCreated={handleNotebookCreated} onNavigate={(path) => router.push(path)} />
        </section>

        {/* Notebooks section */}
        <section className="animate-slide-up [animation-delay:200ms]">
          <div className="flex items-baseline justify-between mb-4">
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
                  className="h-[120px] rounded-xl border bg-card animate-shimmer"
                />
              ))}
            </div>
          ) : notebooks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/5">
                <svg className="h-7 w-7 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium">No notebooks yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a PDF above to start chatting with your document.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {notebooks.map((notebook, i) => (
                <div
                  key={notebook.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <NotebookCard
                    notebook={notebook}
                    timedOut={isTimedOut(notebook)}
                    onDelete={handleNotebookDeleted}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="border-t pt-6 pb-4">
          <p className="text-xs text-muted-foreground/60 text-center">
            Processing large PDFs may take up to 60 seconds due to rate limits.
            Scanned PDFs without a text layer are not supported.
          </p>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`${accent ? "text-primary" : "text-muted-foreground"}`}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

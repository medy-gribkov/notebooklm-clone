"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UploadZone } from "@/components/upload-zone";
import { NotebookCard } from "@/components/notebook-card";
import { Button } from "@/components/ui/button";
import type { Notebook } from "@/types";

export default function DashboardPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotebooks();
  }, []);

  async function fetchNotebooks() {
    const res = await fetch("/api/notebooks");
    if (res.ok) {
      const data = await res.json();
      setNotebooks(data);
    }
    setLoading(false);
  }

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

  // Poll processing notebooks every 5s
  useEffect(() => {
    const processing = notebooks.filter((n) => n.status === "processing");
    if (processing.length === 0) return;

    const interval = setInterval(async () => {
      const updates = await Promise.all(
        processing.map((n) =>
          fetch(`/api/notebooks/${n.id}`).then((r) => r.json())
        )
      );
      setNotebooks((prev) =>
        prev.map((n) => {
          const updated = updates.find((u) => u.id === n.id);
          return updated ?? n;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [notebooks]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">NotebookLM Clone</h1>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            New Notebook
          </h2>
          <UploadZone onNotebookCreated={handleNotebookCreated} />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Your Notebooks
          </h2>

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
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              <p className="text-sm">No notebooks yet. Upload a PDF to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {notebooks.map((notebook) => (
                <NotebookCard
                  key={notebook.id}
                  notebook={notebook}
                  onDelete={handleNotebookDeleted}
                />
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground text-center">
          Note: This app uses Supabase free tier, which pauses after 1 week of inactivity.
          Processing large PDFs may take a few minutes due to Gemini rate limits.
        </p>
      </main>
    </div>
  );
}

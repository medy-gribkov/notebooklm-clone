"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UploadZone } from "@/components/upload-zone";
import { NotebookCard } from "@/components/notebook-card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserDropdown } from "@/components/user-dropdown";
import type { Notebook, NotebookFile } from "@/types";
import { useTranslations } from "next-intl";

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_DELAYS = [5000, 10000, 20000, 30000];

function isTimedOut(notebook: Notebook): boolean {
  return (
    notebook.status === "processing" &&
    Date.now() - new Date(notebook.created_at).getTime() > PROCESSING_TIMEOUT_MS
  );
}

function getFirstName(email: string): string {
  const local = email.split("@")[0];
  const name = local.replace(/[._-]/g, " ").split(" ")[0];
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export default function DashboardPage() {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notebookFiles, setNotebookFiles] = useState<Record<string, NotebookFile[]>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const pollAttemptRef = useRef(0);
  const t = useTranslations("dashboard");

  useEffect(() => {
    fetch("/api/notebooks?include=files")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.notebooks) {
            // Batch response: { notebooks, filesByNotebook }
            setNotebooks(data.notebooks);
            setNotebookFiles(data.filesByNotebook ?? {});
          } else {
            // Fallback: plain array
            setNotebooks(data);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleCreateNotebook() {
    setCreatingNotebook(true);
    try {
      const res = await fetch("/api/notebooks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Notebook" }),
      });
      if (res.ok) {
        const notebook = await res.json();
        router.push(`/notebook/${notebook.id}`);
      }
    } finally {
      setCreatingNotebook(false);
    }
  }

  function handleNotebookCreated(notebook: Notebook) {
    setNotebooks((prev) => [notebook, ...prev]);
  }

  function handleNotebookDeleted(id: string) {
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
    setNotebookFiles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
            const updated = updates.find((u: Notebook) => u.id === n.id);
            return updated ?? n;
          })
        );
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [notebooks]);

  const readyCount = notebooks.filter((n) => n.status === "ready").length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {userEmail && <UserDropdown email={userEmail} />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-5 flex-1 w-full">
        {/* Welcome + Actions */}
        <section className="animate-slide-up [animation-delay:100ms]">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                {userEmail ? t("welcomeBack", { name: getFirstName(userEmail) }) : t("welcomeBackGeneric")}
              </h1>
              {!loading && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {notebooks.length === 0
                    ? t("emptyState")
                    : t("readyCount", { count: readyCount })}
                </p>
              )}
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateNotebook}
              disabled={creatingNotebook}
              className="gap-1.5 shrink-0"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {creatingNotebook ? t("creating") : t("newNotebook")}
            </Button>
          </div>
          <UploadZone onNotebookCreated={handleNotebookCreated} onNavigate={(path) => router.push(path)} />
        </section>

        {/* Notebooks */}
        <section className="animate-slide-up [animation-delay:200ms]">
          {notebooks.length > 0 && (
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("yourNotebooks")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {t("readyOf", { ready: readyCount, total: notebooks.length })}
              </span>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[88px] rounded-xl border bg-card animate-shimmer"
                  style={{ animationDelay: `${(i - 1) * 150}ms` }}
                />
              ))}
            </div>
          ) : notebooks.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {notebooks.map((notebook, i) => (
                <div
                  key={notebook.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <NotebookCard
                    notebook={notebook}
                    files={notebookFiles[notebook.id] ?? []}
                    timedOut={isTimedOut(notebook)}
                    onDelete={handleNotebookDeleted}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </main>

      <footer className="border-t py-5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <a href="https://github.com/medy-gribkov" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-muted-foreground transition-colors" aria-label="GitHub">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a href="https://medygribkov.vercel.app" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-muted-foreground transition-colors" aria-label="Portfolio">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
            </a>
          </div>
          <p className="text-xs text-muted-foreground/40">
            Built by{" "}
            <a href="https://medygribkov.vercel.app" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
              Medy Gribkov
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

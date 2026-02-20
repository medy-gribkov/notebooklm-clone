"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotebookCard } from "@/components/notebook-card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserDropdown } from "@/components/user-dropdown";
import { featuredNotebooks } from "@/lib/featured-notebooks";
import type { Notebook, NotebookFile } from "@/types";
import { useTranslations } from "next-intl";

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_DELAYS = [5000, 10000, 20000, 30000];

type SortKey = "newest" | "oldest" | "az" | "za";

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
  const [creatingFeatured, setCreatingFeatured] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const pollAttemptRef = useRef(0);
  const t = useTranslations("dashboard");
  const tf = useTranslations("featured");

  useEffect(() => {
    fetch("/api/notebooks?include=files")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.notebooks) {
            setNotebooks(data.notebooks);
            setNotebookFiles(data.filesByNotebook ?? {});
          } else {
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

  async function handleCreateFeatured(titleKey: string, descKey: string) {
    setCreatingFeatured(titleKey);
    try {
      const title = tf(titleKey);
      const description = tf(descKey);
      const res = await fetch("/api/notebooks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        const notebook = await res.json();
        router.push(`/notebook/${notebook.id}`);
      }
    } finally {
      setCreatingFeatured(null);
    }
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

  // Filtered + sorted notebooks
  const filteredNotebooks = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return notebooks
      .filter((n) => {
        if (!query) return true;
        return (
          n.title.toLowerCase().includes(query) ||
          (n.description?.toLowerCase().includes(query) ?? false)
        );
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "oldest":
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case "az":
            return a.title.localeCompare(b.title);
          case "za":
            return b.title.localeCompare(a.title);
          case "newest":
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
  }, [notebooks, searchQuery, sortBy]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "newest", label: t("sortNewest") },
    { key: "oldest", label: t("sortOldest") },
    { key: "az", label: t("sortAZ") },
    { key: "za", label: t("sortZA") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-3">
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

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6 flex-1 w-full">
        {/* Welcome */}
        <section className="animate-slide-up [animation-delay:100ms]">
          <h1 className="text-display">
            {userEmail ? t("welcomeBack", { name: getFirstName(userEmail) }) : t("welcomeBackGeneric")}
          </h1>
          {!loading && notebooks.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {t("readyCount", { count: notebooks.filter(n => n.status === "ready").length })}
            </p>
          )}
        </section>

        {/* Featured notebooks */}
        <section className="animate-slide-up [animation-delay:150ms]">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">{t("featuredNotebooks")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {featuredNotebooks.map((fn) => (
              <button
                key={fn.titleKey}
                onClick={() => handleCreateFeatured(fn.titleKey, fn.descriptionKey)}
                disabled={creatingFeatured === fn.titleKey}
                className={`relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 bg-gradient-to-br ${fn.gradient} disabled:opacity-60`}
              >
                <FeaturedIcon type={fn.icon} />
                <div>
                  <p className="text-xs font-semibold leading-tight">{tf(fn.titleKey)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{tf(fn.descriptionKey)}</p>
                </div>
                {creatingFeatured === fn.titleKey && (
                  <span className="absolute top-2 right-2 h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Search + Sort */}
        {!loading && notebooks.length > 0 && (
          <section className="flex items-center gap-2 animate-slide-up [animation-delay:200ms]">
            <h2 className="text-title mr-auto">{t("yourNotebooks")}</h2>
            <div className="relative w-48">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search")}
                className="h-8 ps-9 text-xs"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-8 rounded-lg border bg-background px-2.5 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {sortOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </section>
        )}

        {/* Notebooks grid */}
        <section className="animate-slide-up [animation-delay:250ms]">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[96px] rounded-xl border bg-card animate-shimmer"
                  style={{ animationDelay: `${(i - 1) * 150}ms` }}
                />
              ))}
            </div>
          ) : notebooks.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center py-16 text-center animate-fade-in">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/5">
                <svg className="h-10 w-10 text-primary/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-heading mb-1">{t("emptyTitle")}</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                {t("emptyDescription")}
              </p>
            </div>
          ) : filteredNotebooks.length === 0 ? (
            /* No results for search */
            <div className="flex flex-col items-center py-12 text-center animate-fade-in">
              <svg className="h-10 w-10 text-muted-foreground/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm text-muted-foreground">{t("noResults")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Create new notebook card */}
              <button
                onClick={handleCreateNotebook}
                disabled={creatingNotebook}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-transparent p-6 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/[0.02] transition-all duration-200 min-h-[96px] cursor-pointer disabled:opacity-50"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-medium">
                  {creatingNotebook ? t("creating") : t("newNotebook")}
                </span>
              </button>

              {filteredNotebooks.map((notebook, i) => (
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
          )}
        </section>
      </main>

      <footer className="border-t py-4">
        <p className="text-center text-xs text-muted-foreground/40">
          Built by{" "}
          <a href="https://medygribkov.vercel.app" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
            Medy Gribkov
          </a>
        </p>
      </footer>
    </div>
  );
}

function FeaturedIcon({ type }: { type: string }) {
  const cls = "h-6 w-6";
  switch (type) {
    case "rocket":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841M3.75 21L6 18.75M8.25 21L6 18.75M3.75 18.75L6 21" />
        </svg>
      );
    case "research":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      );
    case "meeting":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      );
    case "study":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
      );
    default:
      return null;
  }
}

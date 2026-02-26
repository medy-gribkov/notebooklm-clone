"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotebookCard } from "@/components/notebook-card";
import { Mascot } from "@/components/mascot";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserDropdown } from "@/components/user-dropdown";
import { featuredNotebooks, CATEGORIES } from "@/lib/featured-notebooks";
import type { FeaturedNotebook } from "@/lib/featured-notebooks";
import { useToast } from "@/components/toast";
import { Logo } from "@/components/logo";
import { LanguageToggle } from "@/components/language-toggle";
import type { Notebook, NotebookFile } from "@/types";
import { useTranslations, useLocale } from "next-intl";


const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_DELAYS = [5000, 10000, 20000, 30000];
const INITIAL_VISIBLE = 12;

type SortKey = "newest" | "oldest" | "az" | "za";
type TabKey = "all" | "mine" | "featured";
type GridDensity = "compact" | "default" | "spacious";

function isTimedOut(notebook: Notebook): boolean {
  return (
    notebook.status === "processing" &&
    Date.now() - new Date(notebook.created_at).getTime() > PROCESSING_TIMEOUT_MS
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notebookFiles, setNotebookFiles] = useState<Record<string, NotebookFile[]>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [gridDensity, setGridDensity] = useState<GridDensity>("default");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAllFeatured, setShowAllFeatured] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("grid-density") as GridDensity;
    if (saved) setGridDensity(saved);
  }, []);
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
      const meta = data.user?.user_metadata;
      if (meta?.avatar_url) {
        if (typeof meta.avatar_url === "string" && meta.avatar_url.startsWith("http")) {
          setUserAvatar(meta.avatar_url);
        } else if (typeof meta.avatar_url === "string") {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          setUserAvatar(`${supabaseUrl}/storage/v1/object/public/avatars/${meta.avatar_url}`);
        }
      }
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
        addToast(t("notebookCreated"));
        router.push(`/notebook/${notebook.id}`);
      }
    } finally {
      setCreatingNotebook(false);
    }
  }

  const [cloningSlug, setCloningSlug] = useState<string | null>(null);

  async function handleOpenFeatured(slug: string) {
    if (cloningSlug) return;
    setCloningSlug(slug);
    try {
      const res = await fetch("/api/notebooks/clone-featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Clone failed");
      }
      const { notebookId } = await res.json();
      router.push(`/notebook/${notebookId}`);
    } catch {
      addToast(t("cloneFailed"), "error");
      setCloningSlug(null);
    }
  }

  function handleNotebookDeleted(id: string) {
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
    setNotebookFiles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    addToast(t("notebookDeleted"));
  }

  // Polling for processing notebooks
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
          fetch(`/api/notebooks/${n.id}`).then((r) => r.ok ? r.json() : n).catch(() => n)
        )
      ).then((updates) => {
        setNotebooks((prev) =>
          prev.map((n) => {
            const updated = updates.find((u: Notebook) => u.id === n.id);
            return updated ?? n;
          })
        );
      }).catch(() => {});
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

  // Filtered featured notebooks
  const filteredFeatured = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return featuredNotebooks.filter((fn) => {
      const matchesCategory = selectedCategory === "All" || fn.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      const title = tf(fn.titleKey).toLowerCase();
      const desc = tf(fn.descriptionKey).toLowerCase();
      return title.includes(query) || desc.includes(query) || fn.category.toLowerCase().includes(query);
    });
  }, [searchQuery, selectedCategory, tf]);

  const visibleFeatured = showAllFeatured ? filteredFeatured : filteredFeatured.slice(0, INITIAL_VISIBLE);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "newest", label: t("sortNewest") },
    { key: "oldest", label: t("sortOldest") },
    { key: "az", label: t("sortAZ") },
    { key: "za", label: t("sortZA") },
  ];

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: t("tabAll") },
    { key: "mine", label: t("tabMine") },
    { key: "featured", label: t("tabFeatured") },
  ];

  const showFeatured = activeTab === "all" || activeTab === "featured";
  const showRecent = activeTab === "all" || activeTab === "mine";

  const gridColsClass =
    gridDensity === "compact"
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      : gridDensity === "spacious"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

  function handleDensityChange(d: GridDensity) {
    setGridDensity(d);
    localStorage.setItem("grid-density", d);
  }

  // Search handler (direct, no debounce needed for in-memory filtering)
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b border-border/40">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            {userEmail && <UserDropdown email={userEmail} avatarUrl={userAvatar} />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Search bar - prominent, full width */}
        <div className="relative animate-slide-up">
          <svg className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("search")}
            className="h-12 ps-12 text-base sm:text-sm rounded-xl"
          />
        </div>

        {/* Tab bar + Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-0 animate-slide-up [animation-delay:50ms]">
          {/* Tabs */}
          <div className="flex gap-0 flex-1 border-b border-border/40">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 min-h-[44px] text-sm font-medium transition-all duration-200 relative ${activeTab === tab.key
                  ? "text-foreground after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:bg-primary after:rounded-full"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            {/* Grid density toggle - hidden on mobile */}
            <div className="hidden sm:flex items-center rounded-lg border bg-background">
              {(["compact", "default", "spacious"] as GridDensity[]).map((d) => (
                <button
                  key={d}
                  onClick={() => handleDensityChange(d)}
                  className={`h-10 w-10 flex items-center justify-center transition-all duration-300 ease-out ${gridDensity === d ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    } ${d === "compact" ? "rounded-s-lg" : d === "spacious" ? "rounded-e-lg" : ""}`}
                  title={d.charAt(0).toUpperCase() + d.slice(1)}
                  aria-label={`${d} grid layout`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    {d === "compact" ? (
                      <>
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </>
                    ) : d === "default" ? (
                      <>
                        <rect x="3" y="3" width="8" height="8" rx="1" />
                        <rect x="13" y="3" width="8" height="8" rx="1" />
                        <rect x="3" y="13" width="8" height="8" rx="1" />
                        <rect x="13" y="13" width="8" height="8" rx="1" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="3" width="18" height="8" rx="1" />
                        <rect x="3" y="13" width="18" height="8" rx="1" />
                      </>
                    )}
                  </svg>
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-10 rounded-lg border bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {sortOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNotebook}
              disabled={creatingNotebook}
              className="gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">{creatingNotebook ? t("creating") : t("createNew")}</span>
              <span className="sm:hidden">+</span>
            </Button>
          </div>
        </div>

        {/* Featured notebooks section */}
        {showFeatured && (
          <FeaturedSection
            notebooks={filteredFeatured}
            visibleNotebooks={visibleFeatured}
            showAll={showAllFeatured}
            onToggleShowAll={() => setShowAllFeatured(!showAllFeatured)}
            totalCount={filteredFeatured.length}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onOpenFeatured={handleOpenFeatured}
            cloningSlug={cloningSlug}
            t={t}
            tf={tf}
          />
        )}

        {/* Recent notebooks section */}
        {showRecent && (
          <section className="animate-slide-up [animation-delay:150ms]">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-title flex-1">{t("recentNotebooks")}</h2>
            </div>

            {/* Grid */}
            {loading ? (
              <div className={`grid gap-4 ${gridColsClass}`}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-[140px] rounded-2xl border bg-card animate-shimmer"
                    style={{ animationDelay: `${(i - 1) * 150}ms` }}
                  />
                ))}
              </div>
            ) : notebooks.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center animate-fade-in">
                <div className="mb-8">
                  <Mascot size="lg" mood="neutral" />
                </div>
                <h2 className="text-xl font-bold mb-2">{t("emptyTitle")}</h2>
                <p className="text-sm text-muted-foreground mb-3 max-w-sm">
                  {t("emptyDescription")}
                </p>
                <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground/50">
                  <span className="bg-muted/50 rounded-full px-2.5 py-1">PDF</span>
                  <span className="bg-muted/50 rounded-full px-2.5 py-1">DOCX</span>
                  <span className="bg-muted/50 rounded-full px-2.5 py-1">TXT</span>
                  <span className="bg-muted/50 rounded-full px-2.5 py-1">Images</span>
                </div>
                <Button onClick={handleCreateNotebook} disabled={creatingNotebook} size="lg" className="shadow-md shadow-primary/20">
                  {creatingNotebook ? t("creating") : t("createNew")}
                </Button>
              </div>
            ) : filteredNotebooks.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center animate-fade-in">
                <div className="mb-4 opacity-70">
                  <Mascot size="md" mood="surprised" />
                </div>
                <p className="text-sm text-muted-foreground">{t("noResults")}</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${gridColsClass}`}>
                {/* Create new notebook card */}
                <button
                  onClick={handleCreateNotebook}
                  disabled={creatingNotebook}
                  className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] p-6 text-primary hover:border-primary/50 hover:from-primary/[0.05] hover:to-primary/[0.12] transition-all duration-300 ease-out min-h-[190px] h-full cursor-pointer disabled:opacity-50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.01]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-transform group-hover:scale-110">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">
                    {creatingNotebook ? t("creating") : t("createNewNotebook")}
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
        )}
      </main>

      <footer className="border-t py-6">
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

function FeaturedSection({
  notebooks,
  visibleNotebooks,
  showAll,
  onToggleShowAll,
  totalCount,
  selectedCategory,
  onSelectCategory,
  onOpenFeatured,
  cloningSlug,
  t,
  tf,
}: {
  notebooks: FeaturedNotebook[];
  visibleNotebooks: FeaturedNotebook[];
  showAll: boolean;
  onToggleShowAll: () => void;
  totalCount: number;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onOpenFeatured: (slug: string) => void;
  cloningSlug: string | null;
  t: (key: string) => string;
  tf: (key: string) => string;
}) {
  return (
    <section className="animate-slide-up [animation-delay:100ms]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("featuredNotebooks")}</h2>
        <span className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? "company" : "companies"}
        </span>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`shrink-0 min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of featured cards */}
      {visibleNotebooks.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center animate-fade-in">
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleNotebooks.map((fn, i) => (
              <FeaturedCard
                key={fn.slug}
                notebook={fn}
                index={i}
                isCloning={cloningSlug === fn.slug}
                onOpen={() => onOpenFeatured(fn.slug)}
                tf={tf}
              />
            ))}
          </div>

          {/* Show more / Show less */}
          {totalCount > INITIAL_VISIBLE && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={onToggleShowAll}
                className="min-h-[44px]"
              >
                {showAll
                  ? t("showLess")
                  : `${t("showMore")} (${totalCount - INITIAL_VISIBLE})`}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const FeaturedCard = React.memo(function FeaturedCard({
  notebook: fn,
  index,
  isCloning,
  onOpen,
  tf,
}: {
  notebook: FeaturedNotebook;
  index: number;
  isCloning: boolean;
  onOpen: () => void;
  tf: (key: string) => string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onOpen}
      disabled={isCloning}
      className={`relative shrink-0 rounded-2xl overflow-hidden group hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 featured-shadow cursor-pointer border-0 text-start w-full disabled:opacity-70 ${fn.bgClass}`}
      style={{
        height: 200,
        animationDelay: `${index * 40}ms`,
      }}
    >
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-[0.04]">
        <CardPattern pattern={fn.pattern} />
      </div>
      <div className="absolute inset-0 featured-mesh opacity-50 mix-blend-overlay" />

      {/* Company logo (Clearbit) with initial fallback - top right */}
      {fn.website && (
        <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-10">
          {!imgError ? (
            <img
              src={`https://logo.clearbit.com/${fn.website}`}
              alt={tf(fn.titleKey)}
              className="h-8 w-8 rounded-lg bg-white/90 p-0.5 shadow-sm"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary/90 shadow-sm flex items-center justify-center text-primary-foreground text-xs font-bold">
              {tf(fn.titleKey).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Category badge */}
      <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4 z-10">
        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md bg-black/10 dark:bg-white/10 backdrop-blur-sm">
          {fn.category}
        </span>
      </div>

      {/* Loading indicator */}
      {isCloning && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-2xl">
          <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Content (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <h3 className="font-bold text-lg sm:text-xl tracking-tight leading-tight mb-1.5 drop-shadow-sm">
          {tf(fn.titleKey)}
        </h3>
        <p className="text-xs sm:text-sm font-medium leading-snug opacity-75 line-clamp-2">
          {tf(fn.descriptionKey)}
        </p>
      </div>
    </button>
  );
});

function CardPattern({ pattern }: { pattern: string }) {
  switch (pattern) {
    case "circles":
      return (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20%" cy="30%" r="60" fill="white" />
          <circle cx="80%" cy="20%" r="40" fill="white" />
          <circle cx="60%" cy="70%" r="80" fill="white" />
          <circle cx="10%" cy="80%" r="30" fill="white" />
        </svg>
      );
    case "grid":
      return (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="1.5" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      );
    case "waves":
      return (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 320 200">
          <path d="M0 80 Q80 40 160 80 T320 80 V200 H0Z" fill="white" />
          <path d="M0 120 Q80 80 160 120 T320 120 V200 H0Z" fill="white" />
          <path d="M0 160 Q80 120 160 160 T320 160 V200 H0Z" fill="white" />
        </svg>
      );
    case "dots":
      return (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="2.5" fill="white" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      );
    case "hexagons":
      return (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="hex" width="50" height="43.3" patternUnits="userSpaceOnUse" patternTransform="scale(1.2)"><polygon points="25,0 50,14.4 50,28.9 25,43.3 0,28.9 0,14.4" fill="none" stroke="white" strokeWidth="1.5" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#hex)" />
        </svg>
      );
    case "triangles":
      return (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" preserveAspectRatio="none">
          <polygon points="0,200 160,0 320,200" fill="none" stroke="white" strokeWidth="2" />
          <polygon points="60,200 160,60 260,200" fill="none" stroke="white" strokeWidth="1.5" />
          <polygon points="120,200 160,120 200,200" fill="none" stroke="white" strokeWidth="1" />
        </svg>
      );
    case "lines":
      return (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="lines" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="12" stroke="white" strokeWidth="2" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#lines)" />
        </svg>
      );
    case "diamond":
      return (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="diamond" width="30" height="30" patternUnits="userSpaceOnUse"><polygon points="15,0 30,15 15,30 0,15" fill="none" stroke="white" strokeWidth="1.5" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#diamond)" />
        </svg>
      );
    default:
      return null;
  }
}

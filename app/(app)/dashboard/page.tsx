"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserDropdown } from "@/components/user-dropdown";
import { featuredNotebooks, CATEGORIES } from "@/lib/featured-notebooks";
import type { FeaturedNotebook } from "@/lib/featured-notebooks";
import { useToast } from "@/components/toast";
import { Logo } from "@/components/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { CompanyLogo } from "@/components/company-logo";
import { SearchBar } from "@/components/dashboard/search-bar";
import { TabBar, type TabKey } from "@/components/dashboard/tab-bar";
import { Toolbar, type GridDensity, type SortKey } from "@/components/dashboard/toolbar";
import { RecentNotebooks } from "@/components/dashboard/recent-notebooks";
import { AdminQuickCreate } from "@/components/dashboard/admin-quick-create";
import type { Notebook, NotebookFile } from "@/types";
import { useTranslations } from "next-intl";

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000];
const INITIAL_VISIBLE = 8;

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
  const [companyByNotebook, setCompanyByNotebook] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [gridDensity, setGridDensity] = useState<GridDensity>("default");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [cloningSlug, setCloningSlug] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("grid-density") as GridDensity;
    if (saved) setGridDensity(saved);
  }, []);

  const pollAttemptRef = useRef(0);
  const t = useTranslations("dashboard");
  const tf = useTranslations("featured");

  // Initial data fetch
  useEffect(() => {
    fetch("/api/notebooks?include=files")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.notebooks) {
            setNotebooks(data.notebooks);
            setNotebookFiles(data.filesByNotebook ?? {});
            setCompanyByNotebook(data.companyByNotebook ?? {});
          } else {
            setNotebooks(data);
          }
        } else {
          setFetchError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setLoading(false);
      });

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
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

  // Handlers
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

  function handleDensityChange(d: GridDensity) {
    setGridDensity(d);
    localStorage.setItem("grid-density", d);
  }

  const [searchInput, setSearchInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(value), 300);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Memos
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-30 border-b border-border/40">
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
        {userId && <AdminQuickCreate userId={userId} />}

        <SearchBar value={searchInput} onChange={handleSearchChange} placeholder={t("search")} />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-0 animate-slide-up [animation-delay:50ms]">
          <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          <Toolbar
            gridDensity={gridDensity}
            onGridDensityChange={handleDensityChange}
            sortBy={sortBy}
            onSortChange={setSortBy}
            sortOptions={sortOptions}
            onCreateNotebook={handleCreateNotebook}
            creatingNotebook={creatingNotebook}
            createLabel={t("createNew")}
            creatingLabel={t("creating")}
          />
        </div>

        {showFeatured && (
          <FeaturedSection
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

        {fetchError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mb-4">
            {t("fetchError")}
            <button onClick={() => window.location.reload()} className="ml-2 underline hover:no-underline">
              {t("retry")}
            </button>
          </div>
        )}
        {showRecent && (
          <RecentNotebooks
            notebooks={notebooks}
            filteredNotebooks={filteredNotebooks}
            notebookFiles={notebookFiles}
            companyByNotebook={companyByNotebook}
            loading={loading}
            gridColsClass={gridColsClass}
            onCreateNotebook={handleCreateNotebook}
            creatingNotebook={creatingNotebook}
            onDelete={handleNotebookDeleted}
            isTimedOut={isTimedOut}
            t={t}
          />
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

// ── Featured Section (kept in same file since it uses CardPattern) ──────

function FeaturedSection({
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
          {totalCount} {totalCount === 1 ? "notebook" : "notebooks"}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`shrink-0 min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/70 text-muted-foreground border border-border/40 hover:bg-muted hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

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

          {totalCount > INITIAL_VISIBLE && (
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={onToggleShowAll} className="min-h-[44px]">
                {showAll ? t("showLess") : `${t("showMore")} (${totalCount - INITIAL_VISIBLE})`}
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
  return (
    <button
      onClick={onOpen}
      disabled={isCloning}
      className={`relative shrink-0 rounded-2xl overflow-hidden group hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 featured-shadow cursor-pointer border-0 text-start w-full disabled:opacity-70 ${fn.bgClass}`}
      style={{ height: 200, animationDelay: `${index * 25}ms` }}
    >
      <div className="absolute inset-0 opacity-[0.07]">
        <CardPattern pattern={fn.pattern} />
      </div>
      <div className="absolute inset-0 featured-mesh opacity-50 mix-blend-overlay" />

      {fn.website && (
        <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-10">
          <CompanyLogo domain={fn.website} name={tf(fn.titleKey)} size="md" eager={index < 8} />
        </div>
      )}

      <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4 z-10">
        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-md bg-black/10 dark:bg-white/10 backdrop-blur-sm">
          {fn.category}
        </span>
      </div>

      {isCloning && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-2xl">
          <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

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

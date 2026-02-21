"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotebookCard } from "@/components/notebook-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserDropdown } from "@/components/user-dropdown";
import { featuredNotebooks } from "@/lib/featured-notebooks";
import type { FeaturedNotebook } from "@/lib/featured-notebooks";
import { useToast } from "@/components/toast";
import { Logo } from "@/components/logo";
import type { Notebook, NotebookFile } from "@/types";
import { useTranslations } from "next-intl";
import {
  Rocket,
  Microscope,
  ClipboardList,
  BookOpen,
  BarChart3,
  Scale,
  Package,
  BookText,
  FileText,
} from "lucide-react";

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
const POLL_DELAYS = [5000, 10000, 20000, 30000];

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
  const [gridDensity, setGridDensity] = useState<GridDensity>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("grid-density") as GridDensity) || "default";
    }
    return "default";
  });
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
        addToast("Notebook created");
        router.push(`/notebook/${notebook.id}`);
      }
    } finally {
      setCreatingNotebook(false);
    }
  }

  function handleOpenFeatured(slug: string) {
    router.push(`/notebook/featured/${slug}`);
  }

  function handleNotebookDeleted(id: string) {
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
    setNotebookFiles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    addToast("Notebook deleted");
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

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: t("tabAll") },
    { key: "mine", label: t("tabMine") },
    { key: "featured", label: t("tabFeatured") },
  ];

  const showFeatured = activeTab === "all" || activeTab === "featured";
  const showRecent = activeTab === "all" || activeTab === "mine";

  const gridColsClass =
    gridDensity === "compact"
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
      : gridDensity === "spacious"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  function handleDensityChange(d: GridDensity) {
    setGridDensity(d);
    localStorage.setItem("grid-density", d);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {userEmail && <UserDropdown email={userEmail} avatarUrl={userAvatar} />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Tab bar + Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b pb-3 animate-slide-up [animation-delay:50ms]">
          {/* Tabs */}
          <div className="flex gap-1 flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.key
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            {/* Grid density toggle */}
            <div className="flex items-center rounded-lg border bg-background">
              {(["compact", "default", "spacious"] as GridDensity[]).map((d) => (
                <button
                  key={d}
                  onClick={() => handleDensityChange(d)}
                  className={`h-9 w-9 flex items-center justify-center transition-colors ${
                    gridDensity === d ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"
                  } ${d === "compact" ? "rounded-l-lg" : d === "spacious" ? "rounded-r-lg" : ""}`}
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
              className="h-9 rounded-lg border bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              {creatingNotebook ? t("creating") : t("createNew")}
            </Button>
          </div>
        </div>

        {/* Featured notebooks section */}
        {showFeatured && (
          <FeaturedCarousel
            notebooks={featuredNotebooks}
            activeTab={activeTab}
            onOpenFeatured={handleOpenFeatured}
            onSeeAll={() => setActiveTab("featured")}
            t={t}
            tf={tf}
          />
        )}

        {/* Recent notebooks section */}
        {showRecent && (
          <section className="animate-slide-up [animation-delay:150ms]">
            {/* Section header with search */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-title flex-1">{t("recentNotebooks")}</h2>
              {!loading && notebooks.length > 0 && (
                <div className="relative w-56">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("search")}
                    className="h-9 ps-9 text-sm"
                  />
                </div>
              )}
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
                <Button onClick={handleCreateNotebook} disabled={creatingNotebook}>
                  {creatingNotebook ? t("creating") : t("createNew")}
                </Button>
              </div>
            ) : filteredNotebooks.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center animate-fade-in">
                <svg className="h-10 w-10 text-muted-foreground/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm text-muted-foreground">{t("noResults")}</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${gridColsClass}`}>
                {/* Create new notebook card */}
                <button
                  onClick={handleCreateNotebook}
                  disabled={creatingNotebook}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-transparent p-6 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/[0.02] transition-all duration-200 min-h-[140px] cursor-pointer disabled:opacity-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">
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

      <footer className="border-t py-4">
        <p className="text-center text-xs text-muted-foreground/40">
          Built by{" "}
          <a href="https://mahdygribkov.vercel.app" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
            Mahdy Gribkov
          </a>
        </p>
      </footer>
    </div>
  );
}

function FeaturedCarousel({
  notebooks,
  activeTab,
  onOpenFeatured,
  onSeeAll,
  t,
  tf,
}: {
  notebooks: FeaturedNotebook[];
  activeTab: string;
  onOpenFeatured: (slug: string) => void;
  onSeeAll: () => void;
  t: (key: string) => string;
  tf: (key: string) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const CARD_WIDTH = 320;
  const GAP = 16;

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    const idx = Math.round(el.scrollLeft / (CARD_WIDTH + GAP));
    setActiveIndex(Math.min(idx, notebooks.length - 1));
  }, [notebooks.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState]);

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const amount = (CARD_WIDTH + GAP) * 2;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }

  function scrollToIndex(idx: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * (CARD_WIDTH + GAP), behavior: "smooth" });
  }

  return (
    <section className="animate-slide-up [animation-delay:100ms]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title">{t("featuredNotebooks")}</h2>
        <div className="flex items-center gap-2">
          {activeTab === "all" && (
            <button
              onClick={onSeeAll}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {t("seeAll")}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="relative group/carousel">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/90 border shadow-lg flex items-center justify-center text-foreground opacity-0 group-hover/carousel:opacity-100 transition-opacity -translate-x-1/2 hover:bg-background"
            aria-label="Scroll left"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/90 border shadow-lg flex items-center justify-center text-foreground opacity-0 group-hover/carousel:opacity-100 transition-opacity translate-x-1/2 hover:bg-background"
            aria-label="Scroll right"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Cards container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {notebooks.map((fn, i) => (
            <button
              key={fn.slug}
              onClick={() => onOpenFeatured(fn.slug)}
              className="relative shrink-0 rounded-xl overflow-hidden group hover:scale-[1.02] transition-transform featured-shadow cursor-pointer"
              style={{ width: CARD_WIDTH, height: 200, scrollSnapAlign: "start", animationDelay: `${i * 60}ms` }}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${fn.gradient}`} />
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-[0.08]">
                <CardPattern pattern={fn.pattern} />
              </div>
              {/* Mesh overlay */}
              <div className="absolute inset-0 featured-mesh" />

              {/* Large decorative icon */}
              <div className="absolute top-3 right-3 text-3xl opacity-30 z-10 drop-shadow-sm">
                <FeaturedIcon type={fn.icon} />
              </div>

              {/* Author badge (top-left) */}
              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                <div className="h-6 w-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-xs">
                  <FeaturedIcon type={fn.icon} />
                </div>
                <span className="text-xs font-medium text-white/90 drop-shadow-sm">
                  {fn.author}
                </span>
              </div>

              {/* Content (bottom) */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 via-black/30 to-transparent z-10">
                <h3 className="text-white font-semibold text-base leading-tight mb-1 drop-shadow-sm">
                  {tf(fn.titleKey)}
                </h3>
                <p className="text-white/70 text-xs leading-snug mb-2 line-clamp-2">
                  {tf(fn.descriptionKey)}
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>{fn.date}</span>
                  <span className="text-white/30">&middot;</span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {fn.sourceCount} sources
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-3">
          {notebooks.map((fn, i) => (
            <button
              key={fn.slug}
              onClick={() => scrollToIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
              }`}
              aria-label={`Go to ${tf(fn.titleKey)}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedIcon({ type }: { type: string }) {
  const props = { size: 28, className: "text-white/80" };
  switch (type) {
    case "rocket": return <Rocket {...props} />;
    case "research": return <Microscope {...props} />;
    case "meeting": return <ClipboardList {...props} />;
    case "study": return <BookOpen {...props} />;
    case "data": return <BarChart3 {...props} />;
    case "legal": return <Scale {...props} />;
    case "product": return <Package {...props} />;
    case "literature": return <BookText {...props} />;
    default: return <FileText {...props} />;
  }
}

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

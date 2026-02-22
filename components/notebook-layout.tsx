"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChatInterface } from "@/components/chat-interface";
import { SourcesPanel } from "@/components/sources-panel";

const StudioPanel = dynamic(
  () => import("@/components/studio-panel").then((m) => ({ default: m.StudioPanel })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    ),
  }
);
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { ShareDialog } from "@/components/share-dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Message, NotebookFile } from "@/types";

interface NotebookLayoutProps {
  notebookId: string;
  notebookTitle: string;
  notebookFiles: NotebookFile[];
  initialMessages: Message[];
  notebookDescription?: string | null;
  starterPrompts?: string[] | null;
}

export function NotebookLayout({ notebookId, notebookTitle, notebookFiles, initialMessages, notebookDescription, starterPrompts }: NotebookLayoutProps) {
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [studioOpen, setStudioOpen] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"sources" | "studio" | null>(null);
  const [title, setTitle] = useState(notebookTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editValue, setEditValue] = useState(notebookTitle);
  const [shareOpen, setShareOpen] = useState(false);
  const [files, setFiles] = useState<NotebookFile[]>(notebookFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStarterPrompts, setCurrentStarterPrompts] = useState<string[] | null | undefined>(starterPrompts);
  const promptRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFileUploaded = useCallback((file: NotebookFile) => {
    setFiles(prev => [file, ...prev]);

    // After upload, the backend generates new starter prompts async (~5-10s).
    // Poll after a delay to pick them up.
    if (promptRefreshTimer.current) clearTimeout(promptRefreshTimer.current);
    promptRefreshTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/notebooks/${notebookId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.starter_prompts && Array.isArray(data.starter_prompts) && data.starter_prompts.length > 0) {
            setCurrentStarterPrompts(data.starter_prompts);
          }
        }
      } catch {
        // Silent fail, prompts stay as-is
      }
    }, 10_000);
  }, [notebookId]);
  const t = useTranslations("notebook");
  const ts = useTranslations("share");

  const toggleSources = useCallback(() => {
    setSourcesOpen((prev) => !prev);
  }, []);

  const toggleStudio = useCallback(() => {
    setStudioOpen((prev) => !prev);
  }, []);

  const closeMobilePanel = useCallback(() => {
    setMobilePanel(null);
  }, []);

  const openMobileSources = useCallback(() => {
    setMobilePanel("sources");
  }, []);

  const openMobileStudio = useCallback(() => {
    setMobilePanel("studio");
  }, []);

  async function saveTitle() {
    const newTitle = editValue.trim();
    if (!newTitle || newTitle === title) {
      setEditingTitle(false);
      setEditValue(title);
      return;
    }
    setTitle(newTitle);
    setEditingTitle(false);
    try {
      await fetch(`/api/notebooks/${notebookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch {
      // Revert on failure
      setTitle(notebookTitle);
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle();
    } else if (e.key === "Escape") {
      setEditingTitle(false);
      setEditValue(title);
    }
  }

  // Check if any files are still processing
  const hasProcessingFiles = files.some((f) => f.status === "processing");
  const hasReadyFiles = files.some((f) => f.status === "ready");

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 px-3 sm:px-5 py-2.5">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline text-xs">{t("dashboard")}</span>
            </Button>
          </Link>

          {/* Desktop sources toggle */}
          <button
            onClick={toggleSources}
            className={`hidden lg:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${sourcesOpen
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {t("sources")}
          </button>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Editable title */}
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                className="w-full text-sm font-semibold bg-transparent border-b border-primary/40 outline-none py-0.5"
                maxLength={200}
              />
            ) : (
              <h1
                className="text-sm font-semibold truncate cursor-pointer hover:text-primary/80 transition-colors"
                onDoubleClick={() => {
                  setEditValue(title);
                  setEditingTitle(true);
                }}
                title={t("doubleClickToEdit")}
              >
                {title}
              </h1>
            )}
          </div>

          {/* Desktop studio toggle */}
          <button
            onClick={toggleStudio}
            className={`hidden lg:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${studioOpen
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 00-.659 1.59v1.69m-11.742 0A2.923 2.923 0 005 19.748V21" />
            </svg>
            {t("studio")}
          </button>

          {/* Share button */}
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            aria-label={ts("title")}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="hidden sm:inline">{ts("title")}</span>
          </button>

          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <ShareDialog notebookId={notebookId} open={shareOpen} onClose={() => setShareOpen(false)} />

      {/* Main content: three-panel layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left: Sources panel (desktop lg+) */}
        <div
          className={`hidden lg:flex flex-col border-e bg-background shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden ${sourcesOpen ? "w-[260px]" : "w-0 border-e-0"
            }`}
        >
          <div className="w-[260px] h-full min-w-[260px]">
            <SourcesPanel notebookId={notebookId} initialFiles={files} isUploading={isUploading} setIsUploading={setIsUploading} />
          </div>
        </div>

        {/* Center: Chat (always visible) */}
        <div className="flex-1 min-w-0 min-h-0">
          <ChatInterface
            notebookId={notebookId}
            initialMessages={initialMessages}
            isProcessing={hasProcessingFiles && !hasReadyFiles}
            hasFiles={files.length > 0}
            description={notebookDescription}
            starterPrompts={currentStarterPrompts}
            onFileUploaded={handleFileUploaded}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
          />
        </div>

        {/* Right: Studio panel (desktop lg+) */}
        <div
          className={`hidden lg:flex flex-col border-s bg-background shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden ${studioOpen ? "w-[320px]" : "w-0 border-s-0"
            }`}
        >
          <div className="w-[320px] h-full min-w-[320px]">
            <StudioPanel notebookId={notebookId} />
          </div>
        </div>

        {/* Mobile: Sources slide-over (from left) */}
        {mobilePanel === "sources" && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
              onClick={closeMobilePanel}
            />
            <div className="absolute inset-inline-start-0 top-0 bottom-0 w-[90vw] max-w-[320px] bg-background border-e shadow-xl shadow-black/[0.05] animate-slide-in-left">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-sm font-semibold">{t("sources")}</h2>
                <button
                  onClick={closeMobilePanel}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-[calc(100%-49px)] overflow-hidden">
                <SourcesPanel notebookId={notebookId} initialFiles={files} isUploading={isUploading} setIsUploading={setIsUploading} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile: Studio slide-over (from right) */}
        {mobilePanel === "studio" && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
              onClick={closeMobilePanel}
            />
            <div className="absolute inset-inline-end-0 top-0 bottom-0 w-[90vw] max-w-[420px] bg-background border-s shadow-xl shadow-black/[0.05] animate-slide-in-right">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-sm font-semibold">{t("studio")}</h2>
                <button
                  onClick={closeMobilePanel}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-[calc(100%-49px)] overflow-hidden">
                <StudioPanel notebookId={notebookId} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile FABs (only when no overlay is open) */}
        {mobilePanel === null && (
          <>
            <button
              onClick={openMobileSources}
              className="lg:hidden fixed bottom-24 start-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
              aria-label={t("sources")}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </button>

            <button
              onClick={openMobileStudio}
              className="lg:hidden fixed bottom-24 end-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
              aria-label={t("studio")}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 00-.659 1.59v1.69m-11.742 0A2.923 2.923 0 005 19.748V21" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

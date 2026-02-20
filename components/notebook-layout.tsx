"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChatInterface } from "@/components/chat-interface";
import { StudioPanel } from "@/components/studio-panel";
import { ViewPdfButton } from "@/components/view-pdf-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Message } from "@/types";

interface NotebookLayoutProps {
  notebookId: string;
  notebookTitle: string;
  initialMessages: Message[];
}

export function NotebookLayout({ notebookId, notebookTitle, initialMessages }: NotebookLayoutProps) {
  const [studioOpen, setStudioOpen] = useState(false);

  const toggleStudio = useCallback(() => {
    setStudioOpen((prev) => !prev);
  }, []);

  const closeStudio = useCallback(() => {
    setStudioOpen(false);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{notebookTitle}</h1>
          </div>

          {/* Desktop studio toggle */}
          <button
            onClick={toggleStudio}
            className={`hidden lg:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              studioOpen
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 00-.659 1.59v1.69m-11.742 0A2.923 2.923 0 005 19.748V21" />
            </svg>
            Studio
          </button>

          <ThemeToggle />
          <ViewPdfButton notebookId={notebookId} />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Chat, always visible and mounted */}
        <div className="flex-1 min-w-0 min-h-0">
          <ChatInterface notebookId={notebookId} initialMessages={initialMessages} />
        </div>

        {/* Desktop sidebar (lg+) */}
        <div
          className={`hidden lg:flex flex-col border-l bg-background shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden ${
            studioOpen ? "w-[400px]" : "w-0 border-l-0"
          }`}
        >
          <div className="w-[400px] h-full min-w-[400px]">
            <StudioPanel notebookId={notebookId} />
          </div>
        </div>

        {/* Mobile slide-over (<lg) */}
        {studioOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
              onClick={closeStudio}
            />
            {/* Panel */}
            <div className="absolute right-0 top-0 bottom-0 w-[90vw] max-w-[420px] bg-background border-l shadow-2xl animate-slide-in-right">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Studio</h2>
                <button
                  onClick={closeStudio}
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

        {/* Mobile FAB (only when studio is closed) */}
        {!studioOpen && (
          <button
            onClick={toggleStudio}
            className="lg:hidden fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            aria-label="Open Studio"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 00-.659 1.59v1.69m-11.742 0A2.923 2.923 0 005 19.748V21" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

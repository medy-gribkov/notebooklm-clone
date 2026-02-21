"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getFeaturedBySlug } from "@/lib/featured-notebooks";
import { getFeaturedContent } from "@/lib/featured-content";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { FlashcardsView } from "@/components/studio/flashcards";
import { QuizView } from "@/components/studio/quiz";
import { ReportView } from "@/components/studio/report";
import { MindMapView } from "@/components/studio/mindmap";

type ContentTab = "quiz" | "flashcards" | "report" | "mindmap";

export default function FeaturedNotebookPage() {
  const params = useParams();
  const slug = params.slug as string;
  const t = useTranslations("notebook");
  const tf = useTranslations("featured");
  const ts = useTranslations("studio");

  const notebook = getFeaturedBySlug(slug);
  const content = getFeaturedContent(slug);

  const [activeTab, setActiveTab] = useState<ContentTab>("quiz");

  if (!notebook || !content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Featured notebook not found</h2>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: ContentTab; label: string }[] = [
    { key: "quiz", label: ts("quiz") },
    { key: "flashcards", label: ts("flashcards") },
    { key: "report", label: ts("report") },
    { key: "mindmap", label: ts("mindmap") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 sm:px-6 py-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-xs">{t("dashboard")}</span>
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{tf(notebook.titleKey)}</h1>
            <p className="text-xs text-muted-foreground truncate">{tf(notebook.descriptionKey)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Featured
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero banner */}
      <div className={`relative h-32 sm:h-40 bg-gradient-to-br ${notebook.gradient} overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 h-full flex items-end pb-4">
          <div>
            <h2 className="text-white text-xl sm:text-2xl font-bold drop-shadow-sm">{tf(notebook.titleKey)}</h2>
            <p className="text-white/80 text-sm mt-1">{tf(notebook.descriptionKey)}</p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Info banner */}
        <div className="rounded-xl border bg-primary/5 p-4 mb-6 flex items-start gap-3">
          <svg className="h-5 w-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium">Featured content by DocChat Team</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This is a curated example notebook. Studio content is pre-generated. Chat is available in your own notebooks.
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b pb-3">
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

        {/* Content */}
        <div className="max-w-3xl mx-auto animate-fade-in">
          {activeTab === "quiz" && <QuizView data={content.quiz} />}
          {activeTab === "flashcards" && <FlashcardsView data={content.flashcards} />}
          {activeTab === "report" && <ReportView data={content.report} />}
          {activeTab === "mindmap" && <MindMapView data={content.mindmap} />}
        </div>
      </main>

      <footer className="border-t py-4">
        <p className="text-center text-xs text-muted-foreground/40">
          Curated by DocChat Team &middot; {notebook.author}
        </p>
      </footer>
    </div>
  );
}

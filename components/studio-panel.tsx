"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FlashcardsView } from "@/components/studio/flashcards";
import { QuizView } from "@/components/studio/quiz";
import { ReportView } from "@/components/studio/report";
import { MindMapView } from "@/components/studio/mindmap";
import { DataTableView } from "@/components/studio/datatable";
import { InfographicView } from "@/components/studio/infographic";
import { SlideDeckView } from "@/components/studio/slidedeck";
import { NoteEditor } from "@/components/studio/note-editor";
import type { Note, StudioGeneration } from "@/types";

type StudioAction = "flashcards" | "quiz" | "report" | "mindmap" | "datatable" | "infographic" | "slidedeck";
type StubAction = "audio" | "video";

interface StudioPanelProps {
  notebookId: string;
}

interface Flashcard { front: string; back: string }
interface QuizQuestion { question: string; options: string[]; correctIndex: number; explanation: string }
interface ReportSection { heading: string; content: string }
interface MindMapNode { label: string; children?: MindMapNode[] }
interface DataTableData { columns: string[]; rows: string[][] }

type StudioResult = Flashcard[] | QuizQuestion[] | ReportSection[] | MindMapNode | DataTableData;

function parseStudioResult(_action: StudioAction, text: string): StudioResult {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned) as StudioResult;
}

const ACTION_LABELS: Record<StudioAction, string> = {
  flashcards: "Flashcards",
  quiz: "Quiz",
  report: "Report",
  mindmap: "Mind Map",
  datatable: "Data Table",
  infographic: "Infographic",
  slidedeck: "Slide Deck",
};

export function StudioPanel({ notebookId }: StudioPanelProps) {
  const t = useTranslations("studio");
  const tc = useTranslations("common");

  // Generation state
  const [generatingAction, setGeneratingAction] = useState<StudioAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // View state: which result is being viewed (from generation or history)
  const [viewingResult, setViewingResult] = useState<{ action: StudioAction; result: StudioResult } | null>(null);

  // Persisted history
  const [history, setHistory] = useState<StudioGeneration[]>([]);

  // Notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [creatingNote, setCreatingNote] = useState(false);

  // Load history + notes on mount
  useEffect(() => {
    fetch(`/api/notebooks/${notebookId}/generations`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setHistory(data))
      .catch(() => {});

    fetch(`/api/notebooks/${notebookId}/notes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setNotes(data))
      .catch(() => {});
  }, [notebookId]);

  async function handleCreateNote() {
    setCreatingNote(true);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t("newNote") }),
      });
      if (res.ok) {
        const note = await res.json();
        setNotes((prev) => [note, ...prev]);
        setEditingNote(note);
      }
    } finally {
      setCreatingNote(false);
    }
  }

  function handleNoteUpdate(updated: Note) {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setEditingNote(updated);
  }

  function handleNoteDelete(noteId: string) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setEditingNote(null);
  }

  const features: { action: StudioAction; label: string; description: string; icon: string; color: string }[] = [
    { action: "flashcards", label: t("flashcards"), description: t("flashcardsDesc"), icon: "cards", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
    { action: "quiz", label: t("quiz"), description: t("quizDesc"), icon: "quiz", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    { action: "report", label: t("report"), description: t("reportDesc"), icon: "report", color: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
    { action: "mindmap", label: t("mindmap"), description: t("mindmapDesc"), icon: "mindmap", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    { action: "datatable", label: t("datatable"), description: t("datatableDesc"), icon: "table", color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
    { action: "infographic", label: t("infographic"), description: t("infographicDesc"), icon: "infographic", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
    { action: "slidedeck", label: t("slidedeck"), description: t("slidedeckDesc"), icon: "slides", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  ];

  const stubs: { action: StubAction; label: string; description: string; icon: string; color: string }[] = [
    { action: "audio", label: t("audioOverview"), description: t("audioOverviewDesc"), icon: "audio", color: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
    { action: "video", label: t("videoOverview"), description: t("videoOverviewDesc"), icon: "video", color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
  ];

  const generate = useCallback(
    async (action: StudioAction) => {
      setGeneratingAction(action);
      setError(null);
      setViewingResult(null);

      try {
        const res = await fetch("/api/studio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notebookId, action }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }

        const textParts: string[] = [];
        for (const line of fullText.split("\n")) {
          if (line.startsWith("0:")) {
            try {
              textParts.push(JSON.parse(line.slice(2)));
            } catch {
              // skip malformed lines
            }
          }
        }
        const combinedText = textParts.join("");

        if (!combinedText.trim()) {
          throw new Error("Empty response from AI");
        }

        const parsed = parseStudioResult(action, combinedText);

        // Save to database
        try {
          const saveRes = await fetch(`/api/notebooks/${notebookId}/generations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, result: parsed }),
          });
          if (saveRes.ok) {
            const saved = await saveRes.json();
            setHistory((prev) => [saved, ...prev]);
          }
        } catch {
          // Save failed silently, result still shown
        }

        setViewingResult({ action, result: parsed });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setGeneratingAction(null);
      }
    },
    [notebookId]
  );

  async function handleDeleteGeneration(genId: string) {
    const res = await fetch(`/api/notebooks/${notebookId}/generations?generationId=${genId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setHistory((prev) => prev.filter((g) => g.id !== genId));
    }
  }

  function viewHistoryItem(gen: StudioGeneration) {
    setViewingResult({ action: gen.action as StudioAction, result: gen.result as StudioResult });
  }

  function closeViewer() {
    setViewingResult(null);
    setError(null);
  }

  // Note editor view
  if (editingNote) {
    return (
      <NoteEditor
        note={editingNote}
        notebookId={notebookId}
        onBack={() => setEditingNote(null)}
        onUpdate={handleNoteUpdate}
        onDelete={handleNoteDelete}
      />
    );
  }

  // Result viewer (overlay-style, with back to grid)
  if (viewingResult) {
    const { action, result } = viewingResult;
    const label = t(action);
    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={closeViewer}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-xs"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {tc("back")}
          </button>
          <span className="text-sm font-semibold flex-1">{label}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { closeViewer(); generate(action); }}
            className="gap-1.5 text-xs"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t("regenerate")}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
          <div className="max-w-2xl mx-auto">
            {action === "flashcards" && <FlashcardsView data={result as Flashcard[]} />}
            {action === "quiz" && <QuizView data={result as QuizQuestion[]} />}
            {action === "report" && <ReportView data={result as ReportSection[]} />}
            {action === "mindmap" && <MindMapView data={result as MindMapNode} />}
            {action === "datatable" && <DataTableView data={result as DataTableData} />}
            {action === "infographic" && <InfographicView data={result as ReportSection[]} />}
            {action === "slidedeck" && <SlideDeckView data={result as ReportSection[]} />}
          </div>
        </div>
      </div>
    );
  }

  // Feature grid + history + notes
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-lg font-semibold tracking-tight mb-1">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center mb-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Tool grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {features.map((feature) => {
            const isGenerating = generatingAction === feature.action;
            const hasHistory = history.some((g) => g.action === feature.action);
            return (
              <button
                key={feature.action}
                onClick={() => !isGenerating && generate(feature.action)}
                disabled={isGenerating}
                className="group relative flex flex-col items-start gap-2 rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-wait"
              >
                {hasHistory && !isGenerating && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                )}
                {isGenerating && (
                  <span className="absolute top-2 right-2">
                    <span className="block h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </span>
                )}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${feature.color} transition-colors`}>
                  <FeatureIcon type={feature.icon} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold mb-0.5">{feature.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{feature.description}</p>
                </div>
              </button>
            );
          })}
          {/* Disabled stubs */}
          {stubs.map((stub) => (
            <div
              key={stub.action}
              className="relative flex flex-col items-start gap-2 rounded-xl border bg-card p-3 text-left opacity-50 cursor-not-allowed"
              title={t("comingSoon")}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${stub.color}`}>
                <FeatureIcon type={stub.icon} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold mb-0.5">{stub.label}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{t("comingSoon")}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Generation loading indicator */}
        {generatingAction && (
          <div className="mt-4 rounded-xl border bg-card p-4 flex items-center gap-3 animate-fade-in">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
            <div>
              <p className="text-xs font-medium">{t("generating", { type: t(generatingAction) })}</p>
              <p className="text-[10px] text-muted-foreground">{t("generatingNote")}</p>
            </div>
          </div>
        )}

        {/* History section */}
        {history.length > 0 && (
          <div className="mt-6 border-t pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t("history")}
            </h3>
            <div className="space-y-1.5">
              {history.map((gen) => (
                <div
                  key={gen.id}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors group"
                >
                  <button
                    onClick={() => viewHistoryItem(gen)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  >
                    <div className="h-6 w-6 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
                      <FeatureIcon type={getIconForAction(gen.action)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{ACTION_LABELS[gen.action as StudioAction] || gen.action}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(gen.created_at)}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteGeneration(gen.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                    title={tc("delete")}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes section */}
        <div className="mt-6 border-t pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("notes")}
            </h3>
            <button
              onClick={handleCreateNote}
              disabled={creatingNote}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("addNote")}
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 text-center py-4">
              {t("noNotes")}
            </p>
          ) : (
            <div className="space-y-1.5">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setEditingNote(note)}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-accent/50 transition-colors group"
                >
                  <svg className="h-4 w-4 text-muted-foreground/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{note.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(note.updated_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50 mt-8">
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}

function getIconForAction(action: string): string {
  const map: Record<string, string> = {
    flashcards: "cards",
    quiz: "quiz",
    report: "report",
    mindmap: "mindmap",
    datatable: "table",
    infographic: "infographic",
    slidedeck: "slides",
  };
  return map[action] || "report";
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function FeatureIcon({ type }: { type: string }) {
  const cls = "h-4 w-4";
  switch (type) {
    case "cards":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case "quiz":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case "report":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "mindmap":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case "table":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case "infographic":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3v18h18M7 16V8m4 8v-5m4 5V5m4 11v-3" />
        </svg>
      );
    case "slides":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm9 12v4m-4 0h8" />
        </svg>
      );
    case "audio":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z" />
        </svg>
      );
    case "video":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    default:
      return null;
  }
}

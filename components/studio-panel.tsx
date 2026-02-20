"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FlashcardsView } from "@/components/studio/flashcards";
import { QuizView } from "@/components/studio/quiz";
import { ReportView } from "@/components/studio/report";
import { MindMapView } from "@/components/studio/mindmap";
import { DataTableView } from "@/components/studio/datatable";

type StudioAction = "flashcards" | "quiz" | "report" | "mindmap" | "datatable";

interface StudioPanelProps {
  notebookId: string;
}

const FEATURES: {
  action: StudioAction;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    action: "flashcards",
    label: "Flashcards",
    description: "Generate study cards from your document",
    icon: "cards",
  },
  {
    action: "quiz",
    label: "Quiz",
    description: "Test your knowledge with multiple choice",
    icon: "quiz",
  },
  {
    action: "report",
    label: "Report",
    description: "Get a structured summary report",
    icon: "report",
  },
  {
    action: "mindmap",
    label: "Mind Map",
    description: "Visualize topic hierarchy",
    icon: "mindmap",
  },
  {
    action: "datatable",
    label: "Data Table",
    description: "Extract facts and figures into a table",
    icon: "table",
  },
];

const ACTION_LABELS: Record<StudioAction, string> = {
  flashcards: "Flashcards",
  quiz: "Quiz",
  report: "Report",
  mindmap: "Mind Map",
  datatable: "Data Table",
};

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

export function StudioPanel({ notebookId }: StudioPanelProps) {
  const [selectedAction, setSelectedAction] = useState<StudioAction | null>(null);
  const [result, setResult] = useState<StudioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Set<StudioAction>>(new Set());

  const generate = useCallback(
    async (action: StudioAction) => {
      setSelectedAction(action);
      setResult(null);
      setError(null);
      setLoading(true);

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
        setResult(parsed);
        setGenerated((prev) => new Set(prev).add(action));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setLoading(false);
      }
    },
    [notebookId]
  );

  function goBack() {
    setSelectedAction(null);
    setResult(null);
    setError(null);
  }

  // Result view
  if (selectedAction && (result || loading || error)) {
    const label = ACTION_LABELS[selectedAction];

    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={goBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold flex-1">{label}</span>
          {(result || error) && !loading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generate(selectedAction)}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
          <div className="max-w-2xl mx-auto">
            {loading && (
              <div className="flex flex-col items-center py-16 text-center animate-fade-in">
                <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
                <p className="text-sm font-medium">Generating {label.toLowerCase()}...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This may take 10-30 seconds for large documents.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
                <p className="text-sm text-destructive mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={() => generate(selectedAction)}>
                  Try Again
                </Button>
              </div>
            )}

            {result && selectedAction === "flashcards" && <FlashcardsView data={result as Flashcard[]} />}
            {result && selectedAction === "quiz" && <QuizView data={result as QuizQuestion[]} />}
            {result && selectedAction === "report" && <ReportView data={result as ReportSection[]} />}
            {result && selectedAction === "mindmap" && <MindMapView data={result as MindMapNode} />}
            {result && selectedAction === "datatable" && <DataTableView data={result as DataTableData} />}
          </div>
        </div>
      </div>
    );
  }

  // Feature grid
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-lg font-semibold tracking-tight mb-1">Studio</h2>
          <p className="text-sm text-muted-foreground">
            Generate study materials and insights from your document.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {FEATURES.map((feature) => {
            const hasResult = generated.has(feature.action);
            return (
              <button
                key={feature.action}
                onClick={() => generate(feature.action)}
                className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                  <FeatureIcon type={feature.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-0.5 flex items-center gap-2">
                    {feature.label}
                    {hasResult && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        Generated
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50 mt-8">
          Generated content is AI-produced and may not be perfectly accurate. Always verify against the source document.
        </p>
      </div>
    </div>
  );
}

function FeatureIcon({ type }: { type: string }) {
  const cls = "h-5 w-5";
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
    default:
      return null;
  }
}

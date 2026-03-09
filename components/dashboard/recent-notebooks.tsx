"use client";

import { NotebookCard } from "@/components/notebook-card";
import { Mascot } from "@/components/mascot";
import { Button } from "@/components/ui/button";
import type { Notebook, NotebookFile } from "@/types";

interface RecentNotebooksProps {
  notebooks: Notebook[];
  filteredNotebooks: Notebook[];
  notebookFiles: Record<string, NotebookFile[]>;
  companyByNotebook: Record<string, string>;
  loading: boolean;
  gridColsClass: string;
  onCreateNotebook: () => void;
  creatingNotebook: boolean;
  onDelete: (id: string) => void;
  isTimedOut: (notebook: Notebook) => boolean;
  t: (key: string) => string;
}

export function RecentNotebooks({
  notebooks,
  filteredNotebooks,
  notebookFiles,
  companyByNotebook,
  loading,
  gridColsClass,
  onCreateNotebook,
  creatingNotebook,
  onDelete,
  isTimedOut,
  t,
}: RecentNotebooksProps) {
  return (
    <section className="animate-slide-up [animation-delay:150ms]">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-title flex-1">{t("recentNotebooks")}</h2>
      </div>

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
          <Button onClick={onCreateNotebook} disabled={creatingNotebook} size="lg" className="shadow-md shadow-primary/20">
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
          {filteredNotebooks.map((notebook, i) => (
            <div
              key={notebook.id}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <NotebookCard
                notebook={notebook}
                files={notebookFiles[notebook.id] ?? []}
                timedOut={isTimedOut(notebook)}
                onDelete={onDelete}
                companyDomain={companyByNotebook[notebook.id]}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

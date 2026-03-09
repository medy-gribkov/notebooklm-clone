"use client";

import { useState, useRef, memo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface ReportSection {
  heading: string;
  content: string;
}

interface ReportViewProps {
  data: ReportSection[];
}

const SECTION_BORDERS = [
  "border-l-[#CC785C]",
  "border-l-[#D4A27F]",
  "border-l-[#6B8F71]",
  "border-l-[#8B7355]",
  "border-l-[#BF4D43]",
  "border-l-[#91918D]",
];

export const ReportView = memo(function ReportView({ data }: ReportViewProps) {
  const t = useTranslations("studio");
  const [copied, setCopied] = useState(false);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  function copyToClipboard() {
    const text = data
      .map((s) => `## ${s.heading}\n\n${s.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadAsText() {
    const text = data
      .map((s) => `${s.heading}\n${"=".repeat(s.heading.length)}\n\n${s.content}`)
      .join("\n\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function scrollToSection(index: number) {
    sectionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("documentReport")}
          </h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadAsText}>
            {t("download")}
          </Button>
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            {copied ? t("copied") : t("copy")}
          </Button>
        </div>
      </div>

      {/* Table of contents */}
      {data.length > 2 && (
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
            {t("contents")}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {data.map((section, i) => (
              <button
                key={i}
                onClick={() => scrollToSection(i)}
                className="text-xs text-primary/80 hover:text-primary hover:underline transition-colors"
              >
                {i + 1}. {section.heading}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4 max-w-2xl">
        {data.map((section, i) => {
          const borderClass = SECTION_BORDERS[i % SECTION_BORDERS.length];
          return (
            <div
              key={i}
              ref={(el) => { sectionRefs.current[i] = el; }}
              className={`rounded-lg border border-l-4 ${borderClass} bg-card p-4 transition-all hover:shadow-sm`}
            >
              <div className="flex items-start gap-3">
                {/* Section number */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold tracking-tight mb-2">
                    {section.heading}
                  </h2>
                  <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ReportSection {
  heading: string;
  content: string;
}

interface ReportViewProps {
  data: ReportSection[];
}

export function ReportView({ data }: ReportViewProps) {
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    const text = data
      .map((s) => `## ${s.heading}\n\n${s.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Document Report
        </h3>
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          {copied ? "Copied!" : "Copy to clipboard"}
        </Button>
      </div>

      <div className="space-y-6 max-w-2xl">
        {data.map((section, i) => (
          <div key={i} className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {section.heading}
            </h2>
            <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

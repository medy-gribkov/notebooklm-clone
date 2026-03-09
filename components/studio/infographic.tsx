"use client";

import { memo } from "react";

interface InfographicSection {
  heading: string;
  content: string;
}

interface InfographicViewProps {
  data: InfographicSection[];
}

const SECTION_ACCENTS = [
  { border: "border-l-[#CC785C]", bg: "bg-[#CC785C]", bgLight: "bg-[#CC785C]/5", text: "text-[#CC785C]" },
  { border: "border-l-[#D4A27F]", bg: "bg-[#D4A27F]", bgLight: "bg-[#D4A27F]/5", text: "text-[#D4A27F]" },
  { border: "border-l-[#6B8F71]", bg: "bg-[#6B8F71]", bgLight: "bg-[#6B8F71]/5", text: "text-[#6B8F71]" },
  { border: "border-l-[#8B7355]", bg: "bg-[#8B7355]", bgLight: "bg-[#8B7355]/5", text: "text-[#8B7355]" },
  { border: "border-l-[#BF4D43]", bg: "bg-[#BF4D43]", bgLight: "bg-[#BF4D43]/5", text: "text-[#BF4D43]" },
  { border: "border-l-[#91918D]", bg: "bg-[#91918D]", bgLight: "bg-[#91918D]/5", text: "text-[#91918D]" },
];

export const InfographicView = memo(function InfographicView({ data }: InfographicViewProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No infographic data generated.</p>;
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-1 rounded-full bg-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Infographic
        </h3>
        <span className="text-[10px] text-muted-foreground/60 ml-auto">
          {data.length} sections
        </span>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {data.map((section, i) => {
          const accent = SECTION_ACCENTS[i % SECTION_ACCENTS.length];
          return (
            <div
              key={i}
              className={`group rounded-xl border border-l-4 ${accent.border} ${accent.bgLight} overflow-hidden transition-all hover:shadow-sm`}
            >
              <div className="flex gap-4 p-4">
                {/* Number badge */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.bg} text-white font-bold text-sm`}>
                  {String(i + 1).padStart(2, "0")}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold mb-1.5 tracking-tight">{section.heading}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

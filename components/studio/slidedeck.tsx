"use client";

import { useState, useEffect, useCallback, memo } from "react";

interface Slide {
  heading: string;
  content: string;
}

interface SlideDeckViewProps {
  data: Slide[];
}

const SLIDE_ACCENTS = [
  "from-[#CC785C]/20 to-transparent",
  "from-[#D4A27F]/20 to-transparent",
  "from-[#6B8F71]/20 to-transparent",
  "from-[#8B7355]/20 to-transparent",
  "from-[#BF4D43]/20 to-transparent",
  "from-[#91918D]/20 to-transparent",
];

function formatContent(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      return (
        <div key={i} className="flex gap-2 items-start ml-1 my-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
          <span>{trimmed.slice(2)}</span>
        </div>
      );
    }
    if (trimmed === "") return <div key={i} className="h-2" />;
    return <p key={i} className="my-0.5">{line}</p>;
  });
}

export const SlideDeckView = memo(function SlideDeckView({ data }: SlideDeckViewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goTo = useCallback((index: number) => {
    if (index === currentSlide) return;
    setCurrentSlide(index);
  }, [currentSlide]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) goTo(currentSlide - 1);
  }, [currentSlide, goTo]);

  const goNext = useCallback(() => {
    if (currentSlide < (data?.length || 0) - 1) goTo(currentSlide + 1);
  }, [currentSlide, data?.length, goTo]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext]);

  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No slides generated.</p>;
  }

  const slide = data[currentSlide];
  const accent = SLIDE_ACCENTS[currentSlide % SLIDE_ACCENTS.length];

  return (
    <div className="space-y-4">
      {/* Slide display */}
      <div className={`relative rounded-xl border bg-card overflow-hidden min-h-[300px] flex flex-col`}>
        {/* Gradient top bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />

        {/* Slide number badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Slide {currentSlide + 1} of {data.length}
          </span>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col justify-center p-6 pt-10">
          <h3 className="text-lg font-bold mb-1 text-center tracking-tight">
            {slide.heading}
          </h3>
          <div className="w-12 h-0.5 bg-primary/30 mx-auto mb-4 rounded-full" />
          <div className="text-sm text-muted-foreground leading-relaxed">
            {formatContent(slide.content)}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {data.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${i === currentSlide
                ? "w-6 bg-primary"
                : "w-2 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={currentSlide === data.length - 1}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          Next
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        {data.map((s, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-all min-w-[120px] max-w-[160px] ${i === currentSlide
              ? "bg-primary/10 border-primary/30 shadow-sm"
              : "hover:bg-accent"
              }`}
          >
            <span className={`block text-[10px] font-bold mb-0.5 ${i === currentSlide ? "text-primary" : "text-muted-foreground/50"
              }`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={`block text-[11px] leading-tight truncate ${i === currentSlide ? "text-primary font-medium" : "text-muted-foreground"
              }`}>
              {s.heading}
            </span>
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/50 text-center">
        Use arrow keys to navigate
      </p>
    </div>
  );
});

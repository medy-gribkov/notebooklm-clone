"use client";

import { useState, useCallback, useEffect, memo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardsViewProps {
  data: Flashcard[];
}

export const FlashcardsView = memo(function FlashcardsView({ data }: FlashcardsViewProps) {
  const t = useTranslations("studio");
  const [cards, setCards] = useState(data);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [focusedCard, setFocusedCard] = useState(0);

  const toggleFlip = useCallback((index: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Keyboard: arrow keys to navigate, Space to flip
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedCard((prev) => Math.min(prev + 1, cards.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedCard((prev) => Math.max(prev - 1, 0));
      } else if (e.key === " ") {
        e.preventDefault();
        toggleFlip(focusedCard);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function shuffle() {
    setCards((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    setFlipped(new Set());
  }

  function reset() {
    setCards(data);
    setFlipped(new Set());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={shuffle}>
          {t("shuffle")}
        </Button>
        <Button variant="outline" size="sm" onClick={reset}>
          {t("reset")}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {t("flipped", { count: flipped.size, total: cards.length })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card, i) => {
          const isFlipped = flipped.has(i);
          return (
            <button
              key={`${card.front}-${i}`}
              onClick={() => toggleFlip(i)}
              className={`group relative h-44 rounded-xl border bg-card text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                isFlipped
                  ? "border-primary/30 shadow-sm"
                  : "hover:border-primary/30"
              }`}
              style={{ perspective: "600px" }}
            >
              {/* Card number */}
              <span className="absolute top-2.5 left-3 text-[10px] font-bold text-muted-foreground/40">
                {i + 1}/{cards.length}
              </span>

              <div
                className="absolute inset-0 p-4 pt-7 flex flex-col justify-center transition-all duration-300 backface-hidden"
                style={{
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  backfaceVisibility: "hidden",
                }}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  {t("question")}
                </span>
                <p className="text-sm font-medium leading-relaxed line-clamp-4">
                  {card.front}
                </p>
              </div>
              <div
                className="absolute inset-0 p-4 pt-7 flex flex-col justify-center transition-all duration-300 backface-hidden"
                style={{
                  transform: isFlipped ? "rotateY(0deg)" : "rotateY(-180deg)",
                  backfaceVisibility: "hidden",
                }}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider text-primary mb-2">
                  {t("answer")}
                </span>
                <p className="text-sm leading-relaxed line-clamp-5 text-muted-foreground">
                  {card.back}
                </p>
              </div>
              <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50">
                {t("clickToFlip")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

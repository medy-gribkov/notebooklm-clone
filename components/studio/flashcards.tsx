"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardsViewProps {
  data: Flashcard[];
}

export function FlashcardsView({ data }: FlashcardsViewProps) {
  const [cards, setCards] = useState(data);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  const toggleFlip = useCallback((index: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

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
          Shuffle
        </Button>
        <Button variant="outline" size="sm" onClick={reset}>
          Reset
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {cards.length} cards
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card, i) => {
          const isFlipped = flipped.has(i);
          return (
            <button
              key={`${card.front}-${i}`}
              onClick={() => toggleFlip(i)}
              className="group relative h-40 rounded-xl border bg-card text-left transition-all hover:shadow-md hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ perspective: "600px" }}
            >
              <div
                className="absolute inset-0 p-4 flex flex-col justify-center transition-all duration-300 backface-hidden"
                style={{
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  backfaceVisibility: "hidden",
                }}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Question
                </span>
                <p className="text-sm font-medium leading-relaxed line-clamp-4">
                  {card.front}
                </p>
              </div>
              <div
                className="absolute inset-0 p-4 flex flex-col justify-center transition-all duration-300 backface-hidden"
                style={{
                  transform: isFlipped ? "rotateY(0deg)" : "rotateY(-180deg)",
                  backfaceVisibility: "hidden",
                }}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider text-primary mb-2">
                  Answer
                </span>
                <p className="text-sm leading-relaxed line-clamp-4 text-muted-foreground">
                  {card.back}
                </p>
              </div>
              <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50">
                Click to flip
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

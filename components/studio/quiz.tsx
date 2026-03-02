"use client";

import { useState, memo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizViewProps {
  data: QuizQuestion[];
}

export const QuizView = memo(function QuizView({ data }: QuizViewProps) {
  const t = useTranslations("studio");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(data.length).fill(null));

  const q = data[current];

  function checkAnswer() {
    if (selected === null) return;
    setChecked(true);
    const newAnswers = [...answers];
    newAnswers[current] = selected;
    setAnswers(newAnswers);
    if (selected === q.correctIndex) {
      setScore((s) => s + 1);
    }
  }

  function next() {
    if (current < data.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setChecked(false);
    } else {
      setFinished(true);
    }
  }

  function restart() {
    setCurrent(0);
    setSelected(null);
    setChecked(false);
    setScore(0);
    setFinished(false);
    setAnswers(new Array(data.length).fill(null));
  }

  if (finished) {
    const pct = Math.round((score / data.length) * 100);
    const isPerfect = score === data.length;
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (pct / 100) * circumference;

    return (
      <div className="space-y-6">
        {/* Score circle */}
        <div className={`flex flex-col items-center py-6 ${isPerfect ? "animate-pulse-once" : ""}`}>
          <div className="relative h-28 w-28 mb-3">
            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
              <circle
                cx="50" cy="50" r="40" fill="none" strokeWidth="6"
                className="text-primary transition-all duration-1000"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{pct}%</span>
            </div>
          </div>
          <div className="text-lg font-bold">
            {t("correct", { score, total: data.length })}
          </div>
          <p className="text-sm text-muted-foreground">
            {isPerfect
              ? t("perfectScore")
              : score >= data.length * 0.7
              ? t("greatJob")
              : t("keepStudying")}
          </p>
        </div>

        {/* Answer review */}
        <div className="space-y-2">
          {data.map((question, i) => {
            const userAnswer = answers[i];
            const isCorrect = userAnswer === question.correctIndex;
            return (
              <div
                key={i}
                className={`rounded-lg border p-3 text-sm ${
                  isCorrect
                    ? "border-primary/20 bg-primary/5"
                    : "border-destructive/20 bg-destructive/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                    isCorrect ? "bg-primary" : "bg-destructive"
                  }`}>
                    {isCorrect ? "\u2713" : "\u2717"}
                  </span>
                  <div>
                    <p className="font-medium mb-0.5">{question.question}</p>
                    {!isCorrect && (
                      <p className="text-xs text-muted-foreground">
                        {t("correctAnswer", { answer: question.options[question.correctIndex] })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button onClick={restart} className="w-full">
          {t("tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {data.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === current
                  ? "w-6 bg-primary"
                  : i < current
                  ? "w-3 bg-primary/40"
                  : "w-3 bg-muted"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground shrink-0 ml-auto">
          {t("questionOf", { current: current + 1, total: data.length })}
        </span>
      </div>

      {/* Question */}
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
          Q{current + 1}
        </span>
        <p className="text-base font-medium leading-relaxed pt-1">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((option, i) => {
          let optionClass = "border bg-card hover:border-primary/30";
          if (checked) {
            if (i === q.correctIndex) {
              optionClass = "border-primary bg-primary/10";
            } else if (i === selected && i !== q.correctIndex) {
              optionClass = "border-destructive bg-destructive/10";
            }
          } else if (i === selected) {
            optionClass = "border-primary bg-primary/5";
          }

          return (
            <button
              key={i}
              onClick={() => !checked && setSelected(i)}
              disabled={checked}
              className={`w-full text-left rounded-lg px-4 py-3 text-sm transition-all ${optionClass}`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold mr-2.5 text-muted-foreground">
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {checked && q.explanation && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground animate-fade-in">
          <span className="font-semibold text-foreground">{t("explanation")}: </span>
          {q.explanation}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!checked ? (
          <Button
            onClick={checkAnswer}
            disabled={selected === null}
            className="flex-1"
          >
            {t("checkAnswer")}
          </Button>
        ) : (
          <Button onClick={next} className="flex-1">
            {current < data.length - 1 ? t("nextQuestion") : t("seeResults")}
          </Button>
        )}
      </div>
    </div>
  );
});

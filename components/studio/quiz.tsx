"use client";

import { useState } from "react";
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

export function QuizView({ data }: QuizViewProps) {
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
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-4xl font-bold mb-2">
            {score}/{data.length}
          </div>
          <p className="text-sm text-muted-foreground">
            {score === data.length
              ? "Perfect score!"
              : score >= data.length * 0.7
              ? "Great job!"
              : "Keep studying!"}
          </p>
        </div>

        <div className="space-y-3">
          {data.map((question, i) => {
            const userAnswer = answers[i];
            const isCorrect = userAnswer === question.correctIndex;
            return (
              <div
                key={i}
                className={`rounded-lg border p-3 text-sm ${
                  isCorrect
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-red-500/20 bg-red-500/5"
                }`}
              >
                <p className="font-medium mb-1">
                  {i + 1}. {question.question}
                </p>
                {!isCorrect && (
                  <p className="text-xs text-muted-foreground">
                    Correct: {question.options[question.correctIndex]}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <Button onClick={restart} className="w-full">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((current + 1) / data.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {current + 1}/{data.length}
        </span>
      </div>

      {/* Question */}
      <div>
        <p className="text-base font-medium leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((option, i) => {
          let optionClass = "border bg-card hover:border-primary/30";
          if (checked) {
            if (i === q.correctIndex) {
              optionClass = "border-emerald-500 bg-emerald-500/10";
            } else if (i === selected && i !== q.correctIndex) {
              optionClass = "border-red-500 bg-red-500/10";
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
              <span className="font-medium mr-2 text-muted-foreground">
                {String.fromCharCode(65 + i)}.
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {checked && q.explanation && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground animate-fade-in">
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
            Check Answer
          </Button>
        ) : (
          <Button onClick={next} className="flex-1">
            {current < data.length - 1 ? "Next Question" : "See Results"}
          </Button>
        )}
      </div>
    </div>
  );
}

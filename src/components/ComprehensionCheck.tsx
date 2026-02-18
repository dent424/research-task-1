"use client";

import { useState, useMemo } from "react";
import { shuffleWithIndex } from "@/lib/shuffle";

interface ComprehensionOption {
  text: string;
  correct: boolean;
}

interface ComprehensionCheckProps {
  definition: string;
  question: string;
  options: ComprehensionOption[];
  retryMessage: string;
  onPass: () => void;
  maxAttempts?: number;
  kickWarning?: string;
  onFail?: () => void;
}

export default function ComprehensionCheck({
  definition,
  question,
  options,
  retryMessage,
  onPass,
  maxAttempts,
  kickWarning,
  onFail,
}: ComprehensionCheckProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongCount, setWrongCount] = useState(0);

  const shuffledOptions = useMemo(() => shuffleWithIndex(options), [options]);

  function handleSubmit() {
    if (selected === null) return;
    if (shuffledOptions[selected].item.correct) {
      onPass();
    } else {
      const newWrongCount = wrongCount + 1;
      setWrongCount(newWrongCount);
      setSelected(null);
      if (maxAttempts && newWrongCount >= maxAttempts && onFail) {
        onFail();
      }
    }
  }

  const showWarning = kickWarning && maxAttempts && wrongCount === maxAttempts - 1;

  return (
    <div className="flex flex-col gap-6 max-w-2xl text-left">
      <div className="whitespace-pre-line text-zinc-700 leading-relaxed">
        {definition.trim()}
      </div>

      <h3 className="text-lg font-medium">{question}</h3>

      {wrongCount > 0 && !showWarning && (
        <p className="text-red-600 font-medium">
          {retryMessage}
        </p>
      )}

      {showWarning && (
        <p className="text-red-600 font-medium">
          {kickWarning}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {shuffledOptions.map((entry, index) => (
          <button
            key={entry.originalIndex}
            onClick={() => {
              setSelected(index);
            }}
            className={`text-left px-4 py-3 rounded-lg border-2 transition-colors ${
              selected === index
                ? "border-foreground bg-zinc-100"
                : "border-zinc-200 hover:border-zinc-400"
            }`}
          >
            {entry.item.text}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={selected === null}
        className="self-center rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Submit
      </button>
    </div>
  );
}

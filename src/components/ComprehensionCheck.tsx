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
}

export default function ComprehensionCheck({
  definition,
  question,
  options,
  retryMessage,
  onPass,
}: ComprehensionCheckProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  const shuffledOptions = useMemo(() => shuffleWithIndex(options), [options]);

  function handleSubmit() {
    if (selected === null) return;
    if (shuffledOptions[selected].item.correct) {
      onPass();
    } else {
      setShowRetry(true);
      setSelected(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl text-left">
      <div className="whitespace-pre-line text-zinc-700 leading-relaxed">
        {definition.trim()}
      </div>

      <h3 className="text-lg font-medium">{question}</h3>

      {showRetry && (
        <p className="text-red-600 font-medium">
          {retryMessage}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {shuffledOptions.map((entry, index) => (
          <button
            key={entry.originalIndex}
            onClick={() => {
              setSelected(index);
              setShowRetry(false);
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

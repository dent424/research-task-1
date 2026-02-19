"use client";

import { useState } from "react";
import LikertScale from "./LikertScale";

function renderBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

interface CategoryRatingProps {
  category: string;
  question: string;
  scaleMin: number;
  scaleMax: number;
  minLabel: string;
  maxLabel: string;
  currentIndex: number;
  totalCount: number;
  onSubmit: (rating: number) => void;
}

export default function CategoryRating({
  category,
  question,
  scaleMin,
  scaleMax,
  minLabel,
  maxLabel,
  currentIndex,
  totalCount,
  onSubmit,
}: CategoryRatingProps) {
  const [value, setValue] = useState<number | null>(null);

  const displayCategory = category.charAt(0).toLowerCase() + category.slice(1);
  const parts = question.split("{category}");

  return (
    <div className="flex flex-col items-center gap-8 max-w-2xl">
      <p className="text-sm text-zinc-400">
        {currentIndex + 1} of {totalCount}
      </p>

      <h3 className="text-lg font-medium text-center">
        {renderBoldText(parts[0])}
        <span className="font-bold underline">{displayCategory}</span>
        {renderBoldText(parts[1])}
      </h3>

      <LikertScale
        min={scaleMin}
        max={scaleMax}
        minLabel={minLabel}
        maxLabel={maxLabel}
        value={value}
        onChange={setValue}
      />

      <button
        onClick={() => {
          if (value !== null) onSubmit(value);
        }}
        disabled={value === null}
        className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}

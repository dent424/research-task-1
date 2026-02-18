"use client";

import { useState } from "react";
import type { Category } from "@/lib/study-config";

interface BatchCategoryRatingProps {
  categories: Category[];
  question: string;
  scaleMin: number;
  scaleMax: number;
  minLabel: string;
  maxLabel: string;
  onSubmit: (ratings: Record<string, number>) => void;
}

export default function BatchCategoryRating({
  categories,
  question,
  scaleMin,
  scaleMax,
  minLabel,
  maxLabel,
  onSubmit,
}: BatchCategoryRatingProps) {
  const [ratings, setRatings] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(categories.map((c) => [c.key, null]))
  );

  const points = Array.from(
    { length: scaleMax - scaleMin + 1 },
    (_, i) => scaleMin + i
  );
  const allRated = categories.every((c) => ratings[c.key] !== null);

  function handleRate(categoryKey: string, value: number) {
    setRatings((prev) => ({ ...prev, [categoryKey]: value }));
  }

  function handleSubmit() {
    if (!allRated) return;
    onSubmit(ratings as Record<string, number>);
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
      <h3 className="text-lg font-medium text-center">{question}</h3>

      <div className="w-full">
        {/* Scale header */}
        <div className="flex items-end mb-1">
          <div className="w-52 shrink-0" />
          <div className="flex-1 flex justify-between">
            {points.map((p) => (
              <span
                key={p}
                className="w-10 text-center text-sm font-medium text-zinc-500"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Endpoint labels */}
        <div className="flex mb-3">
          <div className="w-52 shrink-0" />
          <div className="flex-1 flex justify-between">
            <span className="text-xs text-zinc-400">{minLabel}</span>
            <span className="text-xs text-zinc-400">{maxLabel}</span>
          </div>
        </div>

        {/* Category rows */}
        {categories.map((category) => (
          <div
            key={category.key}
            className="flex items-center py-3 border-t border-zinc-100"
          >
            <span className="w-52 shrink-0 text-sm font-medium pr-4 text-left">
              {category.label}
            </span>
            <div className="flex-1 flex justify-between">
              {points.map((p) => (
                <button
                  key={p}
                  onClick={() => handleRate(category.key, p)}
                  className={`w-10 h-10 rounded-full border-2 text-sm transition-colors ${
                    ratings[category.key] === p
                      ? "bg-foreground text-background border-foreground"
                      : "border-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allRated}
        className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}

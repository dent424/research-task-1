"use client";

import { useState } from "react";
import type { Category } from "@/lib/study-config";

function renderFormattedText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("***") && part.endsWith("***")) {
      return <strong key={i}><em>{part.slice(3, -3)}</em></strong>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

interface BatchCategoryRatingProps {
  categories: Category[];
  question: string;
  scaleMin: number;
  scaleMax: number;
  minLabel: string;
  maxLabel: string;
  showUnfamiliarOption?: boolean;
  onSubmit: (ratings: Record<string, number | null>) => void;
}

export default function BatchCategoryRating({
  categories,
  question,
  scaleMin,
  scaleMax,
  minLabel,
  maxLabel,
  showUnfamiliarOption = false,
  onSubmit,
}: BatchCategoryRatingProps) {
  const [ratings, setRatings] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(categories.map((c) => [c.key, null]))
  );
  const [unfamiliar, setUnfamiliar] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categories.map((c) => [c.key, false]))
  );

  const points = Array.from(
    { length: scaleMax - scaleMin + 1 },
    (_, i) => scaleMin + i
  );
  const allRated = categories.every(
    (c) => ratings[c.key] !== null || unfamiliar[c.key]
  );

  function handleRate(categoryKey: string, value: number) {
    setRatings((prev) => ({ ...prev, [categoryKey]: value }));
    setUnfamiliar((prev) => ({ ...prev, [categoryKey]: false }));
  }

  function handleUnfamiliar(categoryKey: string) {
    setUnfamiliar((prev) => {
      const next = !prev[categoryKey];
      if (next) {
        setRatings((r) => ({ ...r, [categoryKey]: null }));
      }
      return { ...prev, [categoryKey]: next };
    });
  }

  function handleSubmit() {
    if (!allRated) return;
    const result: Record<string, number | null> = {};
    for (const c of categories) {
      result[c.key] = unfamiliar[c.key] ? null : (ratings[c.key] as number);
    }
    onSubmit(result);
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
      <h3 className="text-lg font-medium text-center">{renderFormattedText(question)}</h3>

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
          {showUnfamiliarOption && <div className="w-24 shrink-0" />}
        </div>

        {/* Endpoint labels */}
        <div className="flex mb-3">
          <div className="w-52 shrink-0" />
          <div className="flex-1 flex justify-between">
            <span className="text-xs text-zinc-400">{minLabel}</span>
            <span className="text-xs text-zinc-400">{maxLabel}</span>
          </div>
          {showUnfamiliarOption && <div className="w-24 shrink-0" />}
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
                  disabled={unfamiliar[category.key]}
                  className={`w-10 h-10 rounded-full border-2 text-sm transition-colors ${
                    ratings[category.key] === p
                      ? "bg-foreground text-background border-foreground"
                      : unfamiliar[category.key]
                        ? "border-zinc-200 text-zinc-300 cursor-not-allowed"
                        : "border-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {showUnfamiliarOption && (
              <label className="w-24 shrink-0 flex items-center justify-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unfamiliar[category.key]}
                  onChange={() => handleUnfamiliar(category.key)}
                  className="w-3.5 h-3.5 accent-zinc-600"
                />
                <span className="text-xs text-zinc-400">Not familiar</span>
              </label>
            )}
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

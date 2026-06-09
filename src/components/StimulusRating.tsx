"use client";

import { useState } from "react";
import LikertScale from "./LikertScale";
import StimulusCard from "./StimulusCard";
import { renderFormattedText } from "@/lib/format";
import type { StimulusCondition } from "@/lib/study-config";

interface StimulusRatingProps {
  /** The assigned post text shown on the card. */
  postText: string;
  condition: StimulusCondition;
  // DV question. Supports bold / bold-italic markup. A {category} token is optional.
  question: string;
  scaleMin: number;
  scaleMax: number;
  minLabel: string;
  maxLabel: string;
  currentIndex: number;
  totalCount: number;
  onSubmit: (rating: number) => void;
}

/**
 * A single rating page for a single-stimulus study: the post card stays pinned
 * above one DV question + Likert scale. Unlike CategoryRating, the question is
 * NOT required to contain a {category} token — when absent it renders whole.
 */
export default function StimulusRating({
  postText,
  condition,
  question,
  scaleMin,
  scaleMax,
  minLabel,
  maxLabel,
  currentIndex,
  totalCount,
  onSubmit,
}: StimulusRatingProps) {
  // Reset the selection whenever we move to a new DV (keyed by the parent).
  const [value, setValue] = useState<number | null>(null);

  const canSubmit = value !== null;

  return (
    <div className="flex flex-col items-center gap-8 max-w-2xl">
      <p className="text-sm text-zinc-400">
        {currentIndex + 1} of {totalCount}
      </p>

      <StimulusCard
        label={condition.label}
        handle={condition.handle}
        descriptor={condition.descriptor}
        avatar={condition.avatar}
        text={postText}
      />

      <h3 className="text-lg font-medium text-center">
        {renderFormattedText(question)}
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
          if (canSubmit) onSubmit(value!);
        }}
        disabled={!canSubmit}
        className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}

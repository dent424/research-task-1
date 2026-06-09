"use client";

import { useState } from "react";
import LikertScale from "./LikertScale";
import { renderFormattedText } from "@/lib/format";

interface StimulusRatingProps {
  /** Scenario framing shown above the post. Already actor-substituted; may contain **bold**. */
  scenario: string;
  /** The assigned post text. */
  postText: string;
  // DV question. Supports bold / bold-italic markup. A {actor} token is already substituted.
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
 * A single rating page for a single-stimulus study. A short scenario frames the
 * actor (person vs. company), the post text is shown as a quote, and one DV
 * question + Likert scale follow. No social-media chrome — the only difference
 * between cells is the actor noun in the scenario.
 */
export default function StimulusRating({
  scenario,
  postText,
  question,
  scaleMin,
  scaleMax,
  minLabel,
  maxLabel,
  currentIndex,
  totalCount,
  onSubmit,
}: StimulusRatingProps) {
  // Reset selection whenever the parent moves to a new DV (keyed remount).
  const [value, setValue] = useState<number | null>(null);

  const canSubmit = value !== null;

  return (
    <div className="flex flex-col items-center gap-8 max-w-2xl">
      <p className="text-sm text-zinc-400">
        {currentIndex + 1} of {totalCount}
      </p>

      {scenario && (
        <p
          data-testid="scenario"
          className="text-base text-center text-zinc-700 leading-relaxed"
        >
          {renderFormattedText(scenario)}
        </p>
      )}

      <blockquote
        data-testid="post-text"
        className="w-full max-w-md border-l-4 border-zinc-300 bg-zinc-50 px-5 py-4 text-left text-[17px] leading-snug text-zinc-900"
      >
        {postText}
      </blockquote>

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

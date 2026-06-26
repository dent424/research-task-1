"use client";

import { useState } from "react";
import LikertScale from "./LikertScale";
import BrandLogo from "./BrandLogo";
import { renderFormattedText } from "@/lib/format";
import { renderWithEmoji } from "@/lib/emoji";

interface StimulusRatingProps {
  /** Scenario framing shown above the post. Already actor-substituted; may contain **bold**. */
  scenario: string;
  /** The assigned post text. */
  postText: string;
  // DV question. Supports bold / bold-italic markup. A {actor} token is already substituted.
  question: string;
  /** Optional small lead-in shown left-justified above the question. */
  preamble?: string;
  scaleMin: number;
  scaleMax: number;
  minLabel: string;
  maxLabel: string;
  /** Likert endpoint-label placement: "below" (default) or "sides". */
  labelPlacement?: "below" | "sides";
  /** Scenario text color: "gray" (default) or "black". */
  scenarioColor?: "gray" | "black";
  /**
   * Brand logo for the assigned cell. When provided, the post renders as a
   * generic social-media card (logo header + post text + engagement icons)
   * instead of the plain blockquote.
   */
  logoSrc?: string;
  logoAlt?: string;
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
  preamble,
  scaleMin,
  scaleMax,
  minLabel,
  maxLabel,
  labelPlacement,
  scenarioColor,
  logoSrc,
  logoAlt,
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
          className={`text-base text-center leading-relaxed ${
            scenarioColor === "black" ? "text-zinc-900" : "text-zinc-400"
          }`}
        >
          {renderFormattedText(scenario)}
        </p>
      )}

      {postText && logoSrc ? (
        <div
          data-testid="post-card"
          className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm"
        >
          <div className="flex items-center justify-between px-5 pt-4">
            <BrandLogo src={logoSrc} alt={logoAlt ?? ""} className="h-7" />
            <span className="text-sm text-zinc-400">· 2h</span>
          </div>
          <div
            data-testid="post-text"
            className="px-5 py-3 text-[17px] leading-snug text-zinc-900"
          >
            {renderWithEmoji(postText)}
          </div>
          <div
            data-testid="post-engagement"
            aria-hidden="true"
            className="flex gap-8 border-t border-zinc-100 px-5 py-3 text-zinc-400"
          >
            {/* Generic, non-interactive engagement glyphs (no platform branding). */}
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20.5l-1.45-1.32C5.4 14.5 2 11.4 2 7.6 2 5 4 3 6.5 3c1.74 0 3.41.81 4.5 2.09C12.09 3.81 13.76 3 15.5 3 18 3 20 5 20 7.6c0 3.8-3.4 6.9-8.55 11.58z" strokeLinejoin="round" />
            </svg>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 11.5a8.38 8.38 0 01-8.5 8.5 9 9 0 01-4-.9L3 21l1.9-5.5A8.38 8.38 0 014 11.5 8.5 8.5 0 0112.5 3 8.5 8.5 0 0121 11.5z" strokeLinejoin="round" />
            </svg>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 16V3m0 0L8 7m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      ) : postText ? (
        <blockquote
          data-testid="post-text"
          className="w-full max-w-md border-l-4 border-zinc-300 bg-zinc-50 px-5 py-4 text-left text-[17px] leading-snug text-zinc-900"
        >
          {renderWithEmoji(postText)}
        </blockquote>
      ) : null}

      <div className="w-full flex flex-col gap-2">
        {preamble && (
          <p
            data-testid="preamble"
            className="text-sm text-left text-zinc-500"
          >
            {preamble}
          </p>
        )}
        <h3 className="text-lg font-medium text-center">
          {renderFormattedText(question)}
        </h3>
      </div>

      <LikertScale
        min={scaleMin}
        max={scaleMax}
        minLabel={minLabel}
        maxLabel={maxLabel}
        labelPlacement={labelPlacement}
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

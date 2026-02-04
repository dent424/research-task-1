"use client";

import { useState, useEffect } from "react";

/* eslint-disable @next/next/no-img-element */

interface MemeExampleImage {
  src: string;
  alt: string;
}

interface MemeExamplesProps {
  introduction: string;
  images: MemeExampleImage[];
  minViewingSeconds: number;
  onContinue: () => void;
}

export default function MemeExamples({
  introduction,
  images,
  minViewingSeconds,
  onContinue,
}: MemeExamplesProps) {
  const [secondsLeft, setSecondsLeft] = useState(minViewingSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const canContinue = secondsLeft <= 0;

  return (
    <div className="flex flex-col gap-6 max-w-2xl text-left">
      <div className="whitespace-pre-line text-zinc-700 leading-relaxed">
        {introduction.trim()}
      </div>

      <div className="flex flex-col gap-6">
        {images.map((image, index) => (
          <div key={index} className="flex justify-center">
            <img
              src={image.src}
              alt={image.alt}
              className="max-w-full h-auto rounded-lg border border-zinc-200"
              style={{ maxHeight: "400px" }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        disabled={!canContinue}
        className={`self-center rounded-full px-6 py-3 transition-colors ${
          canContinue
            ? "bg-foreground text-background hover:bg-zinc-700"
            : "bg-zinc-300 text-zinc-500 cursor-not-allowed"
        }`}
      >
        {canContinue ? "Continue" : `Please review the examples (${secondsLeft}s)`}
      </button>
    </div>
  );
}

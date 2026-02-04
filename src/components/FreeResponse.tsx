"use client";

import { useState, useEffect } from "react";

interface FreeResponseProps {
  question: string;
  aiWarning: string;
  minChars: number;
  maxChars: number;
  minSeconds: number;
  placeholder: string;
  onSubmit: (text: string) => void;
}

export default function FreeResponse({
  question,
  aiWarning,
  minChars,
  maxChars,
  minSeconds,
  placeholder,
  onSubmit,
}: FreeResponseProps) {
  const [text, setText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(minSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const timerDone = secondsLeft <= 0;
  const charCount = text.length;
  const meetsMinChars = charCount >= minChars;
  const canSubmit = timerDone && meetsMinChars;

  return (
    <div className="flex flex-col gap-6 max-w-2xl text-left">
      <h3 className="text-lg font-medium">{question}</h3>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        {aiWarning}
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= maxChars) {
              setText(e.target.value);
            }
          }}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          placeholder={placeholder}
          rows={6}
          className="w-full rounded-lg border border-zinc-300 p-3 text-zinc-700 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none resize-none"
        />
        <p className="text-sm text-zinc-400 text-right">
          {charCount} / {maxChars} characters
          {!meetsMinChars && charCount > 0 && (
            <span className="text-amber-600"> (minimum {minChars})</span>
          )}
        </p>
      </div>

      <button
        onClick={() => {
          if (canSubmit) onSubmit(text);
        }}
        disabled={!canSubmit}
        className={`self-center rounded-full px-6 py-3 transition-colors ${
          canSubmit
            ? "bg-foreground text-background hover:bg-zinc-700"
            : "bg-zinc-300 text-zinc-500 cursor-not-allowed"
        }`}
      >
        {!timerDone
          ? `Please think about your response (${secondsLeft}s)`
          : "Continue"}
      </button>
    </div>
  );
}

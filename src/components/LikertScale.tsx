"use client";

interface LikertScaleProps {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  value: number | null;
  onChange: (value: number) => void;
  // "below" (default): endpoint labels under the row of buttons.
  // "sides": endpoint labels flank the buttons (minLabel left, maxLabel right).
  labelPlacement?: "below" | "sides";
}

export default function LikertScale({
  min,
  max,
  minLabel,
  maxLabel,
  value,
  onChange,
  labelPlacement = "below",
}: LikertScaleProps) {
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const buttons = points.map((point) => (
    <button
      key={point}
      onClick={() => onChange(point)}
      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 text-sm font-medium transition-colors ${
        value === point
          ? "bg-foreground text-background border-foreground"
          : "border-zinc-300 hover:border-zinc-500"
      }`}
    >
      {point}
    </button>
  ));

  if (labelPlacement === "sides") {
    return (
      <div className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-2xl">
        <span className="flex-1 min-w-0 text-right text-xs sm:text-sm text-zinc-500">
          {minLabel}
        </span>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">{buttons}</div>
        <span className="flex-1 min-w-0 text-left text-xs sm:text-sm text-zinc-500">
          {maxLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-sm">
      <div className="flex items-center justify-between w-full">{buttons}</div>
      <div className="flex justify-between w-full text-sm text-zinc-500 px-1">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

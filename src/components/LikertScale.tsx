"use client";

interface LikertScaleProps {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  value: number | null;
  onChange: (value: number) => void;
}

export default function LikertScale({
  min,
  max,
  minLabel,
  maxLabel,
  value,
  onChange,
}: LikertScaleProps) {
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-sm">
      <div className="flex items-center justify-between w-full">
        {points.map((point) => (
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
        ))}
      </div>
      <div className="flex justify-between w-full text-sm text-zinc-500 px-1">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

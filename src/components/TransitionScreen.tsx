"use client";

interface TransitionScreenProps {
  text: string;
  onContinue: () => void;
}

export default function TransitionScreen({
  text,
  onContinue,
}: TransitionScreenProps) {
  return (
    <div className="flex flex-col items-center gap-8 max-w-2xl">
      <p className="text-lg text-center text-zinc-700 leading-relaxed">
        {text}
      </p>

      <button
        onClick={onContinue}
        className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-zinc-700"
      >
        Continue
      </button>
    </div>
  );
}

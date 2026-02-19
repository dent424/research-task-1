"use client";

function renderBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

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
        {renderBoldText(text)}
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

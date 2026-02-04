"use client";

/* eslint-disable @next/next/no-img-element */

interface MemeExampleImage {
  src: string;
  alt: string;
}

interface MemeExamplesProps {
  introduction: string;
  images: MemeExampleImage[];
  onContinue: () => void;
}

export default function MemeExamples({
  introduction,
  images,
  onContinue,
}: MemeExamplesProps) {
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
        className="self-center rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-zinc-700"
      >
        Continue
      </button>
    </div>
  );
}

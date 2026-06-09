import type React from "react";

/**
 * Render inline markdown-ish emphasis to React nodes:
 *   ***bold italic***  -> <strong><em>…</em></strong>
 *   **bold**           -> <strong>…</strong>
 * All other text is returned verbatim. Shared by CategoryRating and
 * StimulusRating so the formatting rules stay identical.
 */
export function renderFormattedText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("***") && part.endsWith("***")) {
      return (
        <strong key={i}>
          <em>{part.slice(3, -3)}</em>
        </strong>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

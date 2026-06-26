/* eslint-disable @next/next/no-img-element */
// Plain <img> (not next/image) to match MemeExamples.tsx — these are small,
// static, public SVG assets and Next's optimizer adds no value here.

interface BrandLogoProps {
  src: string;
  alt: string;
  /**
   * Tailwind classes for the box that constrains the logo. The logo is sized by
   * HEIGHT (h-full w-auto object-contain), so two wordmarks with different aspect
   * ratios render at a matched optical size. Defaults to `h-12`; the post card
   * passes a smaller height (e.g. `h-7`).
   */
  className?: string;
}

export default function BrandLogo({
  src,
  alt,
  className = "h-12",
}: BrandLogoProps) {
  return (
    <div
      data-testid="brand-logo-box"
      className={`flex items-center justify-center ${className}`}
    >
      <img
        src={src}
        alt={alt}
        data-testid="brand-logo"
        className="h-full w-auto object-contain"
      />
    </div>
  );
}

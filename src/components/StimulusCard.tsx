"use client";

interface StimulusCardProps {
  /** Display name of the account (the only identity cue besides handle/avatar). */
  label: string;
  /** Account handle, e.g. "@jordan_rivers". */
  handle: string;
  /** Optional bio line. MUST be matched/empty across conditions. */
  descriptor?: string;
  /** Optional avatar image path. When absent, a neutral placeholder is shown. */
  avatar?: string;
  /** The post text — identical across all conditions. */
  text: string;
}

/**
 * A styled social-media post card. Used as the (persistent) stimulus in a
 * single-stimulus study. The only elements that vary between conditions are the
 * name, handle, and avatar; every other element is identity-neutral so the two
 * cells are textually identical except the person/company identity cue.
 */
export default function StimulusCard({
  label,
  handle,
  descriptor,
  avatar,
  text,
}: StimulusCardProps) {
  const hasDescriptor = !!descriptor && descriptor.trim() !== "";

  return (
    <article
      data-testid="stimulus-card"
      className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm"
    >
      <header className="flex items-center gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div
            data-testid="avatar-placeholder"
            aria-hidden="true"
            className="h-12 w-12 rounded-full bg-zinc-200"
          />
        )}
        <div className="flex flex-col">
          <span data-testid="card-name" className="font-semibold text-zinc-900">
            {label}
          </span>
          <span data-testid="card-handle" className="text-sm text-zinc-500">
            {handle}
          </span>
        </div>
      </header>

      {hasDescriptor && (
        <p data-testid="card-descriptor" className="mt-2 text-sm text-zinc-600">
          {descriptor}
        </p>
      )}

      <p
        data-testid="post-text"
        className="mt-3 whitespace-pre-line text-[17px] leading-snug text-zinc-900"
      >
        {text}
      </p>

      {/* Inert engagement row — purely decorative, identical across conditions. */}
      <div
        data-testid="card-actions"
        aria-hidden="true"
        className="mt-4 flex items-center justify-between text-zinc-400"
      >
        <span>💬</span>
        <span>🔁</span>
        <span>❤️</span>
        <span>📊</span>
      </div>
    </article>
  );
}

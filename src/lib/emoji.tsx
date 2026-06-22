import type React from "react";

// Self-hosted Twemoji SVGs (see public/twemoji/). Rendering emoji as images
// makes every participant see the EXACT same glyph regardless of device — no
// missing-glyph "tofu" boxes for newer emoji (e.g. the "blessed" post) and no
// platform drift (Apple vs Android vs Windows), which matters when the post IS
// the stimulus.
const TWEMOJI_BASE = "/twemoji";

const ZWJ = String.fromCharCode(0x200d); // zero-width joiner
const VS16 = new RegExp(String.fromCharCode(0xfe0f), "g"); // variation selector-16

/**
 * Twemoji filename for an emoji: lowercase hex codepoints joined by "-".
 * Mirrors twemoji's grabTheRightIcon/toCodePoint — the VS16 (U+FE0F) variation
 * selector is stripped unless the emoji is a ZWJ sequence.
 */
export function toTwemojiCode(emoji: string): string {
  const input = emoji.indexOf(ZWJ) < 0 ? emoji.replace(VS16, "") : emoji;
  const points: string[] = [];
  let high = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (high) {
      points.push(
        (0x10000 + ((high - 0xd800) << 10) + (c - 0xdc00)).toString(16)
      );
      high = 0;
    } else if (c >= 0xd800 && c <= 0xdbff) {
      high = c;
    } else {
      points.push(c.toString(16));
    }
  }
  return points.join("-");
}

// Is this codepoint the START of an emoji (a pictographic/symbol base)? Covers
// the common emoji blocks; anything not matched simply renders as plain text
// (its native glyph), i.e. today's behaviour — a safe fallback.
function isEmojiBase(cp: number): boolean {
  return (
    (cp >= 0x1f000 && cp <= 0x1faff) || // pictographs + supplemental symbols
    (cp >= 0x2600 && cp <= 0x27bf) || // misc symbols + dingbats (incl. ❤ 2764)
    (cp >= 0x2300 && cp <= 0x23ff) || // misc technical (⌚ ⏰ …)
    (cp >= 0x2b00 && cp <= 0x2bff) || // stars/arrows (⭐ ⬛ …)
    (cp >= 0x2190 && cp <= 0x21ff) // arrows
  );
}

// Codepoints that attach to the preceding base without a ZWJ: the emoji
// presentation selector (VS16) and the skin-tone modifiers.
function isEmojiGlue(cp: number): boolean {
  return cp === 0xfe0f || (cp >= 0x1f3fb && cp <= 0x1f3ff);
}

/**
 * Replace each emoji in `text` with a self-hosted Twemoji <img>, leaving the
 * surrounding text intact. ZWJ sequences, skin-tone modifiers and VS16 stay
 * grouped into a single image. If an asset is missing the image degrades back
 * to the raw emoji character (onError), so the worst case is today's behaviour.
 */
export function renderWithEmoji(text: string): React.ReactNode[] {
  const cps = Array.from(text); // split into codepoints (astral-safe)
  const nodes: React.ReactNode[] = [];
  let buffer = "";
  let key = 0;
  let i = 0;

  const flushText = () => {
    if (buffer) {
      nodes.push(buffer);
      buffer = "";
    }
  };

  while (i < cps.length) {
    if (isEmojiBase(cps[i].codePointAt(0) ?? 0)) {
      flushText();
      let token = cps[i++];
      while (i < cps.length && isEmojiGlue(cps[i].codePointAt(0) ?? 0)) {
        token += cps[i++];
      }
      // ZWJ-joined continuations (e.g. family / profession sequences).
      while (
        i + 1 < cps.length &&
        cps[i] === ZWJ &&
        isEmojiBase(cps[i + 1].codePointAt(0) ?? 0)
      ) {
        token += cps[i++]; // ZWJ
        token += cps[i++]; // next base
        while (i < cps.length && isEmojiGlue(cps[i].codePointAt(0) ?? 0)) {
          token += cps[i++];
        }
      }
      const code = toTwemojiCode(token);
      nodes.push(
        <img
          key={`emoji-${key++}`}
          src={`${TWEMOJI_BASE}/${code}.svg`}
          alt={token}
          draggable={false}
          className="inline-block h-[1.2em] w-[1.2em] mx-[0.05em] align-[-0.15em]"
          onError={(e) => {
            // Asset missing → fall back to the raw emoji character.
            const el = e.currentTarget;
            el.replaceWith(document.createTextNode(el.alt));
          }}
        />
      );
    } else {
      buffer += cps[i++];
    }
  }
  flushText();
  return nodes;
}
